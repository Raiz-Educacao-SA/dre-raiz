-- Tabela smtp_config — configuração SMTP global (apenas 1 registro ativo)
-- Executar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS smtp_config (
  id           SERIAL PRIMARY KEY,
  host         TEXT NOT NULL DEFAULT 'email-smtp.sa-east-1.amazonaws.com',
  port         INTEGER NOT NULL DEFAULT 587,
  username     TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  from_name    TEXT NOT NULL DEFAULT 'DRE Raiz',
  from_email   TEXT NOT NULL DEFAULT 'noreply@raizeducacao.com.br',
  use_tls      BOOLEAN NOT NULL DEFAULT TRUE,
  enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_smtp_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_smtp_config_updated_at
  BEFORE UPDATE ON smtp_config
  FOR EACH ROW
  EXECUTE FUNCTION update_smtp_config_updated_at();

-- RLS: select para qualquer autenticado, escrita apenas admin (auth.email() + role check)
ALTER TABLE smtp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "smtp_config_select" ON smtp_config
  FOR SELECT USING (true);

CREATE POLICY "smtp_config_insert_admin" ON smtp_config
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

CREATE POLICY "smtp_config_update_admin" ON smtp_config
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

CREATE POLICY "smtp_config_delete_admin" ON smtp_config
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- Comentário
COMMENT ON TABLE smtp_config IS 'Configuração SMTP global para envio de emails (AWS SES ou outro). Apenas 1 registro ativo.';
