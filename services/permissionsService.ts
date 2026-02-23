/**
 * ════════════════════════════════════════════════════════════════
 * SERVIÇO CENTRALIZADO DE PERMISSÕES
 * ════════════════════════════════════════════════════════════════
 *
 * Este serviço gerencia permissões de forma GLOBAL e aplica
 * filtros AUTOMATICAMENTE em todas as queries do Supabase.
 *
 * IMPORTANTE:
 * - Permissões são carregadas no LOGIN
 * - TODAS as queries passam por aqui
 * - Se tem permissão configurada, aplica o filtro
 * - Se não tem permissão, retorna TUDO (acesso total)
 * - Admin sempre tem acesso total
 */

export interface UserPermissions {
  isAdmin: boolean;
  hasPermissions: boolean;
  allowedMarcas: string[];
  allowedFiliais: string[];
  allowedCategories: string[];
  allowedTag01: string[];
  allowedTag02: string[];
  allowedTag03: string[];
}

// Estado global de permissões (singleton)
let currentPermissions: UserPermissions | null = null;

/**
 * Define as permissões do usuário atual
 * Chamado após o login
 */
export const setUserPermissions = (permissions: UserPermissions) => {
  currentPermissions = permissions;
  console.log('🔐 Permissões definidas globalmente:', {
    isAdmin: permissions.isAdmin,
    hasPermissions: permissions.hasPermissions,
    allowedMarcas: permissions.allowedMarcas,
    allowedFiliais: permissions.allowedFiliais,
    allowedTag01: permissions.allowedTag01,
    allowedTag02: permissions.allowedTag02,
    allowedTag03: permissions.allowedTag03
  });
};

/**
 * Obtém as permissões do usuário atual
 */
export const getUserPermissions = (): UserPermissions => {
  if (!currentPermissions) {
    console.warn('⚠️ Permissões não carregadas! Retornando acesso total como fallback.');
    return {
      isAdmin: false,
      hasPermissions: false,
      allowedMarcas: [],
      allowedFiliais: [],
      allowedCategories: [],
      allowedTag01: [],
      allowedTag02: [],
      allowedTag03: []
    };
  }
  return currentPermissions;
};

/**
 * Limpa as permissões (logout)
 */
export const clearUserPermissions = () => {
  currentPermissions = null;
  console.log('🔓 Permissões limpas (logout)');
};

/**
 * Aplica filtros de permissão em uma query do Supabase
 * Esta função é chamada AUTOMATICAMENTE por todas as queries
 */
export const applyPermissionFilters = (query: any, options?: {
  skipMarca?: boolean;
  skipFilial?: boolean;
  skipTag01?: boolean;
  skipTag02?: boolean;
  skipTag03?: boolean;
  skipCategory?: boolean;
}): any => {
  const permissions = getUserPermissions();

  // Admin ou sem permissões = não aplica filtros
  if (permissions.isAdmin || !permissions.hasPermissions) {
    console.log('🔓 Sem restrições de permissão (admin ou acesso total)');
    return query;
  }

  console.log('🔒 Aplicando filtros de permissão na query...');

  // Aplicar filtro de MARCA (cia)
  if (!options?.skipMarca && permissions.allowedMarcas.length > 0) {
    query = query.in('marca', permissions.allowedMarcas);
    console.log('  ✅ Filtro MARCA:', permissions.allowedMarcas);
  }

  // Aplicar filtro de FILIAL
  if (!options?.skipFilial && permissions.allowedFiliais.length > 0) {
    query = query.in('nome_filial', permissions.allowedFiliais);
    console.log('  ✅ Filtro FILIAL:', permissions.allowedFiliais);
  }

  // Aplicar filtro de TAG01
  if (!options?.skipTag01 && permissions.allowedTag01.length > 0) {
    query = query.in('tag01', permissions.allowedTag01);
    console.log('  ✅ Filtro TAG01:', permissions.allowedTag01);
  }

  // Aplicar filtro de TAG02
  if (!options?.skipTag02 && permissions.allowedTag02.length > 0) {
    query = query.in('tag02', permissions.allowedTag02);
    console.log('  ✅ Filtro TAG02:', permissions.allowedTag02);
  }

  // Aplicar filtro de TAG03
  if (!options?.skipTag03 && permissions.allowedTag03.length > 0) {
    query = query.in('tag03', permissions.allowedTag03);
    console.log('  ✅ Filtro TAG03:', permissions.allowedTag03);
  }

  // Aplicar filtro de CATEGORY
  if (!options?.skipCategory && permissions.allowedCategories.length > 0) {
    query = query.in('category', permissions.allowedCategories);
    console.log('  ✅ Filtro CATEGORY:', permissions.allowedCategories);
  }

  console.log('✅ Filtros de permissão aplicados com sucesso');
  return query;
};

/**
 * Adiciona filtros de permissão ao objeto de filtros
 * Usado em queries que já têm filtros customizados
 */
