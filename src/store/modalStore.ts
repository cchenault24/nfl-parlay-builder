import { create } from "zustand";

interface ModalStore {
  // State
  authModalOpen: boolean;
  
  // Actions
  setAuthModalOpen: (open: boolean) => void;
}

const useModalStore = create<ModalStore>((set) => ({
  // Initial state
  authModalOpen: false,

  // Action implementations
  setAuthModalOpen: (open) => set({ authModalOpen: open }),
}));

export default useModalStore;