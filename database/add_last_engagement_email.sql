-- Adicionar coluna para rastrear ultimo email de engajamento enviado
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_engagement_email_at TIMESTAMPTZ;

-- Atualizar RPC para retornar a nova coluna
DROP FUNCTION IF EXISTS get_engagement_stats();

CREATE OR REPLACE FUNCTION get_engagement_stats()
RETURNS TABLE (
  user_id TEXT,
  email TEXT,
  name TEXT,
  photo_url TEXT,
  role TEXT,
  user_since TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  total_sessions_7d BIGINT,
  total_minutes_7d INTEGER,
  active_days_7d BIGINT,
  last_session_at TIMESTAMPTZ,
  days_since_last_access INTEGER,
  last_engagement_email_at TIMESTAMPTZ
)
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT
    u.id::text AS user_id, u.email, u.name, u.photo_url, u.role,
    u.created_at AS user_since, u.last_login::timestamptz,
    COALESCE(s7.total_sessions_7d, 0),
    COALESCE(s7.total_minutes_7d, 0),
    COALESCE(s7.active_days_7d, 0),
    s7.last_session_at,
    EXTRACT(DAY FROM (now() - COALESCE(s7.last_session_at, u.last_login::timestamptz, u.created_at)))::INTEGER,
    u.last_engagement_email_at
  FROM users u
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total_sessions_7d,
      COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at, last_heartbeat) - started_at)) / 60), 0)::INTEGER AS total_minutes_7d,
      COUNT(DISTINCT started_at::date) AS active_days_7d,
      MAX(started_at) AS last_session_at
    FROM user_sessions WHERE user_sessions.user_id = u.id AND started_at >= now() - INTERVAL '7 days'
  ) s7 ON true
  WHERE u.role != 'pending'
  ORDER BY COALESCE(s7.total_minutes_7d, 0) DESC;
$$;

-- RPC para marcar que email de engajamento foi enviado
CREATE OR REPLACE FUNCTION mark_engagement_email_sent(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users SET last_engagement_email_at = now() WHERE id = p_user_id::uuid;
END;
$$;
