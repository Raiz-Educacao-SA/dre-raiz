-- =============================================================
-- Tabela: user_sessions
-- Rastreia sessoes de uso da plataforma para engajamento
-- =============================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (COALESCE(ended_at, last_heartbeat) - started_at)) / 60
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices para queries de engajamento
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_started_at ON user_sessions(started_at DESC);
CREATE INDEX idx_user_sessions_email ON user_sessions(email);

-- RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Admin pode ver tudo
CREATE POLICY "admin_full_access_sessions" ON user_sessions
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE email = auth.email() AND role = 'admin')
  );

-- Usuario pode inserir/atualizar suas proprias sessoes
CREATE POLICY "user_own_sessions_insert" ON user_sessions
  FOR INSERT
  WITH CHECK (email = auth.email());

CREATE POLICY "user_own_sessions_update" ON user_sessions
  FOR UPDATE
  USING (email = auth.email());

-- Usuario pode ver suas proprias sessoes
CREATE POLICY "user_own_sessions_select" ON user_sessions
  FOR SELECT
  USING (email = auth.email());

-- Grants
GRANT SELECT, INSERT, UPDATE ON user_sessions TO anon, authenticated;

-- =============================================================
-- RPCs SECURITY DEFINER para session tracking (bypassa RLS)
-- =============================================================

CREATE OR REPLACE FUNCTION create_user_session(p_user_id UUID, p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO user_sessions (user_id, email)
  VALUES (p_user_id, p_email)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_session_heartbeat(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_sessions
  SET last_heartbeat = now()
  WHERE id = p_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION end_user_session(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_sessions
  SET ended_at = now(), last_heartbeat = now()
  WHERE id = p_session_id;
END;
$$;

-- RPC para buscar config SMTP (SECURITY DEFINER bypassa RLS)
CREATE OR REPLACE FUNCTION get_smtp_config_for_email()
RETURNS TABLE (
  host TEXT, port INTEGER, username TEXT, password_encrypted TEXT,
  from_name TEXT, from_email TEXT, use_tls BOOLEAN
)
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT host, port, username, password_encrypted, from_name, from_email, use_tls
  FROM smtp_config
  WHERE enabled = true
  ORDER BY updated_at DESC
  LIMIT 1;
$$;

-- =============================================================
-- RPC: get_engagement_stats
-- Estatisticas agregadas de engajamento por usuario (admin only)
-- =============================================================

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
  days_since_last_access INTEGER
)
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT
    u.id::text AS user_id,
    u.email,
    u.name,
    u.photo_url,
    u.role,
    u.created_at AS user_since,
    u.last_login::timestamptz,
    COALESCE(s7.total_sessions_7d, 0) AS total_sessions_7d,
    COALESCE(s7.total_minutes_7d, 0) AS total_minutes_7d,
    COALESCE(s7.active_days_7d, 0) AS active_days_7d,
    s7.last_session_at,
    EXTRACT(DAY FROM (now() - COALESCE(s7.last_session_at, u.last_login::timestamptz, u.created_at)))::INTEGER AS days_since_last_access
  FROM users u
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS total_sessions_7d,
      COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at, last_heartbeat) - started_at)) / 60), 0)::INTEGER AS total_minutes_7d,
      COUNT(DISTINCT started_at::date) AS active_days_7d,
      MAX(started_at) AS last_session_at
    FROM user_sessions
    WHERE user_sessions.user_id = u.id
      AND started_at >= now() - INTERVAL '7 days'
  ) s7 ON true
  WHERE u.role != 'pending'
  ORDER BY COALESCE(s7.total_minutes_7d, 0) DESC;
$$;

-- =============================================================
-- RPC: get_engagement_weekly_history
-- Historico semanal de engajamento (ultimas 5 semanas)
-- =============================================================

CREATE OR REPLACE FUNCTION get_engagement_weekly_history()
RETURNS TABLE (
  user_id TEXT,
  week_start DATE,
  week_label TEXT,
  total_sessions BIGINT,
  total_minutes INTEGER,
  active_days BIGINT
)
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT
    u.id::text AS user_id,
    w.week_start,
    TO_CHAR(w.week_start, 'DD/MM') AS week_label,
    COALESCE(s.total_sessions, 0) AS total_sessions,
    COALESCE(s.total_minutes, 0) AS total_minutes,
    COALESCE(s.active_days, 0) AS active_days
  FROM users u
  CROSS JOIN (
    SELECT generate_series(
      date_trunc('week', CURRENT_DATE) - INTERVAL '4 weeks',
      date_trunc('week', CURRENT_DATE),
      '1 week'
    )::date AS week_start
  ) w
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS total_sessions,
      COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at, last_heartbeat) - started_at)) / 60), 0)::INTEGER AS total_minutes,
      COUNT(DISTINCT started_at::date) AS active_days
    FROM user_sessions
    WHERE user_sessions.user_id = u.id
      AND started_at >= w.week_start
      AND started_at < w.week_start + INTERVAL '7 days'
  ) s ON true
  WHERE u.role != 'pending'
  ORDER BY u.id, w.week_start;
$$;
