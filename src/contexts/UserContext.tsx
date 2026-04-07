import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

export type Avatar = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  bonus?: number;
};

export const AVATARS: Avatar[] = [
  { id: "explorador", name: "Explorador", emoji: "🧭", color: "from-blue-400 to-blue-500" },
  { id: "automacao", name: "Automação", emoji: "⚙️", color: "from-indigo-400 to-indigo-500" },
  { id: "unicornio", name: "Unicórnio", emoji: "🦄", color: "from-pink-400 to-purple-500", bonus: 25 },
  { id: "campeao", name: "Campeão", emoji: "🏆", color: "from-yellow-400 to-amber-500" },
  { id: "shopper", name: "Shopper", emoji: "🛒", color: "from-green-400 to-emerald-500" },
  { id: "tech-wizard", name: "Tech Wizard", emoji: "🧙", color: "from-purple-400 to-violet-500" },
  { id: "flash-dev", name: "Flash Dev", emoji: "⚡", color: "from-orange-400 to-red-500" },
  { id: "dragao", name: "Dragão", emoji: "🐉", color: "from-red-400 to-rose-500" },
  { id: "estrategista", name: "Estrategista", emoji: "🎯", color: "from-teal-400 to-cyan-500" },
];

export type Profile = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
  city?: string;
  avatar_id?: string;
  avatar_emoji?: string;
  points: number;
  registration_type: string;
  accepted_terms: boolean;
  accepted_marketing: boolean;
};

type UserContextType = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  addPoints: (points: number) => Promise<void>;
  completeMission: (missionId: string) => Promise<void>;
  completeQuiz: (quizId: string, score: number) => Promise<void>;
  getCompletedMissions: () => Promise<string[]>;
  getCompletedQuizzes: () => Promise<string[]>;
  logout: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data) setProfile(data as Profile);
    return data;
  };

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    setIsAdmin(!!data);
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        // Use setTimeout to avoid Supabase auth deadlock
        setTimeout(async () => {
          await fetchProfile(sess.user.id);
          await checkAdmin(sess.user.id);
          setLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      if (sess?.user) {
        fetchProfile(sess.user.id).then(() => {
          checkAdmin(sess.user.id).then(() => setLoading(false));
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const addPoints = async (points: number) => {
    if (!profile) return;
    const newPoints = profile.points + points;
    await supabase.from("profiles").update({ points: newPoints }).eq("id", profile.id);
    setProfile((p) => p ? { ...p, points: newPoints } : null);
  };

  const completeMission = async (missionId: string) => {
    if (!session?.user) return;
    await supabase.from("user_missions").insert({
      user_id: session.user.id,
      mission_id: missionId,
    });
  };

  const completeQuiz = async (quizId: string, score: number) => {
    if (!session?.user) return;
    await supabase.from("user_quizzes").insert({
      user_id: session.user.id,
      quiz_id: quizId,
      score,
    });
  };

  const getCompletedMissions = async (): Promise<string[]> => {
    if (!session?.user) return [];
    const { data } = await supabase
      .from("user_missions")
      .select("mission_id")
      .eq("user_id", session.user.id);
    return data?.map((d) => d.mission_id) || [];
  };

  const getCompletedQuizzes = async (): Promise<string[]> => {
    if (!session?.user) return [];
    const { data } = await supabase
      .from("user_quizzes")
      .select("quiz_id")
      .eq("user_id", session.user.id);
    return data?.map((d) => d.quiz_id) || [];
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <UserContext.Provider
      value={{
        session,
        profile,
        loading,
        isAuthenticated: !!session && !!profile,
        isAdmin,
        refreshProfile,
        addPoints,
        completeMission,
        completeQuiz,
        getCompletedMissions,
        getCompletedQuizzes,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be within UserProvider");
  return ctx;
};
