import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';

export interface Me {
  user: { id: string; email: string; name: string } | null;
  businesses?: { id: string; name: string; slug: string; role: string }[];
  isAdmin?: boolean;
  aiEnabled?: boolean;
}

const Ctx = createContext<{ me: Me | null; refresh: () => Promise<void> }>({ me: null, refresh: async () => {} });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const refresh = useCallback(async () => {
    try {
      setMe(await api<Me>('/me'));
    } catch {
      setMe({ user: null });
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return <Ctx.Provider value={{ me, refresh }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
