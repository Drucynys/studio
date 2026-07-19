import { create } from 'zustand';

export type SupportedLanguage = 'en' | 'ja';

interface UIState {
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isAuthModalOpen: false,
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),
}));
