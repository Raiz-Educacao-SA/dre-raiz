-- SQL para criar a tabela dre_fabric no Supabase
-- Execute este script no SQL Editor do Supabase (https://app.supabase.com)

-- Criar tabela
CREATE TABLE IF NOT EXISTS dre_fabric (
    id BIGSERIAL PRIMARY KEY,
    chave TEXT,
    codlote TEXT,
    cia TEXT,
    filial TEXT,
    integraaplicacao TEXT,
    idpartida TEXT,
    ticket TEXT,
    fornecedor_padrao TEXT,
    anomes TEXT,
    valor NUMERIC,
    complemento TEXT,
    recorrente TEXT,
    conta TEXT,
    tag1 TEXT,
    tag2 TEXT,
    tag3 TEXT,
    tag4 TEXT,
    tag_orc TEXT,
    original TEXT,
    r_o TEXT,
    cc TEXT,
    codcoligada INTEGER,
    codfilial INTEGER,
    usuario TEXT,
    conta_original TEXT,
    tag1_original TEXT,
    tag4_original TEXT,
    tagorc_original TEXT,
    integrachave_tratada TEXT,
    status_lanc_financeiro TEXT,
    anomes_original TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_dre_fabric_chave ON dre_fabric(chave);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_anomes ON dre_fabric(anomes);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_codcoligada ON dre_fabric(codcoligada);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_fornecedor ON dre_fabric(fornecedor_padrao);
CREATE INDEX IF NOT EXISTS idx_dre_fabric_tag1 ON dre_fabric(tag1);

-- Criar trigger para atualizar updated_at automaticamente
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

-- Comentários nas colunas para documentação
COMMENT ON TABLE dre_fabric IS 'Dados de lançamentos financeiros extraídos do Microsoft Fabric Data Warehouse';
COMMENT ON COLUMN dre_fabric.chave IS 'Chave única do lançamento (IDLANCAMENTO + IDPARTIDA)';
COMMENT ON COLUMN dre_fabric.anomes IS 'Ano e mês no formato YYYYMM';
COMMENT ON COLUMN dre_fabric.valor IS 'Valor do lançamento financeiro';

-- Habilitar Row Level Security (RLS) - Opcional
-- ALTER TABLE dre_fabric ENABLE ROW LEVEL SECURITY;

-- Política de acesso - permite leitura para todos os usuários autenticados
-- CREATE POLICY "Permitir leitura para usuários autenticados"
--     ON dre_fabric FOR SELECT
--     TO authenticated
--     USING (true);

-- Política de escrita - permite escrita apenas para service_role
-- CREATE POLICY "Permitir escrita para service_role"
--     ON dre_fabric FOR ALL
--     TO service_role
--     USING (true)
--     WITH CHECK (true);

SELECT 'Tabela dre_fabric criada com sucesso!' AS status;
