import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import RecommendationEngine from './recommendation-engine.js';
import demoData from './demo-data.js';
import adminRoutes from './admin-routes.js';
import farmerRoutes from './farmer-routes.js';
import farmerProfileRoutes from './farmer-profile-routes.js';
import * as adminDB from './admin-database.js';
import * as farmerDB from './farmer-module.js';
import * as farmerProfileDB from './farmer-profile-dashboard.js';
import {
  securityHeaders,
  sanitizeInput,
  enforceHTTPS,
  enforceSameOriginForMutations,
  createRateLimitMiddleware,
  authenticateAdmin
} from './admin-middleware.js';
import { initializeEmailService, sendFarmerPasswordResetEmail } from './email-service.js';
import { enqueueJob, jobQueue } from './job-queue.js';
import metricsCollector from './monitoring/metrics-collector.js';
import kpiTracker from './monitoring/kpi-tracker.js';
import { createPostgresDbAsync, createPostgresPoolFromEnv } from './db/postgres.js';
import { ensurePostgresSchema } from './db/postgres-schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execFileAsync = promisify(execFile);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const IS_VERCEL = Boolean(process.env.VERCEL);
const POSTGRES_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.VERCEL_POSTGRES_URL;
const USE_POSTGRES = Boolean(POSTGRES_URL) || String(process.env.DB_DIALECT || '').toLowerCase() === 'postgres';
const configuredDbPath = process.env.DB_PATH || process.env.DATABASE_PATH;
const DB_FILE = configuredDbPath
  ? path.resolve(configuredDbPath)
  : (IS_VERCEL ? path.join('/tmp', 'fahamu_shamba.db') : path.join(__dirname, 'fahamu_shamba.db'));
const BACKUP_DIR = IS_VERCEL ? path.join('/tmp', 'backups') : path.join(__dirname, 'backups');
const recommendationEngine = new RecommendationEngine();
const ML_MODEL_PATH = path.resolve(__dirname, '..', 'ml', 'models', 'crop_recommender_model.joblib');
const ML_METADATA_PATH = path.resolve(__dirname, '..', 'ml', 'models', 'crop_recommender_metadata.json');
const ML_PREDICT_SCRIPT = path.resolve(__dirname, '..', 'ml', 'scripts', 'predict_top3.py');
const ML_METRICS_PATH = path.resolve(__dirname, '..', 'ml', 'reports', 'model_metrics.json');
const ML_DEMO_SCENARIOS_PATH = path.resolve(__dirname, '..', 'ml', 'reports', 'demo_scenarios.json');

app.disable('x-powered-by');

let db = null;
let dbAsync = null;
let closeDb = async () => {};

function getMlPythonBin() {
  if (process.env.ML_PYTHON_BIN) return process.env.ML_PYTHON_BIN;
  const venvPython = path.resolve(__dirname, '..', '.venv', 'bin', 'python3');
  if (fs.existsSync(venvPython)) return venvPython;
  return 'python3';
}

async function runMlTopRecommendations(inputPayload = {}) {
  if (!fs.existsSync(ML_MODEL_PATH) || !fs.existsSync(ML_METADATA_PATH) || !fs.existsSync(ML_PREDICT_SCRIPT)) {
    return {
      success: false,
      reason: 'ML artifacts not available'
    };
  }

  try {
    const pythonBin = getMlPythonBin();
    const { stdout } = await execFileAsync(
      pythonBin,
      [
        ML_PREDICT_SCRIPT,
        '--model',
        ML_MODEL_PATH,
        '--metadata',
        ML_METADATA_PATH,
        '--input-json',
        JSON.stringify(inputPayload)
      ],
      { timeout: 15000, maxBuffer: 1024 * 1024 }
    );

    const parsed = JSON.parse((stdout || '').trim() || '{}');
    if (!parsed.success || !Array.isArray(parsed.top_recommendations)) {
      return {
        success: false,
        reason: parsed.error || 'ML predictor returned invalid response'
      };
    }

    return {
      success: true,
      selectedModel: parsed.selected_model || null,
      top3CombinedConfidence: Number(parsed.top3_combined_confidence || 0),
      topRecommendations: parsed.top_recommendations.map((item) => ({
        crop: String(item.crop || '').toLowerCase(),
        confidence: Number(item.confidence || 0),
        probability: Number(item.probability || 0)
      }))
    };
  } catch (error) {
    return {
      success: false,
      reason: error.message
    };
  }
}

function buildExplainability(rec = {}) {
  const component = rec.componentScores || {};
  const rule = Number(component.ruleScore || rec.score || 0);
  const regional = Number(component.regionalScore || 50);
  const feedback = Number(component.feedbackScore || 50);
  const market = Number(component.marketScore || 50);

  return {
    scoreBreakdown: {
      ruleMatch: Math.round(rule),
      regionalSignal: Math.round(regional),
      farmerFeedback: Math.round(feedback),
      marketMomentum: Math.round(market)
    },
    summary: `Score drivers -> rule ${Math.round(rule)}%, regional ${Math.round(regional)}%, feedback ${Math.round(feedback)}%, market ${Math.round(market)}%.`
  };
}

function displayCropName(key) {
  return String(key || '')
    .trim()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildRecommendationCatalog(recommendations = []) {
  const catalog = new Map();
  recommendations.forEach((rec) => {
    const key = normalizeCropKey(rec?.name);
    if (key) catalog.set(key, rec);
  });
  (recommendationEngine?.cropRules || []).forEach((rule) => {
    const key = normalizeCropKey(rule?.name);
    if (key && !catalog.has(key)) catalog.set(key, rule);
  });
  return catalog;
}

function buildMlPrimaryRecommendations(mlInference, analysisRecommendations = [], subCounty, season) {
  if (!mlInference?.success || !Array.isArray(mlInference.topRecommendations) || !mlInference.topRecommendations.length) {
    return analysisRecommendations.map((rec) => ({
      ...rec,
      explainability: buildExplainability(rec),
      source: rec.source || 'rule_engine'
    }));
  }

  const recommendationCatalog = buildRecommendationCatalog(analysisRecommendations);
  const mlPrimary = mlInference.topRecommendations.map((mlRec) => {
    const cropKey = normalizeCropKey(mlRec.crop);
    const matchedRuleRec = recommendationCatalog.get(cropKey);
    const mlConfidence = Number(mlRec.confidence || 0);
    const probability = mlRec.probability ?? null;

    if (matchedRuleRec) {
      const marketPrice = matchedRuleRec.marketPrice || recommendationEngine.getMarketPrice(matchedRuleRec.name, subCounty);
      const enriched = {
        ...matchedRuleRec,
        marketPrice: marketPrice || null
      };
      return {
        ...enriched,
        score: mlConfidence,
        confidenceScore: mlConfidence,
        mlConfidenceScore: mlConfidence,
        probability,
        explainability: buildExplainability(enriched),
        source: 'ml_model'
      };
    }

    const displayName = cropKey ? displayCropName(cropKey) : 'Unknown';
    return {
      name: displayName,
      score: mlConfidence,
      confidenceScore: mlConfidence,
      mlConfidenceScore: mlConfidence,
      probability,
      yieldRange: '1.2-2.4 tons/ha',
      waterReq: 'Moderate',
      plantingWindow: season === 'short_rains' ? 'October-November' : season === 'dry' ? 'January-February' : 'March-April',
      inputs: 'Certified seed, basal fertilizer, timely weeding and pest scouting',
      marketPrice: recommendationEngine.getMarketPrice(displayName, subCounty) || null,
      reasons: {
        english: 'Model-based recommendation from trained data.',
        swahili: 'Pendekezo limetokana na modeli iliyofunzwa.',
        luo: 'Ngʼeyo osedhi e model ma osesomo data.'
      },
      explainability: {
        scoreBreakdown: {
          ruleMatch: 70,
          regionalSignal: 60,
          farmerFeedback: 55,
          marketMomentum: 58
        },
        summary: 'Model-backed recommendation with default explainability profile.'
      },
      source: 'ml_model'
    };
  });

  const seen = new Set(mlPrimary.map((rec) => normalizeCropKey(rec?.name)));
  const remaining = analysisRecommendations
    .filter((rec) => !seen.has(normalizeCropKey(rec?.name)))
    .map((rec) => ({
      ...rec,
      explainability: buildExplainability(rec),
      source: rec.source || 'rule_engine'
    }));

  return [...mlPrimary, ...remaining];
}

function rankRecommendations(recommendations = [], limit = 3) {
  const scored = Array.isArray(recommendations) ? [...recommendations] : [];
  scored.sort((a, b) => {
    const scoreA = Number(a?.score ?? a?.confidenceScore ?? 0);
    const scoreB = Number(b?.score ?? b?.confidenceScore ?? 0);
    if (scoreB !== scoreA) return scoreB - scoreA;
    const confA = Number(a?.confidenceScore ?? a?.score ?? 0);
    const confB = Number(b?.confidenceScore ?? b?.score ?? 0);
    if (confB !== confA) return confB - confA;
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  });
  return Number.isFinite(limit) ? scored.slice(0, Math.max(0, limit)) : scored;
}

const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: Number(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || 4),
  cooldownMs: Number(process.env.CIRCUIT_BREAKER_COOLDOWN_MS || 60000),
  halfOpenAttempts: Number(process.env.CIRCUIT_BREAKER_HALF_OPEN_ATTEMPTS || 1)
};
const EXTERNAL_SERVICE_STATE = new Map();

function getServiceCircuitState(serviceName) {
  if (!EXTERNAL_SERVICE_STATE.has(serviceName)) {
    EXTERNAL_SERVICE_STATE.set(serviceName, {
      state: 'CLOSED',
      failures: 0,
      openedAt: 0,
      halfOpenInFlight: 0
    });
  }
  return EXTERNAL_SERVICE_STATE.get(serviceName);
}

function shouldAllowRequest(serviceName) {
  const state = getServiceCircuitState(serviceName);
  if (state.state === 'CLOSED') return true;

  if (state.state === 'OPEN') {
    const elapsed = Date.now() - state.openedAt;
    if (elapsed >= CIRCUIT_BREAKER_CONFIG.cooldownMs) {
      state.state = 'HALF_OPEN';
      state.halfOpenInFlight = 0;
    } else {
      return false;
    }
  }

  if (state.state === 'HALF_OPEN') {
    if (state.halfOpenInFlight >= CIRCUIT_BREAKER_CONFIG.halfOpenAttempts) {
      return false;
    }
    state.halfOpenInFlight += 1;
    return true;
  }

  return true;
}

function markServiceSuccess(serviceName) {
  const state = getServiceCircuitState(serviceName);
  state.failures = 0;
  state.state = 'CLOSED';
  state.halfOpenInFlight = 0;
}

function markServiceFailure(serviceName) {
  const state = getServiceCircuitState(serviceName);
  state.failures += 1;
  if (state.state === 'HALF_OPEN' || state.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
    state.state = 'OPEN';
    state.openedAt = Date.now();
    state.halfOpenInFlight = 0;
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function resilientCall(
  serviceName,
  operation,
  {
    retries = 2,
    baseDelayMs = 250,
    timeoutMs = 10000
  } = {}
) {
  if (!shouldAllowRequest(serviceName)) {
    throw new Error(`Circuit breaker open for ${serviceName}`);
  }

  let attempt = 0;
  let lastError = null;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await operation({ attempt, signal: controller.signal });
      clearTimeout(timeoutId);
      markServiceSuccess(serviceName);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      attempt += 1;
      if (attempt > retries) break;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await wait(delay);
    }
  }

  markServiceFailure(serviceName);
  throw lastError || new Error(`Unknown failure calling ${serviceName}`);
}

// Required when behind reverse proxies/load balancers (for HTTPS detection).
app.set('trust proxy', 1);

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || true 
    : true,
  credentials: true
}));

app.get('/market-trends.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'market-trends.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/monitoring-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'monitoring-dashboard.html'));
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Ensure database is initialized on Vercel (lazy init)
app.use(async (req, res, next) => {
  if (IS_VERCEL && !dbAsync) {
    try {
      await ensureDbInitialized();
    } catch (err) {
      console.error('❌ Database initialization failed:', err);
      return res.status(503).json({ error: 'Service unavailable: database not ready', code: 'DB_INIT_FAILED' });
    }
  }
  next();
});

// Request context + structured request logs
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  req.requestStartedAt = process.hrtime.bigint();
  res.setHeader('x-request-id', req.requestId);

  res.on('finish', () => {
    const elapsedNs = process.hrtime.bigint() - req.requestStartedAt;
    const latencyMs = Number(elapsedNs / BigInt(1e6));
    const endpointPath = (req.originalUrl || '').split('?')[0] || req.path || '/';
    const farmerId =
      req.user?.farmerId ||
      req.body?.farmerId ||
      req.params?.farmerId ||
      null;

    try {
      metricsCollector.recordApiCall(endpointPath, req.method, latencyMs, res.statusCode);
    } catch (metricsError) {
      // best effort only
    }

    console.log(JSON.stringify({
      level: 'info',
      event: 'http_request',
      requestId: req.requestId,
      method: req.method,
      endpoint: req.originalUrl,
      statusCode: res.statusCode,
      latencyMs,
      farmerId,
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
      timestamp: new Date().toISOString()
    }));
  });

  next();
});

// Force HTTPS in production deployments.
app.use(enforceHTTPS());

// Add security headers
app.use(securityHeaders);

// Add sanitization middleware
app.use(sanitizeInput);

// Prevent browser-driven cross-origin state changes.
app.use(enforceSameOriginForMutations());

// Rate limit API traffic globally.
const apiRateLimiter = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  maxRequests: 300,
  label: 'api_global'
});
app.use('/api', apiRateLimiter);

// Tighten auth-related endpoint throttling further.
const authRateLimiter = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  maxRequests: 40,
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown',
  label: 'api_auth'
});
app.use('/api/admin/login', authRateLimiter);
app.use('/api/admin/verify-otp', authRateLimiter);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve admin dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Historical data uploader (admin utility)
app.get('/admin/historical-data', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-historical-data.html'));
});

// Farmer Profile Dashboard
app.get('/farmer-profile-dashboard', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'farmer-profile-dashboard.html'));
});

// Farmer Registration Portal
app.get('/farmer-registration', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(path.join(__dirname, 'public', 'farmer-registration.html'));
});

// Initialize email service
console.log('📧 Initializing email service...');
initializeEmailService();

jobQueue.registerProcessor('password_reset_email', async (payload) => {
  await sendFarmerPasswordResetEmail(payload.email, payload.resetCode, payload.firstName);
});

jobQueue.registerProcessor('recommendation_notification', async (payload) => {
  await sendRecommendationNotification(payload.phoneNumber, payload.recommendation);
});

jobQueue.registerProcessor('analytics_refresh', async () => {
  await refreshAnalyticsSnapshot();
});

jobQueue.registerProcessor('sqlite_backup', async () => {
  const info = await performSQLiteBackup();
  console.log(JSON.stringify({
    level: 'info',
    event: 'sqlite_backup_completed',
    backupFolder: info.backupFolder,
    copiedFiles: info.copiedFiles,
    timestamp: new Date().toISOString()
  }));
});

async function initializeDatabaseConnection() {
  if (USE_POSTGRES) {
    const pool = createPostgresPoolFromEnv();
    dbAsync = createPostgresDbAsync(pool);
    closeDb = dbAsync.close;
    console.log('✅ Connected to Postgres');
    await ensurePostgresSchema(dbAsync);
    // Optional: refresh analytics cache on startup (skip timers on Vercel).
    enqueueJob('analytics_refresh', {}, { maxAttempts: 2, backoffMs: 500 });
    if (!IS_VERCEL) {
      setInterval(() => {
        enqueueJob('analytics_refresh', {}, { maxAttempts: 2, backoffMs: 500 });
      }, 10 * 60 * 1000);
    }
    return;
  }

  const sqlite3Module = await import('sqlite3');
  const sqlite3 = sqlite3Module.default ?? sqlite3Module;
  await new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_FILE, (err) => {
      if (err) return reject(err);
      return resolve();
    });
  });

  dbAsync = createSqliteDbAsync(db);
  closeDb = dbAsync.close;
  console.log('✅ Connected to SQLite database');

  await new Promise((resolve) => {
    configureSQLiteForScale(() => {
      initializeDatabase();
      enqueueJob('analytics_refresh', {}, { maxAttempts: 2, backoffMs: 500 });
      if (!IS_VERCEL) {
        setInterval(() => {
          enqueueJob('analytics_refresh', {}, { maxAttempts: 2, backoffMs: 500 });
        }, 10 * 60 * 1000);
        scheduleDailyBackupJob();
      }
      resolve();
    });
  });
}

// For Vercel: Lazy initialize database on first request
let dbInitPromise = null;

async function ensureDbInitialized() {
  if (dbAsync) return; // Already initialized
  if (dbInitPromise) return dbInitPromise; // Already initializing
  
  dbInitPromise = initializeDatabaseConnection();
  await dbInitPromise;
}

// Initialize immediately in local/development, lazily on Vercel
if (!IS_VERCEL) {
  await initializeDatabaseConnection();
} else {
  console.log('⏳ Vercel mode: Database will initialize on first request');
}

function configureSQLiteForScale(onReady) {
  db.serialize(() => {
    // Avoid immediate failures under concurrent writes.
    db.configure('busyTimeout', 5000);

    const pragmas = [
      `PRAGMA journal_mode = WAL`,
      `PRAGMA synchronous = NORMAL`,
      `PRAGMA temp_store = MEMORY`,
      `PRAGMA cache_size = -64000`, // ~64MB page cache
      `PRAGMA foreign_keys = ON`,
      `PRAGMA wal_autocheckpoint = 1000`
    ];

    let pending = pragmas.length;
    pragmas.forEach((pragma) => {
      db.run(pragma, (pragmaErr) => {
        if (pragmaErr) {
          console.error(`SQLite pragma failed (${pragma}):`, pragmaErr.message);
        }
        pending -= 1;
        if (pending === 0) {
          console.log('✅ SQLite scalability pragmas applied');
          onReady();
        }
      });
    });
  });
}

// Lightweight promise helpers for sqlite
const SQLITE_RETRYABLE_ERRORS = ['SQLITE_BUSY', 'SQLITE_LOCKED'];

function isRetryableSQLiteError(error) {
  if (!error) return false;
  const code = error.code || '';
  return SQLITE_RETRYABLE_ERRORS.some((entry) => code.includes(entry));
}

async function withSQLiteRetry(fn, retries = 4, baseDelayMs = 25) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableSQLiteError(error) || attempt >= retries) {
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt += 1;
    }
  }
}

function createSqliteDbAsync(sqliteDb) {
  return {
    dialect: 'sqlite',
    run: (sql, params = []) =>
      withSQLiteRetry(
        () =>
          new Promise((resolve, reject) => {
            sqliteDb.run(sql, params, function(err) {
              if (err) return reject(err);
              resolve(this);
            });
          })
      ),
    get: (sql, params = []) =>
      withSQLiteRetry(
        () =>
          new Promise((resolve, reject) => {
            sqliteDb.get(sql, params, (err, row) => {
              if (err) return reject(err);
              resolve(row);
            });
          })
      ),
    all: (sql, params = []) =>
      withSQLiteRetry(
        () =>
          new Promise((resolve, reject) => {
            sqliteDb.all(sql, params, (err, rows) => {
              if (err) return reject(err);
              resolve(rows);
            });
          })
      ),
    close: () =>
      new Promise((resolve, reject) => {
        sqliteDb.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      })
  };
}

async function requireAdminSessionForSystemRoutes(req, res, next) {
  authenticateAdmin(req, res, async () => {
    try {
      const sessionId = req.headers['x-session-id'];
      if (!sessionId) {
        return res.status(401).json({
          success: false,
          message: 'Session ID is required'
        });
      }

      const session = await adminDB.getAdminSession(dbAsync, sessionId);
      if (!session || Number(session.admin_id) !== Number(req.admin.adminId)) {
        return res.status(401).json({
          success: false,
          message: 'Session invalid or expired'
        });
      }

      return next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to validate admin session'
      });
    }
  });
}

