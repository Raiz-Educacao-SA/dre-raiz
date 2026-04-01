-- Schema SQL para Supabase - DRE RAIZ
-- Execute este script no SQL Editor do Supabase

-- Tabela de Transações
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  scenario TEXT NOT NULL,
  status TEXT DEFAULT 'Normal',
  filial TEXT NOT NULL,
  marca TEXT,
  tag01 TEXT,
  tag02 TEXT,
  tag03 TEXT,
  vendor TEXT,
  ticket TEXT,
  nat_orc TEXT,
  recurring TEXT,
  chave_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Mudanças Manuais (Aprovações)
CREATE TABLE IF NOT EXISTS manual_changes (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT NOT NULL,
  justification TEXT NOT NULL,
  status TEXT DEFAULT 'Pendente',
  requested_at TIMESTAMPTZ NOT NULL,
  requested_by TEXT NOT NULL,
  requested_by_name TEXT NOT NULL,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_by_name TEXT,
  original_transaction JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_filial ON transactions(filial);
CREATE INDEX IF NOT EXISTS idx_transactions_marca ON transactions(marca);
CREATE INDEX IF NOT EXISTS idx_transactions_scenario ON transactions(scenario);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_vendor ON transactions(vendor);
CREATE INDEX IF NOT EXISTS idx_transactions_ticket ON transactions(ticket);
CREATE INDEX IF NOT EXISTS idx_transactions_nat_orc ON transactions(nat_orc);
CREATE INDEX IF NOT EXISTS idx_transactions_chave_id ON transactions(chave_id);
CREATE INDEX IF NOT EXISTS idx_manual_changes_status ON manual_changes(status);
CREATE INDEX IF NOT EXISTS idx_manual_changes_transaction_id ON manual_changes(transaction_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manual_changes_updated_at
  BEFORE UPDATE ON manual_changes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_changes ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (ajuste conforme necessário)
-- Por enquanto, permite acesso público para leitura e escrita
-- ATENÇÃO: Em produção, ajuste as políticas conforme suas regras de negócio

CREATE POLICY "Enable read access for all users" ON transactions
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON transactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON transactions
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON transactions
  FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON manual_changes
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON manual_changes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON manual_changes
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON manual_changes
  FOR DELETE USING (true);
