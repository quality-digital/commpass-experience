import { useState, useEffect, useCallback, useRef } from "react";
import { fmtPts } from "@/lib/utils";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Globe } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { fireConfetti } from "@/lib/confetti";
import { supabase } from "@/integrations/supabase/client";
import { FaApple, FaAndroid, FaInstagram, FaFacebookF, FaTiktok, FaYoutube, FaLinkedinIn } from "react-icons/fa6";

type Phase = "loading" | "intro" | "playing" | "result" | "completed";

type QuizData = {
  id: string;
  slug: string;
  title: string;
  description: string;
  max_points: number;
  time_per_question: number;
  benefit_title: string | null;
  benefit_description: string | null;
  benefit_url: string | null;
  benefit_coupon: string | null;
  website_url: string | null;
  app_ios_url: string | null;
  app_android_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  linkedin_url: string | null;
  questions: { question: string; options: string[]; correct_index: number }[];
};

type CompletedQuizData = {
  score: number;
};

const QuizPage = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { profile, completeQuiz, refreshProfile, getCompletedQuizzes } = useUser();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [totalPoints, setTotalPoints] = useState(0);
  const [completedData, setCompletedData] = useState<CompletedQuizData | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!quizId) return;
      const { data: quizData } = await supabase.from("quizzes").select("*").eq("id", quizId).single();
      if (!quizData) { navigate("/missions"); return; }

      const { data: questions } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("sort_order");

      // Check completion from backend
      const completedQuizzes = await getCompletedQuizzes();
      const alreadyDone = completedQuizzes.includes(quizId);

      const quizParsed: QuizData = {
        ...quizData,
        questions: (questions || []).map((q) => ({
          question: q.question,
          options: q.options as string[],
          correct_index: q.correct_index,
        })),
      };
      setQuiz(quizParsed);

      if (alreadyDone) {
        // Fetch saved score
        const userId = (await supabase.auth.getUser()).data.user?.id;
        const { data: userQuiz } = await supabase
          .from("user_quizzes")
          .select("score")
          .eq("quiz_id", quizId)
          .eq("user_id", userId!)
          .maybeSingle();
        setCompletedData({ score: userQuiz?.score ?? 0 });
        setTotalPoints(userQuiz?.score ?? 0);
        setPhase("completed");
      } else {
        setPhase("intro");
      }
    };
    load();
  }, [quizId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTimeout = useCallback(() => {
    if (!showFeedback) {
      setShowFeedback(true);
    }
  }, [showFeedback]);

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
  };

  const nextQuestion = () => {
    if (currentQ < quiz.questions.length - 1) {
      setCurrentQ((p) => p + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setTimeLeft(quiz.time_per_question);
    } else {
      // Persist completion IMMEDIATELY before showing result
      handleFinish();
    }
  };

  const handleFinish = async () => {
    // Double-check backend to prevent duplicate completion
    const completedQuizzes = await getCompletedQuizzes();
    if (completedQuizzes.includes(quiz.id)) {
      // Already completed - just show result without adding points
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data: userQuiz } = await supabase
        .from("user_quizzes")
        .select("score")
        .eq("quiz_id", quiz.id)
        .eq("user_id", userId!)
        .maybeSingle();
      setCompletedData({ score: userQuiz?.score ?? totalPoints });
      setTotalPoints(userQuiz?.score ?? totalPoints);
      setPhase("completed");
      return;
    }
    const finalPoints = totalPoints;

    // Complete quiz mission with actual score via dedicated RPC
    const { data: mission } = await supabase.from("missions").select("id").eq("slug", quiz.slug).maybeSingle();
    if (mission) {
      const { data: result } = await supabase.rpc("complete_quiz_mission", {
        p_mission_id: mission.id,
        p_score: finalPoints,
      });
      const r = result as any;
      if (r?.points_awarded !== undefined) {
        // Use actual points from backend
      }
    }

    // Record quiz completion
    await completeQuiz(quiz.id, finalPoints);
    await refreshProfile();

    setCompletedData({ score: finalPoints });
    setPhase("result");
    setTimeout(() => fireConfetti(), 400);
  };

  // COMPLETED phase - quiz already done, show benefit access
  if (phase === "completed") {
    const hasBenefit = quiz.benefit_title || quiz.benefit_coupon;
    return (
      <div className="min-h-screen flex flex-col items-center px-6 py-12 bg-background">
        <button onClick={() => navigate("/missions")} className="self-start mb-6 text-muted-foreground"><ChevronLeft size={24} /></button>
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-300 to-green-200 flex items-center justify-center text-4xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Você já concluiu este quiz</h1>
        <p className="text-muted-foreground text-sm mb-6 text-center">Este quiz só pode ser realizado uma vez.</p>
        
        <div className="p-6 rounded-2xl border border-border bg-card w-full max-w-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-200 to-green-100 flex items-center justify-center text-2xl">🏆</div>
            <div>
              <p className="text-xs text-green-600 uppercase font-bold tracking-wider">Quiz Concluído ✓</p>
              <p className="text-3xl font-extrabold text-primary">{fmtPts(totalPoints)}<span className="text-lg">pts</span></p>
            </div>
          </div>
          {hasBenefit && (
            <>
              <div className="border-t border-border my-4" />
              <BenefitSection quiz={quiz} />
            </>
          )}
        </div>
        <ChannelsSection quiz={quiz} />
        <button onClick={() => navigate("/missions")} className="w-full max-w-sm py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button mt-6">Voltar para missões</button>
      </div>
    );
  }

  if (phase === "intro") {
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
              <p>🚫 Apenas uma tentativa</p>
              <p>🏆 Até {fmtPts(quiz.max_points)} pontos de recompensa</p>
              <p>✅ Somente respostas corretas contabilizam pontos</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6 w-full">
            <div className="p-3 rounded-xl border border-border text-center">
              <p className="text-2xl font-bold text-foreground">{quiz.questions.length}</p>
              <p className="text-xs text-muted-foreground">Perguntas</p>
            </div>
            <div className="p-3 rounded-xl border border-border text-center">
              <p className="text-2xl font-bold text-primary">{fmtPts(quiz.max_points)}+</p>
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
    const hasBenefit = quiz.benefit_title || quiz.benefit_coupon;
    return (
      <div className="min-h-screen flex flex-col items-center px-6 py-12 bg-background">
        <button onClick={() => navigate("/missions")} className="self-start mb-6 text-muted-foreground"><ChevronLeft size={24} /></button>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 rounded-3xl bg-gradient-to-br from-green-300 to-green-200 flex items-center justify-center text-5xl mb-4">⭐</motion.div>
        <h1 className="text-2xl font-bold text-foreground mb-6">Missão Completa!</h1>
        <div className="p-6 rounded-2xl border border-border bg-card w-full max-w-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-200 to-green-100 flex items-center justify-center text-2xl">🏆</div>
            <div>
              <p className="text-xs text-green-600 uppercase font-bold tracking-wider">Quiz Concluído ✓</p>
              <p className="text-3xl font-extrabold text-primary">{fmtPts(totalPoints)}<span className="text-lg">pts</span></p>
            </div>
          </div>
          {hasBenefit && (
            <>
              <div className="border-t border-border my-4" />
              <BenefitSection quiz={quiz} />
            </>
          )}
        </div>
        <ChannelsSection quiz={quiz} />
        <button onClick={() => navigate("/missions")} className="w-full max-w-sm py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button mt-6">Retornar para lista de missões</button>
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
        <button onClick={nextQuestion} className="w-full py-4 rounded-2xl gradient-cta text-primary-foreground font-bold text-lg shadow-button mt-4">
          {currentQ < quiz.questions.length - 1 ? "Próxima →" : "Ver Resultado"}
        </button>
      )}
    </div>
  );
};

