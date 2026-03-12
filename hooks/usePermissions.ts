import { useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserPermissions as getGlobalPermissions } from '../services/permissionsService';
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

// Referências estáveis para evitar re-renders infinitos em useCallback/useMemo deps
const EMPTY_PERMS: Permission[] = [];
const EMPTY_STRINGS: string[] = [];
const IDENTITY_FILTER = (transactions: Transaction[]) => transactions;
const ALWAYS_TRUE = () => true as const;

/**
 * Hook que lê permissões do singleton global (já carregado pelo AuthContext).
 * NÃO faz chamadas ao Supabase — elimina roundtrips duplicados.
 */
export const usePermissions = (): UsePermissionsReturn => {
  const { user, loading: authLoading, isAdmin } = useAuth();

  // Ler do singleton preenchido pelo AuthContext.fetchUserData
  const globalPerms = getGlobalPermissions();

  // loading = true enquanto AuthContext ainda não terminou
  const loading = authLoading;

  const allowedMarcas = useMemo(() => globalPerms.allowedMarcas, [globalPerms]);
  const allowedFiliais = useMemo(() => globalPerms.allowedFiliais, [globalPerms]);
  const allowedCategories = useMemo(() => globalPerms.allowedCategories, [globalPerms]);
  const allowedTag01 = useMemo(() => globalPerms.allowedTag01, [globalPerms]);
  const allowedTag02 = useMemo(() => globalPerms.allowedTag02, [globalPerms]);
  const allowedTag03 = useMemo(() => globalPerms.allowedTag03, [globalPerms]);
  const hasPermissions = globalPerms.hasPermissions;

  // Admin sempre tem acesso total
  const canAccess = useCallback((transaction: Transaction): boolean => {
    if (isAdmin || !hasPermissions) return true;

    if (allowedFiliais.length > 0) {
      if (!transaction.filial || !allowedFiliais.includes(transaction.filial)) return false;
    }
    if (allowedMarcas.length > 0) {
      if (!transaction.marca || !allowedMarcas.includes(transaction.marca)) return false;
    }
    if (allowedCategories.length > 0) {
      if (!transaction.category || !allowedCategories.includes(transaction.category)) return false;
    }
    if (allowedTag01.length > 0) {
      if (!transaction.tag01 || !allowedTag01.includes(transaction.tag01)) return false;
    }
    if (allowedTag02.length > 0) {
      if (!transaction.tag02 || !allowedTag02.includes(transaction.tag02)) return false;
    }
    if (allowedTag03.length > 0) {
      if (!transaction.tag03 || !allowedTag03.includes(transaction.tag03)) return false;
    }
    return true;
  }, [isAdmin, hasPermissions, allowedMarcas, allowedFiliais, allowedCategories, allowedTag01, allowedTag02, allowedTag03]);

  const filterTransactions = useCallback((transactions: Transaction[]): Transaction[] => {
    if (isAdmin || !hasPermissions) return transactions;
    return transactions.filter(canAccess);
  }, [isAdmin, hasPermissions, canAccess]);

  if (isAdmin) {
    return {
      permissions: EMPTY_PERMS,
      loading,
      canAccess: ALWAYS_TRUE,
      filterTransactions: IDENTITY_FILTER,
      hasPermissions: false,
      allowedMarcas: EMPTY_STRINGS,
      allowedFiliais: EMPTY_STRINGS,
      allowedCategories: EMPTY_STRINGS,
      allowedTag01: EMPTY_STRINGS,
      allowedTag02: EMPTY_STRINGS,
      allowedTag03: EMPTY_STRINGS
    };
  }

  if (!hasPermissions) {
    return {
      permissions: EMPTY_PERMS,
      loading,
      canAccess: ALWAYS_TRUE,
      filterTransactions: IDENTITY_FILTER,
      hasPermissions: false,
      allowedMarcas: EMPTY_STRINGS,
      allowedFiliais: EMPTY_STRINGS,
      allowedCategories: EMPTY_STRINGS,
      allowedTag01: EMPTY_STRINGS,
      allowedTag02: EMPTY_STRINGS,
      allowedTag03: EMPTY_STRINGS
    };
  }

  return {
    permissions: [],
    loading,
    canAccess,
    filterTransactions,
    hasPermissions: true,
    allowedMarcas,
    allowedFiliais,
    allowedCategories,
    allowedTag01,
    allowedTag02,
    allowedTag03
  };
};
