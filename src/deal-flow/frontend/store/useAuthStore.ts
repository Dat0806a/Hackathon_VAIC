// @ts-nocheck
/**
 * Startup portal auth — persisted in localStorage so login survives reloads & tabs.
 * Migrates once from legacy sessionStorage key.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UserProfile {
  id: string
  email: string
  fullName: string
  role: 'startup'
  status?: string
}

interface AuthState {
  user: UserProfile | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  /** true after zustand persist has rehydrated from storage */
  _hasHydrated: boolean
  setAuth: (user: UserProfile, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  setHasHydrated: (v: boolean) => void
}

const STORAGE_NAME = 'dealflow-auth-storage'

function migrateFromSessionStorage() {
  if (typeof window === 'undefined') return
  try {
    const existing = localStorage.getItem(STORAGE_NAME)
    if (existing) return
    const legacy = sessionStorage.getItem(STORAGE_NAME)
    if (legacy) {
      localStorage.setItem(STORAGE_NAME, legacy)
      sessionStorage.removeItem(STORAGE_NAME)
    }
  } catch {
    /* ignore */
  }
}

if (typeof window !== 'undefined') {
  migrateFromSessionStorage()
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),
      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: STORAGE_NAME,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        isAuthenticated: s.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)

/**
 * Cross-tab auth sync: login/logout in one tab updates others without F5.
 * (zustand persist only writes localStorage; other tabs need a storage listener.)
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_NAME) return
    try {
      if (!e.newValue) {
        useAuthStore.getState().clearAuth()
        useAuthStore.getState().setHasHydrated(true)
        return
      }
      const parsed = JSON.parse(e.newValue) as {
        state?: {
          user?: UserProfile | null
          accessToken?: string | null
          refreshToken?: string | null
          isAuthenticated?: boolean
        }
      }
      const s = parsed?.state
      if (!s) return
      if (s.accessToken && s.user) {
        useAuthStore
          .getState()
          .setAuth(s.user, s.accessToken, s.refreshToken || '')
      } else {
        useAuthStore.getState().clearAuth()
      }
      useAuthStore.getState().setHasHydrated(true)
    } catch {
      /* ignore corrupt storage */
    }
  })
}
