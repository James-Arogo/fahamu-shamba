/**
 * API Integration Tests
 * Covers: auth, register, recommend, chat + monitoring/KPI endpoints.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '../..');

const TEST_PORT = 5600 + Math.floor(Math.random() * 200);
const BASE_URL = `http://localhost:${TEST_PORT}`;

let serverProcess;

async function waitForServerReady(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch (error) {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Server did not become ready within timeout');
}

async function apiCall(method, endpoint, body = null) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });

  const json = await response.json().catch(() => ({}));
  return { status: response.status, data: json };
}

beforeAll(async () => {
  serverProcess = spawn('node', ['server.js'], {
    cwd: BACKEND_ROOT,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      NODE_ENV: 'test'
    },
    stdio: 'ignore'
  });

  await waitForServerReady();
}, 30000);

afterAll(async () => {
  if (!serverProcess || serverProcess.exitCode !== null) return;

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      serverProcess.kill('SIGKILL');
      resolve();
    }, 5000);

    serverProcess.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });

    serverProcess.kill('SIGINT');
  });
}, 10000);

describe('API Integration: register/auth/recommend/chat', () => {
  const unique = Date.now();
  const phoneNumber = `+254712${String(unique).slice(-6)}`;
  const email = `itest_${unique}@example.com`;
  const password = 'StrongP@ssw0rd!';

  test('register endpoint creates a farmer profile', async () => {
    const payload = {
      phoneNumber,
      firstName: 'Test',
      lastName: 'Farmer',
      email,
      password,
      subCounty: 'bondo',
      farmSize: 2.0,
      soilType: 'loam',
      preferredLanguage: 'english'
    };

    const result = await apiCall('POST', '/api/farmer-profile/register', payload);

    expect([201, 409]).toContain(result.status);
    if (result.status === 201) {
      expect(result.data.success).toBe(true);
    }
  });

  test('auth login endpoint returns token/session', async () => {
    const result = await apiCall('POST', '/api/auth/login', {
      phoneOrEmail: email,
      password
    });

    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.token).toBeDefined();
    expect(result.data.sessionId).toBeDefined();
  });

  test('legacy register endpoint accepts registration payload', async () => {
    const result = await apiCall('POST', '/api/register-farmer', {
      phoneNumber: `+254713${String(unique).slice(-6)}`,
      subCounty: 'ugunja',
      soilType: 'clay'
    });

    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);
  });

  test('recommend endpoint returns recommendations', async () => {
    const result = await apiCall('POST', '/api/recommend', {
      phoneNumber,
      subCounty: 'bondo',
      soilType: 'loam',
      season: 'long_rains',
      budget: 6000,
      farmSize: 2,
      waterSource: 'Rainfall'
    });

    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(Array.isArray(result.data.data.recommendations)).toBe(true);
    expect(result.data.data.recommendations.length).toBeGreaterThan(0);
  });

  test('chat endpoint returns farming response', async () => {
    const result = await apiCall('POST', '/api/chat', {
      message: 'Which crop should I plant this season in Bondo with loam soil?',
      context: {
        farmerId: phoneNumber,
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains'
      }
    });

    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.data.reply).toBeDefined();
  });

  test('monitoring and KPI endpoints are available', async () => {
    const [metricsRes, kpiRes] = await Promise.all([
      apiCall('GET', '/api/metrics'),
      apiCall('GET', '/api/kpi')
    ]);

    expect(metricsRes.status).toBe(200);
    expect(metricsRes.data.api).toBeDefined();
    expect(metricsRes.data.errors).toBeDefined();
    expect(metricsRes.data.uptime).toBeDefined();
    expect(metricsRes.data.recommendations).toBeDefined();

    expect(kpiRes.status).toBe(200);
    expect(kpiRes.data.recommendations).toBeDefined();
    expect(kpiRes.data.retention).toBeDefined();
    expect(kpiRes.data.yield).toBeDefined();
  });
});
