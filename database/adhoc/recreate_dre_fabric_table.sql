-- SQL para RECRIAR a tabela dre_fabric no Supabase com a estrutura correta
-- Execute este script no SQL Editor do Supabase (https://app.supabase.com)

-- 1. Dropar tabela antiga (CUIDADO: isso apaga todos os dados!)
DROP TABLE IF EXISTS dre_fabric CASCADE;

-- 2. Criar tabela com nova estrutura
CREATE TABLE dre_fabric (
    id BIGSERIAL PRIMARY KEY,
    chave TEXT,
    codlote TEXT,
    cia TEXT,
    filial TEXT,
    integraaplicacao TEXT,
    idlancamento BIGINT,
    idpartida TEXT,
    ticket TEXT,
    data DATE,
    fornecedor_padrao TEXT,
    fornecedor_original TEXT,
    anomes TEXT,
    valor NUMERIC,
    complemento TEXT,
    conta TEXT,
    tag01 TEXT,
    codcoligada INTEGER,
    codfilial INTEGER,
    usuario TEXT,
    codigofornecedor TEXT,
    integrachave_tratada TEXT,
    status_lanc_financeiro TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_dre_fabric_chave ON dre_fabric(chave);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_anomes ON dre_fabric(anomes);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_codcoligada ON dre_fabric(codcoligada);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_fornecedor ON dre_fabric(fornecedor_padrao);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_conta ON dre_fabric(conta);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_tag01 ON dre_fabric(tag01);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_data ON dre_fabric(data);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_idlancamento ON dre_fabric(idlancamento);

-- 4. Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dre_fabric_updated_at
    BEFORE UPDATE ON dre_fabric
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Comentários nas colunas para documentação
COMMENT ON TABLE dre_fabric IS 'Dados de lançamentos financeiros extraídos do Microsoft Fabric Data Warehouse';
COMMENT ON COLUMN dre_fabric.chave IS 'Chave única do lançamento (IDLANCAMENTO + IDPARTIDA)';
COMMENT ON COLUMN dre_fabric.anomes IS 'Ano e mês no formato YYYYMM';
COMMENT ON COLUMN dre_fabric.valor IS 'Valor do lançamento financeiro';
COMMENT ON COLUMN dre_fabric.conta IS 'Código da conta contábil (será usado para JOIN com conta_contabil)';

SELECT 'Tabela dre_fabric recriada com sucesso!' AS status;
