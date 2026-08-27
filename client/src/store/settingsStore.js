// src/store/settingsStore.js — cafe settings + open/closed state (Zustand).
//
// `isOpen` is computed by the SERVER (GET /api/settings) so it never depends on
// the customer's device clock. Defaults to closed while loading so we never let
// a customer start ordering before we know the real state.
import { create } from 'zustand';
import { getSettings } from '../lib/api.js';

export const useSettings = create((set) => ({
  settings: null,
  isOpen: false,
  loading: true,
  error: null,

  /** Fetch (or refresh) settings from the API. */
  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getSettings();
      set({ settings: data.settings, isOpen: Boolean(data.isOpen), loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },
}));
