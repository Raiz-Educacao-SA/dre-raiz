
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { supabase } from './supabase';
import { User } from './types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configuração de acesso (Allowlist)
// Para testes em ambiente de desenvolvimento, mudamos para permitir gmail.com se necessário
const ALLOWED_DOMAIN: string = "@escolasap.edu.br"; 
const ALLOWED_EMAILS = ["financeiro@raiz.edu.br", "diretoria@raiz.edu.br", "admin@escolasap.edu.br"];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || "";
        const isDomainAllowed = email.endsWith(ALLOWED_DOMAIN);
        const isEmailAllowed = ALLOWED_EMAILS.includes(email);
        
        // Se o domínio for @escolasap.edu.br ou estiver na lista explícita ou for um teste local permissivo
        const isAuthorized = isDomainAllowed || isEmailAllowed || ALLOWED_DOMAIN === "@gmail.com";

        if (isAuthorized) {
          // Sincroniza sessão com Supabase para que auth.email() funcione nas RLS policies
          try {
            const idToken = await firebaseUser.getIdToken();
            await supabase.auth.signInWithIdToken({ provider: 'firebase', token: idToken });
          } catch (supabaseErr) {
            console.error("Erro ao sincronizar sessão com Supabase:", supabaseErr);
          }
          setUser({
            name: firebaseUser.displayName || "Usuário SAP",
            email: email,
            photo: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.displayName || 'U')}&background=911e21&color=fff`,
            role: "Administrador Financeiro"
          });
          setError(null);
        } else {
          signOut(auth);
          setUser(null);
          setError(`Acesso não autorizado para o e-mail: ${email}. Utilize uma conta institucional.`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Erro no observador de Auth:", err);
      setError("Erro de configuração do serviço de autenticação.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Erro no login Firebase:", err);
      if (err.code === 'auth/api-key-not-valid') {
        setError("Chave de API inválida ou Identity Toolkit não ativado no Firebase.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        // Ignorar se o usuário apenas fechou o popup
      } else {
        setError(`Erro ao autenticar: ${err.message}`);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
