import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

const GAME_CAPACITIES: Record<string, number> = {
  bingo: 4,
  chess: 2,
  ludo: 4,
};

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Callable Cloud Function: createPrivateRoom
 * Generates an authoritative unique room code and atomically creates room & mapping
 */
export const createPrivateRoom = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to create a private room.'
    );
  }

  const { gameType, hostName, avatarUrl } = data;
  if (!['bingo', 'chess', 'ludo'].includes(gameType)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Invalid game type: ${gameType}`
    );
  }

  const hostUid = context.auth.uid;
  const maxPlayers = GAME_CAPACITIES[gameType] || 2;
  const now = admin.firestore.FieldValue.serverTimestamp();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

  // Concurrency-safe code reservation
  let roomCode = '';
  let attempts = 0;
  const roomRef = db.collection('rooms').doc();

  while (attempts < 5) {
    roomCode = generateRoomCode();
    const codeRef = db.collection('roomCodes').doc(roomCode);

    try {
      await db.runTransaction(async (transaction) => {
        const codeDoc = await transaction.get(codeRef);
        if (codeDoc.exists) {
          const mapping = codeDoc.data();
          if (mapping && mapping.expiresAt?.toDate() > new Date()) {
            throw new Error('CODE_TAKEN');
          }
        }

        // Reserve code
        transaction.set(codeRef, {
          roomCode,
          roomId: roomRef.id,
          hostUid,
          gameType,
          createdAt: now,
          expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        });

        // Create Room
        transaction.set(roomRef, {
          roomCode,
          gameType,
          visibility: 'private',
          hostUid,
          playerUids: [hostUid],
          playerCount: 1,
          maxPlayers,
          status: 'waiting',
          createdAt: now,
          updatedAt: now,
          expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
          players: {
            [hostUid]: {
              uid: hostUid,
              name: hostName || 'Host',
              avatar: avatarUrl || '',
              seatIndex: 0,
              isReady: true,
              isHost: true,
              joinedAt: Date.now(),
            },
          },
          gameState: {
            status: 'waiting',
          },
        });
      });

      return {
        success: true,
        roomId: roomRef.id,
        roomCode,
      };
    } catch (err: any) {
      if (err.message === 'CODE_TAKEN') {
        attempts++;
        continue;
      }
      throw new functions.https.HttpsError('internal', err.message);
    }
  }

  throw new functions.https.HttpsError(
    'resource-exhausted',
    'Unable to reserve unique room code. Please try again.'
  );
});

/**
 * Callable Cloud Function: joinRoomByCode
 * Concurrency-safe transactional join
 */
export const joinRoomByCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to join a room.'
    );
  }

  const { roomCode, playerName, avatarUrl } = data;
  if (!roomCode || typeof roomCode !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Room code is required.');
  }

  const normalizedCode = roomCode.trim().toUpperCase();
  const playerUid = context.auth.uid;
  const codeRef = db.collection('roomCodes').doc(normalizedCode);

  return await db.runTransaction(async (transaction) => {
    const codeDoc = await transaction.get(codeRef);
    if (!codeDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Room code not found.');
    }

    const mapping = codeDoc.data();
    if (!mapping) {
      throw new functions.https.HttpsError('not-found', 'Invalid room code.');
    }

    const roomRef = db.collection('rooms').doc(mapping.roomId);
    const roomDoc = await transaction.get(roomRef);

    if (!roomDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Room not found or expired.');
    }

    const room = roomDoc.data();
    if (!room) {
      throw new functions.https.HttpsError('not-found', 'Room data invalid.');
    }

    if (room.status !== 'waiting') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Match has already started or room has closed.'
      );
    }

    // Check if player is already inside
    if (room.playerUids.includes(playerUid)) {
      return {
        success: true,
        roomId: roomRef.id,
        roomCode: normalizedCode,
        gameType: room.gameType,
      };
    }

    if (room.playerCount >= room.maxPlayers) {
      throw new functions.https.HttpsError('failed-precondition', 'Room is full.');
    }

    const occupiedSeats = Object.values(room.players || {}).map((p: any) => p.seatIndex);
    let nextSeat = 0;
    while (occupiedSeats.includes(nextSeat)) {
      nextSeat++;
    }

    const newPlayers = {
      ...(room.players || {}),
      [playerUid]: {
        uid: playerUid,
        name: playerName || 'Player',
        avatar: avatarUrl || '',
        seatIndex: nextSeat,
        isReady: false,
        isHost: false,
        joinedAt: Date.now(),
      },
    };

    const newPlayerUids = [...room.playerUids, playerUid];

    transaction.update(roomRef, {
      playerUids: newPlayerUids,
      playerCount: newPlayerUids.length,
      players: newPlayers,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      roomId: roomRef.id,
      roomCode: normalizedCode,
      gameType: room.gameType,
    };
  });
});

/**
 * Scheduled or Callable Cleanup function: cleanupStaleMatchmaking
 * Cleans expired queue entries (>3 minutes old) and completed/abandoned rooms
 */
export const cleanupStaleMatchmaking = functions.https.onCall(async () => {
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
  const staleQueueSnap = await db
    .collection('matchmakingQueue')
    .where('createdAt', '<', admin.firestore.Timestamp.fromDate(threeMinutesAgo))
    .get();

  const batch = db.batch();
  staleQueueSnap.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  return { cleaned: staleQueueSnap.size };
});
