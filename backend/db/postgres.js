import pg from 'pg';

const { Pool } = pg;

function hasSslModeRequire(connectionString) {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get('sslmode');
    return sslMode === 'require' || sslMode === 'verify-full' || sslMode === 'verify-ca';
  } catch (e) {
    return false;
  }
}

function translateQuestionMarksToPg(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function rewriteSqliteSyntaxForPostgres(sql) {
  let out = sql;

  if (/^\s*INSERT\s+OR\s+IGNORE\s+/i.test(out)) {
    out = out.replace(/^\s*INSERT\s+OR\s+IGNORE\s+/i, 'INSERT ');
    if (!/\bON\s+CONFLICT\b/i.test(out)) {
      out = out.replace(/;\s*$/, '');
      out += ' ON CONFLICT DO NOTHING';
    }
  }

  // datetime('now', $n) => now() + ($n)::interval
  out = out.replace(/datetime\('now',\s*\$(\d+)\)/gi, "now() + ($$$1)::interval");

  return out;
}

function isInsertStatement(sql) {
  return /^\s*INSERT\b/i.test(sql);
}

function hasReturningClause(sql) {
  return /\bRETURNING\b/i.test(sql);
}

// Best-effort: if an INSERT doesn't specify RETURNING, add RETURNING id
// so callers that expect .lastID keep working (admin/farmer creation, etc.).
function addReturningIdIfMissing(sql) {
  if (!isInsertStatement(sql) || hasReturningClause(sql)) return sql;
  return `${sql.replace(/;\s*$/, '')} RETURNING id`;
}

export function createPostgresPoolFromEnv() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.VERCEL_POSTGRES_URL;

  if (!connectionString) {
    throw new Error('Postgres connection string missing. Set DATABASE_URL or POSTGRES_URL.');
  }

  const ssl =
    process.env.PGSSLMODE === 'disable'
      ? undefined
      : (process.env.VERCEL || hasSslModeRequire(connectionString))
        ? { rejectUnauthorized: false }
        : undefined;

  return new Pool({
    connectionString,
    ssl
  });
}

export function createPostgresDbAsync(pool) {
  const dbAsync = {
    dialect: 'postgres',
    async run(sql, params = []) {
      const withPgParams = translateQuestionMarksToPg(sql);
      const rewritten = addReturningIdIfMissing(rewriteSqliteSyntaxForPostgres(withPgParams));
      const result = await pool.query(rewritten, params);
      const lastID = result?.rows?.[0]?.id ?? null;
      return {
        lastID,
        changes: result.rowCount || 0,
        rows: result.rows || []
      };
    },
    async get(sql, params = []) {
      const withPgParams = translateQuestionMarksToPg(sql);
      const rewritten = rewriteSqliteSyntaxForPostgres(withPgParams);
      const result = await pool.query(rewritten, params);
      return result.rows[0];
    },
    async all(sql, params = []) {
      const withPgParams = translateQuestionMarksToPg(sql);
      const rewritten = rewriteSqliteSyntaxForPostgres(withPgParams);
      const result = await pool.query(rewritten, params);
      return result.rows;
    },
    async close() {
      await pool.end();
    }
  };

  return dbAsync;
}
