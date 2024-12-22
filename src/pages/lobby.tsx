import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Box,
  Button,
  Typography,
  Dialog,
  TextField
} from '@mui/material';
import { useAuthStore } from '../store/authStore';
import { useQuizStore } from '../store/quizStore';

export default function Lobby() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [quizCode, setQuizCode] = useState('');
  const joinQuiz = useQuizStore(state => state.joinQuiz);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!user) {
      router.push('/login');
    }
  }, [user]);

  const handleJoinQuiz = () => {
    if (joinQuiz(quizCode, user)) {
      router.push('/game');
    }
  };

  if (!isClient) {
    return null; // Return null on server-side
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Typography variant="h4">Welcome to Quiz Game</Typography>
        
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={() => setJoinDialogOpen(true)}
        >
          Join Quiz Game
        </Button>

        <Button
          variant="contained"
          color="secondary"
          fullWidth
          onClick={() => router.push('/create-quiz')}
        >
          Create New Quiz
        </Button>

        <Dialog open={joinDialogOpen} onClose={() => setJoinDialogOpen(false)}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6">Enter Quiz Code</Typography>
            <TextField
              fullWidth
              value={quizCode}
              onChange={(e) => setQuizCode(e.target.value)}
              margin="normal"
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleJoinQuiz}
              sx={{ mt: 2 }}
            >
              Join
            </Button>
          </Box>
        </Dialog>
      </Box>
    </Container>
  );
}