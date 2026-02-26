import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as supabaseService from '../services/supabaseService';
import { Transaction } from '../types';

interface Permission {
  id: string;
  user_id: string;
  permission_type: 'centro_custo' | 'cia' | 'filial' | 'tag01' | 'tag02' | 'tag03';
  permission_value: string;
}

interface UsePermissionsReturn {
  permissions: Permission[];
  loading: boolean;
  canAccess: (transaction: Transaction) => boolean;
  filterTransactions: (transactions: Transaction[]) => Transaction[];
  hasPermissions: boolean;
  allowedMarcas: string[];
  allowedFiliais: string[];
  allowedCategories: string[];
  allowedTag01: string[];
  allowedTag02: string[];
  allowedTag03: string[];
}

export const usePermissions = (): UsePermissionsReturn => {
  const { user, isAdmin } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPermissions = async () => {
      if (!user) {
        console.log('🔒 usePermissions: Nenhum usuário logado');
        setPermissions([]);
        setLoading(false);
        return;
      }

      console.log('🔒 usePermissions: Carregando permissões para', user.email);
      setLoading(true);

      // Buscar o usuário no Supabase para pegar o ID
      const dbUser = await supabaseService.getUserByEmail(user.email);

      if (dbUser) {
        console.log('🔒 usePermissions: Usuário encontrado no banco', { id: dbUser.id, role: dbUser.role });
        const userPermissions = await supabaseService.getUserPermissions(dbUser.id);
        console.log('🔒 usePermissions: Permissões carregadas', userPermissions);
        if (userPermissions.length === 0 && dbUser.role !== 'admin') {
          console.warn('⚠️ usePermissions: ZERO permissões carregadas para usuário não-admin!');
          console.warn('⚠️ Verifique RLS e GRANTs na tabela user_permissions no Supabase.');
        }
        setPermissions(userPermissions);
      } else {
        console.warn('⚠️ usePermissions: Usuário não encontrado no banco Supabase');
      }

      setLoading(false);
    };

    loadPermissions();
  }, [user]);

  // Extrair valores permitidos (memoizados para evitar loops infinitos)
  // ⚠️ IMPORTANTE: useMemo ANTES de qualquer return (Rules of Hooks)
  const allowedMarcas = useMemo(() =>
    permissions
      .filter(p => p.permission_type === 'cia')
      .map(p => p.permission_value.toUpperCase()), // normaliza uppercase para evitar mismatch de case
    [permissions]
  );

  const allowedFiliais = useMemo(() =>
    permissions
      .filter(p => p.permission_type === 'filial')
      .map(p => p.permission_value),
    [permissions]
  );

  const allowedCentroCusto = useMemo(() =>
    permissions
      .filter(p => p.permission_type === 'centro_custo')
      .map(p => p.permission_value),
    [permissions]
  );

  const allowedTag01 = useMemo(() =>
    permissions
      .filter(p => p.permission_type === 'tag01')
      .map(p => p.permission_value),
    [permissions]
  );

  const allowedTag02 = useMemo(() =>
    permissions
      .filter(p => p.permission_type === 'tag02')
      .map(p => p.permission_value),
    [permissions]
  );

  const allowedTag03 = useMemo(() =>
    permissions
      .filter(p => p.permission_type === 'tag03')
      .map(p => p.permission_value),
    [permissions]
  );

  // Verifica se o usuário tem permissões específicas configuradas
  const hasPermissions = permissions.length > 0;

  // Admin sempre tem acesso total
  if (isAdmin) {
    console.log('🔒 usePermissions: Usuário é ADMIN - Acesso Total (sem restrições)');
    return {
      permissions,
      loading,
      canAccess: () => true,
      filterTransactions: (transactions) => {
        console.log('🔒 usePermissions: ADMIN vendo todas transações', transactions.length);
        return transactions;
      },
      hasPermissions: false, // Admin não tem restrições
      allowedMarcas: [],
      allowedFiliais: [],
      allowedCategories: [],
      allowedTag01: [],
      allowedTag02: [],
      allowedTag03: []
    };
  }

  // Se não tem permissões configuradas, tem acesso total
  if (!hasPermissions) {
    console.log('🔒 usePermissions: SEM permissões configuradas - Acesso Total');
    return {
      permissions,
      loading,
      canAccess: () => true,
      filterTransactions: (transactions) => {
        console.log('🔒 usePermissions: SEM PERMISSÕES - vendo todas transações', transactions.length);
        return transactions;
      },
      hasPermissions: false,
      allowedMarcas: [],
      allowedFiliais: [],
      allowedCategories: [],
      allowedTag01: [],
      allowedTag02: [],
      allowedTag03: []
    };
  }

  // Função para verificar se o usuário pode acessar uma transação
  const canAccess = (transaction: Transaction): boolean => {
    // Se tem permissão de filial configurada, verificar
    if (allowedFiliais.length > 0) {
      if (!transaction.filial || !allowedFiliais.includes(transaction.filial)) {
        return false;
      }
    }

    // Se tem permissão de CIA (marca) configurada, verificar
    if (allowedMarcas.length > 0) {
      if (!transaction.marca || !allowedMarcas.includes(transaction.marca)) {
        return false;
      }
    }

    // Se tem permissão de centro de custo configurada, verificar
    // Centro de custo está mapeado para o campo category
    if (allowedCentroCusto.length > 0) {
      if (!transaction.category || !allowedCentroCusto.includes(transaction.category)) {
        return false;
      }
    }

    // Se tem permissão de tag01 configurada, verificar
    if (allowedTag01.length > 0) {
      if (!transaction.tag01 || !allowedTag01.includes(transaction.tag01)) {
        return false;
      }
    }

    // Se tem permissão de tag02 configurada, verificar
    if (allowedTag02.length > 0) {
      if (!transaction.tag02 || !allowedTag02.includes(transaction.tag02)) {
        return false;
      }
    }

    // Se tem permissão de tag03 configurada, verificar
    if (allowedTag03.length > 0) {
      if (!transaction.tag03 || !allowedTag03.includes(transaction.tag03)) {
        return false;
      }
    }

    return true;
  };

  // Função para filtrar lista de transações
  const filterTransactions = (transactions: Transaction[]): Transaction[] => {
    console.log('🔒 usePermissions: Filtrando transações...', {
      total: transactions.length,
      allowedMarcas,
      allowedFiliais,
      allowedCategories: allowedCentroCusto,
      allowedTag01,
      allowedTag02,
      allowedTag03
    });

    const filtered = transactions.filter(canAccess);

    console.log('🔒 usePermissions: Filtragem concluída', {
      totalOriginal: transactions.length,
      totalFiltrado: filtered.length,
      bloqueados: transactions.length - filtered.length
    });

    // Log de amostra das primeiras 3 transações filtradas
    if (filtered.length > 0) {
      console.log('🔒 usePermissions: Amostra de transações permitidas:',
        filtered.slice(0, 3).map(t => ({
          id: t.id,
          description: t.description,
          marca: t.marca,
          filial: t.filial,
          tag01: t.tag01,
          tag02: t.tag02,
          tag03: t.tag03
        }))
      );
    }

    return filtered;
  };

  console.log('🔒 usePermissions: Retornando com permissões ATIVAS', {
    hasPermissions: true,
    totalPermissions: permissions.length,
    allowedMarcas,
    allowedFiliais,
    allowedTag01
  });

  return {
    permissions,
    loading,
    canAccess,
    filterTransactions,
    hasPermissions: true,
    allowedMarcas,
    allowedFiliais,
    allowedCategories: allowedCentroCusto,
    allowedTag01,
    allowedTag02,
    allowedTag03
  };
};
