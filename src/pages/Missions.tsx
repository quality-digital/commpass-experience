import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Check, QrCode, Upload, Play, Clock, Camera, Zap, Lock, AlertTriangle, RefreshCw } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { toast } from "@/hooks/use-toast";
import { sanitizeSupabaseError } from "@/lib/sanitizeError";
import { fireConfetti } from "@/lib/confetti";

type MissionType = "digital" | "presencial" | "quiz" | "social";

const typeColors: Record<string, string> = {
  digital: "text-blue-500 border-blue-200 bg-blue-50",
  presencial: "text-amber-600 border-amber-200 bg-amber-50",
  quiz: "text-red-500 border-red-200 bg-red-50",
  social: "text-green-600 border-green-200 bg-green-50",
};

const difficultyColors: Record<string, string> = {
  "fácil": "bg-green-100 text-green-700",
  "médio": "bg-amber-100 text-amber-700",
  "difícil": "bg-red-100 text-red-700",
};

type CompletedMission = {
  id: string;
  mission_id: string;
  status: string;
  photo_url?: string;
  rejection_note?: string;
};

const Missions = () => {
  const { profile, addPoints, getCompletedMissions } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get("filter") || "all";
  const [filter, setFilter] = useState<"all" | string>(initialFilter);
  const [qrInput, setQrInput] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState("");
  const [missions, setMissions] = useState<any[]>([]);
  const [completedMissions, setCompletedMissions] = useState<CompletedMission[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<any>(null);
  const [goldenPassMinPoints, setGoldenPassMinPoints] = useState(400);
  const [goldenPassRedeemedValue, setGoldenPassRedeemedValue] = useState<number | null>(null);
  const [quizScores, setQuizScores] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const load = async () => {
      const { data: sess } = await supabase.auth.getSession();
      setSession(sess.session);

      const [missionsRes, settingsRes, quizzesMetaRes] = await Promise.all([
        supabase.from("missions").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("app_settings").select("key, value").eq("key", "golden_pass_min_points").maybeSingle(),
        supabase.from("quizzes").select("slug, benefit_title, benefit_url, benefit_coupon"),
      ]);
      // Enrich quiz missions with benefit info
      const benefitMap = new Map<string, boolean>();
      quizzesMetaRes.data?.forEach((q: any) => {
        benefitMap.set(q.slug, !!(q.benefit_title || q.benefit_url || q.benefit_coupon));
      });
      if (missionsRes.data) {
        setMissions(missionsRes.data.map((m: any) => ({
          ...m,
          _hasBenefit: m.action === "quiz" ? (benefitMap.get(m.slug) || false) : false,
        })));
      }
      if (settingsRes.data) setGoldenPassMinPoints(Number(settingsRes.data.value));

      if (sess.session?.user) {
        const [completedRes, redemptionRes, quizzesRes] = await Promise.all([
          supabase
            .from("user_missions")
            .select("id, mission_id, status, photo_url")
            .eq("user_id", sess.session.user.id),
          supabase
            .from("golden_pass_redemptions")
            .select("value")
            .eq("user_id", sess.session.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("user_quizzes")
            .select("quiz_id, score")
            .eq("user_id", sess.session.user.id),
        ]);
        
        // Build quiz score map: quiz_id → score
        if (quizzesRes.data) {
          const scoreMap = new Map<string, number>();
          // We need to map quiz_id to mission via slug match
          // Fetch quizzes to get slug mapping
          const { data: quizData } = await supabase.from("quizzes").select("id, slug");
          if (quizData && missionsRes.data) {
            const quizSlugMap = new Map(quizData.map(q => [q.id, q.slug]));
            const missionBySlug = new Map(missionsRes.data.map((m: any) => [m.slug, m.id]));
            quizzesRes.data.forEach(uq => {
              const slug = quizSlugMap.get(uq.quiz_id);
              if (slug) {
                const missionId = missionBySlug.get(slug);
                if (missionId) scoreMap.set(missionId, uq.score);
              }
            });
          }
          setQuizScores(scoreMap);
        }
        
        let completedData = (completedRes.data || []) as CompletedMission[];
        
        // Fetch rejection notes for rejected missions
        const rejectedIds = completedData.filter(c => c.status === "rejected").map(c => c.id);
        if (rejectedIds.length > 0) {
          const { data: auditData } = await supabase
            .from("approval_audit_log")
            .select("user_mission_id, notes, created_at")
            .in("user_mission_id", rejectedIds)
            .eq("new_status", "rejected")
            .order("created_at", { ascending: false });
          
          if (auditData) {
            const noteMap = new Map<string, string>();
            auditData.forEach(a => {
              if (!noteMap.has(a.user_mission_id) && a.notes) {
                noteMap.set(a.user_mission_id, a.notes);
              }
            });
            completedData = completedData.map(c => ({
              ...c,
              rejection_note: noteMap.get(c.id),
            }));
          }
        }
        
        setCompletedMissions(completedData);
        if (redemptionRes.data) setGoldenPassRedeemedValue(redemptionRes.data.value);
      }
    };
    load();
  }, []);

  if (!profile) return null;

  const getMissionStatus = (missionId: string): string | null => {
    const found = completedMissions.find((c) => c.mission_id === missionId);
    return found?.status || null;
  };

  const isCompleted = (missionId: string) => {
    const status = getMissionStatus(missionId);
    return status === "completed" || status === "approved";
  };

  const isPending = (missionId: string) => getMissionStatus(missionId) === "pending_approval";

  const isRejected = (missionId: string) => getMissionStatus(missionId) === "rejected";

  const getRejectionNote = (missionId: string): string | undefined => {
    const found = completedMissions.find((c) => c.mission_id === missionId);
    return found?.rejection_note;
  };

  const getCompletedMissionRecord = (missionId: string): CompletedMission | undefined => {
    return completedMissions.find((c) => c.mission_id === missionId);
  };

  const completedCount = completedMissions.filter((c) => c.status === "completed" || c.status === "approved").length;
  const available = missions.filter((m) => !isCompleted(m.id) && !isPending(m.id)).length;
  const totalPossiblePoints = missions.reduce((sum, m) => sum + (m.points || 0), 0);
  const filteredRaw = filter === "all" ? missions : missions.filter((m) => m.type === filter);
  // Sort: incomplete missions first, completed last, preserving admin sort_order within each group
  const filtered = [...filteredRaw].sort((a, b) => {
    const aDone = isCompleted(a.id) ? 1 : 0;
    const bDone = isCompleted(b.id) ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  const filters = [
    { key: "all", label: "Todas" },
    { key: "presencial", label: "Presencial", dot: "bg-amber-400" },
    { key: "digital", label: "Digital", dot: "bg-blue-400" },
    { key: "quiz", label: "Quiz", dot: "bg-red-400" },
    { key: "social", label: "Social", dot: "bg-green-400" },
  ];

  // Determine what action button to show based on mission type/action
  const handleAction = async (mission: any) => {
    const action = mission.action;
    const slug = mission.slug;

    if (action === "quiz") {
      // Navigate to quiz
      const { data: quiz } = await supabase.from("quizzes").select("id").eq("slug", slug).single();
      if (quiz) navigate(`/quiz/${quiz.id}`);
      else toast({ title: "Quiz não encontrado", variant: "destructive" });
    } else if (action === "qr-camera") {
      // Navigate to dedicated scanner page (e.g. Easter Egg Presencial)
      if (slug === "easter-egg-presencial") {
        navigate("/easter-egg-presencial");
      }
    } else if (action === "qr") {
      // Open QR code input dialog
      setQrInput(mission.id);
    } else if (action === "upload") {
      // Open file picker for photo upload (approval-based missions)
      setUploading(mission.id);
      fileInputRef.current?.click();
    } else if (action === "video") {
      // Navigate to brands page with the correct brand tab and video focus
      const brandSlug = slug.replace("video-", "");
      navigate(`/brands?tab=${brandSlug}&video=true`);
    } else if (action === "social") {
      // Navigate to brands page with the correct brand tab
      const brandSlug = slug.replace("social-", "");
      navigate(`/brands?tab=${brandSlug}`);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploading || !session?.user) return;

    const ext = file.name.split(".").pop();
    const path = `${session.user.id}/${uploading}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("mission-photos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Erro ao enviar foto", description: sanitizeSupabaseError(uploadError), variant: "destructive" });
      setUploading(null);
      return;
    }

    const { data: publicUrl } = supabase.storage.from("mission-photos").getPublicUrl(path);

    // Check if there's an existing rejected record to update
    const existingRecord = uploading ? getCompletedMissionRecord(uploading) : null;
    
    if (existingRecord && existingRecord.status === "rejected") {
      // Re-submission: update existing record
      await supabase.from("user_missions")
        .update({ status: "pending_approval", photo_url: publicUrl.publicUrl })
        .eq("id", existingRecord.id);
      
      setCompletedMissions((prev) =>
        prev.map((c) => c.id === existingRecord.id 
          ? { ...c, status: "pending_approval", photo_url: publicUrl.publicUrl, rejection_note: undefined }
          : c
        )
      );
    } else {
      // New submission
      const { data: inserted } = await supabase.from("user_missions").insert({
        user_id: session.user.id,
        mission_id: uploading,
        status: "pending_approval",
        photo_url: publicUrl.publicUrl,
      }).select("id").single();

      setCompletedMissions((prev) => [
        ...prev,
        { id: inserted?.id || "", mission_id: uploading, status: "pending_approval", photo_url: publicUrl.publicUrl },
      ]);
    }

    fireConfetti();
    toast({ title: "📸 Foto enviada!", description: "Aguardando aprovação de um administrador." });
    setUploading(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleQrSubmit = async () => {
    if (!qrCode.trim() || !qrInput || !session?.user) return;

    const mission = missions.find((m) => m.id === qrInput);
    if (!mission) return;

    const { data: inserted } = await supabase.from("user_missions").insert({
      user_id: session.user.id,
      mission_id: qrInput,
      status: "completed",
    }).select("id").single();

    await addPoints(mission.points);
    setCompletedMissions((prev) => [...prev, { id: inserted?.id || "", mission_id: qrInput, status: "completed" }]);
    fireConfetti();
    toast({ title: "🎉 Missão concluída!", description: `+${mission.points} pontos conquistados!` });

    setQrInput(null);
    setQrCode("");
  };

  const getActionButton = (mission: any) => {
    const completed = isCompleted(mission.id);
    const pending = isPending(mission.id);
    const rejected = isRejected(mission.id);

    if (completed) {
      // For quiz missions, show "Consultar benefício" only if quiz has a benefit
      if (mission.action === "quiz") {
        return (
          <button onClick={async () => {
            const { data: quizData } = await supabase.from("quizzes").select("id, benefit_title, benefit_url, benefit_coupon").eq("slug", mission.slug).single();
            if (quizData && (quizData.benefit_title || quizData.benefit_url || quizData.benefit_coupon)) {
              navigate(`/quiz/${quizData.id}`);
            }
          }} className={`flex items-center gap-1 text-xs font-semibold ${mission._hasBenefit ? "text-primary" : "text-muted-foreground"}`}>
            {mission._hasBenefit ? "🎁 Consultar benefício" : "Concluída ✓"}
          </button>
        );
      }
      return <span className="text-xs text-muted-foreground">Concluída ✓</span>;
    }
    if (pending) return (
      <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
        <Clock size={12} /> Aguardando Aprovação
      </span>
    );
    if (rejected && mission.action === "upload") {
      return (
        <button onClick={() => { setUploading(mission.id); fileInputRef.current?.click(); }} className="flex items-center gap-1 text-xs font-semibold text-destructive">
          <RefreshCw size={14} /> Re-enviar Foto
        </button>
      );
    }

    // Auto-completed missions (cadastro simples, easter egg) - no button
    if (mission.slug === "cadastro-simples" || mission.slug === "easter-egg-avatar") {
      return <span className="text-xs text-muted-foreground/60">Automática</span>;
    }

    // Golden Pass: check if locked by points
    if (mission.slug === "golden-pass") {
      const isGoldenUnlocked = profile.points >= goldenPassMinPoints;
      if (!isGoldenUnlocked) {
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Lock size={12} /> {profile.points}/{goldenPassMinPoints} pts
          </span>
        );
      }
      return (
        <button onClick={() => navigate("/golden-pass")} className="flex items-center gap-1 text-xs font-semibold text-primary">
          <QrCode size={14} /> Ver Passe
        </button>
      );
    }

    // Cadastro completo: if user did quick registration, show button to complete profile
    if (mission.slug === "cadastro-completo") {
      if (profile.registration_type === "quick") {
        return (
          <button onClick={() => navigate("/profile")} className="flex items-center gap-1 text-xs font-semibold text-primary">
            Completar Cadastro →
          </button>
        );
      }
      return <span className="text-xs text-muted-foreground/60">Automática</span>;
    }

    if (!mission.action) return null;

    return (
      <button onClick={() => handleAction(mission)} className="flex items-center gap-1 text-xs font-semibold text-primary">
        {mission.action === "qr" && <QrCode size={14} />}
        {mission.action === "qr-camera" && <QrCode size={14} />}
        {mission.action === "upload" && <Camera size={14} />}
        {mission.action === "video" && <Play size={14} />}
        {mission.action === "quiz" && <span>⚡</span>}
        {mission.action_label}
      </button>
    );
  };

  return (
    <AppLayout>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="https://ygcduyegblolypsudwjq.supabase.co/storage/v1/object/public/brand-logos/quality-1775526968143.png" alt="Quality Digital" className="h-6 object-contain" />
          <div className="w-px h-5 bg-border" />
          <img src="https://ygcduyegblolypsudwjq.supabase.co/storage/v1/object/public/brand-logos/jitterbit-logo-1775527538784.png" alt="Jitterbit" className="h-6 object-contain" />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5">
          <Zap size={14} className="text-primary" />
          <span className="text-sm font-bold text-primary">{profile.points.toLocaleString("pt-BR")} pts</span>
        </div>
      </div>

      <div className="px-5">
        <h1 className="text-2xl font-bold text-foreground mb-1">Missões</h1>
        <p className="text-primary text-sm font-medium mb-6">Complete missões e acumule pontos</p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { value: completedCount, total: missions.length, label: "Completadas" },
            { value: profile.points, total: totalPossiblePoints, label: "Pontos ganhos" },
            { value: available, label: "Disponíveis" },
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-xl border border-border text-center">
              <p className="text-lg font-bold text-foreground">
                {stat.value}
                {stat.total !== undefined && <span className="text-xs text-muted-foreground font-normal">/{stat.total}</span>}
              </p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
          {filters.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${filter === f.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
              {f.dot && <span className={`w-2 h-2 rounded-full ${f.dot}`} />}
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-0">
          {filtered.map((mission, i) => {
            const completed = isCompleted(mission.id);
            const pending = isPending(mission.id);
            const rejected = isRejected(mission.id);
            const rejectionNote = getRejectionNote(mission.id);
            const isGoldenLocked = mission.slug === "golden-pass" && !completed && !pending && !rejected && profile.points < goldenPassMinPoints;
            return (
              <motion.div key={mission.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${completed ? "gradient-primary" : pending ? "bg-amber-100 border-2 border-amber-400" : rejected ? "bg-destructive/10 border-2 border-destructive/40" : isGoldenLocked ? "border-2 border-border bg-secondary" : "border-2 border-border bg-card"}`}>
                    {completed ? <Check size={14} className="text-primary-foreground" /> : pending ? <Clock size={12} className="text-amber-600" /> : rejected ? <AlertTriangle size={12} className="text-destructive" /> : isGoldenLocked ? <Lock size={12} className="text-muted-foreground" /> : <span className="text-[10px] font-bold text-muted-foreground">{i + 1}</span>}
                  </div>
                  {i < filtered.length - 1 && <div className="w-0.5 flex-1 bg-border min-h-[16px]" />}
                </div>

                <div className={`flex-1 p-4 rounded-2xl mb-3 ${completed ? "bg-card/60 opacity-60" : pending ? "bg-amber-50/50 border border-amber-200" : rejected ? "bg-destructive/5 border border-destructive/20" : isGoldenLocked ? "bg-secondary/50 border border-border" : "bg-card shadow-card"}`}>
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {completed && <span className="text-xs">✓</span>}
                      {mission.type.split(",").map((t: string) => (
                        <span key={t} className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeColors[t.trim()] || ""}`}>
                          {t.trim()}
                        </span>
                      ))}
                      {mission.location && <span className="text-[10px] text-muted-foreground">📍 {mission.location}</span>}
                    </div>
                    <span className={`font-bold text-xs ${isGoldenLocked ? "text-muted-foreground" : completed ? "text-primary/70" : "text-primary"}`}>
                      {(() => {
                        if (mission.slug === "golden-pass") {
                          if (completed && goldenPassRedeemedValue !== null) {
                            return `+${goldenPassRedeemedValue.toLocaleString("pt-BR")}/${mission.points.toLocaleString("pt-BR")}`;
                          }
                          return `Até ${mission.points.toLocaleString("pt-BR")}`;
                        }
                        if (completed) {
                          const earned = mission.type === "quiz" 
                            ? (quizScores.get(mission.id) ?? mission.points)
                            : mission.points;
                          return `+${earned.toLocaleString("pt-BR")}/${mission.points.toLocaleString("pt-BR")}`;
                        }
                        return `+${mission.points.toLocaleString("pt-BR")}`;
                      })()}
                    </span>
                  </div>
                  <h4 className={`font-bold text-sm mb-1 ${completed ? "text-muted-foreground line-through" : isGoldenLocked ? "text-muted-foreground" : "text-foreground"}`}>{mission.name}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{mission.description}</p>
                  
                  {/* Rejection warning */}
                  {rejected && (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 mb-2">
                      <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-destructive">Foto rejeitada</p>
                        {rejectionNote && <p className="text-xs text-destructive/80 mt-0.5">{rejectionNote}</p>}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${difficultyColors[mission.difficulty] || ""}`}>● {mission.difficulty}</span>
                    {getActionButton(mission)}
                  </div>
                  {isGoldenLocked && (
                    <div className="mt-2">
                      <div className="w-full h-1.5 rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${Math.min((profile.points / goldenPassMinPoints) * 100, 100)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {qrInput && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 px-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm p-6 rounded-2xl bg-card shadow-card">
            <h3 className="font-bold text-foreground text-lg mb-2">Inserir Código</h3>
            <p className="text-sm text-muted-foreground mb-4">Digite o código do QR Code ou insira manualmente</p>
            <input type="text" placeholder="Ex: VTEX2026" value={qrCode} onChange={(e) => setQrCode(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setQrInput(null); setQrCode(""); }} className="flex-1 py-3 rounded-xl border border-border text-muted-foreground font-semibold text-sm">Cancelar</button>
              <button onClick={handleQrSubmit} className="flex-1 py-3 rounded-xl gradient-cta text-primary-foreground font-semibold text-sm shadow-button">Confirmar</button>
            </div>
          </motion.div>
        </div>
      )}
    </AppLayout>
  );
};

export default Missions;
