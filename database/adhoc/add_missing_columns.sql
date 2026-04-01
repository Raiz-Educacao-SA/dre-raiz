-- Adicionar colunas faltantes na tabela transactions
-- Execute este script no SQL Editor do Supabase
-- Data: 2026-02-03

BEGIN;

-- 1. Adicionar coluna VENDOR (Fornecedor)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS vendor TEXT;

-- 2. Adicionar coluna TICKET (Número do Ticket/Protocolo)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS ticket TEXT;

-- 3. Adicionar coluna NAT_ORC (Natureza Orçamentária)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS nat_orc TEXT;

-- 4. Adicionar coluna RECURRING (Recorrência) - já existe no código mas pode faltar no DB
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS recurring TEXT;

-- 5. Criar índices para melhor performance (opcional mas recomendado)
CREATE INDEX IF NOT EXISTS idx_transactions_vendor ON transactions(vendor);
CREATE INDEX IF NOT EXISTS idx_transactions_ticket ON transactions(ticket);
CREATE INDEX IF NOT EXISTS idx_transactions_nat_orc ON transactions(nat_orc);

-- 6. Adicionar comentários nas colunas (documentação)
COMMENT ON COLUMN transactions.vendor IS 'Fornecedor ou prestador de serviço';
COMMENT ON COLUMN transactions.ticket IS 'Número do ticket/protocolo de solicitação';
COMMENT ON COLUMN transactions.nat_orc IS 'Natureza orçamentária da despesa';
COMMENT ON COLUMN transactions.recurring IS 'Indicador de recorrência (Sim/Não)';

-- 7. Verificação - Listar todas as colunas da tabela
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

COMMIT;

-- Mensagem de sucesso
SELECT 'Colunas adicionadas com sucesso!' as status,
       'vendor, ticket, nat_orc, recurring' as colunas_adicionadas;
