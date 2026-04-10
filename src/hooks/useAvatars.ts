import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Avatar = {
  id: string;
  slug: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  image_url: string | null;
  sort_order: number;
  is_easter_egg: boolean;
  is_active: boolean;
};

export const useAvatars = () => {
  return useQuery({
    queryKey: ["avatars"],
    queryFn: async (): Promise<Avatar[]> => {
      const { data, error } = await supabase
        .from("avatars")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });
};

export const useAllAvatars = () => {
  return useQuery({
    queryKey: ["avatars", "all"],
    queryFn: async (): Promise<Avatar[]> => {
      const { data, error } = await supabase
        .from("avatars")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });
};

export const findAvatarBySlug = (avatars: Avatar[], slug: string | null | undefined) =>
  avatars.find((a) => a.slug === slug) || null;
