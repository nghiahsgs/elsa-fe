import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Paper,
  Chip
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import StarsIcon from '@mui/icons-material/Stars';
import { useQuizStore } from '../../store/quizStore';
import { useAuth } from '../../hooks/useAuth';
import { getQuizByCode } from '../../services/api';
import { CreateQuizResponse } from '../../services/api';

interface Participant {
  id: string;
  email: string;
}

interface WebSocketMessage {
  type: string;
  participants: Participant[];
}

export default function QuizLobby() {
  const router = useRouter();
  const { code } = router.query;
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState<CreateQuizResponse | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const startQuiz = useQuizStore(state => state.startQuiz);

  // Fetch quiz details
  useEffect(() => {
    const fetchQuiz = async () => {
      if (typeof code === 'string') {
        try {
          const quizData = await getQuizByCode(code);
          setQuiz(quizData);
        } catch (err) {
          setError('Failed to fetch quiz details');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (typeof isAuthenticated === 'boolean' && code) {
      fetchQuiz();
    }
  }, [isAuthenticated, code]);

  // WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !code || !user) return;

    const ws = new WebSocket(`ws://0.0.0.0:8002/ws/quiz/${code}?token=${token}`);

    ws.onopen = () => {
      console.log('Connected to quiz room');
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        if (data.type === 'room_participants') {
          setParticipants(data.participants);
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onclose = (event) => {
      console.log('Disconnected from quiz room:', event.reason);
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (socket) {
          socket.close();
          setSocket(null);
        }
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setSocket(ws);

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [code, user]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !quiz) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">
            {error || 'Quiz not found. Please check the code and try again.'}
          </Alert>
          <Button
            sx={{ mt: 2 }}
            variant="contained"
            onClick={() => router.push('/lobby')}
          >
            Back to Lobby
          </Button>
        </Box>
      </Container>
    );
  }

  const handleStartQuiz = () => {
    if (startQuiz(code as string)) {
      router.push(`/quiz/${code}`);
    }
  };

  const isHost = user?.email === quiz.createdBy?.email;

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Quiz Lobby: {quiz.title}
          </Typography>
          
          {quiz.description && (
            <Typography variant="body1" color="text.secondary" paragraph>
              {quiz.description}
            </Typography>
          )}

          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <StarsIcon sx={{ mr: 1 }} />
                Quiz Settings
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary={`Time Limit: ${quiz.settings.timeLimit} seconds`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary={`Questions: ${quiz.questions.length}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary={`Shuffle Questions: ${quiz.settings.shuffleQuestions ? 'Yes' : 'No'}`}
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
                  <ListItem key={participant.id}>
                    <ListItemIcon>
                      <PersonIcon color={participant.email === quiz.createdBy?.email ? "primary" : "action"} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={participant.email}
                      secondary={participant.email === quiz.createdBy?.email ? "Host" : "Participant"}
                    />
                    {participant.email === quiz.createdBy?.email && (
                      <Chip
                        icon={<StarsIcon />}
                        label="Host"
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                    )}
                  </ListItem>
                ))}
              </List>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              {isHost && !quiz.isStarted ? (
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
              ) : (
                <Alert severity="info" sx={{ width: '100%' }}>
                  {quiz.isStarted ? 
                    "Quiz has already started!" : 
                    "Waiting for host to start the quiz..."}
                </Alert>
              )}
            </Box>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}