import { create } from 'zustand';

export const useUi = create((set) => ({
  bagOpen: false,
  openBag: () => set({ bagOpen: true }),
  closeBag: () => set({ bagOpen: false }),
  notice: '',
  announce: (notice) => set({ notice }),
}));
