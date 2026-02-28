import { create } from "zustand";

/**
 * @typedef {object} IncidentState
 * @property {Array} queuedIncidents
 * @property {function} addQueued
 * @property {function} clearQueued
 * @property {function} removeQueued
 */

/** @type {import("zustand").UseBoundStore<import("zustand").StoreApi<IncidentState>>} */
export const useIncidentStore = create((set) => ({
  queuedIncidents: [],
  addQueued: (incident) =>
    set((s) => ({ queuedIncidents: [...s.queuedIncidents, incident] })),
  clearQueued: () => set({ queuedIncidents: [] }),
  removeQueued: (id) =>
    set((s) => ({
      queuedIncidents: s.queuedIncidents.filter((i) => i.id !== id),
    })),
}));
