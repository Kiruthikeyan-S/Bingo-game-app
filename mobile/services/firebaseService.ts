import {
  auth,
  db,
  storage,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  FirebaseUser,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  ref,
  uploadBytes,
  getDownloadURL,
} from './firebase';
import { LeaderboardEntry } from './api';
import { usePlayerStore } from '../store/playerStore';
import { AVATAR_OPTIONS } from '../constants/avatars';

export interface FirebaseUserProfile {
  uid: string;
  email?: string | null;
  username: string;
  avatarUrl: string;
  coins: number;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
  stats: {
    played: number;
    wins: number;
    losses: number;
    draws: number;
  };
}

class FirebaseService {
  /**
   * Listen to Firebase auth state changes and sync playerStore
   */
  public initAuthListener(onUserChanged?: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        await this.syncUserDataFromFirestore(user);
      }
      if (onUserChanged) {
        onUserChanged(user);
      }
    });
  }

  /**
   * Register with Email & Password
   */
  public async registerWithEmail(
    email: string,
    pass: string,
    username: string,
    avatarUrl?: string
  ): Promise<{ success: boolean; user?: FirebaseUser; error?: string }> {
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const user = res.user;

      const chosenAvatar = avatarUrl || AVATAR_OPTIONS[0];
      const initialProfile: FirebaseUserProfile = {
        uid: user.uid,
        email: user.email,
        username: username.trim() || 'Player_' + user.uid.substring(0, 5),
        avatarUrl: chosenAvatar,
        coins: 1250,
        isAnonymous: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stats: {
          played: 0,
          wins: 0,
          losses: 0,
          draws: 0,
        },
      };

      await setDoc(doc(db, 'users', user.uid), initialProfile, { merge: true });

      usePlayerStore.getState().setProfile({
        playerId: user.uid,
        username: initialProfile.username,
        avatarUrl: initialProfile.avatarUrl,
      });

      return { success: true, user };
    } catch (err: any) {
      return { success: false, error: this.formatErrorMessage(err) };
    }
  }

  /**
   * Sign In with Email & Password
   */
  public async loginWithEmail(
    email: string,
    pass: string
  ): Promise<{ success: boolean; user?: FirebaseUser; error?: string }> {
    try {
      const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
      await this.syncUserDataFromFirestore(res.user);
      return { success: true, user: res.user };
    } catch (err: any) {
      return { success: false, error: this.formatErrorMessage(err) };
    }
  }

  /**
   * Sign In as Guest (Anonymous Firebase Auth)
   */
  public async loginAsGuest(
    username: string,
    avatarUrl?: string
  ): Promise<{ success: boolean; user?: FirebaseUser; error?: string }> {
    try {
      const res = await signInAnonymously(auth);
      const user = res.user;

      const profileDoc = await getDoc(doc(db, 'users', user.uid));
      if (!profileDoc.exists()) {
        const chosenAvatar = avatarUrl || AVATAR_OPTIONS[0];
        const newGuest: FirebaseUserProfile = {
          uid: user.uid,
          email: null,
          username: username.trim() || 'Guest_' + user.uid.substring(0, 5),
          avatarUrl: chosenAvatar,
          coins: 1000,
          isAnonymous: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          stats: { played: 0, wins: 0, losses: 0, draws: 0 },
        };
        await setDoc(doc(db, 'users', user.uid), newGuest, { merge: true });
      }

      await this.syncUserDataFromFirestore(user);
      return { success: true, user };
    } catch (err: any) {
      return { success: false, error: this.formatErrorMessage(err) };
    }
  }

  /**
   * Send Password Reset Email
   */
  public async resetPassword(
    email: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (err: any) {
      return { success: false, error: this.formatErrorMessage(err) };
    }
  }

  /**
   * Sign Out
   */
  public async logout(): Promise<{ success: boolean }> {
    try {
      await signOut(auth);
      usePlayerStore.getState().resetProfile();
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /**
   * Save / Sync player profile and stats to Firestore
   */
  public async syncProfileToFirestore(data: Partial<FirebaseUserProfile>): Promise<void> {
    const current = auth.currentUser;
    if (!current) return;
    try {
      await setDoc(
        doc(db, 'users', current.uid),
        {
          ...data,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[Firebase] syncProfileToFirestore error:', err);
    }
  }

  /**
   * Fetch Realtime Leaderboard from Firestore
   */
  public async fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const q = query(collection(db, 'users'), orderBy('stats.wins', 'desc'), limit(25));
      const snap = await getDocs(q);
      if (snap.empty) {
        return [];
      }

      const results: LeaderboardEntry[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as FirebaseUserProfile;
        const played = d.stats?.played || 0;
        const wins = d.stats?.wins || 0;
        const winPct = played > 0 ? Math.round((wins / played) * 100) : 0;
        results.push({
          playerId: d.uid || docSnap.id,
          username: d.username || 'Warrior',
          avatarUrl: d.avatarUrl || AVATAR_OPTIONS[0],
          gamesPlayed: played,
          wins: wins,
          losses: d.stats?.losses || 0,
          draws: d.stats?.draws || 0,
          winPercentage: winPct,
        });
      });
      return results;
    } catch (err) {
      console.warn('[Firebase] fetchLeaderboard error:', err);
      return [];
    }
  }

  /**
   * Upload Avatar Image to Firebase Storage
   */
  public async uploadAvatar(
    uri: string
  ): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    const current = auth.currentUser;
    if (!current) return { success: false, error: 'User not authenticated' };

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `avatars/${current.uid}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      // update firestore and player store
      await this.syncProfileToFirestore({ avatarUrl: downloadUrl });
      usePlayerStore.getState().setProfile({ avatarUrl: downloadUrl });

      return { success: true, downloadUrl };
    } catch (err: any) {
      return { success: false, error: err.message || 'Avatar upload failed' };
    }
  }

  /**
   * Helper to pull Firestore user profile and populate local playerStore
   */
  private async syncUserDataFromFirestore(user: FirebaseUser): Promise<void> {
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data() as FirebaseUserProfile;
        usePlayerStore.getState().setProfile({
          playerId: user.uid,
          username: data.username || user.displayName || 'Player',
          avatarUrl: data.avatarUrl || AVATAR_OPTIONS[0],
        });
        if (typeof data.coins === 'number') {
          usePlayerStore.setState({ coins: data.coins });
        }
      }
    } catch (err) {
      console.warn('[Firebase] syncUserDataFromFirestore error:', err);
    }
  }

  private formatErrorMessage(err: any): string {
    const msg = err.code || err.message || 'An error occurred';
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
      return 'Invalid email or password.';
    }
    if (msg.includes('auth/email-already-in-use')) {
      return 'An account already exists with this email.';
    }
    if (msg.includes('auth/weak-password')) {
      return 'Password should be at least 6 characters.';
    }
    if (msg.includes('auth/invalid-email')) {
      return 'Please enter a valid email address.';
    }
    if (msg.includes('auth/user-not-found')) {
      return 'No account found with this email.';
    }
    return msg;
  }
}

export const firebaseService = new FirebaseService();
