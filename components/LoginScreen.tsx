import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Chrome, Loader2, AlertCircle } from 'lucide-react';

const LoginScreen: React.FC = () => {
  const { signInWithGoogle, loading, authError } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Erro ao fazer login:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B75BB] via-[#1565a8] to-[#0f5490] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 lg:p-12 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#1B75BB] rounded-2xl mb-6">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">DRE RAIZ</h1>
          <p className="text-sm text-gray-500 font-medium">Demonstrativo de Resultados</p>
        </div>

        {authError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border-2 border-gray-200 hover:border-[#1B75BB] hover:bg-blue-50 text-gray-900 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <Chrome size={20} className="text-[#1B75BB]" />
                <span>Entrar com Google</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Apenas usuários autorizados pelo Grupo Raiz podem acessar este sistema.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
