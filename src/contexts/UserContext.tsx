import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

// Avatar type is now in src/hooks/useAvatars.ts
// AVATARS are loaded from the database, not hardcoded

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

  const buildProfilePayload = useCallback((user: SupabaseUser) => ({
    user_id: user.id,
    name: user.email?.split("@")[0] || "Usuário",
    email: user.email || "",
    phone: null,
    company: null,
    role: null,
    city: null,
    avatar_id: null,
    avatar_emoji: null,
    points: 0,
    registration_type: "quick",
    accepted_terms: false,
    accepted_marketing: false,
  }), []);

  const createMissingProfile = useCallback(async (user: SupabaseUser) => {
    const { data, error } = await supabase
      .from("profiles")
      .insert(buildProfilePayload(user))
      .select("*")
      .single();

    if (error) {
      console.error("[UserContext] Erro ao criar perfil ausente", error);

      const { data: fallbackData, error: fallbackError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fallbackError) {
        console.error("[UserContext] Erro ao recuperar perfil após falha de criação", fallbackError);
      }

      if (fallbackData) {
        setProfile(fallbackData as Profile);
        return fallbackData as Profile;
      }

      setProfile(null);
      return null;
    }

    setProfile(data as Profile);
    return data as Profile;
  }, [buildProfilePayload]);

  const fetchProfile = useCallback(async (userOrId: string | SupabaseUser) => {
    const userId = typeof userOrId === "string" ? userOrId : userOrId.id;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[UserContext] Erro ao carregar perfil", error);
      setProfile(null);
      return null;
    }

    if (data) {
      setProfile(data as Profile);
      return data as Profile;
    }

    if (typeof userOrId !== "string") {
      return createMissingProfile(userOrId);
    }

    setProfile(null);
    return null;
  }, [createMissingProfile]);

  const checkAdmin = useCallback(async (userId: string) => {
    const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (error) {
      console.error("[UserContext] Erro ao validar perfil administrativo", error);
    }
    setIsAdmin(!!data);
  }, []);

  const hydrateAuth = useCallback(async (sess: Session | null) => {
    setSession(sess);

    if (!sess?.user) {
      setProfile(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      await fetchProfile(sess.user);
      await checkAdmin(sess.user.id);
    } catch (error) {
      console.error("[UserContext] Falha ao hidratar autenticação", error);
      setProfile(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [checkAdmin, fetchProfile]);

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      void hydrateAuth(sess);
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      void hydrateAuth(sess);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        supabase.auth.getSession().then(({ data: { session: sess } }) => {
          void hydrateAuth(sess);
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hydrateAuth]);

  const addPoints = async (points: number) => {
    if (!profile) return;
    const newPoints = profile.points + points;
    await supabase.from("profiles").update({ points: newPoints }).eq("id", profile.id);
    setProfile((p) => p ? { ...p, points: newPoints } : null);
  };

  const completeMission = async (missionId: string) => {
    if (!session?.user) return;
    // Check if already completed to prevent duplicates
    const { data: existing } = await supabase
      .from("user_missions")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("mission_id", missionId)
      .maybeSingle();
    if (existing) return; // Already completed
    await supabase.from("user_missions").insert({
      user_id: session.user.id,
      mission_id: missionId,
    });
  };

  const completeQuiz = async (quizId: string, score: number) => {
    if (!session?.user) return;
    // Check if already completed to prevent duplicates
    const { data: existing } = await supabase
      .from("user_quizzes")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("quiz_id", quizId)
      .maybeSingle();
    if (existing) return; // Already completed
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
