import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppProfile, UserRole } from '@/types';

interface AuthContextValue {
  profile: AppProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>(null!);

async function loadProfile(userId: string): Promise<AppProfile | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, display_name')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  const { data: locs } = await supabase
    .from('user_locations')
    .select('location_id, role, locations(name)')
    .eq('user_id', userId);

  return {
    ...profile,
    locations: (locs ?? []).map((l: any) => ({
      location_id: l.location_id,
      location_name: l.locations?.name ?? '',
      role: l.role as UserRole,
    })),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const loaded = await loadProfile(session.user.id);
      setProfile(loaded);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