export const addPermissionFiltersToObject = (filters: any): any => {
  const permissions = getUserPermissions();

  // Admin ou sem permissões = não modifica filtros
  if (permissions.isAdmin || !permissions.hasPermissions) {
    return filters;
  }

  console.log('🔒 Adicionando permissões ao objeto de filtros...');

  // Adicionar MARCA
  if (permissions.allowedMarcas.length > 0) {
    if (filters.marca && filters.marca.length > 0) {
      // Intersecção: manter apenas marcas que o usuário selecionou E tem permissão
      filters.marca = filters.marca.filter((m: string) => permissions.allowedMarcas.includes(m));
    } else {
      filters.marca = permissions.allowedMarcas;
    }
    console.log('  ✅ Marca filtrada:', filters.marca);
  }

  // Adicionar FILIAL
  if (permissions.allowedFiliais.length > 0) {
    if (filters.nome_filial && filters.nome_filial.length > 0) {
      filters.nome_filial = filters.nome_filial.filter((f: string) => permissions.allowedFiliais.includes(f));
    } else {
      filters.nome_filial = permissions.allowedFiliais;
    }
    console.log('  ✅ Filial filtrada:', filters.nome_filial);
  }

  // Adicionar TAG01
  if (permissions.allowedTag01.length > 0) {
    if (filters.tag01 && filters.tag01.length > 0) {
      filters.tag01 = filters.tag01.filter((t: string) => permissions.allowedTag01.includes(t));
    } else {
      filters.tag01 = permissions.allowedTag01;
    }
    console.log('  ✅ TAG01 filtrada:', filters.tag01);
  }

  // Adicionar TAG02
  if (permissions.allowedTag02.length > 0) {
    if (filters.tag02 && filters.tag02.length > 0) {
      filters.tag02 = filters.tag02.filter((t: string) => permissions.allowedTag02.includes(t));
    } else {
      filters.tag02 = permissions.allowedTag02;
    }
    console.log('  ✅ TAG02 filtrada:', filters.tag02);
  }

  // Adicionar TAG03
  if (permissions.allowedTag03.length > 0) {
    if (filters.tag03 && filters.tag03.length > 0) {
      filters.tag03 = filters.tag03.filter((t: string) => permissions.allowedTag03.includes(t));
    } else {
      filters.tag03 = permissions.allowedTag03;
    }
    console.log('  ✅ TAG03 filtrada:', filters.tag03);
  }

  // Adicionar CATEGORY
  if (permissions.allowedCategories.length > 0) {
    if (filters.category && filters.category.length > 0) {
      filters.category = filters.category.filter((c: string) => permissions.allowedCategories.includes(c));
    } else {
      filters.category = permissions.allowedCategories;
    }
    console.log('  ✅ Category filtrada:', filters.category);
  }

  return filters;
};

/**
 * Filtra array de transações baseado em permissões
 * Usado como fallback para dados que já foram carregados
 */
export const filterTransactionsByPermissions = <T extends {
  marca?: string | null;
  filial?: string | null;
  nome_filial?: string | null;
  tag01?: string | null;
  tag02?: string | null;
  tag03?: string | null;
  category?: string | null;
}>(transactions: T[]): T[] => {
  const permissions = getUserPermissions();

  // Admin ou sem permissões = retorna tudo
  if (permissions.isAdmin || !permissions.hasPermissions) {
    return transactions;
  }

  console.log('🔒 Filtrando array de transações por permissões...');

  const filtered = transactions.filter(t => {
    // Verificar MARCA
    if (permissions.allowedMarcas.length > 0) {
      if (!t.marca || !permissions.allowedMarcas.includes(t.marca)) {
        return false;
      }
    }

    // Verificar FILIAL
    if (permissions.allowedFiliais.length > 0) {
      const filial = t.nome_filial || t.filial;
      if (!filial || !permissions.allowedFiliais.includes(filial)) {
        return false;
      }
    }

    // Verificar TAG01
    if (permissions.allowedTag01.length > 0) {
      if (!t.tag01 || !permissions.allowedTag01.includes(t.tag01)) {
        return false;
      }
    }

    // Verificar TAG02
    if (permissions.allowedTag02.length > 0) {
      if (!t.tag02 || !permissions.allowedTag02.includes(t.tag02)) {
        return false;
      }
    }

    // Verificar TAG03
    if (permissions.allowedTag03.length > 0) {
      if (!t.tag03 || !permissions.allowedTag03.includes(t.tag03)) {
        return false;
      }
    }

    // Verificar CATEGORY
    if (permissions.allowedCategories.length > 0) {
      if (!t.category || !permissions.allowedCategories.includes(t.category)) {
        return false;
      }
    }

    return true;
  });

  console.log(`🔒 Filtragem concluída: ${transactions.length} → ${filtered.length} registros`);
  return filtered;
};
