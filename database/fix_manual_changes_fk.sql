-- Remove FK constraint que impede manual_changes de referenciar
-- transactions_orcado e transactions_ano_anterior.
-- O transaction_id pode vir de qualquer uma das 3 tabelas.

ALTER TABLE manual_changes
  DROP CONSTRAINT IF EXISTS manual_changes_transaction_id_fkey;
