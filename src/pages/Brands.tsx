import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Play, ChevronDown, ChevronUp, Globe, Check, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { toast } from "@/hooks/use-toast";
import { sanitizeSupabaseError } from "@/lib/sanitizeError";
import { fireConfetti } from "@/lib/confetti";

type Brand = {
  id: string;
  slug: string;
  name: string;
  description: string;
  tagline: string | null;
  tags: string[];
  website: string | null;
  video_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  logo_url: string | null;
  icon_url: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
};

// Dynamic: mission slugs follow pattern "social-{brandSlug}" and "video-{brandSlug}"
const getSocialMissionSlug = (brandSlug: string) => `social-${brandSlug}`;
const getVideoMissionSlug = (brandSlug: string) => `video-${brandSlug}`;

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&]+)/);
  return match ? match[1] : null;
}

const SOCIAL_CLICKED_KEY = "commpass_social_clicked";

const loadSocialClicked = (): Record<string, boolean> => {
  try {
    const stored = sessionStorage.getItem(SOCIAL_CLICKED_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const saveSocialClicked = (state: Record<string, boolean>) => {
  try {
    sessionStorage.setItem(SOCIAL_CLICKED_KEY, JSON.stringify(state));
  } catch {}
};

const Brands = () => {
  const { profile, session, refreshProfile, getCompletedMissions } = useUser();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [expandedDesc, setExpandedDesc] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);
  const [socialClicked, setSocialClicked] = useState<Record<string, boolean>>(loadSocialClicked);
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [missionMap, setMissionMap] = useState<Record<string, { id: string; points: number }>>({});
  const videoSectionRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);
  const playerPollRef = useRef<number | null>(null);
  const videoCompletionTriggeredRef = useRef(false);
  const [autoVideoTriggered, setAutoVideoTriggered] = useState(false);

  // Persist active tab
  const handleSetActiveTab = (slug: string) => {
    setActiveTab(slug);
    sessionStorage.setItem("commpass_brands_tab", slug);
  };

  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [brandsRes, missionsRes] = await Promise.all([
        supabase.from("brands").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("missions").select("id, slug, points").eq("is_active", true).or("action.eq.video,type.eq.social,slug.ilike.social-%,slug.ilike.video-%"),
      ]);

      if (brandsRes.data) {
        const mapped = brandsRes.data.map((b: any) => ({
          ...b,
          tags: Array.isArray(b.tags) ? b.tags : [],
        })) as Brand[];
        setBrands(mapped);
        const tabParam = searchParams.get("tab");
        const storedTab = sessionStorage.getItem("commpass_brands_tab");
        const initialTab = tabParam && mapped.some((b) => b.slug === tabParam)
          ? tabParam
          : storedTab && mapped.some((b) => b.slug === storedTab)
            ? storedTab
            : mapped[0]?.slug || "";
        handleSetActiveTab(initialTab);
        // Clear URL params after processing to prevent re-triggers on tab return
        if (tabParam || searchParams.get("video")) {
          navigate("/brands", { replace: true });
        }
      }

      if (missionsRes.data) {
        const map: Record<string, { id: string; points: number }> = {};
        missionsRes.data.forEach((m: any) => {
          map[m.slug] = { id: m.id, points: m.points };
        });
        setMissionMap(map);
      }

      const completed = await getCompletedMissions();
      setCompletedMissionIds(completed);
      setDataLoaded(true);
    };
    load();
  }, []);

  const brand = brands.find((b) => b.slug === activeTab);

  // Auto-scroll to video and open it when coming from missions
  useEffect(() => {
    if (autoVideoTriggered) return;
    const shouldOpenVideo = searchParams.get("video") === "true";
    if (shouldOpenVideo && brand?.video_url) {
      setAutoVideoTriggered(true);
      // Clear URL params so video doesn't re-open on tab return
      navigate("/brands", { replace: true });
      setTimeout(() => {
        videoSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => handleOpenVideo(), 500);
      }, 300);
    }
  }, [brand, searchParams, autoVideoTriggered]);

  useEffect(() => {
    return () => {
      if (playerPollRef.current) {
        window.clearInterval(playerPollRef.current);
        playerPollRef.current = null;
      }
      if (playerInstanceRef.current?.destroy) {
        playerInstanceRef.current.destroy();
        playerInstanceRef.current = null;
      }
    };
  }, []);

  // Load YouTube IFrame API and create player when modal opens
  useEffect(() => {
    if (!videoOpen || !brand?.video_url) return;
    const videoId = getYouTubeVideoId(brand.video_url);
    if (!videoId || !playerContainerRef.current) return;

    const createPlayer = () => {
      if (!playerContainerRef.current) return;
      // Clear previous content
      playerContainerRef.current.innerHTML = '';
      const div = document.createElement('div');
      div.id = 'yt-player-' + Date.now();
      playerContainerRef.current.appendChild(div);

      playerInstanceRef.current = new (window as any).YT.Player(div.id, {
        width: '100%',
        height: '100%',
        videoId,
        playerVars: { autoplay: 1, rel: 0 },
        events: {
          onStateChange: (event: any) => {
            // YT.PlayerState.ENDED === 0
            if (event.data === 0 && !videoCompletionTriggeredRef.current) {
              videoCompletionTriggeredRef.current = true;
              handleVideoEndRef.current?.();
            }
          },
        },
      });
    };

    if ((window as any).YT?.Player) {
      createPlayer();
    } else {
      // Load the API script once
      if (!document.getElementById('yt-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      (window as any).onYouTubeIframeAPIReady = createPlayer;
    }
  }, [videoOpen, brand?.video_url]);

  const socialLinks = brand
    ? [
        { type: "Website", url: brand.website, icon: <Globe size={18} /> },
        { type: "LinkedIn", url: brand.linkedin_url, icon: <LinkedInIcon /> },
        { type: "Instagram", url: brand.instagram_url, icon: <InstagramIcon /> },
      ].filter((s) => s.url)
    : [];

  const missionSlug = brand ? getSocialMissionSlug(brand.slug) : null;
  const missionInfo = missionSlug ? missionMap[missionSlug] : null;
  const missionId = missionInfo?.id || null;
  const socialMissionPoints = missionInfo?.points || 0;
  const isMissionCompleted = missionId ? completedMissionIds.includes(missionId) : false;

  const videoMissionSlug = brand ? getVideoMissionSlug(brand.slug) : null;
  const videoMissionInfo = videoMissionSlug ? missionMap[videoMissionSlug] : null;
  const videoMissionId = videoMissionInfo?.id || null;
  const videoMissionPoints = videoMissionInfo?.points || 0;
  const isVideoMissionCompleted = videoMissionId ? completedMissionIds.includes(videoMissionId) : false;

  const allSocialClicked = socialLinks.every((s) => socialClicked[`${brand?.id}-${s.type}`]);

  // Check if social mission should be completed on return from external link
  // Only runs AFTER data is loaded to avoid false positives
  useEffect(() => {
    if (!dataLoaded || !brand || !missionId || isMissionCompleted) return;
    const allClicked = socialLinks.every((s) => socialClicked[`${brand.id}-${s.type}`]);
    if (allClicked && socialLinks.length > 0) {
      const completeSocial = async () => {
        try {
          const { data: result } = await supabase.rpc("complete_mission_with_points", {
            p_mission_id: missionId,
          });
          const r = result as any;
          if (r?.already_completed) return;
          setCompletedMissionIds((p) => [...p, missionId]);
          // Clear persisted clicks for this brand after successful completion
          const cleanedClicks = { ...socialClicked };
          socialLinks.forEach((s) => delete cleanedClicks[`${brand.id}-${s.type}`]);
          saveSocialClicked(cleanedClicks);
          await refreshProfile();
          fireConfetti();
          toast({ title: "🎉 Missão concluída!", description: `+${socialMissionPoints} pontos por acessar todas as redes sociais!` });
        } catch (err) {
          console.error("[Brands] Error completing social mission on return", err);
        }
      };
      completeSocial();
    }
  }, [dataLoaded, brand?.id, missionId, isMissionCompleted, socialClicked]);

  const videoOpenRef = useRef(false);
  const handleVideoEndRef = useRef<() => Promise<void>>();

  // Keep ref always pointing to the latest closure
  handleVideoEndRef.current = async () => {
    if (!videoOpenRef.current) return;
    if (!isVideoMissionCompleted && brand && videoMissionId) {
      try {
        const { data: result } = await supabase.rpc("complete_mission_with_points", {
          p_mission_id: videoMissionId,
        });
        const r = result as any;
        if (r?.already_completed) return;
        setCompletedMissionIds((p) => [...p, videoMissionId]);
        setVideoWatched(true);
        await refreshProfile();
        fireConfetti();
        toast({ title: `🎉 +${videoMissionPoints} pontos!`, description: "Obrigado por assistir o vídeo institucional." });
      } catch (err) {
        console.error("[Brands] Error completing video mission", err);
      }
    }
  };

  const handleOpenVideo = () => {
    setVideoOpen(true);
    videoOpenRef.current = true;
    videoCompletionTriggeredRef.current = false;
    if (!isVideoMissionCompleted) {
      // Start polling interval to check video progress
      if (playerPollRef.current) window.clearInterval(playerPollRef.current);
      playerPollRef.current = window.setInterval(() => {
        const p = playerInstanceRef.current;
        if (!p || !p.getDuration || !p.getCurrentTime) return;
        const duration = p.getDuration();
        const current = p.getCurrentTime();
        if (duration > 0 && current / duration >= 0.9 && !videoCompletionTriggeredRef.current) {
          videoCompletionTriggeredRef.current = true;
          handleVideoEndRef.current?.();
        }
      }, 2000);
    }
  };

  const handleCloseVideo = () => {
    setVideoOpen(false);
    videoOpenRef.current = false;
    if (playerPollRef.current) {
      window.clearInterval(playerPollRef.current);
      playerPollRef.current = null;
    }
    if (playerInstanceRef.current?.destroy) {
      playerInstanceRef.current.destroy();
      playerInstanceRef.current = null;
    }
  };

  const handleSocialClick = async (type: string, url: string) => {
    const key = `${brand?.id}-${type}`;
    
    // Persist state BEFORE opening external link to survive mobile tab kills
    if (!socialClicked[key] && !isMissionCompleted) {
      const next = { ...socialClicked, [key]: true };
      setSocialClicked(next);
      saveSocialClicked(next);

      // Don't complete here - let the useEffect handle it to avoid race conditions
      // The useEffect will fire after state update and handle mission completion
    }

    // Open link AFTER state update
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!profile) return null;

  return (
    <AppLayout>
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground mb-1">Marcas Parceiras</h1>
        <p className="text-primary text-sm font-medium mb-6">Conheça quem está transformando o e-commerce</p>

        {/* Tab selector */}
        <div className="flex gap-3 mb-6">
          {brands.map((b) => (
            <button
              key={b.slug}
              onClick={() => { handleSetActiveTab(b.slug); setExpandedDesc(false); setVideoWatched(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                activeTab === b.slug
                  ? b.slug === "jitterbit"
                    ? "border-orange-400 bg-orange-50 text-foreground shadow-sm"
                    : "border-primary bg-primary/5 text-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {b.icon_url ? (
                <img src={b.icon_url} alt={b.name} className="h-5 w-auto object-contain" />
              ) : b.logo_url ? (
                <img src={b.logo_url} alt={b.name} className="h-5 w-auto object-contain" />
              ) : null}
              {b.name}
            </button>
          ))}
        </div>

        {brand && (
          <AnimatePresence mode="wait">
            <motion.div
              key={brand.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Box 1: Info */}
              <div className="p-5 rounded-2xl border-2 border-primary/20 bg-card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center p-1.5">
                    {brand.icon_url ? (
                      <img src={brand.icon_url} alt={brand.name} className="w-full h-full object-contain" />
                    ) : brand.logo_url ? (
                      <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xl font-bold text-foreground">{brand.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">{brand.name}</h3>
                    {brand.tagline && (
                      <p className={`text-sm ${brand.slug === "jitterbit" ? "text-orange-500" : "text-primary"}`}>{brand.tagline}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <p className={`text-sm text-muted-foreground leading-relaxed ${!expandedDesc ? "line-clamp-5" : ""}`}>
                    {brand.description}
                  </p>
                  {brand.description && brand.description.length > 250 && (
                    <button
                      onClick={() => setExpandedDesc(!expandedDesc)}
                      className={`text-sm font-medium mt-1 flex items-center gap-1 ${brand.slug === "jitterbit" ? "text-orange-500" : "text-primary"}`}
                    >
                      {expandedDesc ? "Menos" : "Ler mais"} {expandedDesc ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Box 2: Soluções & Capabilities */}
              {brand.tags && brand.tags.length > 0 && (
                <div className="p-5 rounded-2xl bg-card shadow-card">
                  <h4 className="font-bold text-foreground mb-3">Soluções</h4>
                  <div className="flex flex-wrap gap-2">
                    {brand.tags.map((tag, i) => (
                      <span key={i} className={`px-3 py-1.5 rounded-full border text-xs font-medium ${
                        brand.slug === "jitterbit"
                          ? "border-orange-300 text-orange-500 bg-orange-50"
                          : "border-primary/30 text-primary"
                      }`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Box 3: Vídeo Institucional */}
              {brand.video_url && (
                <div
                  ref={videoSectionRef}
                  onClick={handleOpenVideo}
                  className={`p-4 rounded-2xl bg-card shadow-card flex items-center gap-4 cursor-pointer transition-colors ${brand.slug === "jitterbit" ? "hover:bg-orange-50" : "hover:bg-accent/50"}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isVideoMissionCompleted ? "bg-green-100" : "bg-primary/10"}`}>
                    {isVideoMissionCompleted ? <Check size={20} className="text-green-600" /> : <Play size={20} className="text-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">Vídeo Institucional</p>
                    <p className="text-xs text-muted-foreground">
                      {isVideoMissionCompleted ? `✅ Missão concluída! +${videoMissionPoints} pontos` : `Assista e ganhe +${videoMissionPoints} pontos`}
                    </p>
                  </div>
                  {!isVideoMissionCompleted && (
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">+{videoMissionPoints} pts</span>
                  )}
                  {isVideoMissionCompleted && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Check size={16} className="text-primary-foreground" />
                    </div>
                  )}
                </div>
              )}

              {/* Box 4: Redes Sociais */}
              {socialLinks.length > 0 && (
                <div className="p-5 rounded-2xl bg-card shadow-card">
                  <h4 className="font-bold text-foreground mb-3">Redes Sociais</h4>
                  <div className="space-y-2">
                    {socialLinks.map((s) => {
                      const key = `${brand.id}-${s.type}`;
                      const clicked = socialClicked[key] || isMissionCompleted;
                      return (
                        <button
                          key={s.type}
                          onClick={() => handleSocialClick(s.type, s.url!)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border border-border transition-colors ${
                            brand.slug === "jitterbit" ? "hover:bg-orange-50" : "hover:bg-accent/50"
                          }`}
                        >
                          <span className="text-muted-foreground">{s.icon}</span>
                          <span className="flex-1 text-left text-sm font-medium text-foreground">{s.type}</span>
                          {clicked ? (
                            <Check size={16} className="text-green-600" />
                          ) : (
                            <ExternalLink size={14} className="text-muted-foreground" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Box 5: Missão Redes Sociais */}
              {socialLinks.length > 0 && (
                <div className="p-4 rounded-2xl bg-card shadow-card flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isMissionCompleted || allSocialClicked ? "bg-green-100" : "bg-primary/10"}`}>
                    {isMissionCompleted || allSocialClicked ? <Check size={20} className="text-green-600" /> : <span className="text-lg">📱</span>}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">Acesse nossas Redes Sociais</p>
                    <p className="text-xs text-muted-foreground">
                      {isMissionCompleted || allSocialClicked
                        ? `✅ Missão concluída! +${socialMissionPoints} pts`
                        : `Acesse todas as redes sociais e ganhe +${socialMissionPoints} pontos.`}
                    </p>
                  </div>
                  {!(isMissionCompleted || allSocialClicked) && (
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">+{socialMissionPoints} pts</span>
                  )}
                  {(isMissionCompleted || allSocialClicked) && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Check size={16} className="text-primary-foreground" />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {videoOpen && brand?.video_url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={handleCloseVideo}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden bg-black"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleCloseVideo}
                className="absolute -top-10 right-0 text-white/80 hover:text-white z-10"
              >
                <X size={24} />
              </button>
              <div ref={playerContainerRef} className="absolute inset-0 w-full h-full" />
              {!videoWatched && !isVideoMissionCompleted && (
                <div className="absolute bottom-3 left-3 right-3 text-center z-10 pointer-events-none">
                  <p className="text-white/70 text-xs bg-black/40 rounded-full px-3 py-1 inline-block">Assista até o final para ganhar +{videoMissionPoints} pontos</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

export default Brands;
