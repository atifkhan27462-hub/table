'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type DashboardMode = 'restaurant' | 'admin';

export interface UserProfile {
  id: string;
  restaurant_id?: string;
  email: string;
  full_name: string;
  role_code: string;
  is_active: boolean;
}

interface DashboardContextType {
  dashboardMode: DashboardMode;
  savedPreference: DashboardMode;
  previewMode: DashboardMode | null;
  currentUser: UserProfile | null;
  canAccessAdmin: boolean;
  setDashboardMode: (mode: DashboardMode, persist?: boolean) => void;
  savePreference: (mode: DashboardMode) => void;
  startPreview: (mode: DashboardMode) => void;
  exitPreview: () => void;
  isLoadingUser: boolean;
}

const STORAGE_KEY = 'smart_table_dashboard_mode';

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dashboardMode, setDashboardModeState] = useState<DashboardMode>('restaurant');
  const [savedPreference, setSavedPreferenceState] = useState<DashboardMode>('restaurant');
  const [previewMode, setPreviewMode] = useState<DashboardMode | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);

  // Determine if the current role is authorized for the Admin Dashboard
  const adminRoles = ['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER'];
  const canAccessAdmin = currentUser ? adminRoles.includes(currentUser.role_code?.toUpperCase()) : true;

  useEffect(() => {
    // 1. Fetch current authenticated user to apply role-aware defaults
    async function fetchUserAndInitMode() {
      try {
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('access_token') || localStorage.getItem('token')
            : null;

        let userProfile: UserProfile | null = null;
        if (token) {
          const apiBase =
            typeof window !== 'undefined' && ['3000', '3001', '3002'].includes(window.location.port)
              ? `${window.location.protocol}//${window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname}:8080/api/v1`
              : 'http://127.0.0.1:8080/api/v1';

          try {
            const res = await fetch(`${apiBase}/auth/me`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const json = await res.json();
              userProfile = json.data || json;
              setCurrentUser(userProfile);
            }
          } catch (e) {
            console.warn('Failed to fetch /auth/me:', e);
          }
        }

        // 2. Read saved preference from localStorage
        const stored = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY) as DashboardMode | null) : null;

        if (stored && (stored === 'restaurant' || stored === 'admin')) {
          setSavedPreferenceState(stored);
          // If stored is admin but user lacks permission, fallback to restaurant
          if (stored === 'admin' && userProfile && !adminRoles.includes(userProfile.role_code?.toUpperCase())) {
            setDashboardModeState('restaurant');
          } else {
            setDashboardModeState(stored);
          }
        } else {
          // 3. Role-aware default fallback:
          // SUPER_ADMIN -> Admin Dashboard
          // RESTAURANT_ADMIN, MANAGER, KITCHEN, STAFF -> Restaurant Dashboard
          if (userProfile?.role_code?.toUpperCase() === 'SUPER_ADMIN') {
            setDashboardModeState('admin');
            setSavedPreferenceState('admin');
          } else {
            setDashboardModeState('restaurant');
            setSavedPreferenceState('restaurant');
          }
        }
      } finally {
        setIsLoadingUser(false);
      }
    }

    fetchUserAndInitMode();
  }, []);

  const setDashboardMode = (mode: DashboardMode, persist = false) => {
    // Permission check
    if (mode === 'admin' && !canAccessAdmin) {
      console.warn('Permission denied: Role lacks admin dashboard privileges.');
      return;
    }
    setDashboardModeState(mode);
    if (persist && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode);
      setSavedPreferenceState(mode);
    }
  };

  const savePreference = (mode: DashboardMode) => {
    if (mode === 'admin' && !canAccessAdmin) {
      alert('Administrator permission is required to select Admin Dashboard.');
      return;
    }
    setDashboardMode(mode, true);
  };

  const startPreview = (mode: DashboardMode) => {
    setPreviewMode(mode);
  };

  const exitPreview = () => {
    setPreviewMode(null);
  };

  // The active mode is the previewMode if previewing, otherwise the user's dashboardMode
  const activeMode = previewMode !== null ? previewMode : dashboardMode;

  return (
    <DashboardContext.Provider
      value={{
        dashboardMode: activeMode,
        savedPreference,
        previewMode,
        currentUser,
        canAccessAdmin,
        setDashboardMode,
        savePreference,
        startPreview,
        exitPreview,
        isLoadingUser,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
