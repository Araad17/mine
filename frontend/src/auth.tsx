import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import api from './api';
import type { User } from './types';

interface Ctx { user: User | null; loading: boolean; login: (e: string, p: string) => Promise<void>; logout: () => void }
const AuthCtx = createContext<Ctx>(null!);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.get('/auth/me').then((r) => setUser(r.data)).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', r.data.token);
    setUser(r.data.user);
  };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };

  return <AuthCtx.Provider value={{ user, loading, login, logout }}>{children}</AuthCtx.Provider>;
}
