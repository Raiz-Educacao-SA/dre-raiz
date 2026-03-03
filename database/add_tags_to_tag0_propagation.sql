-- ═══════════════════════════════════════════════════════════════════
-- add_tags_to_tag0_propagation.sql
-- Inclui tabela `tags` na propagação automática de tag0
--
-- Situação atual:
--   - trg_auto_tag0_em_tags (ON tags) ✅ — preenche tag0 ao inserir/alterar tag1
--   - fn_propagate_tag0_map_change (ON tag0_map) ❌ — NÃO atualiza tabela tags
--
-- Após este SQL:
--   - fn_propagate_tag0_map_change atualiza as 4 tabelas:
--     transactions, transactions_orcado, transactions_ano_anterior, tags
--
-- EXECUTAR no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- Recriar função de propagação incluindo tabela tags
CREATE OR REPLACE FUNCTION fn_propagate_tag0_map_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Atualiza tag0 nas 3 tabelas de transactions
  UPDATE transactions              SET tag0 = NEW.tag0 WHERE LOWER(TRIM(tag01)) = LOWER(TRIM(NEW.tag1_norm));
  UPDATE transactions_orcado       SET tag0 = NEW.tag0 WHERE LOWER(TRIM(tag01)) = LOWER(TRIM(NEW.tag1_norm));
  UPDATE transactions_ano_anterior SET tag0 = NEW.tag0 WHERE LOWER(TRIM(tag01)) = LOWER(TRIM(NEW.tag1_norm));

  -- Atualiza tag0 na tabela tags (coluna é tag1, não tag01)
  UPDATE tags SET tag0 = NEW.tag0 WHERE LOWER(TRIM(tag1)) = LOWER(TRIM(NEW.tag1_norm));

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_propagate_tag0_map_change() IS 'Propaga mudanças no tag0_map para 4 tabelas: transactions (3) + tags';
