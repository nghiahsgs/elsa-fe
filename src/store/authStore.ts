import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const mockUsers: User[] = [
  { id: '1', username: 'user1', password: '1234' },
  { id: '2', username: 'user2', password: '1234' }
];

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  login: (username: string, password: string) => {
    const user = mockUsers.find(
      u => u.username === username && u.password === password
    );
    if (user) {
      set({ user });
      return true;
    }
    return false;
  },
  logout: () => set({ user: null })
}));