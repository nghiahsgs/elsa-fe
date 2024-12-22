import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuthStore } from '../store/authStore';
import { useQuizStore } from '../store/quizStore';
import { Question } from '../types';

export default function CreateQuiz() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const createQuiz = useQuizStore(state => state.createQuiz);
  const [isClient, setIsClient] = useState(false);
  const [questions, setQuestions] = useState<Partial<Question>[]>([{
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
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleCreateQuiz = () => {
    if (!user) return;
    
    const validQuestions = questions.filter(q => 
      q.text && q.options?.every(opt => opt.trim() !== '')
    ) as Question[];
    
    if (validQuestions.length > 0) {
      const quizCode = createQuiz(user.id, validQuestions.map((q, i) => ({
        ...q,
        id: i.toString()
      })));
      router.push('/quiz-lobby/' + quizCode);
    }
  };

  if (!isClient || !user) {
    return null;
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 4 }}>Create Quiz</Typography>
        
        {questions.map((question, qIndex) => (
          <Box key={qIndex} sx={{ mb: 4, p: 3, border: '1px solid #ddd', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Question {qIndex + 1}</Typography>
              {questions.length > 1 && (
                <IconButton onClick={() => handleRemoveQuestion(qIndex)}>
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>

            <TextField
              fullWidth
              label="Question"
              value={question.text}
              onChange={(e) => {
                const newQuestions = [...questions];
                newQuestions[qIndex] = { ...question, text: e.target.value };
                setQuestions(newQuestions);
              }}
              sx={{ mb: 2 }}
            />

            <FormControl component="fieldset">
              <RadioGroup
                value={question.correctAnswer}
                onChange={(e) => {
                  const newQuestions = [...questions];
                  newQuestions[qIndex] = { ...question, correctAnswer: Number(e.target.value) };
                  setQuestions(newQuestions);
                }}
              >
                {question.options?.map((option, oIndex) => (
                  <Box key={oIndex} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormControlLabel
                      value={oIndex}
                      control={<Radio />}
                      label=""
                    />
                    <TextField
                      fullWidth
                      label={`Option ${oIndex + 1}`}
                      value={option}
                      onChange={(e) => {
                        const newQuestions = [...questions];
                        newQuestions[qIndex].options![oIndex] = e.target.value;
                        setQuestions(newQuestions);
                      }}
                      sx={{ mb: 1 }}
                    />
                  </Box>
                ))}
              </RadioGroup>
            </FormControl>
          </Box>
        ))}

        <Button
          startIcon={<AddIcon />}
          onClick={handleAddQuestion}
          variant="outlined"
          sx={{ mb: 2 }}
        >
          Add Question
        </Button>

        <Button
          fullWidth
          variant="contained"
          onClick={handleCreateQuiz}
          disabled={questions.length === 0}
        >
          Create Quiz
        </Button>
      </Box>
    </Container>
  );
}