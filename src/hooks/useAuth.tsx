import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

type AppRole = 'admin' | 'receptionist' | 'seller' | 'professional' | 'superadmin';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── SECURITY: Superadmin is determined ONLY by database role ───
// Never use client-side email lists — they expose superadmin identity
// in the browser bundle and can be bypassed. The DB role is the single
// source of truth, enforced by RLS on the server.
const SUPERADMIN_EMAILS: string[] = [];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string, email?: string | null) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      // SECURITY: Role determined exclusively by database — no client-side bypass
      const rolesFromDb = rolesData ? rolesData.map(r => r.role as AppRole) : [];
      setRoles(rolesFromDb);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  // Modelo vendas diretas: clínicas e usuários são criados pelo superadmin.
  // Não criar clínica automaticamente no login; usuário sem clínica deve contatar o suporte.

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id, session.user.email), 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    // Fallback: se getSession nunca resolver (rede/offline), libera a tela após 5s
    const timeout = setTimeout(() => setIsLoading(false), 5000);
    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
  };

  const isAdmin = roles.includes('admin') || roles.includes('superadmin');
  const isSuperAdmin = roles.includes('superadmin');

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isAdmin,
        isSuperAdmin,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
