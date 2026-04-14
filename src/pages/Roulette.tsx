import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Crown, RotateCcw, Loader2, Delete, CornerDownLeft, Zap, Gift } from "lucide-react";

// ── Types ──
type RouletteConfig = Record<string, string>;
type Prize = {
  id: string;
  label: string;
  value: number;
  weight: number;
  color: string;
  icon_url: string | null;
  sort_order: number;
};

type RouletteMode = "points" | "gifts";
type Step = "mode-select" | "email" | "wheel" | "result";

// ── Virtual Keyboard ──
const EMAIL_DOMAINS = ["gmail.com", "hotmail.com", "outlook.com", "live.com", "icloud.com"];

const VirtualKeyboard = ({
  value,
  onChange,
  onConfirm,
}: {
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
}) => {
  const [showNumbers, setShowNumbers] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (value.includes("@") && !value.includes("@.")) {
      const afterAt = value.split("@")[1] || "";
      if (afterAt && !afterAt.includes(".")) {
        setSuggestions(EMAIL_DOMAINS.filter((d) => d.startsWith(afterAt.toLowerCase())));
      } else if (!afterAt) {
        setSuggestions(EMAIL_DOMAINS);
      } else {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  }, [value]);

  const press = (char: string) => onChange(value + char);
  const backspace = () => onChange(value.slice(0, -1));

  const applySuggestion = (domain: string) => {
    const before = value.split("@")[0];
    onChange(`${before}@${domain}`);
    setSuggestions([]);
  };

  return (
    <div className="w-full space-y-2">
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center px-2">
          {suggestions.map((d) => (
            <button key={d} onClick={() => applySuggestion(d)} className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-sm font-medium hover:bg-white/30 transition-colors">
              @{d}
            </button>
          ))}
        </div>
      )}
      {showNumbers ? (
        <div className="flex flex-wrap justify-center gap-1.5 max-w-[420px] mx-auto">
          {["1","2","3","4","5","6","7","8","9","0"].map((char) => (
            <button key={char} onClick={() => press(char)} className="w-[38px] h-[42px] rounded-lg bg-white/15 text-white font-semibold text-lg hover:bg-white/25 active:bg-white/35 transition-colors flex items-center justify-center backdrop-blur-sm">{char}</button>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {[
            ["q","w","e","r","t","y","u","i","o","p"],
            ["a","s","d","f","g","h","j","k","l"],
            ["z","x","c","v","b","n","m"],
          ].map((row, ri) => (
            <div key={ri} className="flex justify-center gap-1.5 max-w-[420px] mx-auto">
              {row.map((char) => (
                <button key={char} onClick={() => press(char)} className="w-[38px] h-[42px] rounded-lg bg-white/15 text-white font-semibold text-lg hover:bg-white/25 active:bg-white/35 transition-colors flex items-center justify-center backdrop-blur-sm">{char}</button>
              ))}
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-center gap-1.5 max-w-[420px] mx-auto">
        <button onClick={() => setShowNumbers(!showNumbers)} className="px-4 h-[42px] rounded-lg bg-white/15 text-white font-semibold text-sm hover:bg-white/25 transition-colors">
          {showNumbers ? "ABC" : "123"}
        </button>
        <button onClick={() => press("@")} className="w-[42px] h-[42px] rounded-lg bg-white/15 text-white font-bold text-lg hover:bg-white/25 transition-colors flex items-center justify-center">@</button>
        <button onClick={() => press(".")} className="w-[42px] h-[42px] rounded-lg bg-white/15 text-white font-bold text-lg hover:bg-white/25 transition-colors flex items-center justify-center">.</button>
        <button onClick={() => press("_")} className="w-[42px] h-[42px] rounded-lg bg-white/15 text-white font-bold text-lg hover:bg-white/25 transition-colors flex items-center justify-center">_</button>
        <button onClick={() => press(" ")} className="flex-1 h-[42px] rounded-lg bg-white/15 text-white font-semibold text-sm hover:bg-white/25 transition-colors">espaço</button>
        <button onClick={backspace} className="w-[50px] h-[42px] rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors flex items-center justify-center"><Delete size={20} /></button>
        <button onClick={onConfirm} className="px-4 h-[42px] rounded-lg bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition-colors flex items-center justify-center gap-1"><CornerDownLeft size={16} /></button>
      </div>
    </div>
  );
};

// ── Spinning Wheel ──
const FONT_FAMILY = "'Plus Jakarta Sans', sans-serif";

const drawStarOutline = (ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number, lineWidth = 2) => {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerAngle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const innerAngle = outerAngle + Math.PI / 5;
    ctx.lineTo(cx + Math.cos(outerAngle) * outerR, cy + Math.sin(outerAngle) * outerR);
    ctx.lineTo(cx + Math.cos(innerAngle) * innerR, cy + Math.sin(innerAngle) * innerR);
  }
  ctx.closePath();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.stroke();
};

const drawCrown = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
  ctx.beginPath();
  const w = size;
  const h = size * 0.7;
  ctx.moveTo(cx - w / 2, cy + h / 2);
  ctx.lineTo(cx + w / 2, cy + h / 2);
  ctx.lineTo(cx + w / 2, cy - h / 4);
  ctx.lineTo(cx + w / 4, cy + h / 8);
  ctx.lineTo(cx, cy - h / 2);
  ctx.lineTo(cx - w / 4, cy + h / 8);
  ctx.lineTo(cx - w / 2, cy - h / 4);
  ctx.closePath();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.stroke();
  [cx - w / 4, cx, cx + w / 4].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, cy - h / 4 + 2, 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fill();
  });
};

const SpinningWheel = ({
  prizes,
  spinning,
  rotation,
  centerIconUrl,
}: {
  prizes: Prize[];
  spinning: boolean;
  rotation: number;
  centerIconUrl?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const count = prizes.length;
  const segAngle = 360 / count;

  const initialOffset = useMemo(() => {
    const idx = prizes.findIndex((p) => p.value >= 1000);
    if (idx < 0) return 0;
    const segCenter = idx * segAngle + segAngle / 2;
    return -segCenter;
  }, [prizes, segAngle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || count === 0) return;
    const ctx = canvas.getContext("2d")!;
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 6;

    ctx.clearRect(0, 0, size, size);

    prizes.forEach((prize, i) => {
      const startAngle = ((i * segAngle - 90) * Math.PI) / 180;
      const endAngle = (((i + 1) * segAngle - 90) * Math.PI) / 180;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.translate(center, center);
      const midAngle = startAngle + (endAngle - startAngle) / 2;
      ctx.rotate(midAngle + Math.PI / 2);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const isHighValue = prize.value >= 1000;

      if (isHighValue) {
        drawCrown(ctx, 0, -radius * 0.72, 22);
      } else {
        drawStarOutline(ctx, 0, -radius * 0.76, 16, 7, 3);
      }

      ctx.fillStyle = "white";
      const fontSize = prize.value >= 500 ? 30 : 24;
      ctx.font = `800 ${fontSize}px ${FONT_FAMILY}`;
      ctx.fillText(prize.label, 0, -radius * 0.56);

      ctx.font = `700 11px ${FONT_FAMILY}`;
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText("PONTOS", 0, -radius * 0.45);

      ctx.restore();
    });
  }, [prizes, count, segAngle]);

  return (
    <div className="relative w-full max-w-[420px] mx-auto px-4">
      <div className="relative w-full aspect-square">
        <div className="absolute inset-0 rounded-full p-3 bg-white shadow-[0_0_60px_rgba(255,255,255,0.15)]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20" style={{ marginTop: "-4px" }}>
            <div
              className="drop-shadow-lg"
              style={{
                width: 0,
                height: 0,
                borderLeft: "18px solid transparent",
                borderRight: "18px solid transparent",
                borderTop: "32px solid white",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
              }}
            />
          </div>
          <div
            className="transition-none rounded-full overflow-hidden w-full h-full"
            style={{
              transform: `rotate(${rotation + initialOffset}deg)`,
              transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
            }}
          >
            <canvas ref={canvasRef} width={500} height={500} className="w-full h-full" />
          </div>
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[22%] h-[22%] rounded-full flex items-center justify-center shadow-xl z-10 overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #0d1930 0%, #1a2d50 100%)",
              border: "5px solid white",
            }}
          >
            {centerIconUrl ? (
              <img src={centerIconUrl} alt="Logo" className="w-[60%] h-[60%] object-contain" />
            ) : (
              <span className="text-white font-black text-base">Q✦</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ──
const Roulette = () => {
  const [config, setConfig] = useState<RouletteConfig>({});
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("mode-select");
  const [mode, setMode] = useState<RouletteMode | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [qrData, setQrData] = useState<string>("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [recoveredSpin, setRecoveredSpin] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: cfgData }, { data: prizesData }] = await Promise.all([
        supabase.from("roulette_config").select("key, value"),
        supabase.from("roulette_prizes").select("*").eq("is_active", true).order("sort_order"),
      ]);
      if (cfgData) {
        const map: RouletteConfig = {};
        cfgData.forEach((r: any) => (map[r.key] = r.value));
        setConfig(map);
      }
      if (prizesData) setPrizes(prizesData as Prize[]);
      setLoading(false);
    };
    load();
  }, []);

  const cfg = useCallback((key: string, fallback = "") => config[key] || fallback, [config]);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim().toLowerCase());

  // ── Mode 1: Points – email validation + existing spin check ──
  const handleStartPoints = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!validateEmail(trimmed)) {
      setError("Por favor, insira um e-mail válido.");
      return;
    }
    setError("");
    setChecking(true);

    const { data: existing } = await supabase
      .from("roulette_spins")
      .select("*")
      .eq("email", trimmed)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      if ((existing as any).status === "redeemed") {
        setError("Você já utilizou sua participação. Obrigado!");
        setChecking(false);
        return;
      }
      const spin = existing as any;
      const qrPayload = JSON.stringify({
        id: spin.qr_id,
        email: spin.email,
        prize: spin.prize_label,
        value: spin.prize_value,
      });
      setWonPrize({ id: spin.id, label: spin.prize_label.replace(" Pontos", ""), value: spin.prize_value, weight: 0, color: "", icon_url: null, sort_order: 0 });
      setQrData(qrPayload);
      setRecoveredSpin(true);
      setStep("result");
      setChecking(false);
      return;
    }

    setChecking(false);
    setStep("wheel");
  };

  // ── Shared spin logic ──
  const spinWheel = async () => {
    if (spinning || prizes.length === 0) return;

    const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
    let rand = Math.random() * totalWeight;
    let selectedIdx = 0;
    for (let i = 0; i < prizes.length; i++) {
      rand -= prizes[i].weight;
      if (rand <= 0) {
        selectedIdx = i;
        break;
      }
    }
    const selected = prizes[selectedIdx];
    const segAngle = 360 / prizes.length;

    const idx1000 = prizes.findIndex((p) => p.value >= 1000);
    const initialOffset = idx1000 >= 0 ? -(idx1000 * segAngle + segAngle / 2) : 0;

    const segCenter = selectedIdx * segAngle + segAngle / 2;
    const targetAngle = 360 - segCenter - initialOffset;
    const fullSpins = 5 + Math.floor(Math.random() * 3);
    const finalRotation = fullSpins * 360 + targetAngle;

    setSpinning(true);
    setRotation((prev) => prev + finalRotation);

    await new Promise((r) => setTimeout(r, 4200));

    // ── Only persist for Points mode ──
    if (mode === "points") {
      const qrId = crypto.randomUUID();
      const trimmedEmail = email.trim().toLowerCase();

      await supabase.from("roulette_spins").insert({
        email: trimmedEmail,
        prize_label: `${selected.label} Pontos`,
        prize_value: selected.value,
        qr_id: qrId,
      });

      const qrPayload = JSON.stringify({
        id: qrId,
        email: trimmedEmail,
        prize: `${selected.label} Pontos`,
        value: selected.value,
      });
      setQrData(qrPayload);
    }

    setWonPrize(selected);
    setSpinning(false);
    setStep("result");
  };

  // ── Select mode ──
  const selectMode = (m: RouletteMode) => {
    setMode(m);
    if (m === "points") {
      setStep("email");
    } else {
      setStep("wheel");
    }
  };

  // ── Reset ──
  const resetSession = () => {
    setEmail("");
    setStep("mode-select");
    setMode(null);
    setWonPrize(null);
    setQrData("");
    setRotation(0);
    setError("");
    setSpinning(false);
    setRecoveredSpin(false);
  };

  // ── Gifts mode: spin again without going back to mode select ──
  const spinAgainGifts = () => {
    setWonPrize(null);
    setRotation(0);
    setStep("wheel");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#111b3d] to-[#0d1930] flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-white/50" />
      </div>
    );
  }

  const bgImage = cfg("background_image");
  const bgStyle = bgImage ? { backgroundImage: `url('${bgImage}')` } : { background: 'linear-gradient(180deg, #0a0e27, #111b3d, #0d1930)' };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat flex flex-col items-center overflow-hidden select-none" style={{ ...bgStyle, backgroundSize: 'cover' }}>
      {/* Logos */}
      <div className={`flex items-center justify-center gap-4 pt-4 pb-2 w-[80%] max-w-lg mx-auto ${step === "mode-select" ? "mt-[12vh]" : ""}`}>
        {cfg("logo_primary") ? (
          <img src={cfg("logo_primary")} alt="Logo" className="h-10 object-contain max-w-[45%]" />
        ) : (
          <span className="text-white font-bold text-xl">Comm Pass</span>
        )}
        {cfg("logo_secondary") && (
          <>
            <div className="w-px h-8 bg-white/30 shrink-0" />
            <img src={cfg("logo_secondary")} alt="Logo 2" className="h-10 object-contain max-w-[45%]" />
          </>
        )}
      </div>

      {/* ═══ MODE SELECT STEP ═══ */}
      {step === "mode-select" && (
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg px-6 pb-8">
          <h1 className="text-white text-3xl font-black tracking-wide text-center mb-2">
            {cfg("title", "ROLETA DE PRÊMIOS")}
          </h1>
          <p className="text-white/70 text-center text-sm mb-10">
            Escolha como deseja participar
          </p>

          {/* Decorative wheel background */}
          <div className="relative w-full flex flex-col items-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
              <SpinningWheel prizes={prizes} spinning={false} rotation={0} centerIconUrl={cfg("center_icon")} />
            </div>

            <div className="relative z-10 w-full space-y-4 max-w-sm mx-auto">
              <button
                onClick={() => selectMode("points")}
                className="w-full p-5 rounded-2xl bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow-lg hover:from-orange-500 hover:to-orange-700 transition-all flex items-center gap-4"
              >
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Zap size={28} className="text-white" />
                </div>
                <div className="text-left">
                  <span className="font-black text-lg block">Girar Roleta</span>
                  <span className="text-white/80 text-sm">Ganhe pontos no app + brinde</span>
                </div>
              </button>

              <button
                onClick={() => selectMode("gifts")}
                className="w-full p-5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-600 text-white shadow-lg hover:from-emerald-500 hover:to-teal-700 transition-all flex items-center gap-4"
              >
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Gift size={28} className="text-white" />
                </div>
                <div className="text-left">
                  <span className="font-black text-lg block">Roleta de Brindes</span>
                  <span className="text-white/80 text-sm">Ganhe brindes na hora</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EMAIL STEP (Points mode only) ═══ */}
      {step === "email" && mode === "points" && (
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg px-6 pb-8">
          <h1 className="text-white text-3xl font-black tracking-wide text-center mb-2">
            {cfg("title", "ROLETA DE PRÊMIOS")}
          </h1>
          <p className="text-white/70 text-center text-sm mb-8">
            {cfg("subtitle", "Preencha os dados do participante para liberar o jogo")}
          </p>

          <div className="relative w-full flex flex-col items-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-15 pointer-events-none">
              <SpinningWheel prizes={prizes} spinning={false} rotation={0} centerIconUrl={cfg("center_icon")} />
            </div>

            <div className="relative z-10 w-full space-y-4">
              <label className="text-white font-black text-sm tracking-wider block">
                {cfg("email_label", "E-MAIL")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleStartPoints(); }}
                placeholder={cfg("email_placeholder", "seu@email.com")}
                className="w-full bg-white rounded-xl px-4 py-3 text-lg text-gray-800 min-h-[48px] outline-none focus:ring-2 focus:ring-orange-400"
                autoComplete="email"
              />

              {error && <p className="text-red-400 text-sm text-center font-medium">{error}</p>}

              {cfg("virtual_keyboard_enabled", "true") === "true" && (
                <VirtualKeyboard value={email} onChange={setEmail} onConfirm={handleStartPoints} />
              )}

              <button
                onClick={handleStartPoints}
                disabled={checking}
                className="w-full py-4 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 text-white font-black text-lg tracking-wider shadow-lg hover:from-orange-500 hover:to-orange-700 disabled:opacity-50 transition-all"
              >
                {checking ? <Loader2 size={24} className="animate-spin mx-auto" /> : cfg("button_text", "ACESSAR ROLETA")}
              </button>

              <button onClick={resetSession} className="w-full py-2 text-white/50 text-sm font-medium hover:text-white/70 transition-colors">
                ← Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ WHEEL STEP ═══ */}
      {step === "wheel" && (
        <div className="flex-1 flex flex-col items-center justify-center w-full px-6 pb-8">
          <h1 className="text-white text-3xl font-black tracking-wide text-center mb-2 drop-shadow-lg">
            {mode === "gifts" ? "ROLETA DE BRINDES" : cfg("title", "ROLETA DE PRÊMIOS")}
          </h1>
          {mode === "points" && (
            <div className="bg-white rounded-full px-6 py-1.5 mb-6 shadow-md">
              <span className="text-[#0d1930] font-black text-sm tracking-wider">1 GIRO RESTANTE</span>
            </div>
          )}
          {mode === "gifts" && (
            <div className="bg-emerald-500/30 border border-emerald-400/40 rounded-full px-6 py-1.5 mb-6">
              <span className="text-white font-bold text-sm tracking-wider">GIROS ILIMITADOS</span>
            </div>
          )}

          <SpinningWheel prizes={prizes} spinning={spinning} rotation={rotation} centerIconUrl={cfg("center_icon")} />

          <button
            onClick={spinWheel}
            disabled={spinning}
            className="mt-8 px-16 py-4 rounded-full bg-white text-[#0d1930] font-black text-xl tracking-wider shadow-lg border-2 border-[#0d1930]/20 hover:bg-gray-100 disabled:opacity-50 transition-all"
          >
            {spinning ? (
              <span className="flex items-center gap-2">
                <Loader2 size={24} className="animate-spin" />
                GIRANDO...
              </span>
            ) : (
              "INICIAR"
            )}
          </button>

          {!spinning && (
            <button onClick={resetSession} className="mt-4 text-white/50 text-sm font-medium hover:text-white/70 transition-colors">
              ← Voltar
            </button>
          )}
        </div>
      )}

      {/* ═══ RESULT STEP – Points Mode ═══ */}
      {step === "result" && wonPrize && mode === "points" && (
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md px-6 pb-8 text-center">
          {recoveredSpin && (
            <div className="bg-amber-500/20 border border-amber-400/40 rounded-xl px-4 py-3 mb-4">
              <p className="text-amber-200 text-sm font-semibold">Você já possui um prêmio pendente de resgate</p>
              <p className="text-amber-200/70 text-xs mt-1">Resgate seu prêmio escaneando o QR Code abaixo no aplicativo.</p>
            </div>
          )}
          <h2 className="text-white text-3xl font-black mb-1">
            {recoveredSpin ? "VOCÊ JÁ JOGOU!" : cfg("success_title", "PARABÉNS!")}
          </h2>
          <p className="text-white/70 text-sm mb-4">
            {recoveredSpin ? "Resgate seu prêmio abaixo" : cfg("success_subtitle", "VOCÊ GANHOU")}
          </p>

          <Crown size={56} className="text-white mb-2" />

          <p className="text-white text-6xl font-black mb-1">
            {wonPrize.value >= 1000 ? wonPrize.value.toLocaleString("pt-BR") : wonPrize.label}
          </p>
          <p className="text-white font-black text-xl tracking-wider mb-6">
            {cfg("success_points_label", "PONTOS")}
          </p>

          <p className="text-white/70 text-sm mb-4 px-4">
            {cfg("qr_instruction", "Leia o QR code na sessão Golden Pass do nosso aplicativo e resgate sua recompensa!")}
          </p>

          <div className="bg-white rounded-2xl p-4 mb-6">
            <QRCodeSVG value={qrData} size={180} />
          </div>

          <p className="text-white/50 text-xs mb-6">
            Suas tentativas acabaram.<br />
            Insira um novo e-mail para jogar novamente.
          </p>

          <div className="flex gap-3">
            <button onClick={resetSession} className="px-6 py-3 rounded-lg bg-white/15 text-white font-bold text-sm hover:bg-white/25 transition-colors">
              {cfg("close_button", "FECHAR")}
            </button>
            <button onClick={resetSession} className="px-6 py-3 rounded-lg bg-white/15 text-white font-bold text-sm hover:bg-white/25 transition-colors flex items-center gap-2">
              <RotateCcw size={16} />
              {cfg("new_session_button", "NOVA SESSÃO")}
            </button>
          </div>
        </div>
      )}

      {/* ═══ RESULT STEP – Gifts Mode ═══ */}
      {step === "result" && wonPrize && mode === "gifts" && (
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md px-6 pb-8 text-center">
          <h2 className="text-white text-3xl font-black mb-1">
            🎉 PARABÉNS!
          </h2>
          <p className="text-white/70 text-sm mb-4">VOCÊ GANHOU</p>

          <Gift size={56} className="text-emerald-400 mb-2" />

          <p className="text-white text-6xl font-black mb-1">
            {wonPrize.value >= 1000 ? wonPrize.value.toLocaleString("pt-BR") : wonPrize.label}
          </p>
          <p className="text-white font-black text-xl tracking-wider mb-8">
            PONTOS EM BRINDE
          </p>

          <p className="text-white/60 text-sm mb-8">
            Retire seu brinde com a equipe do stand!
          </p>

          <div className="flex gap-3">
            <button onClick={spinAgainGifts} className="px-8 py-4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-600 text-white font-black text-lg tracking-wider shadow-lg hover:from-emerald-500 hover:to-teal-700 transition-all flex items-center gap-2">
              <RotateCcw size={20} />
              GIRAR NOVAMENTE
            </button>
            <button onClick={resetSession} className="px-6 py-4 rounded-lg bg-white/15 text-white font-bold text-sm hover:bg-white/25 transition-colors">
              SAIR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roulette;