async function performSQLiteBackup() {
  if (dbAsync?.dialect !== 'sqlite') {
    throw new Error('SQLite backups are not available when using Postgres.');
  }
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
  await dbAsync.run(`PRAGMA wal_checkpoint(FULL)`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFolder = path.join(BACKUP_DIR, `backup-${stamp}`);
  await fsp.mkdir(backupFolder, { recursive: true });

  const files = [
    DB_FILE,
    `${DB_FILE}-wal`,
    `${DB_FILE}-shm`
  ];
  const copied = [];

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue;
    const targetPath = path.join(backupFolder, path.basename(filePath));
    await fsp.copyFile(filePath, targetPath);
    copied.push(path.basename(filePath));
  }

  await fsp.writeFile(
    path.join(backupFolder, 'manifest.json'),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        sourceDb: DB_FILE,
        copiedFiles: copied
      },
      null,
      2
    )
  );

  return {
    backupFolder,
    copiedFiles: copied
  };
}

let analyticsCache = {
  refreshedAt: null,
  data: null
};

function createTtlCache(defaultTtlMs = 5 * 60 * 1000) {
  const store = new Map();
  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    set(key, value, ttlMs = defaultTtlMs) {
      store.set(key, {
        value,
        expiresAt: Date.now() + ttlMs
      });
      return value;
    },
    del(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    stats() {
      return {
        size: store.size
      };
    }
  };
}

const marketCache = createTtlCache(Number(process.env.MARKET_CACHE_TTL_MS || 5 * 60 * 1000));
const weatherCache = createTtlCache(Number(process.env.WEATHER_CACHE_TTL_MS || 3 * 60 * 1000));
const recommendationCache = createTtlCache(Number(process.env.RECOMMENDATION_CACHE_TTL_MS || 2 * 60 * 1000));

async function getCachedOrCompute(cache, cacheKey, producer, { ttlMs, fresh = false } = {}) {
  if (!fresh) {
    const cached = cache.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      return { value: cached, cacheHit: true };
    }
  }
  const value = await producer();
  cache.set(cacheKey, value, ttlMs);
  return { value, cacheHit: false };
}

async function computeRecommendationEngineMetrics(days = 90) {
  const safeDays = Math.max(7, Math.min(365, Number(days || 90)));
  const sinceExpr = `-${safeDays} day`;

  const [
    predictionTotals,
    feedbackTotals,
    helpfulTotals,
    confidenceAvg,
    contextCoverage
  ] = await Promise.all([
    dbAsync.get(`SELECT COUNT(*) AS total FROM predictions WHERE created_at >= datetime('now', ?)`, [sinceExpr]),
    dbAsync.get(
      `SELECT COUNT(*) AS total
       FROM feedback f
       INNER JOIN predictions p ON p.id = f.prediction_id
       WHERE p.created_at >= datetime('now', ?)`,
      [sinceExpr]
    ),
    dbAsync.get(
      `SELECT AVG(CASE WHEN f.is_helpful = 1 THEN 1.0 ELSE 0.0 END) AS helpful_ratio
       FROM feedback f
       INNER JOIN predictions p ON p.id = f.prediction_id
       WHERE p.created_at >= datetime('now', ?)`,
      [sinceExpr]
    ),
    dbAsync.get(`SELECT AVG(confidence) AS avg_confidence FROM predictions WHERE created_at >= datetime('now', ?)`, [sinceExpr]),
    dbAsync.get(
      `SELECT COUNT(*) AS calibrated_contexts
       FROM (
         SELECT sub_county, soil_type, season, COUNT(*) AS n
         FROM historical_observations
         GROUP BY sub_county, soil_type, season
         HAVING n >= 5
       ) t`
    )
  ]);

  const topContextPerformance = await dbAsync.all(
    `SELECT
      LOWER(p.sub_county) AS sub_county,
      LOWER(p.soil_type) AS soil_type,
      LOWER(p.season) AS season,
      COUNT(f.id) AS feedback_count,
      AVG(CASE WHEN f.is_helpful = 1 THEN 1.0 ELSE 0.0 END) AS helpful_ratio,
      AVG(p.confidence) AS avg_confidence
     FROM predictions p
     LEFT JOIN feedback f ON f.prediction_id = p.id
     WHERE p.created_at >= datetime('now', ?)
     GROUP BY LOWER(p.sub_county), LOWER(p.soil_type), LOWER(p.season)
     HAVING feedback_count > 0
     ORDER BY helpful_ratio DESC, feedback_count DESC
     LIMIT 10`,
    [sinceExpr]
  );

  const totalPredictions = Number(predictionTotals?.total || 0);
  const totalFeedback = Number(feedbackTotals?.total || 0);
  const feedbackCoverage = totalPredictions > 0 ? Number((totalFeedback / totalPredictions).toFixed(3)) : 0;

  return {
    windowDays: safeDays,
    totalPredictions,
    totalFeedback,
    feedbackCoverage,
    helpfulRate:
      helpfulTotals?.helpful_ratio !== null && helpfulTotals?.helpful_ratio !== undefined
        ? Number(Number(helpfulTotals.helpful_ratio).toFixed(3))
        : null,
    avgConfidence:
      confidenceAvg?.avg_confidence !== null && confidenceAvg?.avg_confidence !== undefined
        ? Number(Number(confidenceAvg.avg_confidence).toFixed(2))
        : null,
    calibratedContexts: Number(contextCoverage?.calibrated_contexts || 0),
    proxyPrecisionAt1:
      helpfulTotals?.helpful_ratio !== null && helpfulTotals?.helpful_ratio !== undefined
        ? Number(Number(helpfulTotals.helpful_ratio).toFixed(3))
        : null,
    topContextPerformance: topContextPerformance.map((row) => ({
      subCounty: row.sub_county,
      soilType: row.soil_type,
      season: row.season,
      feedbackCount: Number(row.feedback_count || 0),
      helpfulRate:
        row.helpful_ratio !== null && row.helpful_ratio !== undefined
          ? Number(Number(row.helpful_ratio).toFixed(3))
          : null,
      avgConfidence:
        row.avg_confidence !== null && row.avg_confidence !== undefined
          ? Number(Number(row.avg_confidence).toFixed(2))
          : null
    }))
  };
}

async function refreshAnalyticsSnapshot() {
  const [predictions, farmers, feedback, topCrop, topSubCounty, lastPrediction, metrics7, metrics30, metrics90] = await Promise.all([
    dbAsync.get(`SELECT COUNT(*) AS total FROM predictions`),
    dbAsync.get(`SELECT COUNT(*) AS total FROM farmers`),
    dbAsync.get(`SELECT COUNT(*) AS total FROM feedback`),
    dbAsync.get(`SELECT predicted_crop as crop, COUNT(*) as count FROM predictions GROUP BY predicted_crop ORDER BY count DESC LIMIT 1`),
    dbAsync.get(`SELECT sub_county as subCounty, COUNT(*) as count FROM predictions GROUP BY sub_county ORDER BY count DESC LIMIT 1`),
    dbAsync.get(`SELECT created_at FROM predictions ORDER BY created_at DESC LIMIT 1`),
    computeRecommendationEngineMetrics(7),
    computeRecommendationEngineMetrics(30),
    computeRecommendationEngineMetrics(90)
  ]);

  analyticsCache = {
    refreshedAt: new Date().toISOString(),
    data: {
      totalPredictions: Number(predictions?.total || 0),
      totalFarmers: Number(farmers?.total || 0),
      totalFeedback: Number(feedback?.total || 0),
      topCrop: topCrop?.crop || null,
      topSubCounty: topSubCounty?.subCounty || null,
      lastPredictionAt: lastPrediction?.created_at || null
    },
    metrics: {
      7: metrics7,
      30: metrics30,
      90: metrics90
    }
  };

  return analyticsCache;
}

function scheduleDailyBackupJob() {
  const intervalMs = 24 * 60 * 60 * 1000;
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setHours(2, 0, 0, 0);
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  const delay = nextRun.getTime() - now.getTime();

  setTimeout(() => {
    enqueueJob('sqlite_backup', {}, { maxAttempts: 4, backoffMs: 1000 });
    setInterval(() => {
      enqueueJob('sqlite_backup', {}, { maxAttempts: 4, backoffMs: 1000 });
    }, intervalMs);
  }, delay);
}

const SUPPORTED_LANGUAGES = ['english', 'swahili', 'luo'];

const normalizeLanguage = (language = 'english') => {
  const lang = (language || '').toString().toLowerCase();
  return SUPPORTED_LANGUAGES.includes(lang) ? lang : 'english';
};

const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return null;
  return phoneNumber.toString().replace(/\s+/g, '');
};

const getTrackingFarmerId = (req) => {
  const fromBody = req.body?.farmerId || req.body?.phoneNumber || req.body?.phoneOrEmail || req.body?.phone;
  const fromUser = req.user?.farmerId || req.actor?.farmerId || req.farmer?.farmerId;
  const fromParams = req.params?.farmerId || req.params?.phoneNumber;
  return fromUser || fromBody || fromParams || `anonymous:${req.requestId}`;
};

// Safaricom Configuration
const safaricomConfig = {
  consumerKey: process.env.SAFARICOM_CONSUMER_KEY,
  consumerSecret: process.env.SAFARICOM_CONSUMER_SECRET,
  shortcode: process.env.SAFARICOM_SHORTCODE,
  senderId: process.env.SAFARICOM_SENDER_ID || process.env.SAFARICOM_SHORTCODE,
  baseUrl: process.env.SAFARICOM_BASE_URL || 'https://sandbox.safaricom.co.ke'
};

const isSafaricomConfigured = () =>
  !!(safaricomConfig.consumerKey && safaricomConfig.consumerSecret && safaricomConfig.shortcode);

const formatPhoneForSms = (phoneNumber) => {
  if (!phoneNumber) return null;
  let digits = phoneNumber.toString().replace(/\D/g, '');

  if (digits.startsWith('0')) {
    digits = `254${digits.slice(1)}`;
  } else if (digits.startsWith('7') && digits.length === 9) {
    digits = `254${digits}`;
  } else if (digits.startsWith('254') && digits.length === 12) {
    // already correct
  } else if (digits.startsWith('254') && digits.length > 12) {
    digits = digits.slice(0, 12);
  }

  if (!digits.startsWith('254') || digits.length !== 12) {
    return null;
  }

  return `+${digits}`;
};

const safaricomTokenCache = {
  token: null,
  expiry: 0
};

async function getSafaricomAccessToken() {
  if (!isSafaricomConfigured()) {
    throw new Error('Safaricom SMS credentials not configured');
  }

  if (safaricomTokenCache.token && safaricomTokenCache.expiry > Date.now()) {
    return safaricomTokenCache.token;
  }

  const credentials = Buffer.from(`${safaricomConfig.consumerKey}:${safaricomConfig.consumerSecret}`).toString('base64');
  const response = await resilientCall(
    'safaricom_oauth',
    ({ signal }) =>
      fetch(`${safaricomConfig.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${credentials}`
        },
        signal
      }),
    { retries: 2, baseDelayMs: 300, timeoutMs: 12000 }
  );

  if (!response.ok) {
    throw new Error(`Safaricom OAuth error (${response.status})`);
  }

  const data = await response.json();
  const expiresInMs = (parseInt(data.expires_in, 10) || 3599) * 1000;
  safaricomTokenCache.token = data.access_token;
  safaricomTokenCache.expiry = Date.now() + expiresInMs - 30000; // refresh 30s early

  return safaricomTokenCache.token;
}

async function sendSafaricomSms(phoneNumber, message) {
  if (!isSafaricomConfigured()) {
    return {
      queued: false,
      channel: 'safaricom_sms',
      reason: 'Safaricom SMS not configured'
    };
  }

  const msisdn = formatPhoneForSms(phoneNumber);

  if (!msisdn) {
    return {
      queued: false,
      channel: 'safaricom_sms',
      reason: 'Invalid phone number format'
    };
  }

  try {
    const token = await getSafaricomAccessToken();
    const response = await resilientCall(
      'safaricom_sms',
      ({ signal }) =>
        fetch(`${safaricomConfig.baseUrl}/sms/v1/send`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            shortcode: safaricomConfig.shortcode,
            senderId: safaricomConfig.senderId,
            message,
            recipient: msisdn,
            bulkSMSMode: 0,
            enqueue: 0
          }),
          signal
        }),
      { retries: 2, baseDelayMs: 300, timeoutMs: 12000 }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Safaricom SMS error (${response.status}): ${errorBody}`);
    }

    const result = await response.json().catch(() => ({}));

    return {
      queued: true,
      channel: 'safaricom_sms',
      reference: result?.messageId || result?.ConversationID || null
    };
  } catch (error) {
    console.error('Safaricom SMS error:', error.message);
    return {
      queued: false,
      channel: 'safaricom_sms',
      reason: error.message
    };
  }
}

// ==================== TWILIO SMS CONFIGURATION ====================
// Twilio works on localhost! You just need:
// 1. Install Twilio SDK: npm install twilio
// 2. Get credentials from https://console.twilio.com/
// 3. For webhooks (if needed), use ngrok: npx ngrok http 5000

const twilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromNumber: process.env.TWILIO_PHONE_NUMBER // E.164 format: +1234567890
};

const isTwilioConfigured = () =>
  !!(twilioConfig.accountSid && twilioConfig.authToken && twilioConfig.fromNumber);

// Format phone number for Twilio (E.164 format)
const formatPhoneForTwilio = (phoneNumber) => {
  if (!phoneNumber) return null;
  let digits = phoneNumber.toString().replace(/\D/g, '');

  // Convert Kenyan format to international
  if (digits.startsWith('0')) {
    digits = `254${digits.slice(1)}`;
  } else if (digits.startsWith('7') && digits.length === 9) {
    digits = `254${digits}`;
  } else if (digits.startsWith('254') && digits.length === 12) {
    // already correct
  } else if (digits.startsWith('254') && digits.length > 12) {
    digits = digits.slice(0, 12);
  }

  if (!digits.startsWith('254') || digits.length !== 12) {
    return null;
  }

  return `+${digits}`;
};

async function sendTwilioSms(phoneNumber, message) {
  if (!isTwilioConfigured()) {
    return {
      queued: false,
      channel: 'twilio_sms',
      reason: 'Twilio SMS not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER'
    };
  }

  // Dynamically import Twilio (works even if not installed)
  let twilioClient;
  try {
    const twilioModule = await import('twilio');
    // Twilio exports as default in ESM
    const Twilio = twilioModule.default;
    twilioClient = Twilio(twilioConfig.accountSid, twilioConfig.authToken);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return {
        queued: false,
        channel: 'twilio_sms',
        reason: 'Twilio SDK not installed. Run: npm install twilio'
      };
    }
    console.error('Failed to initialize Twilio:', error.message);
    return {
      queued: false,
      channel: 'twilio_sms',
      reason: `Twilio initialization failed: ${error.message}`
    };
  }

  const msisdn = formatPhoneForTwilio(phoneNumber);

  if (!msisdn) {
    return {
      queued: false,
      channel: 'twilio_sms',
      reason: 'Invalid phone number format. Expected: 07XX, 7XX, or +2547XX'
    };
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: twilioConfig.fromNumber,
      to: msisdn
    });

    console.log(`Twilio SMS sent successfully. SID: ${result.sid}, Status: ${result.status}`);
    
    return {
      queued: true,
      channel: 'twilio_sms',
      reference: result.sid,
      status: result.status
    };
  } catch (error) {
    console.error('Twilio SMS error:', error.message);
    return {
      queued: false,
      channel: 'twilio_sms',
      reason: error.message || 'Failed to send SMS via Twilio'
    };
  }
}

// ==================== UNIFIED SMS NOTIFICATION ====================
// Choose SMS provider: 'safaricom', 'twilio', or 'auto' (tries both)
const SMS_PROVIDER = process.env.SMS_PROVIDER || 'auto';

const sendRecommendationNotification = async (phoneNumber, recommendation) => {
  if (!phoneNumber) {
    return {
      queued: false,
      channel: 'none',
      reason: 'Phone number not supplied'
    };
  }

  const message = [
    'Fahamu Shamba Recommendation:',
    `${recommendation.crop.toUpperCase()} suits ${recommendation.subCounty} (${recommendation.season}).`,
    `Confidence ${recommendation.confidence}%.`,
    recommendation.reason
  ].join(' ');

  // Auto mode: try Twilio first (better for localhost), then Safaricom
  if (SMS_PROVIDER === 'auto') {
    // Try Twilio first (works on localhost)
    if (isTwilioConfigured()) {
      const twilioResult = await sendTwilioSms(phoneNumber, message);
      if (twilioResult.queued) {
        return twilioResult;
      }
      console.log('Twilio failed, trying Safaricom...', twilioResult.reason);
    }
    
    // Fallback to Safaricom
    if (isSafaricomConfigured()) {
      return await sendSafaricomSms(phoneNumber, message);
    }
    
    return {
      queued: false,
      channel: 'none',
      reason: 'No SMS provider configured. Set up Twilio or Safaricom credentials.'
    };
  }
  
  // Explicit provider selection
  if (SMS_PROVIDER === 'twilio') {
    return await sendTwilioSms(phoneNumber, message);
  }
  
  if (SMS_PROVIDER === 'safaricom') {
    return await sendSafaricomSms(phoneNumber, message);
  }
  
  return {
    queued: false,
    channel: 'none',
    reason: `Unknown SMS provider: ${SMS_PROVIDER}. Use 'safaricom', 'twilio', or 'auto'`
  };
};

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Initialize admin database
    adminDB.initializeAdminDatabase(db, dbAsync);

    // Initialize farmer database
    // farmerDB.initializeFarmerDatabase(db);  // Commented - conflicts with farmers table schema in server.js

    // Initialize enhanced farmer profile database
    farmerProfileDB.initializeEnhancedFarmerDatabase(db);

    // Create tables with correct schema
    db.run(`CREATE TABLE IF NOT EXISTS farmers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT UNIQUE,
      sub_county TEXT,
      soil_type TEXT,
      preferred_language TEXT DEFAULT 'english',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Error creating farmers table:', err);
      else console.log('Farmers table ready');
    });

    db.run(`CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farmer_id INTEGER,
      phone_number TEXT,
      sub_county TEXT,
      soil_type TEXT,
      season TEXT,
      predicted_crop TEXT,
      confidence INTEGER,
      model_version TEXT DEFAULT 'rule-engine-v1.0.0',
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(farmer_id) REFERENCES farmers(id)
    )`, (err) => {
      if (err) console.error('Error creating predictions table:', err);
      else console.log('Predictions table ready');
    });

    db.run(`CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prediction_id INTEGER,
      phone_number TEXT,
      is_helpful BOOLEAN,
      comments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(prediction_id) REFERENCES predictions(id)
    )`, (err) => {
      if (err) console.error('Error creating feedback table:', err);
      else console.log('Feedback table ready');
    });

    db.run(`CREATE TABLE IF NOT EXISTS historical_observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sub_county TEXT NOT NULL,
      season TEXT NOT NULL,
      soil_type TEXT NOT NULL,
      crop TEXT NOT NULL,
      observation_date TEXT NOT NULL,
      soil_ph REAL NOT NULL,
      nitrogen REAL,
      phosphorus REAL,
      potassium REAL,
      organic_matter REAL,
      rainfall_mm REAL NOT NULL,
      yield_tons_per_ha REAL NOT NULL,
      pest_incidents INTEGER NOT NULL DEFAULT 0,
      market_price_ksh_per_kg REAL NOT NULL,
      input_cost_ksh REAL NOT NULL,
      source TEXT NOT NULL,
      dedupe_signature TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Error creating historical_observations table:', err);
      else console.log('Historical observations table ready');
    });

    db.run(`CREATE TABLE IF NOT EXISTS weather_observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sub_county TEXT NOT NULL,
      observation_date TEXT NOT NULL,
      season TEXT,
      temperature_c REAL,
      rainfall_mm REAL DEFAULT 0,
      humidity_pct REAL,
      wind_speed_kmh REAL,
      source TEXT NOT NULL DEFAULT 'open_meteo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Error creating weather_observations table:', err);
      else console.log('Weather observations table ready');
    });

    db.run(`CREATE TABLE IF NOT EXISTS soil_samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sub_county TEXT NOT NULL,
      sample_date TEXT NOT NULL,
      soil_type TEXT NOT NULL,
      soil_ph REAL,
      organic_carbon_pct REAL,
      nitrogen_pct REAL,
      phosphorus_mgkg REAL,
      potassium_mgkg REAL,
      source TEXT NOT NULL DEFAULT 'soilgrids',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Error creating soil_samples table:', err);
      else console.log('Soil samples table ready');
    });

    db.run(`CREATE TABLE IF NOT EXISTS market_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sub_county TEXT NOT NULL,
      market_center TEXT,
      crop TEXT NOT NULL,
      price_ksh_per_kg REAL NOT NULL,
      trend TEXT DEFAULT 'stable',
      price_date TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'market_api',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Error creating market_prices table:', err);
      else console.log('Market prices table ready');
    });

    db.run(`CREATE TABLE IF NOT EXISTS yield_outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farmer_id TEXT,
      sub_county TEXT NOT NULL,
      season TEXT NOT NULL,
      crop TEXT NOT NULL,
      planting_date TEXT,
      harvest_date TEXT,
      farm_size_ha REAL,
      yield_ton_per_ha REAL,
      input_cost_ksh REAL,
      revenue_ksh REAL,
      profit_ksh REAL,
      source TEXT NOT NULL DEFAULT 'farmer_reported',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Error creating yield_outcomes table:', err);
      else console.log('Yield outcomes table ready');
    });

    // Backward-compatible migration for older DBs.
    db.run(`ALTER TABLE predictions ADD COLUMN model_version TEXT DEFAULT 'rule-engine-v1.0.0'`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error migrating predictions.model_version:', err.message);
      }
    });

    // Helpful indexes for faster lookups
    db.run(`CREATE INDEX IF NOT EXISTS idx_predictions_phone ON predictions(phone_number)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_predictions_created ON predictions(created_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_predictions_subcounty ON predictions(sub_county)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_predictions_crop ON predictions(predicted_crop)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_predictions_phone_created ON predictions(phone_number, created_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_predictions_context_created ON predictions(sub_county, soil_type, season, created_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_feedback_prediction ON feedback(prediction_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmers_phone ON farmers(phone_number)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmers_subcounty ON farmers(sub_county)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmers_created ON farmers(created_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_historical_location ON historical_observations(sub_county, soil_type, season)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_historical_observation_date ON historical_observations(observation_date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_historical_crop ON historical_observations(crop)`);
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_historical_dedupe ON historical_observations(dedupe_signature)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_weather_subcounty_date ON weather_observations(sub_county, observation_date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_weather_source ON weather_observations(source)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_soil_subcounty_date ON soil_samples(sub_county, sample_date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_soil_type ON soil_samples(soil_type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_market_subcounty_date ON market_prices(sub_county, price_date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_market_crop_date ON market_prices(crop, price_date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_yield_subcounty_season ON yield_outcomes(sub_county, season)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_yield_crop_season ON yield_outcomes(crop, season)`);
  });
}

// Input validation middleware
const validatePredictionInput = (req, res, next) => {
  const { subCounty, soilType, season, phoneNumber } = req.body;
  
  const validSubCounties = ['bondo', 'ugunja', 'yala', 'gem', 'alego'];
  const validSoilTypes = ['sandy', 'clay', 'loam'];
  const validSeasons = ['long_rains', 'short_rains', 'dry'];
  
  if (!subCounty || !validSubCounties.includes(subCounty.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid sub-county. Must be one of: bondo, ugunja, yala, gem, alego'
    });
  }
  
  if (!soilType || !validSoilTypes.includes(soilType.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid soil type. Must be one of: sandy, clay, loam'
    });
  }
  
  if (!season || !validSeasons.includes(season.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid season. Must be one of: long_rains, short_rains, dry'
    });
  }
  
  next();
};

