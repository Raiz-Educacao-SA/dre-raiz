-- ============================================================
-- REVIEW TRACKING — Parte 2: RPCs (SECURITY DEFINER)
-- Rodar DEPOIS das tabelas
-- ============================================================

-- -------------------------------------------------------
-- 1. get_user_watermark: retorna watermark do usuario
--    Se nao existe, retorna NULL (frontend trata como "nunca revisou")
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_watermark(p_user_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT last_reviewed_at
    FROM user_review_watermark
    WHERE user_id = p_user_id
  );
END;
$$;

-- -------------------------------------------------------
-- 2. advance_watermark: "Revisei tudo"
--    UPSERT watermark + limpa seen (tudo vira "antigo")
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION advance_watermark(p_user_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  -- UPSERT watermark
  INSERT INTO user_review_watermark (user_id, last_reviewed_at, updated_at)
  VALUES (p_user_id, v_now, v_now)
  ON CONFLICT (user_id)
  DO UPDATE SET last_reviewed_at = v_now, updated_at = v_now;

  -- Limpar seen — tudo antes do novo watermark e irrelevante
  DELETE FROM user_transaction_seen WHERE user_id = p_user_id;

  RETURN v_now;
END;
$$;

-- -------------------------------------------------------
-- 3. mark_transactions_seen: batch de olhinhos
--    Recebe array de IDs, faz UPSERT (idempotente)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_transactions_seen(
  p_user_id UUID,
  p_transaction_ids TEXT[]
)
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

-- -------------------------------------------------------
-- 4. unmark_transaction_seen: desfazer olhinho individual
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION unmark_transaction_seen(
  p_user_id UUID,
  p_transaction_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_transaction_seen
  WHERE user_id = p_user_id AND transaction_id = p_transaction_id;
END;
$$;

-- -------------------------------------------------------
-- 5. get_seen_transaction_ids: retorna IDs ja vistos
--    (pos-watermark, para montar o Set no frontend)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_seen_transaction_ids(p_user_id UUID)
RETURNS TABLE(transaction_id TEXT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT uts.transaction_id
  FROM user_transaction_seen uts
  WHERE uts.user_id = p_user_id;
END;
$$;

-- -------------------------------------------------------
-- 6. get_new_transactions_count: conta novos desde watermark
--    Usado para badge "N novos" sem carregar dados
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_new_transactions_count(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_watermark TIMESTAMPTZ;
  v_total_new INTEGER;
  v_seen INTEGER;
  v_unseen INTEGER;
BEGIN
  -- Buscar watermark (NULL = nunca revisou = tudo e novo)
  SELECT last_reviewed_at INTO v_watermark
  FROM user_review_watermark
  WHERE user_id = p_user_id;

  -- Se nunca revisou, nao mostrar nada como "novo" (evita flood)
  IF v_watermark IS NULL THEN
    RETURN json_build_object(
      'watermark', NULL,
      'total_new', 0,
      'seen', 0,
      'unseen', 0
    );
  END IF;

  -- Contar transacoes criadas apos watermark
  SELECT COUNT(*) INTO v_total_new
  FROM transactions
  WHERE created_at > v_watermark;

  -- Contar quantas dessas ja foram vistas
  SELECT COUNT(*) INTO v_seen
  FROM user_transaction_seen
  WHERE user_id = p_user_id;

  v_unseen := GREATEST(0, v_total_new - v_seen);

  RETURN json_build_object(
    'watermark', v_watermark,
    'total_new', v_total_new,
    'seen', v_seen,
    'unseen', v_unseen
  );
END;
$$;
