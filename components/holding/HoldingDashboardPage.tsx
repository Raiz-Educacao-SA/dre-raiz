import React, { useState, useEffect, useCallback } from 'react';
import { getUserHolding, getHoldingCompanies } from '../../services/supabaseService';
import type { CompanyFinancialSnapshot } from '../../core/holdingTypes';
import type { PortfolioStressResult } from '../../core/holdingTypes';
import { runPortfolioStressTests } from '../../core/portfolioStressTest';
import HoldingDashboard from './HoldingDashboard';
import { Building2 } from 'lucide-react';

/**
 * Página wrapper para o HoldingDashboard.
 * Responsável por:
 * 1. Buscar o holding do usuário logado
 * 2. Carregar snapshots financeiros das empresas
 * 3. Executar stress tests (pure engine)
 * 4. Passar tudo como props para HoldingDashboard
 */
const HoldingDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [holdingName, setHoldingName] = useState('');
  const [companies, setCompanies] = useState<CompanyFinancialSnapshot[]>([]);
  const [stressResults, setStressResults] = useState<PortfolioStressResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Buscar holding do usuário
      const holding = await getUserHolding();
      if (!holding) {
        setError('Você não está associado a nenhum holding. Peça ao admin para configurar seu acesso.');
        setLoading(false);
        return;
      }

      setHoldingName(holding.name);

      // 2. Buscar empresas com snapshots
      const companiesData = await getHoldingCompanies(holding.id);
      setCompanies(companiesData);

      // 3. Executar stress tests (engine puro, sem I/O)
      if (companiesData.length > 0) {
        const stress = runPortfolioStressTests(companiesData);
        setStressResults(stress);
      }
    } catch (e) {
      console.error('Erro ao carregar holding:', e);
      setError('Erro ao carregar dados do holding. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Building2 className="w-12 h-12 mb-4 opacity-40" />
        <div className="text-lg font-semibold mb-2">Holding Intelligence</div>
        <div className="text-sm text-center max-w-md">{error}</div>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: 'var(--color-primary-500)' }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      {holdingName && (
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" style={{ color: 'var(--color-primary-500)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-gray-900)' }}>{holdingName}</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
            backgroundColor: 'var(--color-primary-50)',
            color: 'var(--color-primary-600)',
          }}>
            {companies.length} empresa{companies.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={loadData}
            className="ml-auto text-xs px-3 py-1.5 rounded-lg font-medium hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: 'var(--color-gray-100)',
              color: 'var(--color-gray-600)',
            }}
          >
            Atualizar
          </button>
        </div>
      )}
      <HoldingDashboard
        companies={companies}
        stressResults={stressResults.length > 0 ? stressResults : undefined}
        loading={loading}
      />
    </div>
  );
};

export default HoldingDashboardPage;