const VALID_SUBCOUNTIES = ['bondo', 'ugunja', 'yala', 'gem', 'alego', 'rarieda', 'siaya town'];
const VALID_SOIL_TYPES = ['sandy', 'clay', 'loam', 'rocky', 'mixed'];
const VALID_SEASONS = ['long_rains', 'short_rains', 'dry'];

function toNormalizedText(value = '') {
  return value.toString().trim().toLowerCase();
}

function parsePaginationParams(req, { defaultLimit = 20, maxLimit = 200 } = {}) {
  const rawLimit = Number.parseInt(req.query.limit, 10);
  const rawOffset = Number.parseInt(req.query.offset, 10);

  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(maxLimit, rawLimit)) : defaultLimit;
  const offset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;

  return { limit, offset };
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function validateNumberInRange(name, value, min, max, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) return `${name} is required`;
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return `${name} must be a valid number`;
  if (parsed < min || parsed > max) return `${name} must be between ${min} and ${max}`;
  return null;
}

function sanitizeHistoricalObservation(raw = {}) {
  const normalized = {
    subCounty: toNormalizedText(raw.subCounty),
    soilType: toNormalizedText(raw.soilType),
    season: toNormalizedText(raw.season),
    crop: raw.crop ? raw.crop.toString().trim() : '',
    observationDate: raw.observationDate ? raw.observationDate.toString().trim() : '',
    soilPH: parseOptionalNumber(raw.soilPH),
    nitrogen: parseOptionalNumber(raw.nitrogen),
    phosphorus: parseOptionalNumber(raw.phosphorus),
    potassium: parseOptionalNumber(raw.potassium),
    organicMatter: parseOptionalNumber(raw.organicMatter),
    rainfallMm: parseOptionalNumber(raw.rainfallMm),
    yieldTonsPerHa: parseOptionalNumber(raw.yieldTonsPerHa),
    pestIncidents: parseOptionalNumber(raw.pestIncidents),
    marketPriceKshPerKg: parseOptionalNumber(raw.marketPriceKshPerKg),
    inputCostKsh: parseOptionalNumber(raw.inputCostKsh),
    source: raw.source ? raw.source.toString().trim() : 'manual'
  };

  // Normalize known aliases.
  if (normalized.subCounty === 'siaya') normalized.subCounty = 'siaya town';

  return normalized;
}

function validateHistoricalObservation(observation) {
  const errors = [];

  if (!observation.subCounty) errors.push('subCounty is required');
  if (!observation.soilType) errors.push('soilType is required');
  if (!observation.season) errors.push('season is required');
  if (!observation.crop) errors.push('crop is required');
  if (!observation.observationDate) errors.push('observationDate is required');

  if (observation.subCounty && !VALID_SUBCOUNTIES.includes(observation.subCounty)) {
    errors.push(`subCounty must be one of: ${VALID_SUBCOUNTIES.join(', ')}`);
  }
  if (observation.soilType && !VALID_SOIL_TYPES.includes(observation.soilType)) {
    errors.push(`soilType must be one of: ${VALID_SOIL_TYPES.join(', ')}`);
  }
  if (observation.season && !VALID_SEASONS.includes(observation.season)) {
    errors.push(`season must be one of: ${VALID_SEASONS.join(', ')}`);
  }

  const numericValidations = [
    validateNumberInRange('soilPH', observation.soilPH, 3.5, 10, { required: true }),
    validateNumberInRange('nitrogen', observation.nitrogen, 0, 10),
    validateNumberInRange('phosphorus', observation.phosphorus, 0, 200),
    validateNumberInRange('potassium', observation.potassium, 0, 1000),
    validateNumberInRange('organicMatter', observation.organicMatter, 0, 30),
    validateNumberInRange('rainfallMm', observation.rainfallMm, 0, 5000, { required: true }),
    validateNumberInRange('yieldTonsPerHa', observation.yieldTonsPerHa, 0, 100, { required: true }),
    validateNumberInRange('pestIncidents', observation.pestIncidents, 0, 1000, { required: true }),
    validateNumberInRange('marketPriceKshPerKg', observation.marketPriceKshPerKg, 0, 100000, { required: true }),
    validateNumberInRange('inputCostKsh', observation.inputCostKsh, 0, 10000000, { required: true })
  ].filter(Boolean);

  errors.push(...numericValidations);

  if (observation.observationDate) {
    const parsedDate = new Date(observation.observationDate);
    if (Number.isNaN(parsedDate.getTime())) {
      errors.push('observationDate must be a valid date');
    } else if (parsedDate > new Date()) {
      errors.push('observationDate cannot be in the future');
    }
  }

  return errors;
}

function buildObservationSignature(observation) {
  const signaturePayload = [
    observation.subCounty,
    observation.soilType,
    observation.season,
    observation.crop.toLowerCase(),
    observation.observationDate,
    observation.soilPH,
    observation.rainfallMm,
    observation.yieldTonsPerHa,
    observation.pestIncidents,
    observation.marketPriceKshPerKg,
    observation.inputCostKsh,
    observation.source.toLowerCase()
  ].join('|');

  return crypto.createHash('sha256').update(signaturePayload).digest('hex');
}

async function fetchHistoricalSummary(subCounty, soilType, season) {
  const row = await dbAsync.get(
    `SELECT
      COUNT(*) AS sample_size,
      AVG(yield_tons_per_ha) AS avg_yield,
      AVG(rainfall_mm) AS avg_rainfall,
      AVG(pest_incidents) AS avg_pest_incidents,
      AVG(market_price_ksh_per_kg) AS avg_market_price,
      AVG(input_cost_ksh) AS avg_input_cost,
      AVG(soil_ph) AS avg_soil_ph,
      AVG(
        CASE
          WHEN soil_ph BETWEEN 3.5 AND 10
            AND rainfall_mm >= 0
            AND yield_tons_per_ha >= 0
            AND market_price_ksh_per_kg >= 0
            AND input_cost_ksh >= 0
          THEN 1 ELSE 0
        END
      ) AS valid_ratio
     FROM historical_observations
     WHERE sub_county = ? AND soil_type = ? AND season = ?`,
    [subCounty, soilType, season]
  );

  const sampleSize = Number(row?.sample_size || 0);
  const validRatio = Number(row?.valid_ratio || 0);
  const coverageScore = Math.min(100, sampleSize * 5);
  const dataQualityScore = Math.round(coverageScore * 0.5 + validRatio * 100 * 0.5);

  return {
    sampleSize,
    avgYield: row?.avg_yield !== null && row?.avg_yield !== undefined ? Number(row.avg_yield.toFixed(3)) : null,
    avgRainfall: row?.avg_rainfall !== null && row?.avg_rainfall !== undefined ? Number(row.avg_rainfall.toFixed(2)) : null,
    avgPestIncidents:
      row?.avg_pest_incidents !== null && row?.avg_pest_incidents !== undefined
        ? Number(row.avg_pest_incidents.toFixed(2))
        : null,
    avgMarketPrice:
      row?.avg_market_price !== null && row?.avg_market_price !== undefined ? Number(row.avg_market_price.toFixed(2)) : null,
    avgInputCost:
      row?.avg_input_cost !== null && row?.avg_input_cost !== undefined ? Number(row.avg_input_cost.toFixed(2)) : null,
    avgSoilPH: row?.avg_soil_ph !== null && row?.avg_soil_ph !== undefined ? Number(row.avg_soil_ph.toFixed(2)) : null,
    dataQualityScore
  };
}

async function fetchRegionalCalibrationProfile(subCounty, soilType, season) {
  const rows = await dbAsync.all(
    `SELECT
      LOWER(crop) AS crop,
      COUNT(*) AS sample_size,
      AVG(yield_tons_per_ha) AS avg_yield,
      AVG(market_price_ksh_per_kg) AS avg_market_price,
      AVG(input_cost_ksh) AS avg_input_cost,
      AVG(pest_incidents) AS avg_pest_incidents
     FROM historical_observations
     WHERE sub_county = ? AND soil_type = ? AND season = ?
     GROUP BY LOWER(crop)
     ORDER BY sample_size DESC, avg_yield DESC`,
    [subCounty, soilType, season]
  );

  return rows.map((row) => ({
    crop: row.crop,
    sampleSize: Number(row.sample_size || 0),
    avgYield: row.avg_yield !== null && row.avg_yield !== undefined ? Number(row.avg_yield.toFixed(3)) : null,
    avgMarketPrice:
      row.avg_market_price !== null && row.avg_market_price !== undefined
        ? Number(row.avg_market_price.toFixed(2))
        : null,
    avgInputCost:
      row.avg_input_cost !== null && row.avg_input_cost !== undefined ? Number(row.avg_input_cost.toFixed(2)) : null,
    avgPestIncidents:
      row.avg_pest_incidents !== null && row.avg_pest_incidents !== undefined
        ? Number(row.avg_pest_incidents.toFixed(2))
        : null
  }));
}

async function fetchFeedbackSignals(subCounty, soilType, season, lookbackDays = 365) {
  const rows = await dbAsync.all(
    `SELECT
      LOWER(p.predicted_crop) AS crop,
      COUNT(f.id) AS feedback_count,
      AVG(CASE WHEN f.is_helpful = 1 THEN 1.0 ELSE 0.0 END) AS helpful_ratio
     FROM predictions p
     LEFT JOIN feedback f ON f.prediction_id = p.id
     WHERE LOWER(p.sub_county) = ?
       AND LOWER(p.soil_type) = ?
       AND LOWER(p.season) = ?
       AND p.created_at >= datetime('now', ?)
     GROUP BY LOWER(p.predicted_crop)`,
    [subCounty, soilType, season, `-${lookbackDays} day`]
  );

  return rows.map((row) => ({
    crop: row.crop,
    feedbackCount: Number(row.feedback_count || 0),
    helpfulRatio:
      row.helpful_ratio !== null && row.helpful_ratio !== undefined
        ? Number(Number(row.helpful_ratio).toFixed(3))
        : 0.5
  }));
}

async function fetchDecisionSignalsSafely(subCounty, soilType, season) {
  const signals = {
    historicalSummary: null,
    regionalProfile: [],
    feedbackSignals: []
  };

  try {
    signals.historicalSummary = await fetchHistoricalSummary(subCounty, soilType, season);
    signals.regionalProfile = await fetchRegionalCalibrationProfile(subCounty, soilType, season);
    signals.feedbackSignals = await fetchFeedbackSignals(subCounty, soilType, season);
  } catch (error) {
    console.error('Decision signals lookup degraded, falling back to rule-only recommendations:', error.message);
  }

  return signals;
}

app.post('/api/historical-data/ingest', async (req, res) => {
  try {
    const normalized = sanitizeHistoricalObservation(req.body || {});
    const errors = validateHistoricalObservation(normalized);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Historical observation validation failed',
        errors
      });
    }

    const signature = buildObservationSignature(normalized);
    const duplicate = await dbAsync.get(
      `SELECT id FROM historical_observations WHERE dedupe_signature = ?`,
      [signature]
    );

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate observation detected',
        duplicateId: duplicate.id
      });
    }

    const insert = await dbAsync.run(
      `INSERT INTO historical_observations (
        sub_county, season, soil_type, crop, observation_date, soil_ph,
        nitrogen, phosphorus, potassium, organic_matter, rainfall_mm,
        yield_tons_per_ha, pest_incidents, market_price_ksh_per_kg, input_cost_ksh,
        source, dedupe_signature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        normalized.subCounty,
        normalized.season,
        normalized.soilType,
        normalized.crop,
        normalized.observationDate,
        normalized.soilPH,
        normalized.nitrogen,
        normalized.phosphorus,
        normalized.potassium,
        normalized.organicMatter,
        normalized.rainfallMm,
        normalized.yieldTonsPerHa,
        Math.round(normalized.pestIncidents),
        normalized.marketPriceKshPerKg,
        normalized.inputCostKsh,
        normalized.source,
        signature
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Historical observation ingested successfully',
      data: {
        id: insert.lastID,
        signature
      }
    });
  } catch (error) {
    console.error('Historical ingestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to ingest historical observation',
      error: error.message
    });
  }
});

app.post('/api/historical-data/ingest-bulk', async (req, res) => {
  try {
    const observations = Array.isArray(req.body?.observations) ? req.body.observations : [];
    if (observations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'observations array is required'
      });
    }

    const results = [];
    for (let i = 0; i < observations.length; i += 1) {
      const normalized = sanitizeHistoricalObservation(observations[i]);
      const errors = validateHistoricalObservation(normalized);

      if (errors.length > 0) {
        results.push({ index: i, success: false, errors });
        continue;
      }

      const signature = buildObservationSignature(normalized);
      const duplicate = await dbAsync.get(
        `SELECT id FROM historical_observations WHERE dedupe_signature = ?`,
        [signature]
      );

      if (duplicate) {
        results.push({ index: i, success: false, duplicateId: duplicate.id, message: 'Duplicate observation' });
        continue;
      }

      const insert = await dbAsync.run(
        `INSERT INTO historical_observations (
          sub_county, season, soil_type, crop, observation_date, soil_ph,
          nitrogen, phosphorus, potassium, organic_matter, rainfall_mm,
          yield_tons_per_ha, pest_incidents, market_price_ksh_per_kg, input_cost_ksh,
          source, dedupe_signature
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          normalized.subCounty,
          normalized.season,
          normalized.soilType,
          normalized.crop,
          normalized.observationDate,
          normalized.soilPH,
          normalized.nitrogen,
          normalized.phosphorus,
          normalized.potassium,
          normalized.organicMatter,
          normalized.rainfallMm,
          normalized.yieldTonsPerHa,
          Math.round(normalized.pestIncidents),
          normalized.marketPriceKshPerKg,
          normalized.inputCostKsh,
          normalized.source,
          signature
        ]
      );

      results.push({ index: i, success: true, id: insert.lastID });
    }

    const inserted = results.filter((item) => item.success).length;
    const rejected = results.length - inserted;

    res.status(207).json({
      success: true,
      message: `Bulk ingestion completed. Inserted: ${inserted}, Rejected: ${rejected}`,
      summary: { total: results.length, inserted, rejected },
      results
    });
  } catch (error) {
    console.error('Bulk historical ingestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to ingest historical observations',
      error: error.message
    });
  }
});

app.get('/api/historical-data/summary', async (req, res) => {
  try {
    const subCounty = toNormalizedText(req.query.subCounty || '');
    const soilType = toNormalizedText(req.query.soilType || '');
    const season = toNormalizedText(req.query.season || '');

    if (!subCounty || !soilType || !season) {
      return res.status(400).json({
        success: false,
        message: 'subCounty, soilType, and season query parameters are required'
      });
    }

    const summary = await fetchHistoricalSummary(subCounty, soilType, season);
    res.json({
      success: true,
      data: {
        subCounty,
        soilType,
        season,
        ...summary
      }
    });
  } catch (error) {
    console.error('Historical summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch historical summary',
      error: error.message
    });
  }
});

// ==================== WEATHER API CONFIGURATION ====================
const WEATHER_BASE_URL = 'https://api.open-meteo.com/v1';

const subCountyCoordinates = {
  'bondo': { lat: -0.2386, lon: 34.2699 },
  'ugunja': { lat: -0.2833, lon: 34.2833 },
  'yala': { lat: -0.1000, lon: 34.5333 },
  'gem': { lat: -0.0833, lon: 34.4833 },
  'alego': { lat: -0.1667, lon: 34.3667 }
};

