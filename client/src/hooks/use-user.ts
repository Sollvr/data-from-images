import useSWR from "swr";
import type { User } from "db/schema";

export function useUser() {
  const { data: user, error, mutate } = useSWR<User | null>(
    "/api/user",
    async (url) => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) return null;
        throw new Error("Failed to fetch user");
      }
      return res.json();
    }
  );

  return {
    user,
    isLoading: !error && !user,
    error,
    login: {
      username: async (username: string, password: string) => {
        const res = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, message: data.message };
        await mutate();
        return { ok: true };
      },
    },
    logout: async () => {
      const res = await fetch("/logout", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, message: data.message };
      await mutate(null);
      return { ok: true };
    },
    register: async (username: string, password: string, email: string) => {
      const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, message: data.message };
      await mutate();
      return { ok: true, message: data.message };
    },
  };
}
