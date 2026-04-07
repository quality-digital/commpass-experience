import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Play, ChevronDown, ChevronUp, Globe, Check, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { toast } from "@/hooks/use-toast";
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

const BRAND_MISSION_MAP: Record<string, string> = {
  jitterbit: "social-jitterbit",
  quality: "social-quality",
};

const BRAND_VIDEO_MISSION_MAP: Record<string, string> = {
  jitterbit: "video-jitterbit",
  quality: "video-quality",
};

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

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^?&]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&enablejsapi=1` : null;
}

const Brands = () => {
  const { profile, addPoints, completeMission, getCompletedMissions } = useUser();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [expandedDesc, setExpandedDesc] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);
  const [socialClicked, setSocialClicked] = useState<Record<string, boolean>>({});
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [missionMap, setMissionMap] = useState<Record<string, string>>({});
  const videoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      const [brandsRes, missionsRes] = await Promise.all([
        supabase.from("brands").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("missions").select("id, slug").in("slug", [
          ...Object.values(BRAND_MISSION_MAP),
          ...Object.values(BRAND_VIDEO_MISSION_MAP),
        ]),
      ]);

      if (brandsRes.data) {
        const mapped = brandsRes.data.map((b: any) => ({
          ...b,
          tags: Array.isArray(b.tags) ? b.tags : [],
        })) as Brand[];
        setBrands(mapped);
        if (mapped.length > 0 && !activeTab) setActiveTab(mapped[0].slug);
      }

      if (missionsRes.data) {
        const map: Record<string, string> = {};
        missionsRes.data.forEach((m) => {
          map[m.slug] = m.id;
        });
        setMissionMap(map);
      }

      const completed = await getCompletedMissions();
      setCompletedMissionIds(completed);
    };
    load();
  }, []);

  const brand = brands.find((b) => b.slug === activeTab);

  const socialLinks = brand
    ? [
        { type: "Website", url: brand.website, icon: <Globe size={18} /> },
        { type: "LinkedIn", url: brand.linkedin_url, icon: <LinkedInIcon /> },
        { type: "Instagram", url: brand.instagram_url, icon: <InstagramIcon /> },
      ].filter((s) => s.url)
    : [];

  const totalSocialPoints = socialLinks.length * 50;
  const allSocialClicked = socialLinks.every((s) => socialClicked[`${brand?.id}-${s.type}`]);

  const missionSlug = brand ? BRAND_MISSION_MAP[brand.slug] : null;
  const missionId = missionSlug ? missionMap[missionSlug] : null;
  const isMissionCompleted = missionId ? completedMissionIds.includes(missionId) : false;

  const videoMissionSlug = brand ? BRAND_VIDEO_MISSION_MAP[brand.slug] : null;
  const videoMissionId = videoMissionSlug ? missionMap[videoMissionSlug] : null;
  const isVideoMissionCompleted = videoMissionId ? completedMissionIds.includes(videoMissionId) : false;

  const handleVideoEnd = useCallback(async () => {
    if (!isVideoMissionCompleted && brand && videoMissionId) {
      await addPoints(100);
      await completeMission(videoMissionId);
      setCompletedMissionIds((p) => [...p, videoMissionId]);
      setVideoWatched(true);
      fireConfetti();
      toast({ title: "🎉 +100 pontos!", description: "Obrigado por assistir o vídeo institucional." });
    }
  }, [isVideoMissionCompleted, brand, videoMissionId, addPoints, completeMission]);

  const handleOpenVideo = () => {
    setVideoOpen(true);
    if (!isVideoMissionCompleted) {
      videoTimerRef.current = setTimeout(() => {
        handleVideoEnd();
      }, 60000);
    }
  };

  const handleCloseVideo = () => {
    setVideoOpen(false);
    if (videoTimerRef.current) clearTimeout(videoTimerRef.current);
  };

  const handleSocialClick = async (type: string, url: string) => {
    const key = `${brand?.id}-${type}`;
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
    if (!socialClicked[key] && !isMissionCompleted) {
      setSocialClicked((prev) => {
        const next = { ...prev, [key]: true };

        const allNowClicked = socialLinks.every((s) => next[`${brand?.id}-${s.type}`]);
        if (allNowClicked && missionId && !isMissionCompleted) {
          completeMission(missionId).then(() => {
            addPoints(totalSocialPoints);
            setCompletedMissionIds((p) => [...p, missionId]);
            fireConfetti();
            toast({ title: "🎉 Missão concluída!", description: `+${totalSocialPoints} pontos por acessar todas as redes sociais!` });
          });
        }

        return next;
      });
    }
  };

  if (!profile) return null;

  return (
    <AppLayout>
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground mb-1">Marcas Parceiras</h1>
        <p className="text-primary text-sm font-medium mb-6">Conheça quem está transformando o ecommerce</p>

        {/* Tab selector */}
        <div className="flex gap-3 mb-6">
          {brands.map((b) => (
            <button
              key={b.slug}
              onClick={() => { setActiveTab(b.slug); setExpandedDesc(false); setVideoWatched(false); }}
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
                  <h4 className="font-bold text-foreground mb-3">Soluções & Capabilities</h4>
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
                  onClick={handleOpenVideo}
                  className={`p-4 rounded-2xl bg-card shadow-card flex items-center gap-4 cursor-pointer transition-colors ${brand.slug === "jitterbit" ? "hover:bg-orange-50" : "hover:bg-accent/50"}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isVideoMissionCompleted ? "bg-green-100" : "bg-primary/10"}`}>
                    {isVideoMissionCompleted ? <Check size={20} className="text-green-600" /> : <Play size={20} className="text-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">Vídeo Institucional</p>
                    <p className="text-xs text-muted-foreground">
                      {isVideoMissionCompleted ? "✅ Missão concluída! +100 pontos" : "Assista e ganhe +100 pontos"}
                    </p>
                  </div>
                  {!isVideoMissionCompleted && (
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">+100 pts</span>
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
                        ? `✅ Missão concluída! +${totalSocialPoints} pts`
                        : "Ao acessar cada uma de nossas redes sociais você ganhará 50 pontos."}
                    </p>
                  </div>
                  {!(isMissionCompleted || allSocialClicked) && (
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">+{totalSocialPoints} pts</span>
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
              <iframe
                src={getYouTubeEmbedUrl(brand.video_url)!}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
              {!videoWatched && (
                <div className="absolute bottom-3 left-3 right-3 text-center">
                  <p className="text-white/70 text-xs">Assista até o final para ganhar +100 pontos</p>
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