// Current weather endpoint
app.get('/api/weather/current/:subcounty', async (req, res) => {
  try {
    const subcounty = req.params.subcounty.toLowerCase();
    const forceFresh = req.query.fresh === '1';
    const coords = subCountyCoordinates[subcounty];
    
    if (!coords) {
      return res.status(404).json({ 
        success: false,
        error: 'Sub-county not found. Available sub-counties: bondo, ugunja, yala, gem, alego' 
      });
    }

    const { value, cacheHit } = await getCachedOrCompute(
      weatherCache,
      `weather:current:${subcounty}`,
      async () => {
        const response = await resilientCall(
          'weather_api',
          ({ signal }) =>
            fetch(
              `${WEATHER_BASE_URL}/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,weather_code,wind_speed_10m,wind_direction_10m&timezone=Africa/Nairobi`,
              { signal }
            ),
          { retries: 2, baseDelayMs: 300, timeoutMs: 12000 }
        );

        if (!response.ok) {
          throw new Error(`Weather API responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.current) {
          throw new Error('Weather data not available from API');
        }

        return {
          location: subcounty.charAt(0).toUpperCase() + subcounty.slice(1),
          temperature: Math.round(data.current.temperature_2m),
          humidity: data.current.relative_humidity_2m,
          precipitation: data.current.precipitation,
          rain: data.current.rain,
          showers: data.current.showers,
          weather_code: data.current.weather_code,
          wind_speed: data.current.wind_speed_10m,
          wind_direction: data.current.wind_direction_10m,
          description: getWeatherDescription(data.current.weather_code),
          icon: getWeatherIcon(data.current.weather_code),
          timestamp: new Date(data.current.time),
          alerts: checkWeatherAlerts(data.current)
        };
      },
      { fresh: forceFresh }
    );

    res.json({
      success: true,
      data: value,
      last_updated: new Date().toISOString(),
      cache: {
        hit: cacheHit
      }
    });

  } catch (error) {
    console.error('Weather API error:', error);
    res.json({
      success: true,
      data: getMockWeatherData(req.params.subcounty),
      last_updated: new Date().toISOString(),
      note: 'Using fallback data due to API unavailability'
    });
  }
});

// 7-day forecast endpoint
app.get('/api/weather/forecast/:subcounty', async (req, res) => {
  try {
    const subcounty = req.params.subcounty.toLowerCase();
    const forceFresh = req.query.fresh === '1';
    const coords = subCountyCoordinates[subcounty];
    
    if (!coords) {
      return res.status(404).json({ 
        success: false,
        error: 'Sub-county not found' 
      });
    }

    const { value, cacheHit } = await getCachedOrCompute(
      weatherCache,
      `weather:forecast:${subcounty}`,
      async () => {
        const response = await resilientCall(
          'weather_api',
          ({ signal }) =>
            fetch(
              `${WEATHER_BASE_URL}/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,precipitation_hours,wind_speed_10m_max&timezone=Africa/Nairobi&forecast_days=7`,
              { signal }
            ),
          { retries: 2, baseDelayMs: 300, timeoutMs: 12000 }
        );

        if (!response.ok) {
          throw new Error(`Forecast API responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.daily) {
          throw new Error('Forecast data not available from API');
        }

        return processOpenMeteoForecast(data.daily, subcounty);
      },
      { fresh: forceFresh }
    );

    res.json({
      success: true,
      data: value,
      location: subcounty.charAt(0).toUpperCase() + subcounty.slice(1),
      last_updated: new Date().toISOString(),
      cache: {
        hit: cacheHit
      }
    });

  } catch (error) {
    console.error('Forecast API error:', error);
    res.json({
      success: true,
      data: getMockForecastData(req.params.subcounty),
      last_updated: new Date().toISOString(),
      note: 'Using fallback data due to API unavailability'
    });
  }
});

// Weather summary endpoint
app.get('/api/weather/summary/:subcounty', async (req, res) => {
  try {
    const subcounty = req.params.subcounty.toLowerCase();
    const forceFresh = req.query.fresh === '1';
    
    if (!subCountyCoordinates[subcounty]) {
      return res.status(404).json({ 
        success: false,
        error: 'Sub-county not found' 
      });
    }

    const { value, cacheHit } = await getCachedOrCompute(
      weatherCache,
      `weather:summary:${subcounty}`,
      async () => {
        const [currentResponse, forecastResponse] = await Promise.all([
          resilientCall(
            'weather_api',
            ({ signal }) =>
              fetch(`${WEATHER_BASE_URL}/forecast?latitude=${subCountyCoordinates[subcounty].lat}&longitude=${subCountyCoordinates[subcounty].lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&timezone=Africa/Nairobi`, { signal }),
            { retries: 2, baseDelayMs: 300, timeoutMs: 12000 }
          ),
          resilientCall(
            'weather_api',
            ({ signal }) =>
              fetch(`${WEATHER_BASE_URL}/forecast?latitude=${subCountyCoordinates[subcounty].lat}&longitude=${subCountyCoordinates[subcounty].lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum&timezone=Africa/Nairobi&forecast_days=3`, { signal }),
            { retries: 2, baseDelayMs: 300, timeoutMs: 12000 }
          )
        ]);

        if (!currentResponse.ok || !forecastResponse.ok) {
          throw new Error('Weather API responded with error');
        }

        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();

        if (!currentData.current || !forecastData.daily) {
          throw new Error('Incomplete weather data received');
        }

        return {
          current: {
            temperature: Math.round(currentData.current.temperature_2m),
            description: getWeatherDescription(currentData.current.weather_code),
            icon: getWeatherIcon(currentData.current.weather_code),
            humidity: currentData.current.relative_humidity_2m,
            wind_speed: currentData.current.wind_speed_10m,
            precipitation: currentData.current.precipitation
          },
          forecast: processOpenMeteoForecast(forecastData.daily, subcounty).slice(0, 3),
          alerts: checkWeatherAlerts(currentData.current)
        };
      },
      { fresh: forceFresh }
    );

    res.json({
      success: true,
      data: value,
      last_updated: new Date().toISOString(),
      cache: {
        hit: cacheHit
      }
    });

  } catch (error) {
    console.error('Weather summary error:', error);
    res.json({
      success: true,
      data: getMockWeatherSummary(req.params.subcounty),
      last_updated: new Date().toISOString(),
      note: 'Using fallback data due to API unavailability'
    });
  }
});

// ==================== WEATHER HELPER FUNCTIONS ====================
function processOpenMeteoForecast(dailyData, location) {
  if (!dailyData.time || !dailyData.temperature_2m_min || !dailyData.temperature_2m_max) {
    return getMockForecastData(location);
  }
  
  return dailyData.time.map((date, index) => ({
    date: new Date(date),
    temperature: {
      min: Math.round(dailyData.temperature_2m_min[index]),
      max: Math.round(dailyData.temperature_2m_max[index])
    },
    weather_code: dailyData.weather_code[index],
    description: getWeatherDescription(dailyData.weather_code[index]),
    icon: getWeatherIcon(dailyData.weather_code[index]),
    precipitation: dailyData.precipitation_sum[index] || 0,
    rain: dailyData.rain_sum[index] || 0,
    precipitation_hours: dailyData.precipitation_hours ? dailyData.precipitation_hours[index] : 0,
    rain_probability: calculateRainProbability(dailyData.weather_code[index])
  }));
}

function getWeatherDescription(weatherCode) {
  const weatherDescriptions = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };
  return weatherDescriptions[weatherCode] || 'Unknown';
}

function getWeatherIcon(weatherCode) {
  const weatherIcons = {
    0: '☀️',  // Clear sky
    1: '🌤️',  // Mainly clear
    2: '⛅',  // Partly cloudy
    3: '☁️',  // Overcast
    45: '🌫️', // Fog
    48: '🌫️', // Fog
    51: '🌦️', // Light drizzle
    53: '🌦️', // Moderate drizzle
    55: '🌧️', // Dense drizzle
    61: '🌦️', // Slight rain
    63: '🌧️', // Moderate rain
    65: '🌧️', // Heavy rain
    80: '🌦️', // Rain showers
    81: '🌧️', // Rain showers
    82: '⛈️',  // Violent rain showers
    95: '⛈️',  // Thunderstorm
    96: '⛈️',  // Thunderstorm with hail
    99: '⛈️'   // Thunderstorm with hail
  };
  return weatherIcons[weatherCode] || '🌈';
}

function calculateRainProbability(weatherCode) {
  const rainCodes = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99];
  return rainCodes.includes(weatherCode) ? 70 : 
         weatherCode === 2 ? 20 : 
         weatherCode === 3 ? 30 : 10;
}

function checkWeatherAlerts(current) {
  const alerts = [];
  
  if (!current) return alerts;
  
  // Check for extreme temperatures
  if (current.temperature_2m > 35) {
    alerts.push({
      type: 'high_temperature',
      message: 'High temperature alert: Consider irrigation and shading',
      severity: 'warning'
    });
  }
  
  if (current.temperature_2m < 10) {
    alerts.push({
      type: 'low_temperature',
      message: 'Low temperature alert: Protect sensitive crops',
      severity: 'warning'
    });
  }
  
  // Check for heavy rain
  if (current.precipitation > 10) {
    alerts.push({
      type: 'heavy_rain',
      message: 'Heavy rain alert: Ensure proper drainage',
      severity: 'warning'
    });
  }
  
  return alerts;
}

// Mock data for fallback
function getMockWeatherData(subcounty) {
  const baseTemp = 25 + Math.random() * 5;
  return {
    location: subcounty.charAt(0).toUpperCase() + subcounty.slice(1),
    temperature: Math.round(baseTemp),
    humidity: 60 + Math.floor(Math.random() * 20),
    precipitation: Math.random() * 5,
    rain: Math.random() * 2,
    weather_code: Math.random() > 0.7 ? 63 : 1,
    wind_speed: 2 + Math.random() * 5,
    description: Math.random() > 0.7 ? 'Moderate rain' : 'Mainly clear',
    icon: Math.random() > 0.7 ? '🌧️' : '🌤️',
    timestamp: new Date(),
    alerts: []
  };
}

function getMockForecastData(subcounty) {
  const forecast = [];
  const baseDate = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + i);
    
    forecast.push({
      date: date,
      temperature: {
        min: 18 + Math.floor(Math.random() * 5),
        max: 28 + Math.floor(Math.random() * 5)
      },
      description: i % 3 === 0 ? 'Moderate rain' : 'Partly cloudy',
      icon: i % 3 === 0 ? '🌧️' : '⛅',
      precipitation: i % 3 === 0 ? 5 + Math.random() * 10 : Math.random() * 2,
      rain_probability: i % 3 === 0 ? 70 : 20
    });
  }
  
  return forecast;
}

function getMockWeatherSummary(subcounty) {
  return {
    current: {
      temperature: 27,
      description: 'Partly cloudy',
      icon: '⛅',
      humidity: 65,
      wind_speed: 3.2,
      precipitation: 0.5
    },
    forecast: [
      {
        date: new Date(Date.now() + 86400000),
        temperature: { min: 19, max: 29 },
        description: 'Partly cloudy',
        icon: '⛅',
        rain_probability: 20
      },
      {
        date: new Date(Date.now() + 172800000),
        temperature: { min: 20, max: 28 },
        description: 'Moderate rain',
        icon: '🌧️',
        rain_probability: 70
      },
      {
        date: new Date(Date.now() + 259200000),
        temperature: { min: 18, max: 27 },
        description: 'Mainly clear',
        icon: '🌤️',
        rain_probability: 10
      }
    ],
    alerts: []
  };
}

