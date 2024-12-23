export interface User {
  id: string;
  email: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
}

export interface Quiz {
  id: string;
  creatorId: string;
  questions: Question[];
  code: string;
  participants: User[];
  isStarted: boolean;
  startTime?: Date;
  scores?: Record<string, number>;
}

export interface GameResult {
  userId: string;
  score: number;
  completionTime: number;
}