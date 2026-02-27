import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider, signInWithPopup, signOut as firebaseSignOut } from '../firebase';
import * as supabaseService from '../services/supabaseService';
import { supabase } from '../supabase';
import { setUserPermissions, clearUserPermissions } from '../services/permissionsService';
import { clearAllCache } from '../services/transactionCache';

interface User {
  uid: string;
  email: string;
  name: string;
  photoURL: string;
  role: 'admin' | 'manager' | 'viewer' | 'approver' | 'pending';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
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
          email: newUser.email,
          name: newUser.name,
          photoURL: firebaseUser.photoURL || '',
          role: newUser.role as 'admin' | 'manager' | 'viewer' | 'pending'
        };
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      return null;
    }
  };

  // Monitorar mudanças de autenticação do Firebase
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Restaura sessão Supabase para que RLS funcione (ex: reload de página)
        try {
          const idToken = await firebaseUser.getIdToken();
          await supabase.auth.signInWithIdToken({ provider: 'firebase', token: idToken });
        } catch (err) {
          console.warn('⚠️ Supabase signInWithIdToken falhou:', err);
        }
        const userData = await fetchUserData(firebaseUser);
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      console.log('🔐 Iniciando login com Google...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ Login Google bem-sucedido:', result.user.email);
      // Assinar na sessão Supabase para que RLS funcione com auth.email()
      try {
        const idToken = await result.user.getIdToken();
        await supabase.auth.signInWithIdToken({ provider: 'firebase', token: idToken });
        console.log('✅ Sessão Supabase estabelecida');
      } catch (err) {
        console.warn('⚠️ Supabase signInWithIdToken falhou:', err);
      }
      const userData = await fetchUserData(result.user);
      console.log('✅ Dados do usuário carregados:', userData);
      setUser(userData);
    } catch (error: any) {
      console.error('❌ Erro completo ao fazer login:', error);
      console.error('Código do erro:', error.code);
      console.error('Mensagem do erro:', error.message);

      if (error.code === 'auth/popup-closed-by-user') {
        alert('Login cancelado. Tente novamente.');
      } else if (error.code === 'auth/network-request-failed') {
        alert('Erro de conexão. Verifique sua internet e tente novamente.');
      } else if (error.code === 'auth/configuration-not-found' || error.message.includes('auth/invalid-api-key')) {
        alert('⚠️ Firebase não configurado!\n\nPara habilitar o login com Google, configure o Firebase:\n\n1. Acesse: https://console.firebase.google.com\n2. Crie/selecione projeto\n3. Ative Authentication > Google\n4. Configure as credenciais no arquivo .env');
        console.error('🔴 FIREBASE NÃO CONFIGURADO - Siga as instruções em INSTRUCOES-FIREBASE.md');
      } else {
        alert(`Erro ao fazer login: ${error.message}\n\nVerifique o console para mais detalhes.`);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
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
    signInWithGoogle,
    signOut,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager' || user?.role === 'admin',
    isApprover: user?.role === 'approver' || user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