// ==================== CROP PREDICTION RULES ====================
const cropRules = [
  // Bondo rules (10 crops)
  {
    conditions: { subcounty: "bondo", soil: "sandy", season: "long_rains" },
    recommendation: "beans",
    confidence: 85,
    reasons: {
      english: "Beans thrive in sandy soil during long rains with good drainage",
      swahili: "Maharagwe hukua vizuri kwenye udongo wa mchanga wakati wa mvua nyingi",
      luo: "Bo ma okony gi tongo anyong e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "bondo", soil: "clay", season: "short_rains" },
    recommendation: "maize",
    confidence: 80,
    reasons: {
      english: "Maize grows well in clay soil during short rains",
      swahili: "Mahindi hukua vizuri kwenye udongo wa mfinyanzi wakati wa mvua fupi",
      luo: "Oduma donjo maber e tongo lal e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "bondo", soil: "loam", season: "long_rains" },
    recommendation: "sorghum",
    confidence: 90,
    reasons: {
      english: "Sorghum is drought-resistant and grows well in loam soil",
      swahili: "Mtama unaomvumilia ukame na hukua vizuri kwenye udongo wa tanuri",
      luo: "Bel donjo maber e tongo ber e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "bondo", soil: "sandy", season: "dry" },
    recommendation: "cassava",
    confidence: 75,
    reasons: {
      english: "Cassava is drought-tolerant and grows well in sandy soil",
      swahili: "Muhogo unavumilia ukame na hukua vizuri kwenye udongo wa mchanga",
      luo: "Mogo nyalo turo e kwo e tongo anyong"
    }
  },
  {
    conditions: { subcounty: "bondo", soil: "clay", season: "long_rains" },
    recommendation: "rice",
    confidence: 88,
    reasons: {
      english: "Rice requires clay soil that retains water during long rains",
      swahili: "Mchele unahitaji udongo wa mfinyanzi unaoshika maji wakati wa mvua nyingi",
      luo: "Mchele donjo maber e tongo lal e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "bondo", soil: "loam", season: "short_rains" },
    recommendation: "soybeans",
    confidence: 82,
    reasons: {
      english: "Soybeans thrive in loam soil during short rains",
      swahili: "Soya hukua vizuri kwenye udongo wa tanuri wakati wa mvua fupi",
      luo: "Soy donjo maber e tongo ber e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "bondo", soil: "sandy", season: "short_rains" },
    recommendation: "green_grams",
    confidence: 78,
    reasons: {
      english: "Green grams are suitable for sandy soil in short rains",
      swahili: "Pojo ni sawa kwa udongo wa mchanga wakati wa mvua fupi",
      luo: "Ngege ber mondo tiyo gi tongo anyong e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "bondo", soil: "clay", season: "dry" },
    recommendation: "millet",
    confidence: 70,
    reasons: {
      english: "Millet is drought-tolerant and grows in clay soil",
      swahili: "Uwele unavumilia ukame na hukua kwenye udongo wa mfinyanzi",
      luo: "Belo ma nyalo turo e kwo e tongo lal"
    }
  },
  {
    conditions: { subcounty: "bondo", soil: "loam", season: "dry" },
    recommendation: "sweet_potatoes",
    confidence: 85,
    reasons: {
      english: "Sweet potatoes grow well in loam soil during dry season",
      swahili: "Viazi vitamu hukua vizuri kwenye udongo wa tanuri wakati wa kiangazi",
      luo: "Rabuon donjo maber e tongo ber e piny kwo"
    }
  },
  {
    conditions: { subcounty: "bondo", soil: "sandy", season: "long_rains" },
    recommendation: "watermelons",
    confidence: 80,
    reasons: {
      english: "Watermelons thrive in sandy soil with good drainage during long rains",
      swahili: "Mtikiti hukua vizuri kwenye udongo wa mchanga wenye mitiririko mzuri wakati wa mvua nyingi",
      luo: "Mikwere donjo maber e tongo anyong e piny ruodho"
    }
  },

  // Ugunja rules (10 crops)
  {
    conditions: { subcounty: "ugunja", soil: "sandy", season: "long_rains" },
    recommendation: "cowpeas",
    confidence: 85,
    reasons: {
      english: "Cowpeas are ideal for sandy soils in Ugunja during long rains",
      swahili: "Kunde ni bora kwa udongo wa mchanga huko Ugunja wakati wa mvua nyingi",
      luo: "Bo ma nyoyo donjo maber e Ugunja gi tongo anyong"
    }
  },
  {
    conditions: { subcounty: "ugunja", soil: "clay", season: "short_rains" },
    recommendation: "pigeon_peas",
    confidence: 82,
    reasons: {
      english: "Pigeon peas grow well in clay soil during short rains",
      swahili: "Mbaazi hukua vizuri kwenye udongo wa mfinyanzi wakati wa mvua fupi",
      luo: "Otho donjo maber e tongo lal e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "ugunja", soil: "loam", season: "long_rains" },
    recommendation: "sunflower",
    confidence: 78,
    reasons: {
      english: "Sunflowers thrive in loam soil during long rains",
      swahili: "Alizeti hukua vizuri kwenye udongo wa tanuri wakati wa mvua nyingi",
      luo: "Abir donjo maber e tongo ber e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "ugunja", soil: "sandy", season: "dry" },
    recommendation: "groundnuts",
    confidence: 75,
    reasons: {
      english: "Groundnuts are drought-resistant and suitable for sandy soil",
      swahili: "Njugu unavumilia ukame na unafaa kwa udongo wa mchanga",
      luo: "Nguo ma nyalo turo e kwo e tongo anyong"
    }
  },
  {
    conditions: { subcounty: "ugunja", soil: "clay", season: "long_rains" },
    recommendation: "cotton",
    confidence: 72,
    reasons: {
      english: "Cotton requires clay soil that retains moisture during long rains",
      swahili: "Pamba unahitaji udongo wa mfinyanzi unaoshika unyevu wakati wa mvua nyingi",
      luo: "Pamba donjo maber e tongo lal e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "ugunja", soil: "loam", season: "short_rains" },
    recommendation: "tomatoes",
    confidence: 88,
    reasons: {
      english: "Tomatoes thrive in loam soil during short rains",
      swahili: "Nyanya hukua vizuri kwenye udongo wa tanuri wakati wa mvua fupi",
      luo: "Nyanya donjo maber e tongo ber e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "ugunja", soil: "sandy", season: "short_rains" },
    recommendation: "onions",
    confidence: 80,
    reasons: {
      english: "Onions grow well in sandy soil during short rains",
      swahili: "Vitunguu hukua vizuri kwenye udongo wa mchanga wakati wa mvua fupi",
      luo: "Kitunguu donjo maber e tongo anyong e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "ugunja", soil: "clay", season: "dry" },
    recommendation: "sugarcane",
    confidence: 85,
    reasons: {
      english: "Sugarcane is drought-tolerant and grows in clay soil",
      swahili: "Mia unavumilia ukame na hukua kwenye udongo wa mfinyanzi",
      luo: "Mia nyalo turo e kwo e tongo lal"
    }
  },
  {
    conditions: { subcounty: "ugunja", soil: "loam", season: "dry" },
    recommendation: "potatoes",
    confidence: 82,
    reasons: {
      english: "Potatoes grow well in loam soil during dry season",
      swahili: "Viazi hukua vizuri kwenye udongo wa tanuri wakati wa kiangazi",
      luo: "Rabuon donjo maber e tongo ber e piny kwo"
    }
  },
  {
    conditions: { subcounty: "ugunja", soil: "sandy", season: "long_rains" },
    recommendation: "carrots",
    confidence: 78,
    reasons: {
      english: "Carrots thrive in sandy soil with good drainage during long rains",
      swahili: "Karoti hukua vizuri kwenye udongo wa mchanga wenye mitiririko mzuri wakati wa mvua nyingi",
      luo: "Karot donjo maber e tongo anyong e piny ruodho"
    }
  },

  // Yala rules (10 crops)
  {
    conditions: { subcounty: "yala", soil: "loam", season: "long_rains" },
    recommendation: "rice",
    confidence: 95,
    reasons: {
      english: "Yala's loam soil is perfect for rice cultivation during long rains",
      swahili: "Udongo wa tanuri wa Yala unafaa kwa kilimo cha mchele wakati wa mvua nyingi",
      luo: "Mchele donjo maber e Yala gi tongo ber e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "yala", soil: "clay", season: "short_rains" },
    recommendation: "sweet_potatoes",
    confidence: 88,
    reasons: {
      english: "Sweet potatoes grow well in clay soil during short rains",
      swahili: "Viazi vitamu hukua vizuri kwenye udongo wa mfinyanzi wakati wa mvua fupi",
      luo: "Rabuon donjo maber e tongo lal e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "yala", soil: "sandy", season: "long_rains" },
    recommendation: "cabbage",
    confidence: 85,
    reasons: {
      english: "Cabbage thrives in sandy soil during long rains",
      swahili: "Kabichi hukua vizuri kwenye udongo wa mchanga wakati wa mvua nyingi",
      luo: "Kabich donjo maber e tongo anyong e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "yala", soil: "loam", season: "short_rains" },
    recommendation: "kale",
    confidence: 90,
    reasons: {
      english: "Kale grows exceptionally well in Yala's loam soil during short rains",
      swahili: "Sukumawiki hukua vizuri sana kwenye udongo wa tanuri wa Yala wakati wa mvua fupi",
      luo: "Sukumawiki donjo maber e Yala gi tongo ber e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "yala", soil: "clay", season: "long_rains" },
    recommendation: "spinach",
    confidence: 82,
    reasons: {
      english: "Spinach requires clay soil that retains moisture during long rains",
      swahili: "Mchicha unahitaji udongo wa mfinyanzi unaoshika unyevu wakati wa mvua nyingi",
      luo: "Mchicha donjo maber e tongo lal e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "yala", soil: "sandy", season: "dry" },
    recommendation: "pumpkins",
    confidence: 75,
    reasons: {
      english: "Pumpkins are drought-tolerant and grow well in sandy soil",
      swahili: "Maboga unavumilia ukame na hukua vizuri kwenye udongo wa mchanga",
      luo: "Boga ma nyalo turo e kwo e tongo anyong"
    }
  },
  {
    conditions: { subcounty: "yala", soil: "loam", season: "dry" },
    recommendation: "eggplant",
    confidence: 78,
    reasons: {
      english: "Eggplant grows well in loam soil during dry season",
      swahili: "Biringanya hukua vizuri kwenye udongo wa tanuri wakati wa kiangazi",
      luo: "Biringanya donjo maber e tongo ber e piny kwo"
    }
  },
  {
    conditions: { subcounty: "yala", soil: "clay", season: "short_rains" },
    recommendation: "okra",
    confidence: 80,
    reasons: {
      english: "Okra thrives in clay soil during short rains",
      swahili: "Bamia hukua vizuri kwenye udongo wa mfinyanzi wakati wa mvua fupi",
      luo: "Bamia donjo maber e tongo lal e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "yala", soil: "sandy", season: "short_rains" },
    recommendation: "cucumber",
    confidence: 82,
    reasons: {
      english: "Cucumbers grow well in sandy soil during short rains",
      swahili: "Tangawizi hukua vizuri kwenye udongo wa mchanga wakati wa mvua fupi",
      luo: "Tangawisi donjo maber e tongo anyong e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "yala", soil: "loam", season: "long_rains" },
    recommendation: "bananas",
    confidence: 92,
    reasons: {
      english: "Bananas thrive in Yala's fertile loam soil during long rains",
      swahili: "Ndizi hukua vizuri kwenye udongo wa tanuri wa Yala wakati wa mvua nyingi",
      luo: "Rabuon donjo maber e Yala gi tongo ber e piny ruodho"
    }
  },

  // Gem rules (10 crops)
  {
    conditions: { subcounty: "gem", soil: "loam", season: "long_rains" },
    recommendation: "soybeans",
    confidence: 82,
    reasons: {
      english: "Soybeans thrive in Gem's loam soil during long rains",
      swahili: "Soya hukua vizuri kwenye udongo wa tanuri wa Gem wakati wa mvua nyingi",
      luo: "Soy donjo maber e Gem gi tongo ber"
    }
  },
  {
    conditions: { subcounty: "gem", soil: "sandy", season: "short_rains" },
    recommendation: "green_grams",
    confidence: 78,
    reasons: {
      english: "Green grams are suitable for Gem's sandy soil in short rains",
      swahili: "Pojo ni sawa kwa udongo wa mchanga wa Gem wakati wa mvua fupi",
      luo: "Ngege ber mondo tiyo gi tongo anyong e Gem"
    }
  },
  {
    conditions: { subcounty: "gem", soil: "clay", season: "long_rains" },
    recommendation: "tea",
    confidence: 85,
    reasons: {
      english: "Tea requires clay soil with good moisture retention in Gem during long rains",
      swahili: "Chai unahitaji udongo wa mfinyanzi unaoshika unyevu vizuri Gem wakati wa mvua nyingi",
      luo: "Chai donjo maber e Gem gi tongo lal e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "gem", soil: "loam", season: "short_rains" },
    recommendation: "coffee",
    confidence: 88,
    reasons: {
      english: "Coffee grows well in Gem's loam soil during short rains",
      swahili: "Kahawa hukua vizuri kwenye udongo wa tanuri wa Gem wakati wa mvua fupi",
      luo: "Kahawa donjo maber e Gem gi tongo ber e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "gem", soil: "sandy", season: "dry" },
    recommendation: "sisal",
    confidence: 70,
    reasons: {
      english: "Sisal is drought-resistant and suitable for sandy soil in Gem",
      swahili: "Mkonge unavumilia ukame na unafaa kwa udongo wa mchanga Gem",
      luo: "Mkonge ma nyalo turo e kwo e Gem gi tongo anyong"
    }
  },
  {
    conditions: { subcounty: "gem", soil: "clay", season: "short_rains" },
    recommendation: "pyrethrum",
    confidence: 75,
    reasons: {
      english: "Pyrethrum grows well in clay soil during short rains in Gem",
      swahili: "Pyrethrum hukua vizuri kwenye udongo wa mfinyanzi wakati wa mvua fupi Gem",
      luo: "Pyrethrum donjo maber e Gem gi tongo lal e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "gem", soil: "loam", season: "dry" },
    recommendation: "avocado",
    confidence: 90,
    reasons: {
      english: "Avocado trees thrive in Gem's loam soil during dry season",
      swahili: "Mikunde hukua vizuri kwenye udongo wa tanuri wa Gem wakati wa kiangazi",
      luo: "Mikunde donjo maber e Gem gi tongo ber e piny kwo"
    }
  },
  {
    conditions: { subcounty: "gem", soil: "sandy", season: "long_rains" },
    recommendation: "mangoes",
    confidence: 85,
    reasons: {
      english: "Mangoes grow well in sandy soil with good drainage in Gem during long rains",
      swahili: "Maembe hukua vizuri kwenye udongo wa mchanga wenye mitiririko mzuri Gem wakati wa mvua nyingi",
      luo: "Maembe donjo maber e Gem gi tongo anyong e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "gem", soil: "clay", season: "dry" },
    recommendation: "macadamia",
    confidence: 80,
    reasons: {
      english: "Macadamia nuts are drought-tolerant and grow in clay soil in Gem",
      swahili: "Macadamia unavumilia ukame na hukua kwenye udongo wa mfinyanzi Gem",
      luo: "Macadamia nyalo turo e kwo e Gem gi tongo lal"
    }
  },
  {
    conditions: { subcounty: "gem", soil: "loam", season: "long_rains" },
    recommendation: "passion_fruit",
    confidence: 88,
    reasons: {
      english: "Passion fruit thrives in Gem's loam soil during long rains",
      swahili: "Passion hukua vizuri kwenye udongo wa tanuri wa Gem wakati wa mvua nyingi",
      luo: "Passion donjo maber e Gem gi tongo ber e piny ruodho"
    }
  },

  // Alego rules (10 crops)
  {
    conditions: { subcounty: "alego", soil: "sandy", season: "short_rains" },
    recommendation: "green_grams",
    confidence: 78,
    reasons: {
      english: "Green grams are suitable for Alego's sandy soil in short rains",
      swahili: "Pojo ni sawa kwa udongo wa mchanga wa Alego wakati wa mvua fupi",
      luo: "Ngege ber mondo tiyo gi tongo anyong e Alego"
    }
  },
  {
    conditions: { subcounty: "alego", soil: "clay", season: "long_rains" },
    recommendation: "rice",
    confidence: 85,
    reasons: {
      english: "Rice grows well in Alego's clay soil during long rains",
      swahili: "Mchele hukua vizuri kwenye udongo wa mfinyanzi wa Alego wakati wa mvua nyingi",
      luo: "Mchele donjo maber e Alego gi tongo lal e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "alego", soil: "loam", season: "short_rains" },
    recommendation: "beans",
    confidence: 90,
    reasons: {
      english: "Beans thrive in Alego's loam soil during short rains",
      swahili: "Maharagwe hukua vizuri kwenye udongo wa tanuri wa Alego wakati wa mvua fupi",
      luo: "Bo donjo maber e Alego gi tongo ber e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "alego", soil: "sandy", season: "dry" },
    recommendation: "cowpeas",
    confidence: 75,
    reasons: {
      english: "Cowpeas are drought-resistant and suitable for Alego's sandy soil",
      swahili: "Kunde unavumilia ukame na unafaa kwa udongo wa mchanga wa Alego",
      luo: "Bo ma nyoyo nyalo turo e kwo e Alego gi tongo anyong"
    }
  },
  {
    conditions: { subcounty: "alego", soil: "clay", season: "short_rains" },
    recommendation: "sorghum",
    confidence: 82,
    reasons: {
      english: "Sorghum grows well in clay soil during short rains in Alego",
      swahili: "Mtama hukua vizuri kwenye udongo wa mfinyanzi wakati wa mvua fupi Alego",
      luo: "Bel donjo maber e Alego gi tongo lal e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "alego", soil: "loam", season: "long_rains" },
    recommendation: "maize",
    confidence: 88,
    reasons: {
      english: "Maize thrives in Alego's loam soil during long rains",
      swahili: "Mahindi hukua vizuri kwenye udongo wa tanuri wa Alego wakati wa mvua nyingi",
      luo: "Oduma donjo maber e Alego gi tongo ber e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "alego", soil: "sandy", season: "long_rains" },
    recommendation: "watermelons",
    confidence: 80,
    reasons: {
      english: "Watermelons grow well in Alego's sandy soil during long rains",
      swahili: "Mtikiti hukua vizuri kwenye udongo wa mchanga wa Alego wakati wa mvua nyingi",
      luo: "Mikwere donjo maber e Alego gi tongo anyong e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "alego", soil: "clay", season: "dry" },
    recommendation: "millet",
    confidence: 70,
    reasons: {
      english: "Millet is drought-tolerant and grows in Alego's clay soil",
      swahili: "Uwele unavumilia ukame na hukua kwenye udongo wa mfinyanzi wa Alego",
      luo: "Belo ma nyalo turo e kwo e Alego gi tongo lal"
    }
  },
  {
    conditions: { subcounty: "alego", soil: "loam", season: "dry" },
    recommendation: "sweet_potatoes",
    confidence: 85,
    reasons: {
      english: "Sweet potatoes grow well in Alego's loam soil during dry season",
      swahili: "Viazi vitamu hukua vizuri kwenye udongo wa tanuri wa Alego wakati wa kiangazi",
      luo: "Rabuon donjo maber e Alego gi tongo ber e piny kwo"
    }
  },
  {
    conditions: { subcounty: "alego", soil: "sandy", season: "short_rains" },
    recommendation: "groundnuts",
    confidence: 78,
    reasons: {
      english: "Groundnuts are suitable for Alego's sandy soil in short rains",
      swahili: "Njugu ni sawa kwa udongo wa mchanga wa Alego wakati wa mvua fupi",
      luo: "Nguo ber mondo tiyo gi tongo anyong e Alego e piny ruodho machon"
    }
  }
];
// ==================== ROUTES ====================

// Serve the landing page
app.get(['/', '/index.html'], (req, res) => {
  // Prefer the repository root landing page if present (matches local "static" look).
  const repoRootIndex = path.resolve(__dirname, '..', 'index.html');
  const backendIndex = path.join(__dirname, 'public', 'index.html');
  res.sendFile(fs.existsSync(repoRootIndex) ? repoRootIndex : backendIndex);
});

// Keep backward-compatible access to the repo-root dashboard HTML if it exists.
app.get('/Dashboard.html', (req, res) => {
  const repoRootDashboard = path.resolve(__dirname, '..', 'Dashboard.html');
  if (!fs.existsSync(repoRootDashboard)) {
    return res.redirect(302, '/dashboard');
  }
  res.sendFile(repoRootDashboard);
});

app.get('/farmer-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'farmer-dashboard.html'));
});

// Serve the dashboard (legacy)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Serve the API tester
app.get('/api-tester', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'api-tester.html'));
});

// Serve the USSD simulator
app.get('/ussd-simulator', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ussd-simulator.html'));
});

// Enhanced Prediction API with proper error handling
app.post('/api/predict', validatePredictionInput, async (req, res) => {
  const { subCounty, soilType, season, language = 'english', phoneNumber } = req.body;

  const normalizedLanguage = normalizeLanguage(language);
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  console.log('Received prediction request:', { subCounty, soilType, season, language: normalizedLanguage, phoneNumber: normalizedPhone });

  const matchedRule = cropRules.find(rule => 
    rule.conditions.subcounty === subCounty.toLowerCase() &&
    rule.conditions.soil === soilType.toLowerCase() &&
    rule.conditions.season === season.toLowerCase()
  );

  if (!matchedRule) {
    return res.status(404).json({
      success: false,
      message: "No matching crop recommendation found for your inputs"
    });
  }

  const localizedReason = matchedRule.reasons[normalizedLanguage] || matchedRule.reasons.english;
  const modelVersion = 'rule-engine-v1.0.0';

  if (normalizedPhone) {
    try {
      await dbAsync.run(
        `INSERT INTO farmers (phone_number, sub_county, soil_type, preferred_language)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(phone_number) DO UPDATE SET 
           sub_county = excluded.sub_county,
           soil_type = excluded.soil_type,
           preferred_language = excluded.preferred_language`,
        [normalizedPhone, subCounty, soilType, normalizedLanguage]
      );
    } catch (err) {
      console.error('Error upserting farmer record:', err);
    }
  }

  let insertResult;
  try {
    insertResult = await dbAsync.run(
      `INSERT INTO predictions (sub_county, soil_type, season, predicted_crop, confidence, model_version, reason, phone_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subCounty,
        soilType,
        season,
        matchedRule.recommendation,
        matchedRule.confidence,
        modelVersion,
        localizedReason,
        normalizedPhone
      ]
    );
  } catch (err) {
    console.error('Error saving prediction:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to save prediction to database'
    });
  }

  const alternatives = cropRules
    .filter(rule => rule.conditions.subcounty === subCounty.toLowerCase())
    .filter(rule => rule.recommendation !== matchedRule.recommendation)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
    .map(rule => ({
      crop: rule.recommendation,
      confidence: rule.confidence,
      soil: rule.conditions.soil,
      season: rule.conditions.season,
      reason: rule.reasons[normalizedLanguage] || rule.reasons.english
    }));

  let notificationStatus = {
    queued: false,
    channel: 'job_queue',
    reason: 'Phone number not provided'
  };

  if (normalizedPhone) {
    const queued = enqueueJob('recommendation_notification', {
      phoneNumber: normalizedPhone,
      recommendation: {
        crop: matchedRule.recommendation,
        confidence: matchedRule.confidence,
        reason: localizedReason,
        subCounty,
        season,
        soilType
      }
    }, {
      maxAttempts: 4,
      backoffMs: 1000
    });
    notificationStatus = {
      ...queued,
      channel: 'job_queue',
      reason: 'Queued for async processing'
    };
  }

  res.json({
    success: true,
    crop: matchedRule.recommendation,
    confidence: matchedRule.confidence,
    reason: localizedReason,
    message: "Prediction successful",
    modelVersion,
    predictionId: insertResult?.lastID ?? null,
    submitted_at: new Date().toISOString(),
    alternatives,
    notificationStatus
  });
});

const USSD_SUBCOUNTIES = ['bondo', 'ugunja', 'yala', 'gem', 'alego'];
const USSD_SOILS = ['sandy', 'clay', 'loam'];
const USSD_SEASONS = ['long_rains', 'short_rains', 'dry'];

const getUssdSeasonFromMonth = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 8) return 'long_rains';
  if (month >= 10 && month <= 12) return 'short_rains';
  return 'dry';
};

// USSD endpoint
app.post('/api/ussd', async (req, res) => {
  try {
    const { phoneNumber, text = '' } = req.body || {};
    const steps = text.split('*').filter((x) => x.length > 0);

    const sendUssd = (value) => {
      res.set('Content-Type', 'text/plain');
      return res.send(value);
    };

    if (!text || steps.length === 0) {
      return sendUssd('CON Welcome to Fahamu Shamba.\n1. English\n2. Kiswahili\n3. Dholuo');
    }

    const language = getLanguage(steps[0]);
    if (!['1', '2', '3'].includes(steps[0])) {
      return sendUssd(`CON ${getTranslation('invalid_selection', language)}\n1. English\n2. Kiswahili\n3. Dholuo`);
    }

    if (steps.length === 1) {
      return sendUssd(
        `CON ${getTranslation('main_menu', language)}\n` +
        `1. ${getTranslation('get_advice', language)}\n` +
        `2. ${getTranslation('market_prices', language)}\n` +
        `3. ${getTranslation('weather_update', language)}\n` +
        `4. ${getTranslation('about', language)}`
      );
    }

    const menuChoice = steps[1];

    if (steps.length === 2) {
      if (menuChoice === '1' || menuChoice === '2' || menuChoice === '3') {
        return sendUssd(
          `CON ${getTranslation('select_subcounty', language)}\n` +
          '1. Bondo\n2. Ugunja\n3. Yala\n4. Gem\n5. Alego'
        );
      }
      if (menuChoice === '4') {
        return sendUssd(
          `END Fahamu Shamba\n` +
          `${getTranslation('about_text', language)}`
        );
      }
      return sendUssd(
        `CON ${getTranslation('main_menu', language)}\n` +
        `1. ${getTranslation('get_advice', language)}\n` +
        `2. ${getTranslation('market_prices', language)}\n` +
        `3. ${getTranslation('weather_update', language)}\n` +
        `4. ${getTranslation('about', language)}`
      );
    }

    const subCountyIndex = parseInt(steps[2], 10) - 1;
    if (subCountyIndex < 0 || subCountyIndex >= USSD_SUBCOUNTIES.length) {
      return sendUssd(`END ${getTranslation('invalid_selection', language)}. ${getTranslation('try_again', language)}`);
    }
    const subCounty = USSD_SUBCOUNTIES[subCountyIndex];

    if (menuChoice === '2') {
      const topMarket = (demoData.marketPrices || [])
        .map((entry) => ({ crop: entry.crop, price: Number(entry[subCounty] || 0) }))
        .sort((a, b) => b.price - a.price)
        .slice(0, 3);

      const lines = topMarket.length
        ? topMarket.map((item, idx) => `${idx + 1}. ${item.crop}: KSh ${item.price}/kg`)
        : [getTranslation('no_market_data', language)];

      return sendUssd(
        `END ${getTranslation('market_prices_for', language)} ${subCounty.toUpperCase()}:\n` +
        `${lines.join('\n')}`
      );
    }

    if (menuChoice === '3') {
      const season = getUssdSeasonFromMonth();
      const weather = demoData.weatherData?.[subCounty]?.[season];
      if (!weather) {
        return sendUssd(`END ${getTranslation('no_weather_data', language)}`);
      }
      return sendUssd(
        `END ${getTranslation('weather_for', language)} ${subCounty.toUpperCase()}:\n` +
        `${getTranslation('season', language)}: ${season}\n` +
        `${getTranslation('rainfall_mm', language)}: ${weather.rainfall}mm\n` +
        `${getTranslation('temperature', language)}: ${weather.temperature}C\n` +
        `${getTranslation('humidity', language)}: ${weather.humidity}%`
      );
    }

    if (menuChoice !== '1') {
      return sendUssd(`END ${getTranslation('invalid_selection', language)}. ${getTranslation('try_again', language)}`);
    }

    if (steps.length === 3) {
      return sendUssd(
        `CON ${getTranslation('select_soil', language)}\n` +
        `1. ${getTranslation('sandy', language)}\n` +
        `2. ${getTranslation('clay', language)}\n` +
        `3. ${getTranslation('loam', language)}`
      );
    }

    const soilIndex = parseInt(steps[3], 10) - 1;
    if (soilIndex < 0 || soilIndex >= USSD_SOILS.length) {
      return sendUssd(`END ${getTranslation('invalid_selection', language)}. ${getTranslation('try_again', language)}`);
    }
    const soilType = USSD_SOILS[soilIndex];

    if (steps.length === 4) {
      return sendUssd(
        `CON ${getTranslation('select_season', language)}\n` +
        `1. ${getTranslation('long_rains', language)}\n` +
        `2. ${getTranslation('short_rains', language)}\n` +
        `3. ${getTranslation('dry', language)}`
      );
    }

    const seasonIndex = parseInt(steps[4], 10) - 1;
    if (seasonIndex < 0 || seasonIndex >= USSD_SEASONS.length) {
      return sendUssd(`END ${getTranslation('invalid_selection', language)}. ${getTranslation('try_again', language)}`);
    }
    const season = USSD_SEASONS[seasonIndex];

    const recommendationResult = recommendationEngine.getRecommendations({
      subCounty,
      soilType,
      season,
      budget: 5000,
      farmSize: 1,
      waterSource: 'Rainfall'
    });

    if (!recommendationResult?.recommendations?.length) {
      return sendUssd(`END ${getTranslation('no_recommendation', language)}`);
    }

    const top = recommendationResult.recommendations[0];
    const second = recommendationResult.recommendations[1];
    const reason = top?.reasons?.[language] || top?.reasons?.english || getTranslation('good_fit', language);

    try {
      const modelVersion = recommendationResult?.metadata?.modelVersion || 'fahamu-rec-v2.0.0';
      await dbAsync.run(
        `INSERT INTO predictions (phone_number, sub_county, soil_type, season, predicted_crop, confidence, model_version, reason) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [normalizePhoneNumber(phoneNumber), subCounty, soilType, season, top.name, top.score, modelVersion, reason]
      );
    } catch (dbError) {
      console.error('USSD prediction save error:', dbError.message);
    }

    const alternativeLine = second
      ? `\n${getTranslation('alternative', language)}: ${second.name} (${second.score}%)`
      : '';

    return sendUssd(
      `END ${getTranslation('recommendation', language)}: ${top.name}\n` +
      `${getTranslation('score', language)}: ${top.score}%${alternativeLine}\n` +
      `${reason}`
    );
  } catch (error) {
    console.error('USSD Error:', error);
    res.set('Content-Type', 'text/plain');
    return res.send('END An error occurred. Please try again later.');
  }
});

// Save user feedback about recommendations
app.post('/api/feedback', async (req, res) => {
  const { predictionId, phoneNumber, helpful, comments = '' } = req.body;

  if (!predictionId || typeof helpful !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'predictionId and helpful flag are required'
    });
  }

  const trimmedComments = comments ? comments.toString().trim().slice(0, 500) : null;
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  try {
    await dbAsync.run(
      `INSERT INTO feedback (prediction_id, phone_number, is_helpful, comments)
       VALUES (?, ?, ?, ?)`,
      [predictionId, normalizedPhone, helpful ? 1 : 0, trimmedComments]
    );

    kpiTracker.recordFeedback(normalizedPhone || getTrackingFarmerId(req), {
      predictionId,
      helpful,
      comments: trimmedComments
    });

    res.json({
      success: true,
      message: 'Feedback recorded. Thank you!'
    });
  } catch (error) {
    console.error('Error saving feedback:', error);
    metricsCollector.recordError(error, '/api/feedback', {
      requestId: req.requestId,
      predictionId
    });
    res.status(500).json({
      success: false,
      message: 'Unable to save feedback'
    });
  }
});

// Get prediction history
app.get('/api/predictions', (req, res) => {
  const { phoneNumber } = req.query;
  const { limit, offset } = parsePaginationParams(req, { defaultLimit: 25, maxLimit: 200 });
  const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : null;

  let whereClause = '';
  let queryParams = [];
  if (normalizedPhone) {
    whereClause = ' WHERE phone_number = ?';
    queryParams = [normalizedPhone];
  }

  Promise.all([
    dbAsync.all(
      `SELECT * FROM predictions${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    ),
    dbAsync.get(
      `SELECT COUNT(*) AS total FROM predictions${whereClause}`,
      queryParams
    )
  ]).then(([rows, totalRow]) => {
    const total = Number(totalRow?.total || 0);
    res.json({
      success: true,
      predictions: rows,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + rows.length < total
      }
    });
  }).catch((err) => {
    console.error('Error fetching predictions:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch predictions'
    });
  });
});

// Get farmers endpoint
app.get('/api/farmers', (req, res) => {
  const { limit, offset } = parsePaginationParams(req, { defaultLimit: 50, maxLimit: 250 });

  Promise.all([
    dbAsync.all(`SELECT * FROM farmers ORDER BY created_at DESC LIMIT ? OFFSET ?`, [limit, offset]),
    dbAsync.get(`SELECT COUNT(*) AS total FROM farmers`)
  ]).then(([rows, totalRow]) => {
    const total = Number(totalRow?.total || 0);
    res.json({
      success: true,
      farmers: rows,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + rows.length < total
      }
    });
  }).catch((err) => {
    console.error('Error fetching farmers:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch farmers'
    });
  });
});

// Get market data
app.get('/api/market', (req, res) => {
  const marketData = [
    { crop: 'Beans', bondo: 85, ugunja: 82, yala: 88, trend: 'up' },
    { crop: 'Maize', bondo: 65, ugunja: 68, yala: 62, trend: 'down' },
    { crop: 'Rice', bondo: 120, ugunja: 118, yala: 125, trend: 'up' },
    { crop: 'Sorghum', bondo: 95, ugunja: 92, yala: 98, trend: 'up' },
    { crop: 'Millet', bondo: 110, ugunja: 105, yala: 112, trend: 'down' }
  ];
  res.json({ 
    success: true,
    updatedAt: new Date().toISOString(),
    marketData 
  });
});

// Get market trends by market center
app.get('/api/market-trends', (req, res) => {
  const marketCenters = {
    'siaya-town': {
      name: 'Siaya Town',
      location: 'Siaya',
      lastUpdated: new Date().toISOString(),
      crops: [
        { crop: 'Maize', price: 62, trend: 'down', changePercent: -2.4, history: [65, 64, 63, 62] },
        { crop: 'Beans', price: 88, trend: 'up', changePercent: 3.5, history: [85, 86, 87, 88] },
        { crop: 'Rice', price: 125, trend: 'up', changePercent: 2.0, history: [122, 123, 124, 125] },
        { crop: 'Sorghum', price: 98, trend: 'stable', changePercent: 0.0, history: [98, 98, 98, 98] },
        { crop: 'Groundnuts', price: 112, trend: 'down', changePercent: -1.8, history: [114, 113, 112, 112] }
      ]
    },
    'bondo': {
      name: 'Bondo Market',
      location: 'Bondo',
      lastUpdated: new Date().toISOString(),
      crops: [
        { crop: 'Maize', price: 65, trend: 'stable', changePercent: 0.0, history: [65, 65, 65, 65] },
        { crop: 'Beans', price: 85, trend: 'up', changePercent: 2.4, history: [83, 84, 84, 85] },
        { crop: 'Rice', price: 120, trend: 'up', changePercent: 1.7, history: [118, 119, 119, 120] },
        { crop: 'Sorghum', price: 95, trend: 'up', changePercent: 1.1, history: [94, 94, 95, 95] },
        { crop: 'Tomatoes', price: 75, trend: 'down', changePercent: -3.2, history: [78, 77, 76, 75] }
      ]
    },
    'yala': {
      name: 'Yala Market',
      location: 'Yala',
      lastUpdated: new Date().toISOString(),
      crops: [
        { crop: 'Maize', price: 62, trend: 'down', changePercent: -1.6, history: [63, 63, 62, 62] },
        { crop: 'Beans', price: 88, trend: 'up', changePercent: 2.3, history: [86, 87, 87, 88] },
        { crop: 'Rice', price: 125, trend: 'up', changePercent: 2.0, history: [122, 123, 124, 125] },
        { crop: 'Cassava', price: 37, trend: 'down', changePercent: -2.6, history: [38, 38, 37, 37] },
        { crop: 'Sweet Potatoes', price: 42, trend: 'up', changePercent: 1.2, history: [41, 41, 42, 42] }
      ]
    },
    'ugunja': {
      name: 'Ugunja Market',
      location: 'Ugunja',
      lastUpdated: new Date().toISOString(),
      crops: [
        { crop: 'Maize', price: 68, trend: 'up', changePercent: 1.5, history: [67, 67, 68, 68] },
        { crop: 'Beans', price: 82, trend: 'down', changePercent: -1.2, history: [83, 83, 82, 82] },
        { crop: 'Rice', price: 118, trend: 'stable', changePercent: 0.0, history: [118, 118, 118, 118] },
        { crop: 'Sorghum', price: 92, trend: 'down', changePercent: -2.1, history: [94, 93, 92, 92] },
        { crop: 'Groundnuts', price: 108, trend: 'up', changePercent: 1.9, history: [106, 107, 107, 108] }
      ]
    },
    'gem': {
      name: 'Gem Market',
      location: 'Gem',
      lastUpdated: new Date().toISOString(),
      crops: [
        { crop: 'Maize', price: 66, trend: 'up', changePercent: 2.0, history: [64, 65, 65, 66] },
        { crop: 'Beans', price: 84, trend: 'up', changePercent: 2.4, history: [82, 83, 83, 84] },
        { crop: 'Rice', price: 119, trend: 'up', changePercent: 0.8, history: [118, 118, 119, 119] },
        { crop: 'Sweet Potatoes', price: 39, trend: 'up', changePercent: 2.6, history: [38, 38, 39, 39] },
        { crop: 'Kales', price: 49, trend: 'down', changePercent: -1.0, history: [50, 50, 49, 49] }
      ]
    },
    'alego': {
      name: 'Alego Market',
      location: 'Alego',
      lastUpdated: new Date().toISOString(),
      crops: [
        { crop: 'Maize', price: 63, trend: 'down', changePercent: -1.6, history: [64, 64, 63, 63] },
        { crop: 'Beans', price: 86, trend: 'up', changePercent: 1.2, history: [85, 85, 86, 86] },
        { crop: 'Rice', price: 122, trend: 'up', changePercent: 1.7, history: [120, 121, 121, 122] },
        { crop: 'Sorghum', price: 97, trend: 'up', changePercent: 2.1, history: [95, 96, 96, 97] },
        { crop: 'Cassava', price: 38, trend: 'up', changePercent: 2.7, history: [37, 37, 38, 38] }
      ]
    }
  };

  res.json({
    success: true,
    data: marketCenters,
    timestamp: new Date().toISOString()
  });
});

// Get market prediction for a specific crop
app.get('/api/market-prediction/:crop', (req, res) => {
  const crop = req.params.crop.toLowerCase();
  const predictions = {
    'maize': {
      crop: 'Maize',
      currentAvgPrice: 64.33,
      prediction: 'DOWN',
      confidence: 65,
      forecastPrice: 61,
      reason: 'Post-harvest season leading to increased supply',
      timeline: '2-3 weeks'
    },
    'beans': {
      crop: 'Beans',
      currentAvgPrice: 85.33,
      prediction: 'UP',
      confidence: 72,
      forecastPrice: 89,
      reason: 'Growing demand and seasonal scarcity',
      timeline: '1-2 weeks'
    },
    'rice': {
      crop: 'Rice',
      currentAvgPrice: 120.67,
      prediction: 'UP',
      confidence: 68,
      forecastPrice: 126,
      reason: 'Limited supply and increasing demand',
      timeline: '2-3 weeks'
    },
    'sorghum': {
      crop: 'Sorghum',
      currentAvgPrice: 95.33,
      prediction: 'STABLE',
      confidence: 58,
      forecastPrice: 95,
      reason: 'Steady demand with consistent supply',
      timeline: 'Ongoing'
    },
    'groundnuts': {
      crop: 'Groundnuts',
      currentAvgPrice: 109.33,
      prediction: 'DOWN',
      confidence: 62,
      forecastPrice: 107,
      reason: 'Increased production in current season',
      timeline: '1-2 weeks'
    }
  };

  const prediction = predictions[crop];
  if (prediction) {
    res.json({
      success: true,
      data: prediction,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Crop prediction not found'
    });
  }
});

// High-level system stats for dashboards
app.get('/api/stats', async (req, res) => {
  try {
    const forceFresh = req.query.fresh === '1';
    if (!forceFresh && analyticsCache?.data) {
      return res.json({
        success: true,
        data: analyticsCache.data,
        meta: {
          source: 'precomputed',
          refreshedAt: analyticsCache.refreshedAt
        }
      });
    }

    const [
      predictionTotals,
      farmerTotals,
      feedbackTotals,
      topCrop,
      topSubCounty,
      lastPrediction
    ] = await Promise.all([
      dbAsync.get(`SELECT COUNT(*) as totalPredictions FROM predictions`),
      dbAsync.get(`SELECT COUNT(*) as totalFarmers FROM farmers`),
      dbAsync.get(`SELECT COUNT(*) as totalFeedback FROM feedback`),
      dbAsync.get(`SELECT predicted_crop as crop, COUNT(*) as count FROM predictions GROUP BY predicted_crop ORDER BY count DESC LIMIT 1`),
      dbAsync.get(`SELECT sub_county as subCounty, COUNT(*) as count FROM predictions GROUP BY sub_county ORDER BY count DESC LIMIT 1`),
      dbAsync.get(`SELECT created_at FROM predictions ORDER BY created_at DESC LIMIT 1`)
    ]);

    res.json({
      success: true,
      data: {
        totalPredictions: predictionTotals?.totalPredictions || 0,
        totalFarmers: farmerTotals?.totalFarmers || 0,
        totalFeedback: feedbackTotals?.totalFeedback || 0,
        topCrop: topCrop?.crop || null,
        topSubCounty: topSubCounty?.subCounty || null,
        lastPredictionAt: lastPrediction?.created_at || null
      }
    });
  } catch (error) {
    console.error('Stats endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats'
    });
  }
});

// Recommendation engine quality metrics
app.get('/api/recommendation-engine/metrics', async (req, res) => {
  try {
    const days = Math.max(7, Math.min(365, parseInt(req.query.days || '90', 10)));
    const forceFresh = req.query.fresh === '1';
    const hasPrecomputed = [7, 30, 90].includes(days) && analyticsCache?.metrics?.[days];
    const payload = !forceFresh && hasPrecomputed
      ? analyticsCache.metrics[days]
      : await computeRecommendationEngineMetrics(days);

    if (!forceFresh && !hasPrecomputed && [7, 30, 90].includes(days)) {
      analyticsCache.metrics = analyticsCache.metrics || {};
      analyticsCache.metrics[days] = payload;
      analyticsCache.refreshedAt = new Date().toISOString();
    }

    res.json({
      success: true,
      data: payload,
      meta: {
        source: !forceFresh && hasPrecomputed ? 'precomputed' : 'live',
        refreshedAt: analyticsCache.refreshedAt
      }
    });
  } catch (error) {
    console.error('Recommendation metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compute recommendation engine metrics',
      error: error.message
    });
  }
});

// ==================== NEW RECOMMENDATION ENDPOINTS ====================

const AGRI_SCOPE_KEYWORDS = [
  'crop', 'crops', 'predict', 'prediction', 'recommend', 'recommendation', 'soil', 'ph',
  'weather', 'rain', 'rainfall', 'season', 'market', 'price', 'prices', 'fertilizer',
  'manure', 'compost', 'mulch', 'mulching', 'seed', 'seeds', 'seedling', 'nursery',
  'pest', 'disease', 'fungicide', 'herbicide', 'insecticide', 'irrigation', 'drip',
  'farm', 'farming', 'harvest', 'yield', 'planting', 'weeding', 'topdress', 'basal',
  'extension officer', 'agronomy', 'agronomist', 'soil test', 'soil testing',
  'subcounty', 'sub-county', 'maize', 'beans', 'rice', 'sorghum', 'groundnut',
  'cassava', 'tomato', 'kale', 'soybean', 'sweet potato'
];

function normalizeChatContext(raw = {}) {
  const subCountyRaw = (raw.subCounty || '').toString().trim();
  const subCounty = subCountyRaw ? subCountyRaw.toLowerCase() : '';
  const soilTypeRaw = (raw.soilType || '').toString().trim();
  const soilType = soilTypeRaw ? soilTypeRaw.toLowerCase() : '';

  const normalized = {
    subCounty,
    soilType,
    season: (raw.season || '').toString().trim().toLowerCase(),
    soilPH: raw.soilPH !== undefined && raw.soilPH !== null && raw.soilPH !== '' ? Number(raw.soilPH) : null,
    budget: raw.budget !== undefined && raw.budget !== null && raw.budget !== '' ? Number(raw.budget) : null,
    farmSize: raw.farmSize !== undefined && raw.farmSize !== null && raw.farmSize !== '' ? Number(raw.farmSize) : null,
    waterSource: (raw.waterSource || '').toString().trim(),
    cropInterest: (raw.cropInterest || '').toString().trim()
  };

  if (!normalized.season) {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 8) normalized.season = 'long_rains';
    else if (month >= 10 && month <= 12) normalized.season = 'short_rains';
    else normalized.season = 'dry';
  }

  return normalized;
}

function extractContextFromMessage(message, context) {
  const text = (message || '').toLowerCase();
  const updated = { ...context };

  const phMatch = text.match(/(?:ph|pH)?\s*([0-9](?:\.[0-9])?)/i);
  if (phMatch) {
    const phValue = Number(phMatch[1]);
    if (!Number.isNaN(phValue) && phValue >= 3.5 && phValue <= 10) {
      updated.soilPH = phValue;
    }
  }

  const budgetMatch = text.match(/(?:budget|ksh|kes)\D*([0-9]{3,})/i);
  if (budgetMatch) {
    const budget = Number(budgetMatch[1]);
    if (!Number.isNaN(budget) && budget > 0) {
      updated.budget = budget;
    }
  }

  const sizeMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:ha|hectares|acre|acres)/i);
  if (sizeMatch) {
    const size = Number(sizeMatch[1]);
    if (!Number.isNaN(size) && size > 0) {
      updated.farmSize = size;
    }
  }

  const knownSubCounties = ['bondo', 'ugunja', 'yala', 'gem', 'alego'];
  const foundSubCounty = knownSubCounties.find((name) => text.includes(name));
  if (foundSubCounty) updated.subCounty = foundSubCounty;

  const foundSoilType = ['sandy', 'clay', 'loam'].find((name) => text.includes(name));
  if (foundSoilType) updated.soilType = foundSoilType;

  if (text.includes('long rains')) updated.season = 'long_rains';
  if (text.includes('short rains')) updated.season = 'short_rains';
  if (text.includes('dry season') || text.includes('dry')) updated.season = 'dry';

  const crop = demoData.marketPrices.find((item) => text.includes(item.crop.toLowerCase()));
  if (crop) updated.cropInterest = crop.crop;

  return updated;
}

function isAgricultureQuery(message = '') {
  const text = message.toLowerCase();
  return AGRI_SCOPE_KEYWORDS.some((keyword) => text.includes(keyword));
}

function detectChatIntent(message = '') {
  const text = String(message || '').toLowerCase();

  const hasAny = (words = []) => words.some((w) => text.includes(w));

  const market = hasAny(['market', 'price', 'prices', 'sell', 'buy', 'trend']);
  const weather = hasAny(['weather', 'rain', 'rainfall', 'temperature', 'humidity', 'season']);
  const soil = hasAny(['soil', 'ph', 'nitrogen', 'phosphorus', 'potassium', 'fertility']);
  const recommendation = hasAny([
    'recommend', 'best crop', 'which crop', 'crop choice', 'predict', 'prediction'
  ]);
  const pest = hasAny(['pest', 'disease', 'fungus', 'blight', 'worm', 'insect', 'rust']);
  const inputs = hasAny(['fertilizer', 'manure', 'seed', 'seeds', 'input', 'inputs', 'spray']);

  const anySpecific = market || weather || soil || recommendation || pest || inputs;
  return {
    market,
    weather,
    soil,
    recommendation,
    pest,
    inputs,
    broad: !anySpecific
  };
}

const CROP_PH_GUIDANCE = {
  maize: { min: 5.5, max: 7.0, best: '6.0-6.8' },
  beans: { min: 6.0, max: 7.5, best: '6.2-7.0' },
  rice: { min: 5.0, max: 6.5, best: '5.5-6.5' },
  sorghum: { min: 5.5, max: 7.5, best: '6.0-7.0' },
  millet: { min: 5.5, max: 7.5, best: '6.0-7.0' },
  groundnuts: { min: 5.8, max: 7.0, best: '6.0-6.8' },
  tomatoes: { min: 5.5, max: 7.0, best: '6.0-6.8' },
  kale: { min: 6.0, max: 7.5, best: '6.2-7.2' },
  cassava: { min: 5.5, max: 7.0, best: '5.8-6.8' },
  soybeans: { min: 6.0, max: 7.0, best: '6.2-6.8' },
  'sweet potatoes': { min: 5.0, max: 6.8, best: '5.6-6.5' }
};

function normalizeCropKey(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCropFromMessage(message = '', context = {}) {
  const text = String(message || '').toLowerCase();
  if (context?.cropInterest) {
    return normalizeCropKey(context.cropInterest);
  }

  const cropNames = Object.keys(CROP_PH_GUIDANCE);
  const found = cropNames.find((crop) => text.includes(crop));
  if (found) return found;

  const fromMarket = demoData.marketPrices
    .map((item) => normalizeCropKey(item.crop))
    .find((crop) => crop && text.includes(crop));
  return fromMarket || '';
}

function buildCropPhReply(cropName, soilPH = null) {
  const key = normalizeCropKey(cropName);
  const guide = CROP_PH_GUIDANCE[key];
  if (!guide) return '';

  let suitability = '';
  if (soilPH !== null && !Number.isNaN(Number(soilPH))) {
    const ph = Number(soilPH);
    if (ph < guide.min) {
      suitability = `Your pH ${ph.toFixed(1)} is below that range; apply lime gradually and retest in 3-6 weeks.`;
    } else if (ph > guide.max) {
      suitability = `Your pH ${ph.toFixed(1)} is above that range; increase organic matter and consider sulfur-based correction.`;
    } else {
      suitability = `Your pH ${ph.toFixed(1)} is suitable for ${key}.`;
    }
  }

  const cropLabel = key.charAt(0).toUpperCase() + key.slice(1);
  return `${cropLabel} performs best around pH ${guide.best} (acceptable ${guide.min}-${guide.max}). ${suitability}`.trim();
}

function shouldAskForMissingDetails(intent, missingField) {
  if (!missingField) return false;
  // Ask precision questions only when the user is asking recommendation/market/weather actions.
  return Boolean(intent.recommendation || intent.market || intent.weather || intent.inputs);
}

function isAgricultureSafeReply(reply = '') {
  const text = String(reply || '').toLowerCase();
  if (!text.trim()) return false;

  const disallowed = [
    'politics', 'crypto', 'bitcoin', 'football', 'soccer', 'movie',
    'music', 'dating', 'stock tips', 'gambling', 'casino', 'lottery'
  ];
  if (disallowed.some((item) => text.includes(item))) return false;

  return AGRI_SCOPE_KEYWORDS.some((keyword) => text.includes(keyword));
}

function getAgentConfigs() {
  const providerChain = (process.env.AI_PROVIDER_CHAIN || process.env.AI_PROVIDER || 'openrouter')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const providers = {
    openrouter: {
      name: 'openrouter',
      endpoint: process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free'
    },
    groq: {
      name: 'groq',
      endpoint: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
    },
    custom: {
      name: 'custom',
      endpoint: process.env.FREE_AI_AGENT_URL || null,
      apiKey: process.env.FREE_AI_AGENT_KEY || null,
      model: process.env.FREE_AI_MODEL || 'free-model'
    }
  };

  return providerChain
    .map((name) => providers[name])
    .filter((cfg) => cfg && cfg.endpoint && cfg.apiKey);
}

function buildAgentPayload(model, message, context, localDraft) {
  return {
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are Fahamu Shamba agriculture assistant. Strict policy: only agriculture topics (crop prediction, soils, pH, weather risk, farm inputs, pests, disease, market prices) for Kenya. Always answer the exact user question in the first sentence. Do not switch topic. Ask follow-up questions only if absolutely required.'
      },
      {
        role: 'user',
        content: `Farmer message: ${message}\nContext: ${JSON.stringify(context)}\nBaseline agronomy draft: ${localDraft}`
      }
    ],
    temperature: 0.3
  };
}

function nextMissingQuestion(context) {
  if (!context.subCounty) {
    return {
      field: 'subCounty',
      question: 'Which sub-county is your farm in? (Bondo, Ugunja, Yala, Gem, or Alego)'
    };
  }
  if (!context.soilType) {
    return {
      field: 'soilType',
      question: 'What is your soil type? (Sandy, Clay, or Loam)'
    };
  }
  if (context.soilPH === null || Number.isNaN(context.soilPH)) {
    return {
      field: 'soilPH',
      question: 'Do you know your soil pH? Share a value like 5.8, 6.3, or 7.0.'
    };
  }
  return null;
}

function buildMarketSummary(context, preferredCrop = '') {
  const subCounty = context.subCounty;
  if (!subCounty) return null;
  const cropRow = preferredCrop
    ? demoData.marketPrices.find((item) => item.crop.toLowerCase() === preferredCrop.toLowerCase())
    : null;

  if (cropRow) {
    const price = cropRow[subCounty];
    if (price !== undefined) {
      return `${cropRow.crop} current market price in ${subCounty}: KSh ${price}/kg (${cropRow.trend} trend).`;
    }
  }

  const topRows = demoData.marketPrices
    .filter((item) => item[subCounty] !== undefined)
    .sort((a, b) => b[subCounty] - a[subCounty])
    .slice(0, 3)
    .map((item) => `${item.crop}: KSh ${item[subCounty]}/kg (${item.trend})`);

  if (topRows.length === 0) return null;
  return `Top market prices in ${subCounty}: ${topRows.join(' | ')}.`;
}

function buildWeatherSummary(context) {
  const weather = demoData.weatherData?.[context.subCounty]?.[context.season];
  if (!weather) return null;
  return `Weather outlook for ${context.subCounty} (${context.season}): rainfall ${weather.rainfall}mm, temperature ${weather.temperature}°C, humidity ${weather.humidity}%.`;
}

async function callExternalFreeAgent(message, context, localDraft) {
  const agents = getAgentConfigs();
  if (!agents.length) return null;

  for (const agent of agents) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agent.apiKey}`
      };

      if (agent.name === 'openrouter') {
        headers['HTTP-Referer'] = process.env.APP_BASE_URL || 'http://localhost:5000';
        headers['X-Title'] = 'Fahamu Shamba';
      }

      const response = await resilientCall(
        `ai_provider_${agent.name}`,
        ({ signal }) =>
          fetch(agent.endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(buildAgentPayload(agent.model, message, context, localDraft)),
            signal
          }),
        { retries: 2, baseDelayMs: 400, timeoutMs: 15000 }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error(`External AI ${agent.name} error (${response.status}): ${errorText}`);
        continue;
      }

      const data = await response.json();
      const content =
        data?.choices?.[0]?.message?.content ||
        data?.output ||
        data?.reply ||
        data?.message ||
        null;
      if (!content || typeof content !== 'string') continue;

      const trimmed = content.trim();
      if (!isAgricultureSafeReply(trimmed)) {
        console.warn(`External AI ${agent.name} returned out-of-scope content; discarded.`);
        continue;
      }

      return trimmed;
    } catch (error) {
      continue;
    }
  }

  return null;
}

async function buildFarmerChatReply(message, rawContext = {}) {
  const context = extractContextFromMessage(message, normalizeChatContext(rawContext));
  const text = (message || '').trim();
  const intent = detectChatIntent(text);

  if (!text) {
    return {
      reply: 'Please type your farming question so I can help with crop prediction, soil, weather, or market trends.',
      updatedContext: context,
      suggestedPrompts: ['Recommend crops for my farm', 'Check weather risk this season', 'Best soil pH for maize']
    };
  }

  if (!isAgricultureQuery(text)) {
    return {
      reply:
        'I can only help with agriculture and farming topics for Fahamu Shamba. Ask about crop prediction, soil pH, weather, farm inputs, pests, or market prices.',
      updatedContext: context,
      suggestedPrompts: ['Recommend crops for my farm', 'What soil pH is best for beans?', 'Show current market trends']
    };
  }

  const missing = nextMissingQuestion(context);
  const weatherSummary = buildWeatherSummary(context);
  const marketSummary = buildMarketSummary(context, context.cropInterest);

  let recommendationSummary = '';
  let soilSummary = '';
  let cropPhSummary = '';
  if (context.subCounty && context.soilType && context.season) {
    try {
      const historicalSummary = await fetchHistoricalSummary(context.subCounty, context.soilType, context.season);
      const regionalProfile = await fetchRegionalCalibrationProfile(context.subCounty, context.soilType, context.season);
      const feedbackSignals = await fetchFeedbackSignals(context.subCounty, context.soilType, context.season);
      const recommendation = recommendationEngine.getRecommendations({
        subCounty: context.subCounty,
        soilType: context.soilType,
        season: context.season,
        budget: context.budget || 5000,
        farmSize: context.farmSize || 1,
        waterSource: context.waterSource || 'Rainfall'
      }, {
        historicalSummary,
        regionalProfile,
        feedbackSignals
      });

      const top = recommendation?.recommendations?.slice(0, 3) || [];
      if (top.length) {
        recommendationSummary = `Top crop options: ${top
          .map((item) => `${item.name} (${item.score}%)`)
          .join(', ')}.`;
      }
    } catch (error) {
      // best effort only
    }

    try {
      const soilData = recommendationEngine.getSoilAssessment(context.subCounty, context.soilType);
      if (soilData) {
        const advisory =
          context.soilPH !== null
            ? context.soilPH < 5.8
              ? 'Your pH is acidic; consider liming before planting.'
              : context.soilPH > 7.5
                ? 'Your pH is alkaline; add organic matter and consider sulfur-based adjustment.'
                : 'Your pH is in a good range for many crops.'
            : '';
        soilSummary = `Soil baseline (${context.subCounty}, ${context.soilType}): pH ${soilData.pH.toFixed(1)}, nitrogen ${soilData.nitrogen.toFixed(1)}%, phosphorus ${soilData.phosphorus.toFixed(1)} mg/kg. ${advisory}`.trim();
      }
    } catch (error) {
      // best effort only
    }
  }

  if (intent.soil) {
    const cropInQuestion = extractCropFromMessage(text, context);
    const phMentioned = /\bph\b|\bsoil pH\b|\bsoil ph\b/i.test(text);
    if (cropInQuestion && phMentioned) {
      cropPhSummary = buildCropPhReply(cropInQuestion, context.soilPH);
    }
  }

  const replyParts = [];
  if (intent.soil && cropPhSummary) replyParts.push(cropPhSummary);
  if (intent.recommendation && recommendationSummary) replyParts.push(recommendationSummary);
  if (intent.soil && soilSummary) replyParts.push(soilSummary);
  if (intent.weather && weatherSummary) replyParts.push(weatherSummary);
  if (intent.market && marketSummary) replyParts.push(marketSummary);

  if (intent.pest) {
    replyParts.push(
      'Pest tip: scout twice weekly, remove infected plants early, and use registered crop-specific control if infestation exceeds threshold.'
    );
  }
  if (intent.inputs) {
    const cropForInputs = context.cropInterest || 'maize';
    const inputGuide = recommendationEngine.getBudgetAdjustedInputs(cropForInputs, context.budget || 5000, context.farmSize || 1);
    if (!inputGuide?.error) {
      replyParts.push(
        `${cropForInputs} input plan (${inputGuide.budgetSufficiency.status} budget): essential ${inputGuide.recommendations.essential.length}, important ${inputGuide.recommendations.important.length}, optional ${inputGuide.recommendations.optional.length}.`
      );
    }
  }

  if (intent.broad) {
    if (recommendationSummary) replyParts.push(recommendationSummary);
    if (cropPhSummary) replyParts.push(cropPhSummary);
    if (soilSummary) replyParts.push(soilSummary);
    if (weatherSummary) replyParts.push(weatherSummary);
    if (marketSummary) replyParts.push(marketSummary);
  }

  if (shouldAskForMissingDetails(intent, missing?.field)) {
    replyParts.push(`To improve precision: ${missing.question}`);
  }

  if (replyParts.length === 0) {
    replyParts.push(
      'Share your sub-county, soil type, and soil pH so I can give a precise farming recommendation for this season.'
    );
  }

  const localReply = replyParts.join(' ');
  const externalReply = await callExternalFreeAgent(text, context, localReply);

  return {
    reply: externalReply || localReply,
    updatedContext: context,
    needsMoreInfo: !!missing,
    askedField: missing?.field || null,
    suggestedPrompts: [
      'Recommend the best crop for my farm this season',
      'How does my soil pH affect crop choice?',
      'What market price trend should I use for planning?',
      'Weather risk outlook for my sub-county',
      'Budget-based farm input plan for beans'
    ]
  };
}

async function handleFarmerChat(req, res) {
  const startedAtMs = Date.now();
  try {
    const { message, context } = req.body || {};
    const data = await buildFarmerChatReply(message || '', context || {});
    const responseTimeMs = Date.now() - startedAtMs;

    metricsCollector.recordChatMessage(message || '', data.reply || '', false, responseTimeMs);
    kpiTracker.recordChatbotInteraction(getTrackingFarmerId(req));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Farmer chat error:', error);
    metricsCollector.recordError(error, '/api/farmer-chat', {
      requestId: req.requestId
    });
    res.status(500).json({
      success: false,
      message: 'Failed to process chat request',
      error: error.message
    });
  }
}

app.post('/api/farmer-chat', handleFarmerChat);
app.post('/api/chat', handleFarmerChat);

// Get crop recommendations
app.post('/api/recommend', async (req, res) => {
  const startedAtMs = Date.now();
  try {
    const { subCounty, soilType, season, budget = 5000, farmSize = 1, waterSource = 'Rainfall' } = req.body;
    const forceFresh = req.query.fresh === '1';

    // Validate inputs
    if (!subCounty || !soilType || !season) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: subCounty, soilType, season'
      });
    }

    const normalizedKey = JSON.stringify({
      subCounty: toNormalizedText(subCounty),
      soilType: toNormalizedText(soilType),
      season: toNormalizedText(season),
      budget: Number(budget),
      farmSize: Number(farmSize),
      waterSource: toNormalizedText(waterSource)
    });

    const { value, cacheHit } = await getCachedOrCompute(
      recommendationCache,
      `recommend:${normalizedKey}`,
      async () => {
        const { historicalSummary, regionalProfile, feedbackSignals } = await fetchDecisionSignalsSafely(
          toNormalizedText(subCounty),
          toNormalizedText(soilType),
          toNormalizedText(season)
        );

        const result = recommendationEngine.getRecommendations({
          subCounty,
          soilType,
          season,
          budget,
          farmSize,
          waterSource
        }, {
          historicalSummary,
          regionalProfile,
          feedbackSignals
        });

        const mlInference = await runMlTopRecommendations({
          subCounty,
          soilType,
          season,
          budget,
          farmSize,
          waterSource
        });

        const ruleRecommendations = result?.recommendations || [];
        const fallbackTopRecommendations = ruleRecommendations.slice(0, 3).map((rec) => ({
          crop: String(rec?.name || '').toLowerCase(),
          confidence: Number(rec?.confidenceScore || rec?.score || 0),
          probability: null
        }));

        const mlPrimaryRecommendations = buildMlPrimaryRecommendations(
          mlInference,
          ruleRecommendations,
          subCounty,
          season
        );
        const rankedRecommendations = rankRecommendations(mlPrimaryRecommendations, 3);

        return {
          ...result,
          recommendations: rankedRecommendations,
          topRecommendations: mlInference.success ? mlInference.topRecommendations : fallbackTopRecommendations,
          mlInference: {
            enabled: mlInference.success,
            selectedModel: mlInference.selectedModel || null,
            top3CombinedConfidence: mlInference.top3CombinedConfidence || null,
            reason: mlInference.success ? null : mlInference.reason
          },
          historicalSummary,
          regionalProfile,
          feedbackSignals
        };
      },
      { fresh: forceFresh }
    );

    const recommendations = value?.recommendations || [];
    const topRecommendation = recommendations[0] || null;

    metricsCollector.recordRecommendation(
      { subCounty, soilType, season, budget, farmSize },
      recommendations,
      Date.now() - startedAtMs
    );

    if (topRecommendation) {
      const farmerId = getTrackingFarmerId(req);
      const confidence = Number(topRecommendation?.confidenceScore || topRecommendation?.score || 0);
      const cropName = topRecommendation?.name || topRecommendation?.crop || 'Unknown';
      kpiTracker.recordRecommendation(farmerId, cropName, confidence, null);
      kpiTracker.recordDailyActiveUser(farmerId);
      kpiTracker.recordWeeklyActiveUser(farmerId);
      kpiTracker.recordMonthlyActiveUser(farmerId);

      const baselineYield = Math.max(0.1, Number(value?.historicalSummary?.avgYield || 1));
      const projectedYield = Number(
        (baselineYield * (1 + Math.min(0.3, Math.max(0.05, confidence / 400)))).toFixed(3)
      );
      kpiTracker.recordYieldImprovement(
        farmerId,
        cropName,
        baselineYield,
        projectedYield,
        ['data_driven_crop_selection', 'soil_profile_matching', 'seasonal_alignment']
      );
    }

    res.json({
      success: true,
      data: value,
      cache: {
        hit: cacheHit
      }
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    metricsCollector.recordError(error, '/api/recommend', {
      requestId: req.requestId
    });
    res.status(500).json({
      success: false,
      message: 'Error generating recommendations',
      error: error.message
    });
  }
});

// Analyze complete farm conditions
app.post('/api/analyze-farm', async (req, res) => {
  try {
    const { subCounty, soilType, season, budget = 5000, farmSize = 1, waterSource = 'Rainfall' } = req.body;

    if (!subCounty || !soilType || !season) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: subCounty, soilType, season'
      });
    }

    const { historicalSummary, regionalProfile, feedbackSignals } = await fetchDecisionSignalsSafely(
      toNormalizedText(subCounty),
      toNormalizedText(soilType),
      toNormalizedText(season)
    );

    const analysis = recommendationEngine.analyzeFarm({
      subCounty,
      soilType,
      season,
      budget,
      farmSize,
      waterSource
    }, {
      historicalSummary,
      regionalProfile,
      feedbackSignals
    });

    const mlInference = await runMlTopRecommendations({
      subCounty,
      soilType,
      season,
      budget,
      farmSize,
      waterSource
    });

    const ruleRecommendations = analysis?.recommendations || [];
    const fallbackTopRecommendations = ruleRecommendations.slice(0, 3).map((rec) => ({
      crop: String(rec?.name || '').toLowerCase(),
      confidence: Number(rec?.confidenceScore || rec?.score || 0),
      probability: null
    }));
    const mlPrimaryRecommendations = buildMlPrimaryRecommendations(
      mlInference,
      ruleRecommendations,
      subCounty,
      season
    );
    const rankedRecommendations = rankRecommendations(mlPrimaryRecommendations, 3);

    res.json({
      success: true,
      data: {
        ...analysis,
        recommendations: rankedRecommendations,
        topRecommendations: mlInference.success ? mlInference.topRecommendations : fallbackTopRecommendations,
        mlInference: {
          enabled: mlInference.success,
          selectedModel: mlInference.selectedModel || null,
          top3CombinedConfidence: mlInference.top3CombinedConfidence || null,
          reason: mlInference.success ? null : mlInference.reason
        },
        historicalSummary,
        regionalProfile,
        feedbackSignals
      }
    });
  } catch (error) {
    console.error('Farm analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing farm',
      error: error.message
    });
  }
});

// Get soil assessment
app.post('/api/soil-assessment', (req, res) => {
  try {
    const { subCounty, soilType } = req.body;

    if (!subCounty || !soilType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: subCounty, soilType'
      });
    }

    const assessment = recommendationEngine.getSoilAssessment(subCounty, soilType);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Soil data not found for this location and type'
      });
    }

    res.json({
      success: true,
      data: assessment
    });
  } catch (error) {
    console.error('Soil assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assessing soil',
      error: error.message
    });
  }
});

// Get market prices
app.get('/api/market-prices', async (req, res) => {
  try {
    const forceFresh = req.query.fresh === '1';
    const { value, cacheHit } = await getCachedOrCompute(
      marketCache,
      'market:prices',
      async () => {
        let marketPayload = demoData.marketPrices;
        let source = 'local_demo_data';

        if (process.env.MARKET_DATA_API_URL) {
          try {
            const externalResponse = await resilientCall(
              'market_api',
              ({ signal }) =>
                fetch(process.env.MARKET_DATA_API_URL, {
                  headers: process.env.MARKET_DATA_API_KEY
                    ? { Authorization: `Bearer ${process.env.MARKET_DATA_API_KEY}` }
                    : {},
                  signal
                }),
              { retries: 2, baseDelayMs: 350, timeoutMs: 12000 }
            );

            if (externalResponse.ok) {
              const externalData = await externalResponse.json();
              if (Array.isArray(externalData?.data)) {
                marketPayload = externalData.data;
                source = 'external_market_api';
              }
            }
          } catch (externalError) {
            source = 'local_fallback_after_external_failure';
          }
        }

        return {
          prices: marketPayload,
          timestamp: new Date().toISOString(),
          currency: 'KSh',
          unit: 'per kg',
          source
        };
      },
      { fresh: forceFresh }
    );

    res.json({
      success: true,
      data: value,
      cache: {
        hit: cacheHit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching market prices',
      error: error.message
    });
  }
});

// Get weather data
app.get('/api/weather-data', (req, res) => {
  try {
    const { subCounty, season } = req.query;

    if (!subCounty) {
      // Return all weather data
      return res.json({
        success: true,
        data: demoData.weatherData,
        timestamp: new Date().toISOString()
      });
    }

    const weatherData = demoData.weatherData[subCounty.toLowerCase()]?.[season?.toLowerCase() || 'long_rains'];

    if (!weatherData) {
      return res.status(404).json({
        success: false,
        message: 'Weather data not found for this location or season'
      });
    }

    res.json({
      success: true,
      data: {
        location: subCounty,
        season: season || 'long_rains',
        ...weatherData,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching weather data',
      error: error.message
    });
  }
});

// Register farmer
app.post('/api/register-farmer', async (req, res) => {
  try {
    const { phoneNumber, name, subCounty, soilType, farmSize, waterSource, budget } = req.body;

    if (!phoneNumber || !subCounty || !soilType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: phoneNumber, subCounty, soilType'
      });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    await dbAsync.run(
      `INSERT INTO farmers (phone_number, sub_county, soil_type, preferred_language)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(phone_number) DO UPDATE SET 
         sub_county = excluded.sub_county,
         soil_type = excluded.soil_type`,
      [normalizedPhone, subCounty, soilType, 'english']
    );

    metricsCollector.recordRegistration({
      phone_number: normalizedPhone,
      sub_county: subCounty,
      soil_type: soilType,
      preferred_language: 'english'
    });
    kpiTracker.recordNewFarmer({
      id: normalizedPhone,
      sub_county: subCounty,
      soil_type: soilType,
      preferred_language: 'english'
    });

    res.json({
      success: true,
      message: 'Farmer registered successfully',
      data: {
        phoneNumber: normalizedPhone,
        subCounty,
        soilType,
        farmSize,
        waterSource,
        budget
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    metricsCollector.recordError(error, '/api/register-farmer', {
      requestId: req.requestId
    });
    res.status(500).json({
      success: false,
      message: 'Error registering farmer',
      error: error.message
    });
  }
});

// Get demo sample farmers
app.get('/api/sample-farmers', (req, res) => {
  res.json({
    success: true,
    data: demoData.sampleFarmers,
    message: 'Sample farmer data for MVP testing'
  });
});

app.get('/api/model-eval', async (req, res) => {
  try {
    let metrics = null;
    let demoScenarios = null;

    if (fs.existsSync(ML_METRICS_PATH)) {
      metrics = JSON.parse(await fsp.readFile(ML_METRICS_PATH, 'utf-8'));
    }
    if (fs.existsSync(ML_DEMO_SCENARIOS_PATH)) {
      demoScenarios = JSON.parse(await fsp.readFile(ML_DEMO_SCENARIOS_PATH, 'utf-8'));
    }

    res.json({
      success: true,
      data: {
        metrics,
        syntheticDataDisclaimer:
          demoScenarios?.synthetic_data_disclaimer ||
          'Demo currently uses synthetic datasets for presentation; production deployment requires validated field data.',
        realDataRoadmap: demoScenarios?.real_data_roadmap || [
          'Integrate verified weather feeds per sub-county.',
          'Ingest market center prices weekly.',
          'Capture real yield outcomes per season.',
          'Retrain and publish updated model metrics.'
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load model evaluation bundle',
      error: error.message
    });
  }
});

// ==================== FARM INPUTS RECOMMENDATION ENDPOINTS ====================

// Get farm input recommendations for a specific crop
app.get('/api/farm-inputs/:cropName', (req, res) => {
  try {
    const { cropName } = req.params;
    const { farmSize = 1 } = req.query;

    const recommendations = recommendationEngine.getFarmInputRecommendations(cropName, parseFloat(farmSize));

    if (recommendations.error) {
      return res.status(404).json({
        success: false,
        message: recommendations.error
      });
    }

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Farm inputs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching farm inputs',
      error: error.message
    });
  }
});

// Get budget-adjusted input recommendations
app.post('/api/farm-inputs/budget-adjusted', (req, res) => {
  try {
    const { cropName, budget, farmSize = 1 } = req.body;

    if (!cropName || budget === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: cropName, budget'
      });
    }

    const recommendations = recommendationEngine.getBudgetAdjustedInputs(cropName, budget, parseFloat(farmSize));

    if (recommendations.error) {
      return res.status(404).json({
        success: false,
        message: recommendations.error
      });
    }

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Budget adjusted inputs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating budget-adjusted inputs',
      error: error.message
    });
  }
});

// Get cost-saving tips
app.get('/api/cost-saving-tips', (req, res) => {
  try {
    const { budget = 5000, farmSize = 1 } = req.query;

    const tips = recommendationEngine.getCostSavingTips(parseFloat(budget), parseFloat(farmSize));

    res.json({
      success: true,
      data: {
        budget: parseFloat(budget),
        farmSize: parseFloat(farmSize),
        tips: tips
      }
    });
  } catch (error) {
    console.error('Cost saving tips error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cost-saving tips',
      error: error.message
    });
  }
});

// Get essential tools checklist
app.get('/api/tools-checklist', (req, res) => {
  try {
    const checklist = recommendationEngine.getEssentialToolsChecklist();

    res.json({
      success: true,
      data: checklist
    });
  } catch (error) {
    console.error('Tools checklist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tools checklist',
      error: error.message
    });
  }
});

// Get soil improvement plan
app.post('/api/soil-improvement-plan', (req, res) => {
  try {
    const { subCounty, soilType, cropName } = req.body;

    if (!subCounty || !soilType || !cropName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: subCounty, soilType, cropName'
      });
    }

    const plan = recommendationEngine.getSoilImprovementPlan(subCounty, soilType, cropName);

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Soil improvement plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating soil improvement plan',
      error: error.message
    });
  }
});

// Get comprehensive farm inputs analysis
app.post('/api/farm-inputs/comprehensive', (req, res) => {
  try {
    const { cropName, subCounty, soilType, budget, farmSize = 1 } = req.body;

    if (!cropName || !budget) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: cropName, budget'
      });
    }

    // Get farm inputs
    const inputs = recommendationEngine.getBudgetAdjustedInputs(cropName, budget, farmSize);
    
    // Get soil improvement plan if soil info provided
    const soilPlan = (subCounty && soilType) ? 
      recommendationEngine.getSoilImprovementPlan(subCounty, soilType, cropName) : 
      null;

    // Get cost-saving tips
    const costSavingTips = recommendationEngine.getCostSavingTips(budget, farmSize);

    // Get tools checklist
    const toolsChecklist = recommendationEngine.getEssentialToolsChecklist();

    res.json({
      success: true,
      data: {
        crop: cropName,
        farmSize,
        budget,
        inputs,
        soilPlan,
        costSavingTips,
        toolsChecklist,
        summary: {
          totalInputCost: inputs.budgetSufficiency.required,
          budgetAvailable: budget,
          budgetStatus: inputs.budgetSufficiency.status,
          essentialInputs: inputs.recommendations.essential.length,
          importantInputs: inputs.recommendations.important.length,
          optionalInputs: inputs.recommendations.optional.length
        }
      }
    });
  } catch (error) {
    console.error('Comprehensive farm inputs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating comprehensive farm inputs analysis',
      error: error.message
    });
  }
});

