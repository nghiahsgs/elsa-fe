import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import StarsIcon from '@mui/icons-material/Stars';
import QuizIcon from '@mui/icons-material/Quiz';
import TimerIcon from '@mui/icons-material/Timer';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { useQuizStore } from '../../store/quizStore';
import { useAuth } from '../../hooks/useAuth';
import { getQuizByCode, getQuizParticipants } from '../../services/api';

interface Participant {
  user_id: string;
  email: string;
  connected_at: string;
}

interface QuizInfo {
  id: string;
  code: string;
  title: string;
  description: string;
  created_by: string;
  status: 'idle' | 'running';
}

interface WebSocketMessage {
  type: string;
  quiz?: QuizInfo;
  participants?: Participant[];
  quiz_id?: string;
  leaderboard?: LeaderboardEntry[];
  question?: Question;
}

interface LeaderboardEntry {
  user_id: string;
  email: string;
  score: number;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correct_answer?: number;
}

export default function QuizLobby() {
  const router = useRouter();
  const { code } = router.query;
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState<QuizInfo | null>(null);
  const [quizData, setQuizData] = useState(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const handleAlertClose = () => {
    setShowAlert(false);
    router.replace('/lobby');
  };

  useEffect(() => {
    const checkAccess = async () => {
      if (!code || !user?.id) return;

      try {
        setIsLoading(true);

        // First get quiz details
        const quizData = await getQuizByCode(code as string);
        
        // Check if quiz is already running
        if (quizData.status === 'running') {
          setAlertMessage('The quiz has already started. You cannot join at this time.');
          setShowAlert(true);
          return;
        }

        setQuizData(quizData); // Store the full quiz data
        
        // Then check participants
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/quizzes/${quizData.id}/participants`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch participants');
        }

        const data = await response.json();
        const existingParticipant = data.participants.find(p => p.email === user.email);
        if (existingParticipant) {
          setAlertMessage('You have already joined this quiz in another tab. Please close this tab and return to your existing quiz session.');
          setShowAlert(true);
          return;
        }

        // If we get here, user can join
        setQuiz(quizData);
        connectWebSocket(code as string);
      } catch (err: any) {
        console.error('Failed to check access:', err);
        if (err.message === 'Quiz not found') {
          setError('Quiz not found. Please check your quiz code.');
        } else {
          setError('Failed to join quiz. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Handle tab/browser close
    const handleBeforeUnload = () => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.close(1000, 'Browser/tab closing');
      }
    };

    // Handle visibility change (tab switch/minimize)
    const handleVisibilityChange = () => {
      if (!document.hidden && socket?.readyState === WebSocket.CLOSED) {
        // Only reconnect if the connection was actually closed (not just hidden)
        if (code) {
          connectWebSocket(code as string);
        }
      }
    };

    // Handle route change
    const handleRouteChange = (url: string) => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.close(1000, 'Route changed');
      }
    };

    checkAccess();
    
    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    router.events.on('routeChangeStart', handleRouteChange);
    
    // Cleanup function
    return () => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.close(1000, 'Component unmounting');
      }
      // Remove event listeners
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [code, user, router]);

  const connectWebSocket = (quizCode: string) => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;

    console.log('Connecting to WebSocket...');
    const wsBaseUrl = process.env.NEXT_PUBLIC_WS_BASE_URL;
    const ws = new WebSocket(`${wsBaseUrl}/quiz/${quizCode}?token=${token}`);

    ws.onopen = () => {
      console.log('Connected to quiz room successfully');
      setError('');
    };

    ws.onmessage = (event) => {
      try {
        console.log('Received WebSocket message:', event.data);
        const data: WebSocketMessage = JSON.parse(event.data);
        
        switch (data.type) {
          case 'room_participants':
            if (data.participants) {
              console.log('Updating participants:', data.participants);
              setParticipants(data.participants);
            }
            break;

          case 'start_quiz_now':
            console.log('Quiz started!');
            console.log({quizData});
            setIsQuizStarted(true);
            if (quizData && quizData.questions) {
              // If questions should be shuffled, shuffle them
              if (quizData.settings?.shuffleQuestions) {
                const shuffledQuestions = [...quizData.questions].sort(() => Math.random() - 0.5);
                setQuizData({...quizData, questions: shuffledQuestions});
              }
              // Set the first question
              setCurrentQuestion(quizData.questions[0]);
              setCurrentQuestionIndex(0);
            }
            if (data.leaderboard) {
              setLeaderboard(data.leaderboard);
            }
            break;

          case 'question':
            if (data.question) {
              console.log('New question received:', data.question);
              setCurrentQuestion(data.question);
              setSelectedAnswer(null);
              setIsAnswerSubmitted(false);
            }
            break;

          case 'answer_result':
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
        setTimeout(() => {
          if (ws.readyState === WebSocket.CLOSED) {
            setError('Connection lost. Please refresh the page.');
          }
        }, 5000);
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
  };

  const handleStartQuiz = async () => {
    try {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket connection not open');
      }

      const startQuizMessage = {
        type: 'start_quiz'
      };
      socket.send(JSON.stringify(startQuizMessage));

    } catch (err) {
      console.error('Error starting quiz:', err);
      setError('Failed to start quiz. Please try again.');
    }
  };

  const handleAnswerSubmit = (answerIndex: number) => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !currentQuestion || isAnswerSubmitted) {
      return;
    }

    setSelectedAnswer(answerIndex);
    setIsAnswerSubmitted(true);

    const message = {
      type: 'submit_answer',
      question_id: currentQuestion.id,
      answer: answerIndex
    };
    socket.send(JSON.stringify(message));

    // Move to next question after a short delay
    setTimeout(() => {
      if (quizData && quizData.questions) {
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < quizData.questions.length) {
          setCurrentQuestion(quizData.questions[nextIndex]);
          setCurrentQuestionIndex(nextIndex);
          setSelectedAnswer(null);
          setIsAnswerSubmitted(false);
        } else {
          // Quiz finished
          setCurrentQuestion(null);
        }
      }
    }, 1000); // Show answer for 1 second before moving to next question
  };

  if (isLoading) {
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

  if (!quiz) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">Quiz not found. Please check your quiz code.</Alert>
        </Box>
      </Container>
    );
  }

  const currentParticipant = participants.find(p => p.user_id === user?.id);
  const isHost = currentParticipant?.user_id === quiz?.created_by || false;

  return (
    <Container maxWidth="md">
      <Dialog
        open={showAlert}
        onClose={handleAlertClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Notification
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {alertMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAlertClose} autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ mt: 4 }}>
        {!isQuizStarted ? (
          <Paper elevation={3} sx={{ p: 4 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <StarsIcon sx={{ mr: 1 }} />
                  Quiz Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <QuizIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={`Number of Questions: ${quiz.questions?.length || 0}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <TimerIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={`Time Limit: ${quiz.settings?.timeLimit || 0} seconds per question`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <ShuffleIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={`Shuffle Questions: ${quiz.settings?.shuffleQuestions ? 'Yes' : 'No'}`}
                    />
                  </ListItem>
                </List>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <PersonIcon sx={{ mr: 1 }} />
                  Participants ({participants.length})
                </Typography>
                <List>
                  {participants.map((participant) => (
                    <ListItem
                      key={participant.user_id}
                      sx={{
                        bgcolor: participant.user_id === quiz?.created_by ? 'action.selected' : 'transparent',
                        borderRadius: 1,
                      }}
                    >
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: participant.user_id === quiz?.created_by ? 'primary.main' : 'grey.400' }}>
                          <PersonIcon />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={participant.email}
                        secondary={
                          participant.user_id === quiz?.created_by ? 'Host' : null
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              {isHost && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleStartQuiz}
                    sx={{
                      minWidth: 200,
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'scale(1.02)',
                      }
                    }}
                  >
                    Start Quiz
                  </Button>
                </Box>
              )}
            </Stack>
          </Paper>
        ) : (
          <Paper elevation={3} sx={{ p: 4 }}>
            {currentQuestion ? (
              <Box>
                <Typography variant="h5" gutterBottom>
                  {currentQuestion.text}
                </Typography>
                <Stack spacing={2} sx={{ mt: 3 }}>
                  {currentQuestion.options.map((option, index) => (
                    <Button
                      key={index}
                      variant={selectedAnswer === index ? "contained" : "outlined"}
                      onClick={() => handleAnswerSubmit(index)}
                      disabled={isAnswerSubmitted}
                      sx={{
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        py: 2,
                        px: 3,
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.02)',
                        }
                      }}
                    >
                      {option}
                    </Button>
                  ))}
                </Stack>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6">
                  Waiting for the next question...
                </Typography>
              </Box>
            )}

            {/* Leaderboard */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Leaderboard
              </Typography>
              <List>
                {leaderboard.sort((a, b) => b.score - a.score).map((entry, index) => (
                  <ListItem key={entry.user_id}>
                    <ListItemIcon>
                      <Typography variant="h6">#{index + 1}</Typography>
                    </ListItemIcon>
                    <ListItemText
                      primary={entry.email}
                      secondary={`Score: ${entry.score}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Paper>
        )}
      </Box>
    </Container>
  );
}