import {
  db,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  runTransaction,
  onSnapshot,
} from './firebase';
import { GameType } from '../../shared/types';
import { MatchmakingQueueEntry, FirebaseRoom } from '../types/room';
import { roomService } from './roomService';

class MatchmakingService {
  /**
   * Enter the public matchmaking queue and atomically match or queue.
   */
  public async enterQueue(
    gameType: GameType,
    player: { uid: string; username: string; avatarUrl: string }
  ): Promise<{ success: boolean; error?: string; matchedRoomId?: string }> {
    try {
      const queueRef = doc(db, 'matchmakingQueue', player.uid);
      const now = Date.now();

      // Clean up stale entries (> 3 minutes old)
      const staleThreshold = now - 3 * 60 * 1000;
      const qStale = query(
        collection(db, 'matchmakingQueue'),
        where('gameType', '==', gameType),
        where('joinedAt', '<', staleThreshold),
        limit(5)
      );
      getDocs(qStale).then((snap) => {
        snap.forEach((d) => deleteDoc(d.ref).catch(() => {}));
      }).catch(() => {});

      // Check if there is an existing waiting player in the queue for this gameType
      const q = query(
        collection(db, 'matchmakingQueue'),
        where('gameType', '==', gameType),
        where('status', '==', 'queued'),
        limit(10)
      );
      const snap = await getDocs(q);

      let matchedPeer: MatchmakingQueueEntry | null = null;
      for (const d of snap.docs) {
        if (d.id !== player.uid) {
          const entry = d.data() as MatchmakingQueueEntry;
          if (entry.joinedAt >= staleThreshold) {
            matchedPeer = entry;
            break;
          }
        }
      }

      if (matchedPeer) {
        // We found a peer! Create a room with peer + current player atomically
        const roomRes = await roomService.createPrivateRoom(
          gameType,
          { uid: matchedPeer.uid, username: matchedPeer.username, avatarUrl: matchedPeer.avatarUrl },
          gameType === 'chess' ? 2 : 2
        );

        if (roomRes.success && roomRes.roomId) {
          const roomId = roomRes.roomId;

          // Join current player into the room
          await roomService.joinRoomByCode(roomRes.roomCode || '', player);

          // Update peer queue doc to 'matched'
          await setDoc(
            doc(db, 'matchmakingQueue', matchedPeer.uid),
            {
              status: 'matched',
              matchedRoomId: roomId,
            },
            { merge: true }
          );

          // Delete current player queue doc
          await deleteDoc(queueRef).catch(() => {});

          return { success: true, matchedRoomId: roomId };
        }
      }

      // No peer found yet, create queue entry
      const newEntry: MatchmakingQueueEntry = {
        uid: player.uid,
        username: player.username,
        avatarUrl: player.avatarUrl,
        gameType,
        joinedAt: now,
        status: 'queued',
      };

      await setDoc(queueRef, newEntry);
      return { success: true };
    } catch (err: any) {
      console.warn('[MatchmakingService] enterQueue error:', err);
      return { success: false, error: err.message || 'Matchmaking request failed' };
    }
  }

  /**
   * Leave / Cancel matchmaking queue.
   */
  public async leaveQueue(uid: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'matchmakingQueue', uid));
    } catch (err) {
      console.warn('[MatchmakingService] leaveQueue error:', err);
    }
  }

  /**
   * Listen for matchmaking assignment.
   */
  public subscribeToQueue(
    uid: string,
    onMatched: (roomId: string) => void,
    onCancelled?: () => void
  ): () => void {
    const queueRef = doc(db, 'matchmakingQueue', uid);
    return onSnapshot(queueRef, (snap) => {
      if (!snap.exists()) {
        if (onCancelled) onCancelled();
        return;
      }
      const data = snap.data() as MatchmakingQueueEntry;
      if (data.status === 'matched' && data.matchedRoomId) {
        // Clean up queue doc after match
        deleteDoc(queueRef).catch(() => {});
        onMatched(data.matchedRoomId);
      }
    });
  }
}

export const matchmakingService = new MatchmakingService();
