-- Suporte a anexos em mensagens de solicitações e análises DRE
-- Executar uma vez no Supabase SQL Editor

-- 1. Coluna attachments nas mensagens
ALTER TABLE dre_inquiry_messages
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 2. Coluna attachments nas análises
ALTER TABLE dre_analyses
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 3. Criar bucket de storage público (10 MB por arquivo)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  10485760,
  ARRAY[
    'image/jpeg','image/jpg','image/png','image/gif','image/webp','image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    'text/csv',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip','application/x-zip-compressed',
    'text/xml','application/xml',
    'application/json',
    'message/rfc822',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 4. Políticas RLS para storage
DO $$
BEGIN
  -- Leitura pública
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'chat-attachments read public'
  ) THEN
    EXECUTE 'CREATE POLICY "chat-attachments read public" ON storage.objects
      FOR SELECT USING (bucket_id = ''chat-attachments'')';
  END IF;

  -- Upload por usuários autenticados
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'chat-attachments upload auth'
  ) THEN
    EXECUTE 'CREATE POLICY "chat-attachments upload auth" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = ''chat-attachments'' AND auth.role() = ''authenticated''
      )';
  END IF;

  -- Delete por usuários autenticados
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'chat-attachments delete auth'
  ) THEN
    EXECUTE 'CREATE POLICY "chat-attachments delete auth" ON storage.objects
      FOR DELETE USING (
        bucket_id = ''chat-attachments'' AND auth.role() = ''authenticated''
      )';
  END IF;
END $$;
