// src/store/useParlayStore.ts
import { create } from "zustand";
import { GeneratedParlay, NFLGame } from "../types";

interface ParlayStore {
  // State
  selectedGame: NFLGame | null;

  // Actions
  setSelectedGame: (game: NFLGame | null) => void;
}

const useParlayStore = create<ParlayStore>((set) => ({
  // Initial state
  selectedGame: null,

  // Action implementations
  setSelectedGame: (game) => set({ selectedGame: game }),
}));

export default useParlayStore;
