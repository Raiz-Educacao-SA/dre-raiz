import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider, signInWithPopup, signOut as firebaseSignOut } from '../firebase';
import * as supabaseService from '../services/supabaseService';
import { supabase } from '../supabase';
import { setUserPermissions, clearUserPermissions } from '../services/permissionsService';
import { clearAllCache } from '../services/transactionCache';

interface User {
  uid: string;
  supabaseId: string; // UUID do Supabase users.id (diferente do Firebase uid)
  email: string;
  name: string;
  photoURL: string;
  role: 'admin' | 'manager' | 'viewer' | 'approver' | 'pending';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isApprover: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Buscar dados do usuário no Supabase
  const fetchUserData = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    if (!firebaseUser.email) return null;

    try {
      // Buscar ou criar usuário no Supabase
      const dbUser = await supabaseService.getUserByEmail(firebaseUser.email);

      if (dbUser) {
        // Atualizar último login (fire-and-forget — não bloqueia login)
        supabaseService.updateUserLastLogin(dbUser.id);

        // 🔐 CARREGAR PERMISSÕES DO USUÁRIO
        console.log('🔐 Carregando permissões para:', dbUser.email, '| user_id:', dbUser.id);
        const userPermissions = await supabaseService.getUserPermissions(dbUser.id);

        if (userPermissions.length === 0 && dbUser.role !== 'admin') {
          console.warn('⚠️ ALERTA: getUserPermissions retornou vazio para usuário não-admin!');
          console.warn('⚠️ Possíveis causas: RLS bloqueando leitura de user_permissions, ou GRANT SELECT não concedido ao role anon/authenticated.');
          console.warn('⚠️ Execute no Supabase: GRANT SELECT ON public.user_permissions TO anon, authenticated;');
        }

        // Organizar permissões por tipo (normalizar para UPPERCASE para evitar mismatch de case)
        const allowedMarcas = userPermissions
          .filter(p => p.permission_type === 'cia')
          .map(p => p.permission_value.toUpperCase());

        const allowedFiliais = userPermissions
          .filter(p => p.permission_type === 'filial')
          .map(p => p.permission_value);

        const allowedCategories = userPermissions
          .filter(p => p.permission_type === 'centro_custo')
          .map(p => p.permission_value);

        const allowedTag01 = userPermissions
          .filter(p => p.permission_type === 'tag01')
          .map(p => p.permission_value);

        const allowedTag02 = userPermissions
          .filter(p => p.permission_type === 'tag02')
          .map(p => p.permission_value);

        const allowedTag03 = userPermissions
          .filter(p => p.permission_type === 'tag03')
          .map(p => p.permission_value);

        // 🔐 CONFIGURAR PERMISSÕES GLOBALMENTE
        setUserPermissions({
          isAdmin: dbUser.role === 'admin',
          hasPermissions: userPermissions.length > 0,
          allowedMarcas,
          allowedFiliais,
          allowedCategories,
          allowedTag01,
          allowedTag02,
          allowedTag03
        });

        console.log('✅ Permissões configuradas:', {
          isAdmin: dbUser.role === 'admin',
          totalPermissions: userPermissions.length,
          allowedMarcas,
          allowedFiliais,
          allowedTag01
        });

        return {
          uid: firebaseUser.uid,
          supabaseId: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          photoURL: firebaseUser.photoURL || '',
          role: dbUser.role as 'admin' | 'manager' | 'viewer' | 'approver' | 'pending'
        };
      } else {
        // Criar novo usuário no Supabase (primeiro login) - aguardando aprovação
        const newUser = await supabaseService.createUser({
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          photoURL: firebaseUser.photoURL || '',
          role: 'pending' // Novo usuário aguarda aprovação do admin
        });

        // Usuário novo não tem permissões ainda
        setUserPermissions({
          isAdmin: false,
          hasPermissions: false,
          allowedMarcas: [],
          allowedFiliais: [],
          allowedCategories: [],
          allowedTag01: [],
          allowedTag02: [],
          allowedTag03: []
        });

        return {
          uid: firebaseUser.uid,
          supabaseId: newUser.id,
          email: newUser.email,
          name: newUser.name,
          photoURL: firebaseUser.photoURL || '',
          role: newUser.role as 'admin' | 'manager' | 'viewer' | 'pending'
        };
      }
    } catch (error: any) {
      console.error('Erro ao buscar dados do usuário:', error);
      // Surface the Supabase error code so the caller can set a visible message
      throw error;
    }
  };

  // Monitorar mudanças de autenticação do Firebase
  // Função para renovar sessão Supabase a partir do Firebase token
  const refreshSupabaseSession = async (firebaseUser: FirebaseUser) => {
    const idToken = await firebaseUser.getIdToken(true); // force refresh
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'firebase', token: idToken });
    if (error) throw error; // Supabase SDK retorna { error } em vez de lançar exceção
    console.log('🔄 Sessão Supabase renovada');
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      // Limpar interval anterior
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      if (firebaseUser) {
        // Limpar operações stale do sync queue (sessões anteriores)
        try { localStorage.removeItem('transactionsOperationQueue'); } catch {}

        // Restaura sessão Supabase para que RLS funcione (ex: reload de página)
        try {
          await refreshSupabaseSession(firebaseUser);
        } catch (err: any) {
          const isNetwork = err?.message?.toLowerCase().includes('fetch') || err?.name === 'TypeError';
          if (isNetwork) {
            // Falha de rede — Supabase inacessível, não tem como prosseguir
            setAuthError('Não foi possível conectar ao servidor de autenticação. Verifique sua conexão com a internet e tente novamente.');
            setUser(null);
            setLoading(false);
            return;
          }
          // OIDC não configurado ou outro erro não-crítico:
          // continua sem sessão Supabase — o banco funciona via policies abertas (USING true)
          console.warn('⚠️ Supabase session não estabelecida (OIDC):', err?.message);
        }

        let userData: User | null = null;
        try {
          userData = await fetchUserData(firebaseUser);
        } catch (err: any) {
          console.error('❌ fetchUserData falhou:', err);
          const msg = err?.message || 'Erro ao carregar dados do usuário no banco.';
          setAuthError(`Erro de autenticação: ${msg}. Verifique as permissões do banco (RLS) ou tente novamente.`);
          setUser(null);
          setLoading(false);
          return;
        }
        setAuthError(null);
        setUser(userData);

        // Iniciar sessao de engajamento (fire-and-forget, nao bloqueia login)
        if (userData && userData.role !== 'pending') {
          supabaseService.getUserByEmail(userData.email).catch(() => null).then(dbUser => {
            if (!dbUser) return;
            supabaseService.createSession(dbUser.id, userData.email).then(sid => {
              sessionIdRef.current = sid;
              // Heartbeat a cada 5 minutos
              if (heartbeatRef.current) clearInterval(heartbeatRef.current);
              heartbeatRef.current = setInterval(() => {
                if (sessionIdRef.current) {
                  supabaseService.updateSessionHeartbeat(sessionIdRef.current);
                }
              }, 5 * 60 * 1000);
            });
          });
        }

        // Renovar token Supabase a cada 45 min (Firebase token expira em 60 min)
        refreshIntervalRef.current = setInterval(() => {
          refreshSupabaseSession(firebaseUser).catch(err => {
            console.warn('⚠️ Renovação automática de sessão falhou:', err);
          });
        }, 45 * 60 * 1000);
      } else {
        // Encerrar sessao se havia uma ativa
        if (sessionIdRef.current) {
          supabaseService.endSession(sessionIdRef.current);
          sessionIdRef.current = null;
        }
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        setUser(null);
      }
      setLoading(false);
    });

    // Encerrar sessao ao fechar aba/navegador (via RPC keepalive)
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/end_user_session`;
        const body = JSON.stringify({ p_session_id: sessionIdRef.current });
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      console.log('🔐 Iniciando login com Google...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ Login Google bem-sucedido:', result.user.email);
      // Supabase session é estabelecida pelo onAuthStateChanged que dispara automaticamente
      // após signInWithPopup — não duplicar fetchUserData aqui.
    } catch (error: any) {
      console.error('❌ Erro completo ao fazer login:', error);
      console.error('Código do erro:', error.code);
      console.error('Mensagem do erro:', error.message);

      if (error.code === 'auth/popup-closed-by-user') {
        setLoading(false);
        return; // não exibir erro — usuário fechou voluntariamente
      } else if (error.code === 'auth/network-request-failed') {
        setAuthError('Erro de conexão. Verifique sua internet e tente novamente.');
      } else if (error.code === 'auth/configuration-not-found' || error.message?.includes('auth/invalid-api-key')) {
        setAuthError('Firebase não configurado corretamente. Verifique as variáveis de ambiente.');
        console.error('🔴 FIREBASE NÃO CONFIGURADO - Siga as instruções em INSTRUCOES-FIREBASE.md');
      } else {
        setAuthError(`Erro ao fazer login: ${error.message}`);
      }
      setLoading(false);
    }
    // Não há finally com setLoading(false) aqui — o onAuthStateChanged é quem resolve
    // loading ao receber o usuário (ou falhar).
  };

  const signOut = async () => {
    try {
      // Encerrar sessao de engajamento
      if (sessionIdRef.current) {
        await supabaseService.endSession(sessionIdRef.current);
        sessionIdRef.current = null;
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }

      await firebaseSignOut(auth);
      await supabase.auth.signOut(); // Limpa sessão Supabase também
      setUser(null);

      // 🔐 LIMPAR PERMISSÕES
      clearUserPermissions();
      console.log('🔓 Permissões limpas após logout');

      // Limpar todos os filtros salvos ao fazer logout
      sessionStorage.removeItem('drillDownFilters');
      sessionStorage.removeItem('drillDownActiveTab');
      sessionStorage.removeItem('transactionsColFilters');
      sessionStorage.removeItem('transactionsActiveTab');
      sessionStorage.removeItem('dreMonthStart');
      sessionStorage.removeItem('dreMonthEnd');
      sessionStorage.removeItem('dreTags01');
      sessionStorage.removeItem('dreBrands');
      sessionStorage.removeItem('dreBranches');

      // ⚡ OPÇÃO C: Limpar cache IndexedDB ao fazer logout
      clearAllCache();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      alert('Erro ao fazer logout. Tente novamente.');
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    authError,
    signInWithGoogle,
    signOut,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager' || user?.role === 'admin',
    isApprover: user?.role === 'approver' || user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
