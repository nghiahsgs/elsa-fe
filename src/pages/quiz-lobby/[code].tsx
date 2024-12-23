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
  is_host: boolean;
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
  quiz: QuizInfo;
  participants: Participant[];
}

export default function QuizLobby() {
  const router = useRouter();
  const { code } = router.query;
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState<CreateQuizResponse | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const startQuiz = useQuizStore(state => state.startQuiz);

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

    console.log('Attempting to connect to WebSocket...');
    const ws = new WebSocket(`ws://0.0.0.0:8002/ws/quiz/${code}?token=${token}`);

    ws.onopen = () => {
      console.log('Connected to quiz room successfully');
      setError('');
    };

    ws.onmessage = (event) => {
      try {
        console.log('Received WebSocket message:', event.data);
        const data: WebSocketMessage = JSON.parse(event.data);
        if (data.type === 'room_participants') {
          console.log('Updating participants:', data.participants);
          setParticipants(data.participants);
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
      console.log('Cleaning up WebSocket connection...');
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Component unmounting');
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

  const handleStartQuiz = async () => {
    try {
      const response = await fetch(`http://0.0.0.0:8002/api/quizzes/${quiz.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to start quiz');
      }

      if (startQuiz(quiz.id)) {
        await router.push(`/quiz/${code}`);
      }
    } catch (err) {
      console.error('Error starting quiz:', err);
      setError('Failed to start quiz. Please try again.');
    }
  };

  const currentParticipant = participants.find(p => p.email === user?.email);
  const isHost = currentParticipant?.is_host || false;

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
                <PersonIcon sx={{ mr: 1 }} />
                Participants ({participants.length})
              </Typography>
              <List>
                {participants.map((participant) => (
                  <ListItem key={participant.id}>
                    <ListItemIcon>
                      <PersonIcon color={participant.is_host ? "primary" : "action"} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={participant.email}
                      secondary={participant.is_host ? "Host" : "Participant"}
                    />
                    {participant.is_host && (
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