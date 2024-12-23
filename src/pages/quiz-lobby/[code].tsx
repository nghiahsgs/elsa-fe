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
}

interface WebSocketMessage {
  type: string;
  quiz?: QuizInfo;
  participants?: Participant[];
}

const BASE_URL = 'http://0.0.0.0:8002/api'; // Replace with your base URL

export default function QuizLobby() {
  const router = useRouter();
  const { code } = router.query;
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState<QuizInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!code || !user?.id) return;

      try {
        setIsLoading(true);

        // First get quiz details
        const quizData = await getQuizByCode(code as string);
        
        // Then check participants
        const response = await fetch(`${BASE_URL}/quizzes/${quizData.id}/participants`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch participants');
        }

        const data = await response.json();
        const existingParticipant = data.participants.find(p => p.user_id === user.id);
        console.log('Current participants:', data.participants);
        console.log('Current user:', user);
        console.log('Found participant:', existingParticipant);

        if (existingParticipant) {
          router.replace('/');
          return;
        }

        // If we get here, user can join
        setQuiz(quizData);
        connectWebSocket(code as string);
      } catch (err) {
        console.error('Failed to check access:', err);
        setError('Failed to join quiz');
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
    
    // Cleanup function
    return () => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.close(1000, 'Component unmounting');
      }
    };
  }, [code, user, router]);

  const connectWebSocket = (quizCode: string) => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;

    console.log('Connecting to WebSocket...');
    const ws = new WebSocket(`ws://0.0.0.0:8002/ws/quiz/${quizCode}?token=${token}`);

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
            if (quiz) {
              console.log('Quiz started! Redirecting to quiz page...');
              router.push(`/quiz/${code}`);
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
          <Alert severity="error">Quiz not found</Alert>
        </Box>
      </Container>
    );
  }

  const currentParticipant = participants.find(p => p.user_id === user?.id);
  const isHost = currentParticipant?.user_id === quiz?.created_by || false;

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
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
                        <>
                          {participant.user_id === quiz?.created_by ? 'Host • ' : ''}
                          {new Date(participant.connected_at).toLocaleTimeString()}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>

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
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}