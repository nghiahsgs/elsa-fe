import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useAuthStore } from '../store/authStore';
import { useQuizStore } from '../store/quizStore';

export default function Results() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const currentQuiz = useQuizStore(state => state.getCurrentQuiz());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!user) {
      router.push('/login');
    }
  }, [user]);

  if (!isClient || !user || !currentQuiz) {
    return null;
  }

  const sortedParticipants = [...currentQuiz.participants].sort((a, b) => 
    (currentQuiz.scores?.[b.id] || 0) - (currentQuiz.scores?.[a.id] || 0)
  );

  const getMedalColor = (rank: number) => {
    switch(rank) {
      case 0: return '#FFD700'; // Gold
      case 1: return '#C0C0C0'; // Silver
      case 2: return '#CD7F32'; // Bronze
      default: return 'transparent';
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          Final Results
        </Typography>

        <TableContainer component={Paper} sx={{ width: '100%' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>Player</TableCell>
                <TableCell align="right">Score</TableCell>
                <TableCell align="right">Trophy</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedParticipants.map((participant, index) => (
                <TableRow 
                  key={participant.id}
                  sx={{ 
                    bgcolor: participant.id === user.id ? 'action.selected' : 'inherit'
                  }}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{participant.username}</TableCell>
                  <TableCell align="right">{currentQuiz.scores?.[participant.id] || 0}</TableCell>
                  <TableCell align="right">
                    {index < 3 && (
                      <EmojiEventsIcon sx={{ color: getMedalColor(index) }} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Button
          variant="contained"
          color="primary"
          onClick={() => router.push('/lobby')}
          sx={{ mt: 4 }}
        >
          Back to Lobby
        </Button>
      </Box>
    </Container>
  );
}