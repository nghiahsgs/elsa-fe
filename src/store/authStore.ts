import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  setUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ 
    user: { 
      ...user
    } as User 
  }),
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null });
  }
}));