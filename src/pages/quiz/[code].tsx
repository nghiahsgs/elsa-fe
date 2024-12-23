import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Paper,
  Stack,
  LinearProgress,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { getQuizByCode } from '../../services/api';

interface Question {
  id: string;
  text: string;
  options: string[];
}

interface LeaderboardEntry {
  user_id: string;
  email: string;
  score: number;
  questions_answered: number;
}

interface WebSocketMessage {
  type: string;
  quiz_id?: string;
  leaderboard?: LeaderboardEntry[];
}

export default function Quiz() {
  const router = useRouter();
  const { code } = router.query;
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch quiz details
  useEffect(() => {
    const fetchQuizDetails = async () => {
      if (typeof code === 'string') {
        try {
          const quizData = await getQuizByCode(code);
          setQuiz(quizData);
        } catch (err) {
          console.error('Failed to fetch quiz details:', err);
          setError('Failed to fetch quiz details');
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchQuizDetails();
  }, [code]);

  // WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !code || !user) return;

    console.log('Connecting to quiz WebSocket...');
    const ws = new WebSocket(`ws://0.0.0.0:8002/ws/quiz/${code}?token=${token}`);

    ws.onopen = () => {
      console.log('Connected to quiz successfully');
    };

    ws.onmessage = (event) => {
      try {
        console.log('Received WebSocket message:', event.data);
        const data: WebSocketMessage = JSON.parse(event.data);

        switch (data.type) {
          case 'start_quiz_now':
            if (data.leaderboard) {
              setLeaderboard(data.leaderboard);
            }
            break;

          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket closed. Code:', event.code, 'Reason:', event.reason);
      if (event.code !== 1000) {
        setError('Connection lost. Please refresh the page.');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setSocket(ws);

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Component unmounting');
      }
    };
  }, [code, user, router]);

  const handleSubmitAnswer = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !quiz?.questions) {
      console.error('Cannot submit answer: socket not ready or no questions');
      return;
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const answerMessage = {
      type: 'submit_answer',
      question_id: currentQuestion.id,
      answer: selectedAnswer
    };

    socket.send(JSON.stringify(answerMessage));

    // Move to next question
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer('');
    } else {
      // Quiz completed
      router.push(`/quiz/${code}/results`);
    }
  };

  if (isLoading || !quiz) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Stack spacing={3}>
          {/* Progress */}
          <Box sx={{ width: '100%' }}>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5 }} />
            <Typography variant="body2" color="text.secondary" align="right" sx={{ mt: 1 }}>
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </Typography>
          </Box>

          {/* Question */}
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              {currentQuestion.text}
            </Typography>

            <FormControl component="fieldset" sx={{ width: '100%', mt: 2 }}>
              <RadioGroup
                value={selectedAnswer}
                onChange={(e) => setSelectedAnswer(e.target.value)}
              >
                {currentQuestion.options.map((option, index) => (
                  <FormControlLabel
                    key={index}
                    value={option}
                    control={<Radio />}
                    label={option}
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  />
                ))}
              </RadioGroup>
            </FormControl>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer}
                sx={{
                  minWidth: 200,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'scale(1.02)',
                  }
                }}
              >
                {currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
              </Button>
            </Box>
          </Paper>

          {/* Leaderboard */}
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Leaderboard
            </Typography>
            {leaderboard.map((entry, index) => (
              <Box
                key={entry.user_id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1,
                  borderBottom: index < leaderboard.length - 1 ? '1px solid #eee' : 'none'
                }}
              >
                <Typography>
                  {index + 1}. {entry.email}
                </Typography>
                <Typography>
                  Score: {entry.score} ({entry.questions_answered} answered)
                </Typography>
              </Box>
            ))}
          </Paper>
        </Stack>
      </Box>
    </Container>
  );
}
