import { create } from "zustand";

/**
 * @typedef {object} HikeState
 * @property {object|null} currentHike
 * @property {object|null} hikerProfile
 * @property {function} setCurrentHike
 * @property {function} setHikerProfile
 * @property {function} reset
 */

/** @type {import("zustand").UseBoundStore<import("zustand").StoreApi<HikeState>>} */
export const useHikeStore = create((set) => ({
  currentHike: null,
  hikerProfile: null,
  setCurrentHike: (hike) => set({ currentHike: hike }),
  setHikerProfile: (profile) => set({ hikerProfile: profile }),
  reset: () => set({ currentHike: null, hikerProfile: null }),
}));
