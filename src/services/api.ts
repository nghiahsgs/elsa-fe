const BASE_URL = 'http://0.0.0.0:8002/api';

export interface SignupRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  grant_type?: string;
  scope?: string;
  client_id?: string;
  client_secret?: string;
}

export const signupUser = async (data: SignupRequest): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Signup failed');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
};

export const loginUser = async (data: LoginRequest): Promise<AuthResponse> => {
  try {
    const formData = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });

    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export interface QuizQuestion {
  text: string;
  options: string[];
  correctAnswer: number;
  score: number;
}

export interface QuizSettings {
  timeLimit: number;
  shuffleQuestions: boolean;
}

export interface CreateQuizRequest {
  title: string;
  description: string;
  questions: QuizQuestion[];
  settings: QuizSettings;
}

export interface CreateQuizResponse {
  id: string;
  code: string;
  createdAt: string;
  createdBy: {
    id: string;
    email: string;
  };
  title: string;
  description: string;
  questions: QuizQuestion[];
  settings: QuizSettings;
}

export const createQuiz = async (data: CreateQuizRequest): Promise<CreateQuizResponse> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${BASE_URL}/quizzes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create quiz');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Create quiz error:', error);
    throw error;
  }
};
