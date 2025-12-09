import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// TEMPORARY: Create mock user outside component to ensure it's consistent
const MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // TODO: Remove this mock user once OAuth is fixed
  // TEMPORARY: Provide a mock user for testing
  const [user, setUser] = useState<User | null>(MOCK_USER);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false); // Set to false immediately
  const navigate = useNavigate();

  useEffect(() => {
    // TEMPORARY: Log to verify mock user is set
    console.log('🔧 AuthProvider initialized with mock user:', MOCK_USER.id);
    console.log('👤 User state:', user);

    // TEMPORARY: Skip real authentication, use mock user
    // Get initial session
    // supabase.auth.getSession().then(({ data: { session } }) => {
    //   setSession(session);
    //   setUser(session?.user ?? null);
    //   setLoading(false);
    // });

    // Listen for auth changes
    // const {
    //   data: { subscription },
    // } = supabase.auth.onAuthStateChange((_event, session) => {
    //   setSession(session);
    //   setUser(session?.user ?? null);
    //   setLoading(false);
    // });

    // return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    console.log('🔐 Starting Google OAuth...');
    console.log('📍 Redirect URL:', `${window.location.origin}/`);
    console.log('🌐 Current origin:', window.location.origin);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('❌ Error signing in with Google:', error);
      throw error;
    }

    console.log('✅ OAuth initiated successfully', data);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
    navigate('/');
  };

  const value = {
    user,
    session,
    loading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
