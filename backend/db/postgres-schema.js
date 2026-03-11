import { seedDefaultPermissionsPgSafe } from '../admin-database.js';

const STATEMENTS = [
  // Core app tables
  `CREATE TABLE IF NOT EXISTS farmers (
    id BIGSERIAL PRIMARY KEY,
    phone_number TEXT UNIQUE,
    sub_county TEXT,
    soil_type TEXT,
    preferred_language TEXT DEFAULT 'english',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS predictions (
    id BIGSERIAL PRIMARY KEY,
    farmer_id BIGINT REFERENCES farmers(id),
    phone_number TEXT,
    sub_county TEXT,
    soil_type TEXT,
    season TEXT,
    predicted_crop TEXT,
    confidence INTEGER,
    model_version TEXT DEFAULT 'rule-engine-v1.0.0',
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS feedback (
    id BIGSERIAL PRIMARY KEY,
    prediction_id BIGINT REFERENCES predictions(id),
    phone_number TEXT,
    is_helpful INTEGER,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS historical_observations (
    id BIGSERIAL PRIMARY KEY,
    sub_county TEXT NOT NULL,
    season TEXT NOT NULL,
    soil_type TEXT NOT NULL,
    crop TEXT NOT NULL,
    observation_date TEXT NOT NULL,
    soil_ph DOUBLE PRECISION NOT NULL,
    nitrogen DOUBLE PRECISION,
    phosphorus DOUBLE PRECISION,
    potassium DOUBLE PRECISION,
    organic_matter DOUBLE PRECISION,
    rainfall_mm DOUBLE PRECISION NOT NULL,
    yield_tons_per_ha DOUBLE PRECISION NOT NULL,
    pest_incidents INTEGER NOT NULL DEFAULT 0,
    market_price_ksh_per_kg DOUBLE PRECISION NOT NULL,
    input_cost_ksh DOUBLE PRECISION NOT NULL,
    source TEXT NOT NULL,
    dedupe_signature TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS weather_observations (
    id BIGSERIAL PRIMARY KEY,
    sub_county TEXT NOT NULL,
    observation_date TEXT NOT NULL,
    rainfall_mm DOUBLE PRECISION,
    temperature_c DOUBLE PRECISION,
    humidity_pct DOUBLE PRECISION,
    source TEXT NOT NULL DEFAULT 'open_meteo',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS soil_samples (
    id BIGSERIAL PRIMARY KEY,
    sub_county TEXT NOT NULL,
    soil_type TEXT,
    sample_date TEXT NOT NULL,
    ph DOUBLE PRECISION,
    organic_carbon_pct DOUBLE PRECISION,
    nitrogen_pct DOUBLE PRECISION,
    phosphorus_mgkg DOUBLE PRECISION,
    potassium_mgkg DOUBLE PRECISION,
    source TEXT NOT NULL DEFAULT 'soilgrids',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS market_prices (
    id BIGSERIAL PRIMARY KEY,
    sub_county TEXT NOT NULL,
    market_center TEXT,
    crop TEXT NOT NULL,
    price_ksh_per_kg DOUBLE PRECISION NOT NULL,
    trend TEXT DEFAULT 'stable',
    price_date TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'market_api',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS yield_outcomes (
    id BIGSERIAL PRIMARY KEY,
    farmer_id TEXT,
    sub_county TEXT NOT NULL,
    season TEXT NOT NULL,
    crop TEXT NOT NULL,
    planting_date TEXT,
    harvest_date TEXT,
    farm_size_ha DOUBLE PRECISION,
    yield_ton_per_ha DOUBLE PRECISION,
    input_cost_ksh DOUBLE PRECISION,
    revenue_ksh DOUBLE PRECISION,
    profit_ksh DOUBLE PRECISION,
    source TEXT NOT NULL DEFAULT 'farmer_reported',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Admin tables
  `CREATE TABLE IF NOT EXISTS admin_users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT DEFAULT 'admin',
    mfa_enabled INTEGER DEFAULT 0,
    mfa_secret TEXT,
    status TEXT DEFAULT 'active',
    last_login TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS mfa_tokens (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(admin_id, token)
  )`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    session_id TEXT UNIQUE NOT NULL,
    csrf_token TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS system_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
    email TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details TEXT,
    status TEXT DEFAULT 'success',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS system_alerts (
    id BIGSERIAL PRIMARY KEY,
    alert_type TEXT NOT NULL,
    severity TEXT DEFAULT 'warning',
    title TEXT NOT NULL,
    message TEXT,
    triggered_by TEXT,
    resolved INTEGER DEFAULT 0,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS system_config (
    id BIGSERIAL PRIMARY KEY,
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT,
    data_type TEXT DEFAULT 'string',
    modified_by TEXT,
    modified_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS admin_permissions (
    id BIGSERIAL PRIMARY KEY,
    role TEXT NOT NULL,
    permission TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, permission)
  )`,

  // Enhanced farmer profile tables (subset used by farmer dashboard / auth)
  `CREATE TABLE IF NOT EXISTS farmer_profiles (
    id BIGSERIAL PRIMARY KEY,
    farmer_id TEXT UNIQUE NOT NULL,
    phone_number TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    date_of_birth TEXT,
    gender TEXT,
    id_number TEXT,
    national_id_type TEXT DEFAULT 'national_id',
    sub_county TEXT NOT NULL,
    ward TEXT,
    soil_type TEXT,
    farm_size DOUBLE PRECISION,
    farm_size_unit TEXT DEFAULT 'acres',
    water_source TEXT,
    water_source_type TEXT,
    crops_grown TEXT,
    livestock_kept TEXT,
    annual_income DOUBLE PRECISION,
    budget DOUBLE PRECISION,
    preferred_language TEXT DEFAULT 'english',
    contact_method TEXT DEFAULT 'sms',
    passport_photo_data BYTEA,
    passport_photo_url TEXT,
    passport_photo_mime_type TEXT,
    photo_uploaded_date TIMESTAMPTZ,
    profile_completion_percentage INTEGER DEFAULT 0,
    profile_verified INTEGER DEFAULT 0,
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    is_active INTEGER DEFAULT 1,
    last_updated_by TEXT,
    last_login TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS farmer_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    farmer_id TEXT NOT NULL REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    description TEXT,
    metadata TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS farmer_farms (
    id BIGSERIAL PRIMARY KEY,
    farmer_id TEXT NOT NULL REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE,
    farm_name TEXT,
    farm_location TEXT,
    farm_size DOUBLE PRECISION,
    farm_size_unit TEXT DEFAULT 'acres',
    soil_type TEXT,
    water_source TEXT,
    terrain_type TEXT,
    registration_number TEXT,
    is_primary INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS farmer_sessions (
    id BIGSERIAL PRIMARY KEY,
    farmer_id TEXT NOT NULL REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE,
    session_id TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'farmer',
    ip_address TEXT,
    user_agent TEXT,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS farmer_password_resets (
    id BIGSERIAL PRIMARY KEY,
    farmer_id TEXT NOT NULL REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE,
    reset_code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS farmer_security_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    farmer_id TEXT,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT DEFAULT 'success',
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Group registration tables
  `CREATE TABLE IF NOT EXISTS farmer_groups (
    id BIGSERIAL PRIMARY KEY,
    group_name TEXT NOT NULL,
    group_reg_number TEXT,
    group_description TEXT,
    leader_first_name TEXT NOT NULL,
    leader_last_name TEXT NOT NULL,
    leader_phone TEXT UNIQUE NOT NULL,
    leader_email TEXT,
    sub_county TEXT NOT NULL,
    ward TEXT,
    leader_photo_url TEXT,
    leader_photo_mime_type TEXT,
    password_hash TEXT,
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active INTEGER DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS group_members (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES farmer_groups(id) ON DELETE CASCADE,
    member_name TEXT NOT NULL,
    member_phone TEXT NOT NULL,
    farm_size DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Indexes (minimal set)
  `CREATE INDEX IF NOT EXISTS idx_predictions_phone ON predictions(phone_number)`,
  `CREATE INDEX IF NOT EXISTS idx_predictions_created ON predictions(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id)`,
  `CREATE INDEX IF NOT EXISTS idx_system_audit_logs_created ON system_audit_logs(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_farmer_sessions_session ON farmer_sessions(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_farmer_profiles_phone ON farmer_profiles(phone_number)`,
  `CREATE INDEX IF NOT EXISTS idx_farmer_activity_logs_farmer ON farmer_activity_logs(farmer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_farmer_farms_farmer ON farmer_farms(farmer_id)`
];

export async function ensurePostgresSchema(dbAsync) {
  // Run sequentially to keep error messages understandable.
  for (const stmt of STATEMENTS) {
    // Each statement uses Postgres syntax already.
    await dbAsync.run(stmt);
  }

  // Seed admin permissions (idempotent via UNIQUE(role, permission)).
  await seedDefaultPermissionsPgSafe(dbAsync);
}
