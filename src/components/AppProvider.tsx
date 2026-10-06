'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Difficulty } from '@/types/puzzle';
type Session = { image: HTMLCanvasElement; difficulty: Difficulty };
type AppState = {
  session: Session | null;
  setSession: (session: Session | null) => void;
  sound: boolean;
  toggleSound: () => void;
};
const AppContext = createContext<AppState | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sound, setSound] = useState(true);
  useEffect(() => { try { setSound(localStorage.getItem('puzzle-sound-v1') !== 'off'); } catch {} }, []);
  function toggleSound() {
    setSound(value => {
      try { localStorage.setItem('puzzle-sound-v1', value ? 'off' : 'on'); } catch {}
      return !value;
    });
  }
  return <AppContext.Provider value={{ session, setSession, sound, toggleSound }}>{children}</AppContext.Provider>;
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('AppProvider missing');
  return context;
}