// Register admin routes
app.use('/api', (req, res, next) => {
  // Make dbAsync available to routes
  req.dbAsync = dbAsync;
  next();
}, adminRoutes);

// Register farmer profile routes
app.use('/api', (req, res, next) => {
  // Make dbAsync available to routes
  req.dbAsync = dbAsync;
  next();
}, farmerProfileRoutes);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'Fahamu Shamba API is working!',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      recommendations: [
        'POST /api/recommend',
        'POST /api/analyze-farm',
        'GET /api/recommendation-engine/metrics'
      ],
      modelQuality: [
        'POST /api/historical-data/ingest',
        'POST /api/historical-data/ingest-bulk',
        'GET /api/historical-data/summary'
      ],
      data: [
        'POST /api/soil-assessment',
        'GET /api/market-prices',
        'GET /api/weather-data'
      ],
      farmers: [
        'POST /api/register-farmer',
        'GET /api/farmers',
        'GET /api/sample-farmers',
        'GET /api/predictions'
      ],
      admin: [
        'POST /api/admin/login',
        'POST /api/admin/verify-mfa',
        'POST /api/admin/logout',
        'GET /api/admin/dashboard',
        'GET /api/admin/audit-logs',
        'GET /api/admin/security-logs'
      ],
      testing: [
        'GET /api-tester (API Testing Console)',
        'GET /dashboard (Web Dashboard)',
        'GET /admin (Admin Dashboard)',
        'GET /api/health (Health Check)',
        'GET /api/stats (Statistics)',
        'GET /api/system/queue (Queue health)',
        'POST /api/system/backup-now (Trigger backup)'
      ]
    }
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Quick health check - don't wait for DB on Vercel
    if (IS_VERCEL && !dbAsync) {
      return res.json({
        success: true,
        status: 'Initializing',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    }
    
    await dbAsync.get('SELECT 1 as test');
    res.json({
      success: true,
      status: 'All systems operational',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (err) {
    return res.status(503).json({
      success: false,
      status: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/metrics', (req, res) => {
  try {
    res.json(metricsCollector.getComprehensiveMetrics());
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monitoring metrics',
      error: error.message
    });
  }
});

app.get('/api/kpi', (req, res) => {
  try {
    res.json(kpiTracker.getComprehensiveKPIs());
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch business KPIs',
      error: error.message
    });
  }
});

app.get('/api/system/queue', requireAdminSessionForSystemRoutes, (req, res) => {
  res.json({
    success: true,
    data: {
      ...jobQueue.stats(),
      analyticsCache
    }
  });
});

app.post('/api/system/backup-now', requireAdminSessionForSystemRoutes, async (req, res, next) => {
  try {
    if (dbAsync?.dialect !== 'sqlite') {
      return res.status(400).json({
        success: false,
        message: 'SQLite backup is not available when using Postgres'
      });
    }
    const queued = enqueueJob('sqlite_backup', {}, { maxAttempts: 4, backoffMs: 1000 });
    res.json({
      success: true,
      message: 'SQLite backup job queued',
      data: queued
    });
  } catch (error) {
    next(error);
  }
});

// Centralized not-found + error handlers
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    requestId: req.requestId
  });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const latencyMs = req.requestStartedAt
    ? Number((process.hrtime.bigint() - req.requestStartedAt) / BigInt(1e6))
    : null;

  console.error(JSON.stringify({
    level: 'error',
    event: 'unhandled_error',
    requestId: req.requestId,
    endpoint: req.originalUrl,
    method: req.method,
    statusCode,
    latencyMs,
    farmerId: req.user?.farmerId || req.body?.farmerId || req.params?.farmerId || null,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString()
  }));

  if (res.headersSent) {
    return next(err);
  }

  try {
    metricsCollector.recordError(err, req.originalUrl || req.path || 'unknown', {
      method: req.method,
      statusCode,
      requestId: req.requestId
    });
  } catch (metricsError) {
    // best effort only
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? 'Internal server error' : err.message,
    requestId: req.requestId
  });
});

