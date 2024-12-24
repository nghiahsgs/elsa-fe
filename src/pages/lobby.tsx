import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Box,
  Button,
  Typography,
  Dialog,
  TextField,
  AppBar,
  Toolbar,
  IconButton,
  Stack,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuthStore } from '../store/authStore';
import { useAuth } from '../hooks/useAuth';

export default function Lobby() {
  const router = useRouter();
  const { user } = useAuth(); // This will handle auth check and redirect
  const logout = useAuthStore(state => state.logout);
  const [openJoinDialog, setOpenJoinDialog] = useState(false);
  const [quizCode, setQuizCode] = useState('');
  const [error, setError] = useState('');

  const handleJoinQuiz = () => {
    if (!quizCode.trim()) {
      setError('Please enter a quiz code');
      return;
    }
    router.push(`/quiz-lobby/${quizCode.trim()}`);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // No need for isClient check anymore as useAuth handles it
  if (!user) {
    return null;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ marginBottom: 4 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Welcome to Quiz Game
          </Typography>
          <IconButton
            size="large"
            color="inherit"
            onClick={handleLogout}
            sx={{
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.1)',
              }
            }}
          >
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm">
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: 3
        }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {user?.email}'s Dashboard
          </Typography>

          <Stack spacing={2} direction="row">
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => router.push('/create-quiz')}
              sx={{
                minWidth: 200,
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)',
                }
              }}
            >
              Create Quiz
            </Button>
            <Button
              variant="contained"
              color="secondary"
              size="large"
              onClick={() => setOpenJoinDialog(true)}
              sx={{
                minWidth: 200,
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)',
                }
              }}
            >
              Join Quiz
            </Button>
          </Stack>
        </Box>

        <Dialog open={openJoinDialog} onClose={() => setOpenJoinDialog(false)}>
          <Box 
            component="form" 
            sx={{ p: 3, minWidth: 300 }}
            onSubmit={(e) => {
              e.preventDefault();
              handleJoinQuiz();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleJoinQuiz();
              }
            }}
          >
            <Typography variant="h6" gutterBottom>
              Join Quiz
            </Typography>
            <TextField
              autoFocus
              margin="dense"
              label="Quiz Code"
              fullWidth
              value={quizCode}
              onChange={(e) => setQuizCode(e.target.value)}
              error={!!error}
              helperText={error}
            />
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={() => setOpenJoinDialog(false)}>Cancel</Button>
              <Button 
                variant="contained" 
                onClick={handleJoinQuiz} 
                type="submit"
              >
                Join
              </Button>
            </Box>
          </Box>
        </Dialog>
      </Container>
    </Box>
  );
}