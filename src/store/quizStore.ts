import { create } from 'zustand';
import { Quiz, Question, User } from '../types';

const mockUsers: User[] = [
  { id: '1', username: 'user1', password: '1234' },
  { id: '2', username: 'user2', password: '1234' }
];

interface QuizState {
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  createQuiz: (creatorId: string, questions: Question[]) => string;
  joinQuiz: (code: string, user: User) => boolean;
  startQuiz: (quizId: string) => void;
  getCurrentQuiz: () => Quiz | null;
  updateScore: (userId: string, score: number) => void;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  quizzes: [],
  currentQuiz: null,
  createQuiz: (creatorId: string, questions: Question[]) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const creator = mockUsers.find(u => u.id === creatorId);
    const newQuiz: Quiz = {
      id: Date.now().toString(),
      creatorId,
      questions,
      code,
      participants: creator ? [creator] : [],
      isStarted: false,
      scores: {}
    };
    set(state => ({ 
      quizzes: [...state.quizzes, newQuiz],
      currentQuiz: newQuiz
    }));
    return code;
  },
  joinQuiz: (code: string, user: User) => {
    const quiz = get().quizzes.find(q => q.code === code);
    if (quiz && !quiz.isStarted) {
      if (!quiz.participants.some(p => p.id === user.id)) {
        const updatedQuiz = {
          ...quiz,
          participants: [...quiz.participants, user],
          scores: { ...quiz.scores, [user.id]: 0 }
        };
        set(state => ({
          quizzes: state.quizzes.map(q => q.code === code ? updatedQuiz : q),
          currentQuiz: updatedQuiz
        }));
      } else {
        set({ currentQuiz: quiz });
      }
      return true;
    }
    return false;
  },
  startQuiz: (quizId: string) => {
    const quiz = get().quizzes.find(q => q.id === quizId);
    if (quiz) {
      const updatedQuiz = {
        ...quiz,
        isStarted: true,
        startTime: new Date(),
        scores: Object.fromEntries(quiz.participants.map(p => [p.id, 0]))
      };
      set(state => ({
        quizzes: state.quizzes.map(q => q.id === quizId ? updatedQuiz : q),
        currentQuiz: updatedQuiz
      }));
    }
  },
  getCurrentQuiz: () => get().currentQuiz,
  updateScore: (userId: string, score: number) => {
    const currentQuiz = get().currentQuiz;
    if (currentQuiz) {
      const updatedQuiz = {
        ...currentQuiz,
        scores: { ...currentQuiz.scores, [userId]: score }
      };
      set(state => ({
        quizzes: state.quizzes.map(q => q.id === currentQuiz.id ? updatedQuiz : q),
        currentQuiz: updatedQuiz
      }));
    }
  }
}));