// ==================== HELPER FUNCTIONS ====================
function getLanguage(choice) {
  const languages = { '1': 'english', '2': 'swahili', '3': 'luo' };
  return languages[choice] || 'english';
}

function getTranslation(key, language) {
  const translations = {
    english: {
      main_menu: "Main menu:",
      select_option: "Select option:",
      get_advice: "Get crop advice",
      market_prices: "Market prices",
      weather_update: "Weather update",
      about: "About Fahamu Shamba",
      about_text: "Smart farming assistant for crop recommendations, market and weather support.",
      select_subcounty: "Select your sub-county:",
      select_soil: "Select soil type:",
      select_season: "Select season:",
      sandy: "Sandy soil",
      clay: "Clay soil", 
      loam: "Loam soil",
      long_rains: "Long rains",
      short_rains: "Short rains",
      dry: "Dry season",
      recommendation: "We recommend",
      no_recommendation: "Sorry, no recommendation available for your inputs",
      invalid_selection: "Invalid selection",
      try_again: "Please try again",
      market_prices_for: "Top market prices in",
      weather_for: "Weather for",
      no_market_data: "No market data available",
      no_weather_data: "No weather data available",
      good_fit: "Good fit for your conditions",
      alternative: "Alternative",
      score: "Score"
    },
    swahili: {
      main_menu: "Menyu kuu:",
      select_option: "Chagua chaguo:",
      get_advice: "Pata ushauri wa mazao",
      market_prices: "Bei za soko",
      weather_update: "Taarifa ya hali ya hewa",
      about: "Kuhusu Fahamu Shamba", 
      about_text: "Msaidizi wa kilimo kwa mapendekezo ya mazao, bei ya soko na hali ya hewa.",
      select_subcounty: "Chagua sub-kaunti yako:",
      select_soil: "Chagua aina ya udongo:",
      select_season: "Chagua msimu:",
      sandy: "Udongo wa mchanga",
      clay: "Udongo wa mfinyanzi",
      loam: "Udongo wa tanuri",
      long_rains: "Mvua nyingi",
      short_rains: "Mvua fupi", 
      dry: "Msimu wa kiangazi",
      recommendation: "Tunapendekeza",
      no_recommendation: "Samahani, hakuna ushauri unaopatikana kwa maelezo yako",
      invalid_selection: "Chaguo si sahihi",
      try_again: "Tafadhali jaribu tena",
      market_prices_for: "Bei kuu za soko katika",
      weather_for: "Hali ya hewa ya",
      no_market_data: "Hakuna data ya soko",
      no_weather_data: "Hakuna data ya hali ya hewa",
      good_fit: "Inafaa kwa hali yako",
      alternative: "Chaguo mbadala",
      score: "Alama"
    },
    luo: {
      main_menu: "Menyu maduong':",
      select_option: "Yier option:",
      get_advice: "Nong'o kit ma idwaro tiyo",
      market_prices: "Nengo mar chiro",
      weather_update: "Wach piny",
      about: "E kind Fahamu Shamba",
      about_text: "Jatemo puodho mar miyo paro mar cham, nengo gi wach piny.",
      select_subcounty: "Yier sub-county mada:",
      select_soil: "Yier tongo:",
      select_season: "Yier piny:",
      sandy: "Tongo anyong",
      clay: "Tongo lal",
      loam: "Tongo ber",
      long_rains: "Piny ruodho",
      short_rains: "Piny ruodho machon",
      dry: "Piny kwo",
      recommendation: "Waneno ni",
      no_recommendation: "Mos, onge kit ma wanyalo nongo kodu mose",
      invalid_selection: "Yiero ok nyalre",
      try_again: "Tem doki kendo",
      market_prices_for: "Nengo maduong' e",
      weather_for: "Wach piny mar",
      no_market_data: "Onge data mar nengo",
      no_weather_data: "Onge data mar piny",
      good_fit: "Ber kod kitni",
      alternative: "Moko machielo",
      score: "Skor"
    }
  };
  
  return translations[language]?.[key] || key;
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  Promise.resolve()
    .then(() => closeDb())
    .then(() => {
      console.log('Database connection closed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error closing database:', err);
      process.exit(1);
    });
});