// Collapsible description component
const CollapsibleDescription = ({ text }: { text: string }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    // Compare scrollHeight vs 6-line max height
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const maxHeight = lineHeight * 6;
    setIsOverflowing(el.scrollHeight > maxHeight + 2);
  }, [text]);

  const paragraphs = text.split(/\n+/).filter(Boolean);

  return (
    <div>
      <div
        ref={contentRef}
        className="text-xs text-muted-foreground mt-1 overflow-hidden transition-all duration-300"
        style={{
          maxHeight: expanded ? "none" : "calc(1.6em * 6)",
          lineHeight: "1.6",
          textAlign: "justify",
        }}
      >
        {paragraphs.map((p, i) => (
          <p key={i} className={i < paragraphs.length - 1 ? "mb-2" : ""}>{p}</p>
        ))}
      </div>
      {isOverflowing && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold text-primary mt-1.5 hover:underline"
        >
          {expanded ? "Mostrar menos" : "Mostrar mais"}
        </button>
      )}
    </div>
  );
};

// Shared benefit section component
const BenefitSection = ({ quiz }: { quiz: QuizData }) => (
  <>
    <div className="flex items-start gap-2 mb-2">
      <span className="text-lg">🎁</span>
      <div>
        {quiz.benefit_title && <p className="font-bold text-foreground text-sm">{quiz.benefit_title}</p>}
        {quiz.benefit_description && <CollapsibleDescription text={quiz.benefit_description} />}
      </div>
    </div>
    {quiz.benefit_coupon && (
      <div className="flex items-center border border-border rounded-xl mt-3 overflow-hidden">
        <span className="flex-1 px-4 py-3 font-mono font-bold text-foreground tracking-widest text-sm">{quiz.benefit_coupon}</span>
        <button onClick={() => { navigator.clipboard.writeText(quiz.benefit_coupon!); import("@/hooks/use-toast").then(m => m.toast({ title: "Cupom copiado!" })); }} className="px-4 py-3 text-primary font-semibold text-sm flex items-center gap-1 border-l border-border">📋 Copiar</button>
      </div>
    )}
    {quiz.benefit_url && (
      <a href={quiz.benefit_url} target="_blank" rel="noopener noreferrer" className="w-full mt-4 py-3 rounded-xl gradient-cta text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2">
        🔗 Resgatar benefício
      </a>
    )}
  </>
);

