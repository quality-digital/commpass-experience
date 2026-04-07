import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";

type Phase = "loading" | "intro" | "playing" | "result";

type QuizData = {
  id: string;
  slug: string;
  title: string;
  description: string;
  max_points: number;
  time_per_question: number;
  questions: { question: string; options: string[]; correct_index: number; explanation: string }[];
};

const QuizPage = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { profile, addPoints, completeQuiz, completeMission, getCompletedQuizzes } = useUser();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [totalPoints, setTotalPoints] = useState(0);
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!quizId) return;
      const { data: quizData } = await supabase.from("quizzes").select("*").eq("id", quizId).single();
      if (!quizData) { navigate("/missions"); return; }

      const { data: questions } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("sort_order");

      const completedQuizzes = await getCompletedQuizzes();
      setAlreadyDone(completedQuizzes.includes(quizId));

      setQuiz({
        ...quizData,
        questions: (questions || []).map((q) => ({
          question: q.question,
          options: q.options as string[],
          correct_index: q.correct_index,
          explanation: q.explanation,
        })),
      });
      setPhase("intro");
    };
    load();
  }, [quizId]);

  const handleTimeout = useCallback(() => {
    if (!showFeedback) {
      setShowFeedback(true);
      setTimeout(() => nextQuestion(), 2000);
    }
  }, [showFeedback, currentQ]);

  useEffect(() => {
    if (phase !== "playing" || showFeedback || !quiz) return;
    if (timeLeft <= 0) { handleTimeout(); return; }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, phase, showFeedback, handleTimeout]);

  if (phase === "loading" || !quiz || !profile) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  const question = quiz.questions[currentQ];
  const isCorrect = selectedAnswer === question?.correct_index;

  const handleAnswer = (index: number) => {
    if (showFeedback) return;
    setSelectedAnswer(index);
    setShowFeedback(true);
    if (index === question.correct_index) {
      setScore((p) => p + 1);
      setTotalPoints((p) => p + 60);
    }
    setTimeout(() => nextQuestion(), 2000);
  };

  const nextQuestion = () => {
    if (currentQ < quiz.questions.length - 1) {
      setCurrentQ((p) => p + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setTimeLeft(quiz.time_per_question);
    } else {
      setPhase("result");
    }
  };

  const handleFinish = async () => {
    await addPoints(totalPoints);
    await completeQuiz(quiz.id, totalPoints);
    // Also complete the mission linked to this quiz
    const { data: mission } = await supabase.from("missions").select("id").eq("slug", quiz.slug).single();
    if (mission) await completeMission(mission.id);
    navigate("/missions");
  };

  if (phase === "intro") {
    if (alreadyDone) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
          <p className="text-xl font-bold text-foreground mb-4">Quiz já realizado!</p>
          <p className="text-muted-foreground text-sm mb-6">Você só pode responder uma vez.</p>
          <button onClick={() => navigate("/missions")} className="px-6 py-3 rounded-xl gradient-cta text-primary-foreground font-semibold">Voltar</button>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col px-6 py-8 bg-background">
        <button onClick={() => navigate(-1)} className="text-muted-foreground mb-6"><ChevronLeft size={24} /></button>
        <div className="flex-1 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-200 to-rose-100 flex items-center justify-center text-4xl mb-4">🧠</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{quiz.title}</h1>
          <p className="text-muted-foreground text-sm mb-8">{quiz.description}</p>
          <div className="w-full p-4 rounded-xl border border-border mb-6">
            <h3 className="font-bold text-foreground text-sm mb-3">Regras do Quiz</h3>
            <div className="space-y-2 text-left text-xs text-muted-foreground">
              <p>⏱️ {quiz.time_per_question} segundos por pergunta</p>
              <p>⚡ Resposta rápida = mais pontos</p>
              <p>🚫 Apenas uma tentativa</p>
              <p>🏆 Até {quiz.max_points} pontos de recompensa</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6 w-full">
            <div className="p-3 rounded-xl border border-border text-center">
              <p className="text-2xl font-bold text-foreground">{quiz.questions.length}</p>
              <p className="text-xs text-muted-foreground">Perguntas</p>
            </div>
            <div className="p-3 rounded-xl border border-border text-center">
              <p className="text-2xl font-bold text-primary">{quiz.max_points}+</p>
              <p className="text-xs text-muted-foreground">Pontos</p>
            </div>
          </div>
          <div className="w-full p-4 rounded-xl bg-destructive/5 border border-destructive/20 text-left mb-6">
            <p className="text-xs font-bold text-destructive uppercase mb-2">⚠️ Atenção antes de começar</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Se sair ou fechar o app durante o quiz, os pontos não serão contabilizados.</li>
              <li>• Não é possível refazer o quiz! Você tem apenas uma tentativa.</li>
              <li>• Mantenha a tela ativa até ver a tela de resultado final.</li>
            </ul>
          </div>
        </div>
        <button onClick={() => { setPhase("playing"); setTimeLeft(quiz.time_per_question); }} className="w-full py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button flex items-center justify-center gap-2">
          ⚡ Iniciar Quiz
        </button>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-200 to-yellow-100 flex items-center justify-center text-5xl mb-4">⭐</motion.div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Missão completada!</h1>
        <div className="p-6 rounded-2xl bg-card shadow-card text-center my-6 w-full max-w-xs">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">🧠</span>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Quiz Concluído ✓</p>
              <p className="text-3xl font-extrabold text-primary">{totalPoints}<span className="text-lg">pts</span></p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{score}/{quiz.questions.length} acertos</p>
        </div>
        <button onClick={handleFinish} className="w-full max-w-xs py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button">Retornar para lista de missões</button>
      </div>
    );
  }

  // Playing
  const progressPercent = ((currentQ + 1) / quiz.questions.length) * 100;
  const timePercent = (timeLeft / quiz.time_per_question) * 100;

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-background">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-2 rounded-full bg-secondary">
          <div className="h-full rounded-full gradient-primary transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="text-xs text-muted-foreground font-mono">{currentQ + 1}/{quiz.questions.length}</span>
      </div>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm">⏱️</span>
        <div className="flex-1 h-2 rounded-full bg-secondary">
          <div className={`h-full rounded-full transition-all ${timePercent > 30 ? "bg-gradient-to-r from-amber-400 to-yellow-400" : "bg-destructive"}`} style={{ width: `${timePercent}%` }} />
        </div>
        <span className={`text-sm font-bold ${timeLeft <= 5 ? "text-destructive" : "text-muted-foreground"}`}>{timeLeft}</span>
      </div>
      <p className="text-sm font-semibold text-muted-foreground mb-2">Pergunta {currentQ + 1}</p>
      <div className="p-5 rounded-2xl border border-border mb-6">
        <p className="font-bold text-foreground text-lg">{question.question}</p>
      </div>
      <div className="space-y-3 flex-1">
        {question.options.map((option: string, idx: number) => {
          const letter = String.fromCharCode(65 + idx);
          let style = "bg-card border border-border";
          if (showFeedback) {
            if (idx === question.correct_index) style = "bg-green-50 border-2 border-green-400";
            else if (idx === selectedAnswer && !isCorrect) style = "bg-red-50 border-2 border-red-400";
          } else if (idx === selectedAnswer) {
            style = "bg-primary/10 border-2 border-primary";
          }
          return (
            <motion.button key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} onClick={() => handleAnswer(idx)} disabled={showFeedback} className={`w-full p-4 rounded-xl flex items-center gap-3 text-left transition-all ${style}`}>
              <span className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                {showFeedback && idx === question.correct_index ? "✓" : showFeedback && idx === selectedAnswer && !isCorrect ? "✗" : letter}
              </span>
              <span className="text-sm font-medium text-foreground">{option}</span>
            </motion.button>
          );
        })}
      </div>
      {showFeedback && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-xl mt-4 ${isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          <p className="text-sm text-foreground">💡 {question.explanation}</p>
        </motion.div>
      )}
      {showFeedback && (
        <button onClick={nextQuestion} className="w-full py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button mt-4">
          {currentQ < quiz.questions.length - 1 ? "Próxima →" : "Ver Resultado"}
        </button>
      )}
    </div>
  );
};

export default QuizPage;