// Start server
export default app;

if (!IS_VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🌱 Fahamu Shamba MVP Server Running\n`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    console.log(`📍 Server: http://localhost:${PORT}\n`);
    
    console.log(`📱 USER INTERFACES:`);
    console.log(`   🏠 Farmer Dashboard: http://localhost:${PORT}/farmer-dashboard`);
    console.log(`   📱 USSD Simulator:   http://localhost:${PORT}/ussd-simulator`);
    console.log(`   🧪 API Tester:       http://localhost:${PORT}/api-tester\n`);
    
    console.log(`🔌 API ENDPOINTS:`);
    console.log(`   POST /api/recommend           - Get crop recommendations`);
    console.log(`   POST /api/analyze-farm        - Full farm analysis`);
    console.log(`   GET  /api/recommendation-engine/metrics - Engine quality metrics`);
    console.log(`   POST /api/soil-assessment     - Soil quality check`);
    console.log(`   GET  /api/market-prices       - Current market prices`);
    console.log(`   GET  /api/weather-data        - Weather conditions`);
    console.log(`   POST /api/register-farmer     - Register new farmer`);
    console.log(`   GET  /api/sample-farmers      - Demo farmer data\n`);

    console.log(`🔐 ADMIN ENDPOINTS:`);
    console.log(`   POST /api/admin/login         - Admin login`);
    console.log(`   POST /api/admin/verify-mfa    - MFA verification`);
    console.log(`   GET  /api/admin/dashboard     - Admin dashboard`);
    console.log(`   GET  /api/admin/audit-logs    - View audit logs`);
    console.log(`   GET  /api/admin/security-logs - View security logs\n`);
    
    console.log(`📊 SYSTEM INFO:`);
    console.log(`   GET  /api/test                - API status`);
    console.log(`   GET  /api/health              - Health check`);
    console.log(`   GET  /api/stats               - System statistics`);
    console.log(`   GET  /api/farmers             - Registered farmers`);
    console.log(`   GET  /api/predictions         - Prediction history\n`);
    console.log(`   GET  /api/system/queue        - Queue and analytics cache status`);
    console.log(`   POST /api/system/backup-now   - Trigger manual SQLite backup\n`);
    console.log(`   POST /api/historical-data/ingest      - Ingest one historical row`);
    console.log(`   POST /api/historical-data/ingest-bulk - Ingest historical CSV batch`);
    console.log(`   GET  /api/historical-data/summary     - Historical context summary\n`);
    
    console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: SQLite (${path.basename(DB_FILE)})`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    console.log(`✨ MVP is ready!`);
    console.log(`   🚀 User Dashboard: http://localhost:${PORT}/farmer-dashboard`);
    console.log(`   🔐 Admin Dashboard: http://localhost:${PORT}/admin\n`);
  });
}
