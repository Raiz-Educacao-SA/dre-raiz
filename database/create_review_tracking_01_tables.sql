-- ============================================================
-- REVIEW TRACKING — Parte 1: Tabelas
-- Rodar PRIMEIRO
-- ============================================================

-- 1. Watermark: 1 row por usuario, grava "revisei tudo ate aqui"
CREATE TABLE IF NOT EXISTS user_review_watermark (
  user_id   UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Seen: rastreia quais transacoes individuais o usuario ja viu (pos-watermark)
CREATE TABLE IF NOT EXISTS user_transaction_seen (
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL,
  seen_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, transaction_id)
);

-- Index para limpeza periodica e queries por usuario
CREATE INDEX IF NOT EXISTS idx_uts_user_id ON user_transaction_seen(user_id);
CREATE INDEX IF NOT EXISTS idx_uts_seen_at ON user_transaction_seen(seen_at);

-- ============================================================
-- RLS — usuario so acessa seus proprios dados
-- ============================================================

ALTER TABLE user_review_watermark ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_transaction_seen ENABLE ROW LEVEL SECURITY;

-- Watermark: SELECT/INSERT/UPDATE proprio
CREATE POLICY "watermark_select_own" ON user_review_watermark
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE email = auth.email())
  );

CREATE POLICY "watermark_insert_own" ON user_review_watermark
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE email = auth.email())
  );

CREATE POLICY "watermark_update_own" ON user_review_watermark
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE email = auth.email())
  );

-- Admin: acesso total ao watermark (para dashboards futuros)
CREATE POLICY "watermark_admin_all" ON user_review_watermark
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- Seen: SELECT/INSERT/DELETE proprio
CREATE POLICY "seen_select_own" ON user_transaction_seen
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE email = auth.email())
  );

CREATE POLICY "seen_insert_own" ON user_transaction_seen
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE email = auth.email())
  );

CREATE POLICY "seen_delete_own" ON user_transaction_seen
  FOR DELETE USING (
    user_id = (SELECT id FROM users WHERE email = auth.email())
  );

-- Admin: acesso total ao seen
CREATE POLICY "seen_admin_all" ON user_transaction_seen
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );
