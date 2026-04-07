import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

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

export type User = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
  city?: string;
  avatar?: Avatar;
  points: number;
  registrationType: "quick" | "complete";
  completedMissions: string[];
  completedQuizzes: string[];
  acceptedTerms: boolean;
  acceptedMarketing: boolean;
};

type UserContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  addPoints: (points: number) => void;
  completeMission: (missionId: string) => void;
  completeQuiz: (quizId: string) => void;
  isAuthenticated: boolean;
  logout: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(() => {
    const saved = localStorage.getItem("commpass_user");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("commpass_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("commpass_user");
    }
  }, [user]);

  const setUser = (u: User | null) => setUserState(u);

  const addPoints = (points: number) => {
    setUserState((prev) => prev ? { ...prev, points: prev.points + points } : null);
  };

  const completeMission = (missionId: string) => {
    setUserState((prev) =>
      prev && !prev.completedMissions.includes(missionId)
        ? { ...prev, completedMissions: [...prev.completedMissions, missionId] }
        : prev
    );
  };

  const completeQuiz = (quizId: string) => {
    setUserState((prev) =>
      prev && !prev.completedQuizzes.includes(quizId)
        ? { ...prev, completedQuizzes: [...prev.completedQuizzes, quizId] }
        : prev
    );
  };

  const logout = () => setUserState(null);

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        addPoints,
        completeMission,
        completeQuiz,
        isAuthenticated: !!user,
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
