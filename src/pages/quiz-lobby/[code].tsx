import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import StarsIcon from '@mui/icons-material/Stars';
import { useQuizStore } from '../../store/quizStore';
import { useAuth } from '../../hooks/useAuth';

export default function QuizLobby() {
  const router = useRouter();
  const { code } = router.query;
  const { user } = useAuth();
  const quizzes = useQuizStore(state => state.quizzes);
  const startQuiz = useQuizStore(state => state.startQuiz);
  const quiz = quizzes.find(q => q.code === code);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!user) {
      router.push('/login');
    }
  }, [user]);

  useEffect(() => {
    if (quiz?.isStarted) {
      router.push('/game');
    }
  }, [quiz?.isStarted]);

  if (!isClient || !user || !quiz) {
    return null;
  }

  const isCreator = quiz.creatorId === user.id;

  const handleStartQuiz = () => {
    if (isCreator) {
      startQuiz(quiz.id);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <Typography variant="h4">Quiz Lobby</Typography>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          bgcolor: 'primary.main',
          color: 'white',
          px: 3,
          py: 1,
          borderRadius: 2
        }}>
          <Typography variant="h6">Room Code:</Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold', letterSpacing: 2 }}>
            {code}
          </Typography>
        </Box>

        <TableContainer component={Paper} sx={{ width: '100%' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Player</TableCell>
                <TableCell align="right">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quiz.participants.map((participant) => (
                <TableRow
                  key={participant.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon color="action" />
                      <Typography>
                        {participant.username}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {participant.id === quiz.creatorId ? (
                      <Chip
                        icon={<StarsIcon />}
                        label="Host"
                        color="primary"
                        variant="outlined"
                      />
                    ) : (
                      <Chip
                        label="Player"
                        color="default"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {isCreator && (
          <Button
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            onClick={handleStartQuiz}
            sx={{ mt: 2 }}
          >
            Start Quiz
          </Button>
        )}
      </Box>
    </Container>
  );
}