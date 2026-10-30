import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  createdAt?: any;
  lastLoginAt?: any;
}

export class FirebaseService {
  /**
   * Create or update user profile document in Firestore collection 'users'
   */
  static async saveUserProfile(user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  }): Promise<void> {
    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      const userProfile: Partial<UserProfile> = {
        uid: user.uid,
        name: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        lastLoginAt: serverTimestamp(),
      };

      if (!userSnap.exists()) {
        userProfile.createdAt = serverTimestamp();
        await setDoc(userRef, userProfile);
        console.log('Firestore: Created new user profile for', user.uid);
      } else {
        await updateDoc(userRef, userProfile);
        console.log('Firestore: Updated user profile for', user.uid);
      }
    } catch (error) {
      console.error('Error saving user profile to Firestore:', error);
    }
  }

  /**
   * Retrieve user profile document from Firestore
   */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile from Firestore:', error);
      return null;
    }
  }
}

export default FirebaseService;
