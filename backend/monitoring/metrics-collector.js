/**
 * Metrics Collector
 * Collects performance, error, and business metrics in real-time
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const METRICS_DIR = path.join(__dirname, '../metrics');

// Ensure metrics directory exists
if (!fs.existsSync(METRICS_DIR)) {
  fs.mkdirSync(METRICS_DIR, { recursive: true });
}

class MetricsCollector {
  constructor() {
    this.metrics = {
      api: {},
      errors: [],
      recommendations: [],
      chatbot: [],
      registrations: [],
      uptime: {
        startTime: new Date(),
        downtime: []
      }
    };

    this.thresholds = {
      p95LatencyMs: 500,
      errorRatePercent: 5,
      uptimePercent: 99.5
    };
    this.totalSubCounties = Number(process.env.MONITORED_SUBCOUNTIES || 6);
  }

  // ===== API ENDPOINT METRICS =====
  recordApiCall(endpoint, method, durationMs, statusCode) {
    const key = `${method} ${endpoint}`;

    if (!this.metrics.api[key]) {
      this.metrics.api[key] = {
        totalCalls: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        responseTimes: [],
        errorCounts: 0,
        successCounts: 0,
        statusCodeDistribution: {}
      };
    }

    const apiMetric = this.metrics.api[key];
    apiMetric.totalCalls++;
    apiMetric.totalDuration += durationMs;
    apiMetric.minDuration = Math.min(apiMetric.minDuration, durationMs);
    apiMetric.maxDuration = Math.max(apiMetric.maxDuration, durationMs);
    apiMetric.responseTimes.push({ time: new Date(), duration: durationMs });

    // Keep only last 1000 response times
    if (apiMetric.responseTimes.length > 1000) {
      apiMetric.responseTimes.shift();
    }

    // Track status codes
    apiMetric.statusCodeDistribution[statusCode] = (apiMetric.statusCodeDistribution[statusCode] || 0) + 1;

    if (statusCode >= 400) {
      apiMetric.errorCounts++;
    } else {
      apiMetric.successCounts++;
    }

    return apiMetric;
  }

  getApiMetrics() {
    const metrics = {};

    for (const [endpoint, data] of Object.entries(this.metrics.api)) {
      const avgDuration = data.totalDuration / data.totalCalls;
      const errorRate = (data.errorCounts / data.totalCalls) * 100;

      // Calculate P95 latency
      const sortedTimes = data.responseTimes
        .map(r => r.duration)
        .sort((a, b) => a - b);
      const p95Index = Math.ceil(sortedTimes.length * 0.95) - 1;
      const p95Latency = sortedTimes[p95Index] || avgDuration;

      metrics[endpoint] = {
        totalCalls: data.totalCalls,
        avgDuration: Math.round(avgDuration),
        minDuration: data.minDuration,
        maxDuration: data.maxDuration,
        p95Latency: Math.round(p95Latency),
        errorRate: Math.round(errorRate * 100) / 100,
        successCount: data.successCounts,
        errorCount: data.errorCounts,
        statusCodes: data.statusCodeDistribution
      };
    }

    return metrics;
  }

  // ===== ERROR TRACKING =====
  recordError(error, endpoint, context = {}) {
    const errorEntry = {
      timestamp: new Date(),
      message: error.message,
      stack: error.stack,
      endpoint,
      context,
      severity: this.determineSeverity(error)
    };

    this.metrics.errors.push(errorEntry);

    // Keep only last 1000 errors
    if (this.metrics.errors.length > 1000) {
      this.metrics.errors.shift();
    }

    return errorEntry;
  }

  determineSeverity(error) {
    const message = error.message.toLowerCase();
    if (message.includes('critical') || message.includes('fatal')) return 'CRITICAL';
    if (message.includes('error')) return 'ERROR';
    if (message.includes('warn')) return 'WARNING';
    return 'INFO';
  }

  getErrorMetrics() {
    const totalErrors = this.metrics.errors.length;
    const recentErrors = this.metrics.errors.slice(-100);

    const errorsBySeverity = {
      CRITICAL: 0,
      ERROR: 0,
      WARNING: 0,
      INFO: 0
    };

    const errorsByEndpoint = {};

    recentErrors.forEach(err => {
      errorsBySeverity[err.severity]++;
      errorsByEndpoint[err.endpoint] = (errorsByEndpoint[err.endpoint] || 0) + 1;
    });

    const errorRate = this.calculateErrorRate();

    return {
      totalErrors,
      recentErrors: recentErrors.slice(-10),
      errorsBySeverity,
      errorsByEndpoint,
      errorRate: Math.round(errorRate * 100) / 100,
      thresholdBreached: errorRate > this.thresholds.errorRatePercent
    };
  }

  calculateErrorRate() {
    let totalCalls = 0;
    let errorCalls = 0;

    for (const endpoint of Object.values(this.metrics.api)) {
      totalCalls += endpoint.totalCalls;
      errorCalls += endpoint.errorCounts;
    }

    return totalCalls === 0 ? 0 : (errorCalls / totalCalls) * 100;
  }

  // ===== RECOMMENDATION METRICS =====
  recordRecommendation(farmData, recommendations, responseTimeMs) {
    const top = recommendations[0] || {};
    const recommendation = {
      timestamp: new Date(),
      farmData: {
        subCounty: farmData.subCounty,
        soilType: farmData.soilType,
        season: farmData.season,
        budget: farmData.budget,
        farmSize: farmData.farmSize
      },
      topCrop: top.name || top.crop || null,
      topScore: top.confidenceScore ?? top.confidence ?? top.score ?? 0,
      cropCount: recommendations.length,
      responseTime: responseTimeMs
    };

    this.metrics.recommendations.push(recommendation);

    // Keep last 10000 recommendations
    if (this.metrics.recommendations.length > 10000) {
      this.metrics.recommendations = this.metrics.recommendations.slice(-10000);
    }

    return recommendation;
  }

  getRecommendationMetrics() {
    const total = this.metrics.recommendations.length;
    const last24h = this.metrics.recommendations.filter(
      r => new Date() - r.timestamp < 86400000
    );
    const last7d = this.metrics.recommendations.filter(
      r => new Date() - r.timestamp < 604800000
    );

    // Top recommended crops
    const cropCounts = {};
    this.metrics.recommendations.forEach(rec => {
      cropCounts[rec.topCrop] = (cropCounts[rec.topCrop] || 0) + 1;
    });

    const topCrops = Object.entries(cropCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([crop, count]) => ({ crop, count }));

    // Average confidence score
    const avgConfidence =
      this.metrics.recommendations.reduce((sum, r) => sum + (r.topScore || 0), 0) /
      (total || 1);

    // Coverage metrics
    const subCountyCoverage = {};
    this.metrics.recommendations.forEach(rec => {
      subCountyCoverage[rec.farmData.subCounty] =
        (subCountyCoverage[rec.farmData.subCounty] || 0) + 1;
    });

    // Average response time
    const avgResponseTime =
      this.metrics.recommendations.reduce((sum, r) => sum + r.responseTime, 0) /
      (total || 1);

    const uniqueSubCounties = Object.keys(subCountyCoverage).length;
    const recommendationCoveragePercent = this.totalSubCounties > 0
      ? Math.min(100, (uniqueSubCounties / this.totalSubCounties) * 100)
      : 0;

    return {
      totalRecommendations: total,
      last24hCount: last24h.length,
      last7dCount: last7d.length,
      dailyAverage: Math.round(last7d.length / 7),
      avgConfidenceScore: Math.round(avgConfidence * 100) / 100,
      topCrops,
      subCountyCoverage,
      avgResponseTime: Math.round(avgResponseTime),
      uniqueSubCounties,
      recommendationCoveragePercent: Math.round(recommendationCoveragePercent * 100) / 100,
      coveragePercent: uniqueSubCounties,
      recommendationRate: this.calculateRecommendationRate()
    };
  }

  calculateRecommendationRate() {
    const last24h = this.metrics.recommendations.filter(
      r => new Date() - r.timestamp < 86400000
    );
    return last24h.length;
  }

  // ===== CHATBOT METRICS =====
  recordChatMessage(message, response, isBlocked, durationMs) {
    const chatEntry = {
      timestamp: new Date(),
      messageLength: message.length,
      responseLength: response?.length || 0,
      isBlocked,
      isGuardrailHit: isBlocked,
      responseTime: durationMs,
      topicIdentified: this.extractTopic(message)
    };

    this.metrics.chatbot.push(chatEntry);

    // Keep last 5000 chat messages
    if (this.metrics.chatbot.length > 5000) {
      this.metrics.chatbot.shift();
    }

    return chatEntry;
  }

  extractTopic(message) {
    const topics = [
      'maize', 'beans', 'rice', 'sorghum', 'crops',
      'soil', 'fertilizer', 'pesticide', 'nitrogen', 'phosphorus',
      'water', 'rainfall', 'irrigation', 'season',
      'budget', 'price', 'market', 'yield'
    ];

    const lowerMsg = message.toLowerCase();
    for (const topic of topics) {
      if (lowerMsg.includes(topic)) return topic;
    }
    return 'general';
  }

  getChatbotMetrics() {
    const total = this.metrics.chatbot.length;
    const blocked = this.metrics.chatbot.filter(c => c.isBlocked).length;
    const blockRate = total === 0 ? 0 : (blocked / total) * 100;

    // Topic distribution
    const topicDist = {};
    this.metrics.chatbot.forEach(c => {
      topicDist[c.topicIdentified] = (topicDist[c.topicIdentified] || 0) + 1;
    });

    // Average response time
    const avgResponseTime =
      this.metrics.chatbot.reduce((sum, c) => sum + c.responseTime, 0) / (total || 1);

    // Last 24 hours activity
    const last24h = this.metrics.chatbot.filter(
      c => new Date() - c.timestamp < 86400000
    );

    return {
      totalMessages: total,
      blockedCount: blocked,
      blockRatePercent: Math.round(blockRate * 100) / 100,
      topicDistribution: topicDist,
      avgResponseTime: Math.round(avgResponseTime),
      last24hCount: last24h.length,
      guardrailsActive: blockRate > 0
    };
  }

  // ===== REGISTRATION METRICS =====
  recordRegistration(farmerData) {
    const registration = {
      timestamp: new Date(),
      subCounty: farmerData.sub_county || farmerData.subCounty || 'unknown',
      soilType: farmerData.soil_type || farmerData.soilType || 'unknown',
      language: farmerData.preferred_language || farmerData.preferredLanguage || 'english',
      hasPhone: Boolean(farmerData.phone_number || farmerData.phoneNumber)
    };

    this.metrics.registrations.push(registration);
    return registration;
  }

  getRegistrationMetrics() {
    const total = this.metrics.registrations.length;
    const last24h = this.metrics.registrations.filter(
      r => new Date() - r.timestamp < 86400000
    );
    const last7d = this.metrics.registrations.filter(
      r => new Date() - r.timestamp < 604800000
    );

    // Registration by location
    const locationDist = {};
    this.metrics.registrations.forEach(reg => {
      locationDist[reg.subCounty] = (locationDist[reg.subCounty] || 0) + 1;
    });

    // Language preference
    const languageDist = {};
    this.metrics.registrations.forEach(reg => {
      languageDist[reg.language] = (languageDist[reg.language] || 0) + 1;
    });

    return {
      totalRegistrations: total,
      last24hCount: last24h.length,
      last7dCount: last7d.length,
      dailyAverage: Math.round(last7d.length / 7),
      locationDistribution: locationDist,
      languagePreferences: languageDist,
      registrationRate: last24h.length // Per day
    };
  }

  // ===== UPTIME METRICS =====
  recordDowntime(startTime, endTime) {
    this.metrics.uptime.downtime.push({
      start: startTime,
      end: endTime,
      durationMs: endTime - startTime
    });
  }

  getUptimeMetrics() {
    const now = new Date();
    const startTime = this.metrics.uptime.startTime;
    const totalUptimeMs = now - startTime;

    const downtimeMs = this.metrics.uptime.downtime.reduce(
      (sum, d) => sum + d.durationMs,
      0
    );

    const uptimePercent = ((totalUptimeMs - downtimeMs) / totalUptimeMs) * 100;
    const lastDowntime = this.metrics.uptime.downtime[this.metrics.uptime.downtime.length - 1];

    return {
      startTime: startTime.toISOString(),
      currentTime: now.toISOString(),
      totalUptimeMs,
      downtimeCount: this.metrics.uptime.downtime.length,
      totalDowntimeMs: downtimeMs,
      uptimePercent: Math.round(uptimePercent * 100) / 100,
      lastDowntime: lastDowntime,
      thresholdBreached: uptimePercent < this.thresholds.uptimePercent
    };
  }

  // ===== COMPREHENSIVE METRICS EXPORT =====
  getComprehensiveMetrics() {
    return {
      timestamp: new Date().toISOString(),
      api: this.getApiMetrics(),
      errors: this.getErrorMetrics(),
      recommendations: this.getRecommendationMetrics(),
      chatbot: this.getChatbotMetrics(),
      registrations: this.getRegistrationMetrics(),
      uptime: this.getUptimeMetrics(),
      thresholds: this.thresholds
    };
  }

  // ===== PERSISTENCE =====
  saveMetricsSnapshot() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(METRICS_DIR, `metrics-${timestamp}.json`);

    fs.writeFileSync(filename, JSON.stringify(this.getComprehensiveMetrics(), null, 2));
    return filename;
  }

  loadMetricsSnapshot(timestamp) {
    const filename = path.join(METRICS_DIR, `metrics-${timestamp}.json`);
    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename, 'utf8'));
    }
    return null;
  }

  // ===== ALERTING =====
  checkThresholds() {
    const metrics = this.getComprehensiveMetrics();
    const alerts = [];

    // Check P95 latency
    for (const [endpoint, data] of Object.entries(metrics.api)) {
      if (data.p95Latency > this.thresholds.p95LatencyMs) {
        alerts.push({
          level: 'WARNING',
          message: `P95 latency for ${endpoint} is ${data.p95Latency}ms (threshold: ${this.thresholds.p95LatencyMs}ms)`
        });
      }
    }

    // Check error rate
    if (metrics.errors.thresholdBreached) {
      alerts.push({
        level: 'ERROR',
        message: `Error rate is ${metrics.errors.errorRate}% (threshold: ${this.thresholds.errorRatePercent}%)`
      });
    }

    // Check uptime
    if (metrics.uptime.thresholdBreached) {
      alerts.push({
        level: 'CRITICAL',
        message: `Uptime is ${metrics.uptime.uptimePercent}% (threshold: ${this.thresholds.uptimePercent}%)`
      });
    }

    return alerts;
  }
}

export default new MetricsCollector();
