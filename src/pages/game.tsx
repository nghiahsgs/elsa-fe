import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Box,
  Button,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider
} from '@mui/material';
import { useAuthStore } from '../store/authStore';
import { useQuizStore } from '../store/quizStore';

export default function Game() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const currentQuiz = useQuizStore(state => state.getCurrentQuiz());
  const updateScore = useQuizStore(state => state.updateScore);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!user) {
      router.push('/login');
    }
  }, [user]);

  useEffect(() => {
    if (isClient && !currentQuiz?.isStarted) {
      router.push('/lobby');
      return;
    }

    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuiz, isClient]);

  if (!isClient || !user || !currentQuiz) {
    return null;
  }

  const handleAnswer = () => {
    if (selectedAnswer === null) return;

    const newScore = selectedAnswer === currentQuiz.questions[currentQuestion].correctAnswer
      ? score + 10
      : score;
    
    setScore(newScore);
    updateScore(user.id, newScore);

    if (currentQuestion < currentQuiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      router.push('/results');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const question = currentQuiz.questions[currentQuestion];
  const sortedParticipants = [...currentQuiz.participants].sort((a, b) => 
    (currentQuiz.scores?.[b.id] || 0) - (currentQuiz.scores?.[a.id] || 0)
  );

  return (
    <Container maxWidth="xl">
      <Box sx={{ 
        mt: 4, 
        display: 'grid', 
        gridTemplateColumns: '1fr auto 1fr',
        gap: 4,
        minHeight: 'calc(100vh - 64px)'
      }}>
        {/* Left side - Quiz Questions */}
        <Box>
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Score: {score}</Typography>
            <Typography variant="h6">Time: {formatTime(timer)}</Typography>
          </Box>

          <Paper sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Question {currentQuestion + 1} of {currentQuiz.questions.length}
            </Typography>
            
            <Typography variant="h5" sx={{ mb: 4 }}>
              {question.text}
            </Typography>

            <RadioGroup
              value={selectedAnswer}
              onChange={(e) => setSelectedAnswer(Number(e.target.value))}
            >
              {question.options.map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={index}
                  control={<Radio />}
                  label={option}
                  sx={{ mb: 2 }}
                />
              ))}
            </RadioGroup>

            <Button
              variant="contained"
              fullWidth
              onClick={handleAnswer}
              disabled={selectedAnswer === null}
              sx={{ mt: 4 }}
            >
              {currentQuestion === currentQuiz.questions.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </Paper>
        </Box>

        {/* Divider */}
        <Divider orientation="vertical" flexItem />

        {/* Right side - Leaderboard */}
        <Box>
          <Typography variant="h5" sx={{ mb: 3 }}>Live Leaderboard</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Player</TableCell>
                  <TableCell align="right">Score</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </Container>
  );
}