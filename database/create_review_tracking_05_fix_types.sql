-- ============================================================
-- REVIEW TRACKING — Parte 5: Fix tipos (user_id TEXT, sem FK)
-- O users.id pode ser TEXT ou UUID dependendo do projeto.
-- Para garantir compatibilidade, recriar tabelas com TEXT.
-- ============================================================

-- 1. Dropar tabelas e RPCs existentes
DROP FUNCTION IF EXISTS get_user_watermark(UUID);
DROP FUNCTION IF EXISTS advance_watermark(UUID);
DROP FUNCTION IF EXISTS mark_transactions_seen(UUID, TEXT[]);
DROP FUNCTION IF EXISTS unmark_transaction_seen(UUID, TEXT);
DROP FUNCTION IF EXISTS get_seen_transaction_ids(UUID);
DROP FUNCTION IF EXISTS get_new_transactions_count(UUID);

DROP TABLE IF EXISTS user_transaction_seen CASCADE;
DROP TABLE IF EXISTS user_review_watermark CASCADE;

-- 2. Recriar com TEXT (compativel com qualquer tipo de users.id)
CREATE TABLE user_review_watermark (
  user_id TEXT PRIMARY KEY,
  last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_transaction_seen (
  user_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, transaction_id)
);

CREATE INDEX idx_uts_user_id ON user_transaction_seen(user_id);
CREATE INDEX idx_uts_seen_at ON user_transaction_seen(seen_at);

-- 3. RLS
ALTER TABLE user_review_watermark ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_transaction_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watermark_select_own" ON user_review_watermark
  FOR SELECT USING (user_id = (SELECT id::text FROM users WHERE email = auth.email()));
CREATE POLICY "watermark_insert_own" ON user_review_watermark
  FOR INSERT WITH CHECK (user_id = (SELECT id::text FROM users WHERE email = auth.email()));
CREATE POLICY "watermark_update_own" ON user_review_watermark
  FOR UPDATE USING (user_id = (SELECT id::text FROM users WHERE email = auth.email()));
CREATE POLICY "watermark_admin_all" ON user_review_watermark
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));

CREATE POLICY "seen_select_own" ON user_transaction_seen
  FOR SELECT USING (user_id = (SELECT id::text FROM users WHERE email = auth.email()));
CREATE POLICY "seen_insert_own" ON user_transaction_seen
  FOR INSERT WITH CHECK (user_id = (SELECT id::text FROM users WHERE email = auth.email()));
CREATE POLICY "seen_delete_own" ON user_transaction_seen
  FOR DELETE USING (user_id = (SELECT id::text FROM users WHERE email = auth.email()));
CREATE POLICY "seen_admin_all" ON user_transaction_seen
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin'));

-- 4. RPCs com TEXT em vez de UUID
CREATE OR REPLACE FUNCTION get_user_watermark(p_user_id TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT last_reviewed_at FROM user_review_watermark WHERE user_id = p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION advance_watermark(p_user_id TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  INSERT INTO user_review_watermark (user_id, last_reviewed_at, updated_at)
  VALUES (p_user_id, v_now, v_now)
  ON CONFLICT (user_id)
  DO UPDATE SET last_reviewed_at = v_now, updated_at = v_now;

  DELETE FROM user_transaction_seen WHERE user_id = p_user_id;
  RETURN v_now;
END;
$$;

CREATE OR REPLACE FUNCTION mark_transactions_seen(p_user_id TEXT, p_transaction_ids TEXT[])
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO user_transaction_seen (user_id, transaction_id, seen_at)
  SELECT p_user_id, unnest(p_transaction_ids), now()
  ON CONFLICT (user_id, transaction_id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION unmark_transaction_seen(p_user_id TEXT, p_transaction_id TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_transaction_seen WHERE user_id = p_user_id AND transaction_id = p_transaction_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_seen_transaction_ids(p_user_id TEXT)
RETURNS TABLE(transaction_id TEXT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT uts.transaction_id FROM user_transaction_seen uts WHERE uts.user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_new_transactions_count(p_user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_watermark TIMESTAMPTZ;
  v_total_new INTEGER;
  v_seen INTEGER;
  v_unseen INTEGER;
BEGIN
  SELECT last_reviewed_at INTO v_watermark FROM user_review_watermark WHERE user_id = p_user_id;

  IF v_watermark IS NULL THEN
    RETURN json_build_object('watermark', NULL, 'total_new', 0, 'seen', 0, 'unseen', 0);
  END IF;

  SELECT COUNT(*) INTO v_total_new FROM transactions WHERE created_at > v_watermark;
  SELECT COUNT(*) INTO v_seen FROM user_transaction_seen WHERE user_id = p_user_id;
  v_unseen := GREATEST(0, v_total_new - v_seen);

  RETURN json_build_object('watermark', v_watermark, 'total_new', v_total_new, 'seen', v_seen, 'unseen', v_unseen);
END;
$$;
