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
import { useWindowSize } from 'react-use';
import Confetti from 'react-confetti';
import { useQuizStore } from '../../store/quizStore';
import { useAuth } from '../../hooks/useAuth';
import {
  getQuizByCode,
  getQuizParticipants
} from '../../services/api';

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
  questions?: Question[];
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
  const { width, height } = useWindowSize();
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
  const [questions, setQuestions] = useState<Question[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isQuizFinished, setIsQuizFinished] = useState(false);

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
        const fetchedQuizData = await getQuizByCode(code as string);
        
        // Check if quiz is already running
        if (fetchedQuizData.status === 'running') {
          // setAlertMessage('The quiz has already started. You cannot join at this time.');
          alert('The quiz has already started. You cannot join at this time.');
          router.push('/lobby');
          return;
        }

        setQuizData(fetchedQuizData); // Store the full quiz data
        setQuiz(fetchedQuizData); // Also update quiz state
        
        // Then check participants
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/quizzes/${fetchedQuizData.id}/participants`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch participants');
        }

        const data = await response.json();
        const existingParticipant = data.participants.find(p => p.email === user.email);
        console.log({existingParticipant});
        console.log({data});
        if (existingParticipant) {
          // setAlertMessage('You have already joined this quiz in another tab. Please close this tab and return to your existing quiz session.');
          // setShowAlert(true);
          alert('You have already joined this quiz in another tab. Please close this tab and return to your existing quiz session.');
          router.push('/lobby');
          return;
        }

        // If we get here, user can join
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
            setIsQuizStarted(true);
            if (data.questions && data.questions.length > 0) {
              console.log('Questions received:', data.questions);
              setQuestions(data.questions);
              // Set the first question
              setCurrentQuestion(data.questions[0]);
              setCurrentQuestionIndex(0);
              setSelectedAnswer(null);
              setIsAnswerSubmitted(false);
            } else {
              console.error('No questions received in start_quiz_now event');
            }
            if (data.leaderboard) {
              setLeaderboard(data.leaderboard);
            }
            break;

          case 'leaderboard_update':
            if (data.leaderboard) {
              console.log('Updating leaderboard:', data.leaderboard);
              setLeaderboard(data.leaderboard);
            }
            break;

          case 'end_quiz_now':
            console.log('Quiz ended!');
            setIsQuizFinished(true);
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

    try {
      const submitAnswerMessage = {
        type: 'submit_answer',
        question_id: currentQuestion.id,
        answer: answerIndex
      };
      socket.send(JSON.stringify(submitAnswerMessage));
      setSelectedAnswer(answerIndex);
      setIsAnswerSubmitted(true);

      // Move to next question after a short delay
      setTimeout(() => {
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < questions.length) {
          setCurrentQuestion(questions[nextIndex]);
          setCurrentQuestionIndex(nextIndex);
          setSelectedAnswer(null);
          setIsAnswerSubmitted(false);
        }

        // Check if this was the last question
        if (nextIndex === questions.length) {
          console.log('Last question answered, sending end_quiz event');
          const endQuizMessage = {
            type: 'end_quiz'
          };
          socket.send(JSON.stringify(endQuizMessage));
        }
      }, 1000); // Show answer for 1 second before moving to next question

    } catch (err) {
      console.error('Error submitting answer:', err);
      setError('Failed to submit answer. Please try again.');
    }
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
    <Container maxWidth="md" sx={{ py: 4 }}>
      {isLoading ? (
        <Box display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          {isQuizFinished && <Confetti width={width} height={height} />}
          
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h4" gutterBottom>
              {quiz?.title}
              {isQuizFinished && (
                <Typography variant="h5" color="primary" sx={{ mt: 2 }}>
                  Game Finished! 🎉
                </Typography>
              )}
            </Typography>
            {!isQuizStarted ? (
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
                          // secondary={
                          //   participant.user_id === quiz?.created_by ? 'Host' : null
                          // }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>

                {/* {isHost && ( */}
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
                {/* )} */}
              </Stack>
            ) : (
              <Box>
                {!isQuizFinished && currentQuestion ? (
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
                ) : !isQuizFinished ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h6">
                      Waiting for the next question...
                    </Typography>
                  </Box>
                ) : null}

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
              </Box>
            )}
          </Paper>
        </>
      )}
    </Container>
  );
}