// Channel links section
const CHANNEL_CONFIG: { key: keyof QuizData; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "website_url", label: "Site", icon: <Globe size={22} />, color: "text-muted-foreground" },
  { key: "app_ios_url", label: "App iOS", icon: <FaApple size={22} />, color: "text-foreground" },
  { key: "app_android_url", label: "App Android", icon: <FaAndroid size={22} />, color: "text-[#3DDC84]" },
  { key: "instagram_url", label: "Instagram", icon: <FaInstagram size={22} />, color: "text-[#E4405F]" },
  { key: "facebook_url", label: "Facebook", icon: <FaFacebookF size={22} />, color: "text-[#1877F2]" },
  { key: "tiktok_url", label: "TikTok", icon: <FaTiktok size={22} />, color: "text-foreground" },
  { key: "youtube_url", label: "YouTube", icon: <FaYoutube size={22} />, color: "text-[#FF0000]" },
  { key: "linkedin_url", label: "LinkedIn", icon: <FaLinkedinIn size={22} />, color: "text-[#0A66C2]" },
];

const ChannelsSection = ({ quiz }: { quiz: QuizData }) => {
  const channels = CHANNEL_CONFIG.filter((c) => quiz[c.key]);
  if (channels.length === 0) return null;

  return (
    <div className="w-full max-w-sm mt-4">
      <div className="p-5 rounded-2xl border border-border bg-card">
        <p className="text-sm font-bold text-foreground mb-3">Conheça mais sobre a marca</p>
        <div className="flex flex-wrap gap-3 justify-center">
          {channels.map((c) => (
            <a
              key={c.key}
              href={quiz[c.key] as string}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border hover:bg-secondary/50 transition-colors min-w-[72px] ${c.color}`}
            >
              {c.icon}
              <span className="text-[10px] text-muted-foreground font-medium">{c.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
