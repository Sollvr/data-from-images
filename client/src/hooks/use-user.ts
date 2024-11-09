import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function useUser() {
  const { data: user, error, mutate } = useSWR<User | null>('user', async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session?.user ?? null;
  });

  return {
    user,
    isLoading: !error && !user,
    error,
    login: {
      email: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) return { ok: false, message: error.message };
        await mutate();
        return { ok: true };
      },
      google: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) return { ok: false, message: error.message };
        return { ok: true };
      },
    },
    logout: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) return { ok: false, message: error.message };
      await mutate(null);
      return { ok: true };
    },
    register: async (email: string, password: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) return { ok: false, message: error.message };
      await mutate();
      return { ok: true };
    },
  };
}
