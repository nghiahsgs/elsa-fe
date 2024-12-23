import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Stack,
  Switch,
  FormControlLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../hooks/useAuth';
import { createQuiz } from '../services/api';

interface QuestionForm {
  text: string;
  options: string[];
  correctAnswer: number;
}

export default function CreateQuiz() {
  const router = useRouter();
  const { user } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Quiz details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  
  // Questions
  const [questions, setQuestions] = useState<QuestionForm[]>([{
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0
  }]);

  useEffect(() => {
    setIsClient(true);
    if (!user) {
      router.push('/login');
    }
  }, [user]);

  const handleAddQuestion = () => {
    setQuestions([...questions, {
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    }]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const handleQuestionChange = (index: number, field: string, value: string | number) => {
    const newQuestions = [...questions];
    if (field === 'text') {
      newQuestions[index].text = value as string;
    } else if (field.startsWith('option')) {
      const optionIndex = parseInt(field.replace('option', ''));
      newQuestions[index].options[optionIndex] = value as string;
    } else if (field === 'correctAnswer') {
      newQuestions[index].correctAnswer = value as number;
    }
    setQuestions(newQuestions);
  };

  const handleCreateQuiz = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');

      // Validate inputs
      if (!title.trim()) {
        throw new Error('Please enter a quiz title');
      }
      if (!questions.every(q => q.text.trim() && q.options.every(o => o.trim()))) {
        throw new Error('Please fill in all questions and options');
      }

      const response = await createQuiz({
        title,
        description,
        questions: questions.map(q => ({
          ...q,
          score: 10 // Default score for each question
        })),
        settings: {
          timeLimit,
          shuffleQuestions
        }
      });

      setSuccess(`Quiz created successfully! Share code: ${response.code}`);
      setTimeout(() => {
        router.push('/lobby');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quiz');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient || !user) {
    return null;
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Create New Quiz
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Stack spacing={3}>
          <TextField
            label="Quiz Title"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <TextField
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="Time Limit (seconds)"
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              sx={{ width: 200 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                />
              }
              label="Shuffle Questions"
            />
          </Box>

          {questions.map((question, qIndex) => (
            <Box key={qIndex} sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Question {qIndex + 1}
                </Typography>
                {questions.length > 1 && (
                  <IconButton onClick={() => handleRemoveQuestion(qIndex)} color="error">
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>

              <Stack spacing={2}>
                <TextField
                  label="Question Text"
                  fullWidth
                  value={question.text}
                  onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                  required
                />

                {question.options.map((option, oIndex) => (
                  <TextField
                    key={oIndex}
                    label={`Option ${oIndex + 1}`}
                    fullWidth
                    value={option}
                    onChange={(e) => handleQuestionChange(qIndex, `option${oIndex}`, e.target.value)}
                    required
                  />
                ))}

                <FormControl fullWidth>
                  <InputLabel>Correct Answer</InputLabel>
                  <Select
                    value={question.correctAnswer}
                    label="Correct Answer"
                    onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                  >
                    {question.options.map((_, index) => (
                      <MenuItem key={index} value={index}>
                        Option {index + 1}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>
          ))}

          <Button
            startIcon={<AddIcon />}
            onClick={handleAddQuestion}
            variant="outlined"
            sx={{ alignSelf: 'flex-start' }}
          >
            Add Question
          </Button>

          <Button
            variant="contained"
            size="large"
            onClick={handleCreateQuiz}
            disabled={isLoading}
            sx={{ mt: 2 }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Create Quiz'}
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}