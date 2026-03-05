import React, { createContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { Transaction } from '../../types';
import { Conflict, PendingOperation, ConnectionStatus } from '../types/sync';
import { operationQueue } from '../services/OperationQueue';
import { syncManager } from '../services/SyncManager';
import { conflictHistory } from '../services/ConflictHistory';
import { syncAuditLog } from '../services/SyncAuditLog';
import * as supabaseService from '../../services/supabaseService';
import { TransactionFilters } from '../../services/supabaseService';
import * as transactionCache from '../../services/transactionCache';
import { auth } from '../../firebase';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TRANSACTIONS CONTEXT - ESTADO GLOBAL DE TRANSAÇÕES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * FASE 1: ✅ Estado centralizado
 * FASE 2: ✅ Optimistic updates
 * FASE 3: ✅ Realtime subscription
 * FASE 4: (futuro) Advanced conflict resolution
 */

export interface TransactionsContextValue {
  // Estado sincronizado
  transactions: Transaction[];
  serverTransactions: Transaction[]; // Cópia do servidor para detecção de conflitos (Fase 4)
  isLoading: boolean;
  isSyncing: boolean;

  // Conflitos e operações pendentes (Fase 4)
  conflicts: Conflict[];
  pendingOperations: PendingOperation[];

  // CRUD operations
  addTransaction: (t: Omit<Transaction, 'id' | 'updated_at'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  bulkAddTransactions: (transactions: Omit<Transaction, 'id' | 'updated_at'>[]) => Promise<void>;

  // Filtros e busca
  applyFilters: (filters: TransactionFilters) => Promise<void>;
  currentFilters: TransactionFilters | null;

  // Resolução de conflitos (Fase 4)
  resolveConflict: (conflictId: string, resolution: 'keep-local' | 'use-server') => void;

  // Status da conexão (Fase 3)
  connectionStatus: ConnectionStatus;

  // Controle de erros
  error: string | null;
  clearError: () => void;
}

export const TransactionsContext = createContext<TransactionsContextValue | null>(null);

interface TransactionsProviderProps {
  children: ReactNode;
}

export const TransactionsProvider: React.FC<TransactionsProviderProps> = ({ children }) => {
  // Estado
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [serverTransactions, setServerTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [currentFilters, setCurrentFilters] = useState<TransactionFilters | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  /**
   * Atualiza lista de operações pendentes do OperationQueue
   */
  const updatePendingOperations = useCallback(() => {
    setPendingOperations(operationQueue.getAll());
  }, []);

  /**
   * Limpa erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Aplica filtros e busca transações do Supabase.
   * ⚡ OPÇÃO C: Stale-While-Revalidate com IndexedDB
   *   1. Se cache válido (< 15min): serve imediatamente + atualiza em background
   *   2. Se cache expirado/ausente: busca do Supabase normalmente + salva no cache
   */
  const applyFilters = useCallback(async (filters: TransactionFilters) => {
    setError(null);
    setCurrentFilters(filters);

    const userId = auth.currentUser?.uid ?? 'anonymous';
    const cacheKey = transactionCache.buildCacheKey(userId, filters as Record<string, unknown>);

    // Verificar cache
    const cached = await transactionCache.getCached(cacheKey, userId);

    if (cached) {
      // ✅ Cache hit: serve imediatamente sem spinner
      console.log(`⚡ [Cache] Hit — ${cached.length} transações do IndexedDB`);
      setTransactions(cached);
      setServerTransactions([...cached]);

      // Atualiza em background (sem bloquear UI)
      supabaseService.getFilteredTransactions(filters).then((response) => {
        const fresh = response.data || [];
        setTransactions(fresh);
        setServerTransactions([...fresh]);
        transactionCache.setCached(cacheKey, userId, fresh);
        console.log(`🔄 [Cache] Background refresh: ${fresh.length} transações`);
      }).catch(() => {
        // Background falhou? dados do cache continuam na UI
      });
      return;
    }

    // Cache miss: busca normal com loading
    setIsLoading(true);
    try {
      console.log('🔍 TransactionsContext: Aplicando filtros (sem cache)', filters);
      const response = await supabaseService.getFilteredTransactions(filters);
      const results = response.data || [];

      console.log(`✅ TransactionsContext: ${results.length} transações carregadas`);
      setTransactions(results);
      setServerTransactions([...results]);

      // Salvar no cache para próximo F5
      transactionCache.setCached(cacheKey, userId, results);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao buscar transações';
      console.error('❌ TransactionsContext: Erro ao aplicar filtros:', errorMsg);
      setError(errorMsg);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Adiciona nova transação (COM OPTIMISTIC UPDATE - Fase 2)
   */
  const addTransaction = useCallback(async (t: Omit<Transaction, 'id' | 'updated_at'>) => {
    setIsSyncing(true);
    setError(null);

    // Criar transação com updated_at e ID temporário
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticTransaction: Transaction = {
      ...t,
      id: tempId,
      updated_at: new Date().toISOString()
    };

    console.log('➕ TransactionsContext: Adicionando transação (optimistic)');

    // [FASE 4] Iniciar rastreamento da operação
    const finishTracking = syncAuditLog.startTracking('INSERT', tempId);

    // 1. OPTIMISTIC UPDATE: Adicionar à UI imediatamente com ID temporário
    setTransactions(prev => [optimisticTransaction, ...prev]);

    // 2. Executar operação no servidor
    try {
      const addedTransaction = await supabaseService.addTransaction(optimisticTransaction);

      // Sucesso: substituir transação temporária pela real
      setTransactions(prev =>
        prev.map(tr => (tr.id === tempId ? addedTransaction : tr))
      );
      setServerTransactions(prev => [addedTransaction, ...prev]);

      // [FASE 4] Registrar sucesso no audit log
      finishTracking('success', {
        dataSnapshot: { id: addedTransaction.id }
      });

      console.log('✅ TransactionsContext: Transação adicionada com sucesso (optimistic)');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao adicionar transação';
      console.error('❌ TransactionsContext: Erro ao adicionar transação:', errorMsg);

      // Rollback: remover transação temporária
      setTransactions(prev => prev.filter(tr => tr.id !== tempId));

      // [FASE 4] Registrar falha no audit log
      finishTracking('failed', { error: errorMsg });

      setError(errorMsg);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Atualiza transação existente (COM OPTIMISTIC UPDATE - Fase 2)
   */
  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    setIsSyncing(true);
    setError(null);

    // Buscar transação atual para ter o updated_at esperado
    const currentTransaction = transactions.find(t => t.id === id);
    if (!currentTransaction) {
      setError('Transação não encontrada no estado local');
      setIsSyncing(false);
      throw new Error('Transação não encontrada no estado local');
    }

    const expectedUpdatedAt = currentTransaction.updated_at;

    // Novo timestamp para a atualização
    const newUpdatedAt = new Date().toISOString();
    const updatesWithTimestamp = {
      ...updates,
      updated_at: newUpdatedAt
    };

    console.log('✏️ TransactionsContext: Atualizando transação (optimistic)', id);

    // [FASE 4] Iniciar rastreamento da operação
    const changedFields = Object.keys(updates);
    const finishTracking = syncAuditLog.startTracking('UPDATE', id);

    // Backup do estado anterior para rollback
    const previousTransactions = [...transactions];

    // 1. OPTIMISTIC UPDATE: Atualizar UI imediatamente
    setTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updatesWithTimestamp } : t))
    );

    // 2. Executar operação com SyncManager
    const result = await syncManager.executeOptimisticUpdate(
      // Operação no servidor
      async () => {
        const result = await supabaseService.updateTransactionWithConflictCheck(
          id,
          updatesWithTimestamp,
          expectedUpdatedAt
        );

        // Se houver conflito, lançar erro para acionar rollback
        if (!result.success && result.conflict) {
          console.warn('⚠️ Conflito detectado no servidor');

          // Criar objeto Conflict
          const conflict = syncManager.createConflict(
            { ...currentTransaction, ...updatesWithTimestamp },
            result.conflict
          );

          // Adicionar aos conflitos
          setConflicts(prev => [...prev, conflict]);

          // [FASE 4] Registrar conflito no audit log
          finishTracking('conflict', {
            conflictId: conflict.id,
            changedFields
          });

          throw new Error('Conflito detectado');
        }

        if (!result.success) {
          throw new Error(result.error || 'Erro ao atualizar transação');
        }

        return result;
      },
      // Rollback em caso de erro
      () => {
        console.log('🔄 TransactionsContext: Executando rollback');
        setTransactions(previousTransactions);
      },
      // Dados da operação para a fila
      {
        type: 'UPDATE',
        transactionId: id,
        data: updatesWithTimestamp
      }
    );

    setIsSyncing(false);

    if (!result.success) {
      // [FASE 4] Registrar falha no audit log
      finishTracking('failed', {
        error: result.error,
        changedFields
      });

      setError(result.error || 'Erro ao atualizar transação');
      throw new Error(result.error);
    }

    // Sucesso: atualizar também serverTransactions
    setServerTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updatesWithTimestamp } : t))
    );

    // [FASE 4] Registrar sucesso no audit log
    finishTracking('success', {
      changedFields,
      dataSnapshot: updatesWithTimestamp
    });

    console.log('✅ TransactionsContext: Transação atualizada com sucesso (optimistic)');
  }, [transactions]);

  /**
   * Deleta transação (COM OPTIMISTIC UPDATE - Fase 2)
   */
  const deleteTransaction = useCallback(async (id: string) => {
    setIsSyncing(true);
    setError(null);

    // Buscar transação para rollback
    const transactionToDelete = transactions.find(t => t.id === id);
    if (!transactionToDelete) {
      setError('Transação não encontrada no estado local');
      setIsSyncing(false);
      throw new Error('Transação não encontrada no estado local');
    }

    console.log('🗑️ TransactionsContext: Deletando transação (optimistic)', id);

    // [FASE 4] Iniciar rastreamento da operação
    const finishTracking = syncAuditLog.startTracking('DELETE', id);

    // Backup para rollback
    const previousTransactions = [...transactions];

    // 1. OPTIMISTIC UPDATE: Remover da UI imediatamente
    setTransactions(prev => prev.filter(t => t.id !== id));

    // 2. Executar operação com SyncManager
    const result = await syncManager.executeOptimisticUpdate(
      // Operação no servidor
      async () => {
        await supabaseService.deleteTransaction(id);
        return true;
      },
      // Rollback em caso de erro
      () => {
        console.log('🔄 TransactionsContext: Executando rollback');
        setTransactions(previousTransactions);
      },
      // Dados da operação para a fila
      {
        type: 'DELETE',
        transactionId: id,
        data: { id }
      }
    );

    setIsSyncing(false);

    if (!result.success) {
      // [FASE 4] Registrar falha no audit log
      finishTracking('failed', { error: result.error });

      setError(result.error || 'Erro ao deletar transação');
      throw new Error(result.error);
    }

    // Sucesso: remover também de serverTransactions
    setServerTransactions(prev => prev.filter(t => t.id !== id));

    // [FASE 4] Registrar sucesso no audit log
    finishTracking('success');

    console.log('✅ TransactionsContext: Transação deletada com sucesso (optimistic)');
  }, [transactions]);

  /**
   * Adiciona múltiplas transações em lote
   */
  const bulkAddTransactions = useCallback(async (newTransactions: Omit<Transaction, 'id' | 'updated_at'>[]) => {
    setIsSyncing(true);
    setError(null);

    try {
      console.log(`➕ TransactionsContext: Adicionando ${newTransactions.length} transações em lote`);

      // Adicionar updated_at a todas as transações
      const transactionsWithTimestamp = newTransactions.map(t => ({
        ...t,
        updated_at: new Date().toISOString()
      }));

      // Adicionar no Supabase
      const addedTransactions = await supabaseService.bulkAddTransactions(transactionsWithTimestamp);

      // Atualizar estado local
      setTransactions(prev => [...addedTransactions, ...prev]);
      setServerTransactions(prev => [...addedTransactions, ...prev]);

      console.log(`✅ TransactionsContext: ${addedTransactions.length} transações adicionadas com sucesso`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao adicionar transações em lote';
      console.error('❌ TransactionsContext: Erro ao adicionar em lote:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Resolve conflito (FASE 4 - Implementado)
   */
  const resolveConflict = useCallback((conflictId: string, resolution: 'keep-local' | 'use-server') => {
    console.log(`🔧 TransactionsContext: Resolvendo conflito ${conflictId} com estratégia ${resolution}`);

    // 1. Buscar conflito
    const conflict = conflicts.find(c => c.id === conflictId);
    if (!conflict) {
      console.warn(`⚠️ TransactionsContext: Conflito ${conflictId} não encontrado`);
      return;
    }

    // 2. Resolver usando ConflictResolver avançado
    const result = syncManager.resolveConflictWithStrategy(conflict, resolution);

    // 3. Aplicar resolução no estado local
    setTransactions(prev =>
      prev.map(t =>
        t.id === conflict.transactionId ? result.resolved : t
      )
    );

    // 4. Aplicar também em serverTransactions
    setServerTransactions(prev =>
      prev.map(t =>
        t.id === conflict.transactionId ? result.resolved : t
      )
    );

    // 5. Remover conflito da lista
    setConflicts(prev => prev.filter(c => c.id !== conflictId));

    // 6. [FASE 4] Registrar no histórico
    const analysis = syncManager.analyzeConflict(conflict);
    const resolutionType: 'keep-local' | 'use-server' | 'auto-merged' =
      result.autoMergedFields?.length ? 'auto-merged' : resolution;

    conflictHistory.recordResolution(
      conflict,
      result.strategy,
      resolutionType,
      result.autoMergedFields,
      analysis.severity,
      result.autoMergedFields?.length ? 'system' : 'user'
    );

    // 7. Log do resultado
    if (result.autoMergedFields?.length) {
      console.log(`✅ TransactionsContext: Conflito resolvido! Campos mesclados: ${result.autoMergedFields.join(', ')}`);
    } else {
      console.log(`✅ TransactionsContext: Conflito resolvido! Versão escolhida: ${resolution}`);
    }
  }, [conflicts]);

  /**
   * Sincroniza status das operações pendentes a cada 10 segundos
   */
  useEffect(() => {
    const interval = setInterval(() => {
      updatePendingOperations();
    }, 10000);

    return () => clearInterval(interval);
  }, [updatePendingOperations]);

  /**
   * Limpa operações antigas com falha a cada 5 minutos
   */
  useEffect(() => {
    const interval = setInterval(() => {
      operationQueue.cleanupOldFailures();
      updatePendingOperations();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [updatePendingOperations]);

  // Ref para pendingOperations — permite acesso atualizado nos callbacks Realtime
  // sem causar re-subscription (pendingOperations muda a cada 1s)
  const pendingOpsRef = useRef(pendingOperations);
  useEffect(() => { pendingOpsRef.current = pendingOperations; }, [pendingOperations]);

  /**
   * FASE 3: Realtime Subscription
   * Inscreve-se em mudanças quando filtros são aplicados
   */
  useEffect(() => {
    // Só subscribir se houver filtros aplicados (usuário fez busca)
    if (!currentFilters) {
      console.log('⏭️ Realtime: Sem filtros, não subscribindo');
      return;
    }

    console.log('📡 Realtime: Iniciando subscription com filtros', currentFilters);
    setConnectionStatus('reconnecting');

    // Criar subscription
    const channel = supabaseService.subscribeToTransactionChanges(
      currentFilters,
      {
        onInsert: (transaction) => {
          console.log('📥 Realtime: Nova transação recebida', transaction.id);

          // Merge inteligente: não adicionar se já existe (evitar duplicatas)
          setTransactions(prev => {
            const exists = prev.some(t => t.id === transaction.id);
            if (exists) {
              console.log('⏭️ Transação já existe, ignorando INSERT');
              return prev;
            }
            return [transaction, ...prev];
          });

          setServerTransactions(prev => {
            const exists = prev.some(t => t.id === transaction.id);
            if (exists) return prev;
            return [transaction, ...prev];
          });

          // [FASE 4] Registrar no audit log
          syncAuditLog.recordOperation(
            'REALTIME_INSERT',
            transaction.id,
            'success'
          );
        },

        onUpdate: (transaction) => {
          console.log('📝 Realtime: Transação atualizada', transaction.id);

          // Merge inteligente: verificar se está em operações pendentes (via ref)
          const isPending = pendingOpsRef.current.some(
            op => op.transactionId === transaction.id && op.status === 'executing'
          );

          if (isPending) {
            console.log('⏭️ Transação está sendo editada localmente, ignorando UPDATE do servidor');
            return;
          }

          // Atualizar nos dois estados
          setTransactions(prev =>
            prev.map(t => (t.id === transaction.id ? transaction : t))
          );

          setServerTransactions(prev =>
            prev.map(t => (t.id === transaction.id ? transaction : t))
          );

          // [FASE 4] Registrar no audit log
          syncAuditLog.recordOperation(
            'REALTIME_UPDATE',
            transaction.id,
            'success'
          );
        },

        onDelete: (id) => {
          console.log('🗑️ Realtime: Transação deletada', id);

          // Merge inteligente: verificar se está em operações pendentes (via ref)
          const isPending = pendingOpsRef.current.some(
            op => op.transactionId === id && op.status === 'executing'
          );

          if (isPending) {
            console.log('⏭️ Transação está sendo deletada localmente, ignorando DELETE do servidor');
            return;
          }

          // Remover dos dois estados
          setTransactions(prev => prev.filter(t => t.id !== id));
          setServerTransactions(prev => prev.filter(t => t.id !== id));

          // [FASE 4] Registrar no audit log
          syncAuditLog.recordOperation(
            'REALTIME_DELETE',
            id,
            'success'
          );
        },

        onError: (error) => {
          console.error('❌ Realtime: Erro', error);
          setConnectionStatus('disconnected');
          setError(error.message);
        }
      }
    );

    // Atualizar status para conectado após subscription
    // (callback do subscribe será chamado quando conectar)
    setTimeout(() => {
      setConnectionStatus('connected');
      console.log('✅ Realtime: Conectado');
    }, 1000);

    // Cleanup: unsubscribe quando filtros mudarem ou componente desmontar
    return () => {
      console.log('🔌 Realtime: Desconectando...');
      if (channel && channel.unsubscribe) {
        channel.unsubscribe();
      }
      setConnectionStatus('disconnected');
    };
  }, [currentFilters]);

  // Valor do contexto
  const value: TransactionsContextValue = {
    transactions,
    serverTransactions,
    isLoading,
    isSyncing,
    conflicts,
    pendingOperations,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    bulkAddTransactions,
    applyFilters,
    currentFilters,
    resolveConflict,
    connectionStatus,
    error,
    clearError
  };

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
};
