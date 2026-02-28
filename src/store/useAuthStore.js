import { create } from "zustand";

/**
 * @typedef {object} AuthState
 * @property {import("firebase/auth").User|null} user
 * @property {string|null} role
 * @property {boolean} loading
 * @property {function} setUser
 * @property {function} setRole
 * @property {function} setLoading
 * @property {function} reset
 */

/** @type {import("zustand").UseBoundStore<import("zustand").StoreApi<AuthState>>} */
export const useAuthStore = create((set) => ({
  user: null,
  role: null,
  loading: true,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ user: null, role: null, loading: false }),
}));
