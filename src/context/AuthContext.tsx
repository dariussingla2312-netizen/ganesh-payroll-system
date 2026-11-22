import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase/config';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  isDemo?: boolean;
}

interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  isFirebase: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginDemoOwner: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_KEY = 'staff_payroll_demo_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if demo user is stored in localStorage
    const savedDemoUser = localStorage.getItem(DEMO_USER_KEY);
    if (savedDemoUser) {
      try {
        const u = JSON.parse(savedDemoUser);
        if (u.isDemo) {
          u.email = 'owner@ganeshagrosangrur.com';
          u.displayName = 'Owner (M/S GANESH AGRO)';
          localStorage.setItem(DEMO_USER_KEY, JSON.stringify(u));
        }
        setCurrentUser(u);
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem(DEMO_USER_KEY);
      }
    }

    // If Firebase Auth is configured
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          setCurrentUser({
            uid: fbUser.uid,
            email: fbUser.email || 'owner@workshop.in',
            displayName: fbUser.displayName || 'Workshop Owner',
            isDemo: false,
          });
        } else {
          // If no Firebase user and no demo user
          if (!localStorage.getItem(DEMO_USER_KEY)) {
            setCurrentUser(null);
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // By default if offline and no user, we can default to demo user or null
      // Let's set loading to false
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        setCurrentUser({
          uid: fbUser.uid,
          email: fbUser.email || email,
          displayName: fbUser.displayName || 'Workshop Owner',
          isDemo: false,
        });
        localStorage.removeItem(DEMO_USER_KEY);
      } else {
        // Fallback local auth for testing
        const demoUser: AppUser = {
          uid: 'owner_local_1',
          email,
          displayName: email.split('@')[0] || 'Workshop Owner',
          isDemo: true,
        };
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
        setCurrentUser(demoUser);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginDemoOwner = () => {
    const demoUser: AppUser = {
      uid: 'demo_owner_ganesh_agro',
      email: 'owner@ganeshagrosangrur.com',
      displayName: 'Owner (M/S GANESH AGRO)',
      isDemo: true,
    };
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    setCurrentUser(demoUser);
    setLoading(false);
  };

  const logout = async (): Promise<void> => {
    localStorage.removeItem(DEMO_USER_KEY);
    if (isFirebaseConfigured && auth) {
      await firebaseSignOut(auth);
    }
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        isFirebase: isFirebaseConfigured,
        login,
        loginDemoOwner,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
