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
  Paper
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import StarsIcon from '@mui/icons-material/Stars';
import { useQuizStore } from '../../store/quizStore';
import { useAuth } from '../../hooks/useAuth';
import { getQuizByCode } from '../../services/api';
import { CreateQuizResponse } from '../../services/api';

export default function QuizLobby() {
  const router = useRouter();
  const { code } = router.query;
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState<CreateQuizResponse | null>(null);
  const startQuiz = useQuizStore(state => state.startQuiz);

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

    // Wait for authentication and code to be available
    if (typeof isAuthenticated === 'boolean' && code) {
      fetchQuiz();
    }
  }, [isAuthenticated, code]);

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
                Participants
              </Typography>
              <List dense>
                {quiz.participants?.map((participant, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText primary={participant.email} />
                  </ListItem>
                ))}
              </List>
            </Box>

            {user?.email === quiz.createdBy?.email && !quiz.isStarted && (
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleStartQuiz}
                sx={{
                  mt: 2,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'scale(1.02)',
                  }
                }}
              >
                Start Quiz
              </Button>
            )}

            {quiz.isStarted && (
              <Alert severity="info">
                Quiz has already started!
              </Alert>
            )}
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}