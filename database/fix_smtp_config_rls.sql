-- Fix RLS smtp_config: desabilitar RLS (tabela de config global, 1 registro, acesso admin-only no frontend)
-- Executar no Supabase SQL Editor

DROP POLICY IF EXISTS "smtp_config_select_authenticated" ON smtp_config;
DROP POLICY IF EXISTS "smtp_config_insert_authenticated" ON smtp_config;
DROP POLICY IF EXISTS "smtp_config_update_authenticated" ON smtp_config;
DROP POLICY IF EXISTS "smtp_config_delete_authenticated" ON smtp_config;
DROP POLICY IF EXISTS "smtp_config_select" ON smtp_config;
DROP POLICY IF EXISTS "smtp_config_insert_admin" ON smtp_config;
DROP POLICY IF EXISTS "smtp_config_update_admin" ON smtp_config;
DROP POLICY IF EXISTS "smtp_config_delete_admin" ON smtp_config;

ALTER TABLE smtp_config DISABLE ROW LEVEL SECURITY;
