/**
 * KPI Tracker
 * Tracks business key performance indicators
 * - Recommendation rate
 * - Farmer retention
 * - Yield improvement delta
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KPI_DIR = path.join(__dirname, '../kpi-data');

// Ensure KPI directory exists
if (!fs.existsSync(KPI_DIR)) {
  fs.mkdirSync(KPI_DIR, { recursive: true });
}

class KPITracker {
  constructor() {
    this.kpis = {
      farmers: {
        total: 0,
        active: 0,
        inactive: 0,
        byLocation: {},
        registrationHistory: [],
        profiles: {}
      },
      recommendations: {
        total: 0,
        acceptanceRate: 0,
        conversionHistory: [],
        recommendationHistory: [],
        topCrops: {}
      },
      retention: {
        dailyActiveUsers: [],
        weeklyActiveUsers: [],
        monthlyActiveUsers: [],
        churnRate: 0,
        lastActivityDates: {},
        cohortData: {}
      },
      yield: {
        projections: [],
        improvements: [],
        farmOutcomes: []
      },
      engagement: {
        recommendationRate: 0,
        chatbotInteractions: 0,
        feedbackResponses: 0
      }
    };

    this.targets = {
      dailyRecommendationRate: 50, // min recommendations per day
      farmerRetentionRate: 60, // % of farmers active after 30 days
      yieldImprovement: 15, // min % improvement
      engagement: 30 // % of farmers engaging with chatbot
    };
  }

  // ===== FARMER LIFECYCLE TRACKING =====
  recordNewFarmer(farmerData) {
    const subCounty = farmerData.sub_county || farmerData.subCounty || 'unknown';
    const soilType = farmerData.soil_type || farmerData.soilType || 'unknown';
    const language = farmerData.preferred_language || farmerData.preferredLanguage || 'english';
    const farmer = {
      id: farmerData.id || this.generateFarmerId(),
      registrationDate: new Date(),
      subCounty,
      soilType,
      language,
      status: 'active',
      lastActivityDate: new Date(),
      recommendationCount: 0,
      chatbotInteractions: 0,
      feedbackProvided: 0
    };

    this.kpis.farmers.total++;
    this.kpis.farmers.active++;

    if (!this.kpis.farmers.byLocation[farmer.subCounty]) {
      this.kpis.farmers.byLocation[farmer.subCounty] = { active: 0, inactive: 0 };
    }
    this.kpis.farmers.byLocation[farmer.subCounty].active++;

    this.kpis.farmers.registrationHistory.push({
      date: farmer.registrationDate,
      count: this.kpis.farmers.total,
      location: farmer.subCounty
    });

    this.kpis.retention.lastActivityDates[farmer.id] = farmer.lastActivityDate;
    this.kpis.farmers.profiles[farmer.id] = farmer;

    return farmer;
  }

  generateFarmerId() {
    return `farmer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===== RECOMMENDATION TRACKING =====
  recordRecommendation(farmerId, cropRecommended, confidence, farmerAccepted = null) {
    this.kpis.recommendations.total++;
    this.kpis.recommendations.recommendationHistory.push({
      date: new Date(),
      farmerId,
      crop: cropRecommended,
      confidence
    });
    if (this.kpis.recommendations.recommendationHistory.length > 10000) {
      this.kpis.recommendations.recommendationHistory.shift();
    }

    // Track crop popularity
    if (!this.kpis.recommendations.topCrops[cropRecommended]) {
      this.kpis.recommendations.topCrops[cropRecommended] = {
        count: 0,
        acceptedCount: 0,
        averageConfidence: 0,
        confidenceSum: 0
      };
    }

    const cropData = this.kpis.recommendations.topCrops[cropRecommended];
    cropData.count++;
    cropData.confidenceSum += confidence;
    cropData.averageConfidence = cropData.confidenceSum / cropData.count;

    if (farmerAccepted !== null) {
      const conversionEntry = {
        date: new Date(),
        farmerId,
        crop: cropRecommended,
        confidence,
        accepted: farmerAccepted
      };

      this.kpis.recommendations.conversionHistory.push(conversionEntry);

      if (farmerAccepted) {
        cropData.acceptedCount++;
      }

      // Keep last 10000 conversions
      if (this.kpis.recommendations.conversionHistory.length > 10000) {
        this.kpis.recommendations.conversionHistory.shift();
      }
    }

    // Update farmer engagement
    this.updateFarmerActivity(farmerId);

    return {
      cropRecommended,
      confidence,
      totalRecommendations: this.kpis.recommendations.total
    };
  }

  recordFeedback(farmerId, feedbackData) {
    // Farmer provided feedback - engagement signal
    this.kpis.engagement.feedbackResponses++;

    // Track farmer engagement
    const locationKey = this.getLocationFromFarmerId(farmerId);
    if (locationKey) {
      this.updateFarmerActivity(farmerId);
    }

    return {
      farmerId,
      feedbackProvided: true,
      timestamp: new Date()
    };
  }

  getRecommendationMetrics() {
    const totalRecs = this.kpis.recommendations.total;
    const acceptedRecs = this.kpis.recommendations.conversionHistory.filter(c => c.accepted).length;
    const acceptanceRate = totalRecs === 0 ? 0 : (acceptedRecs / totalRecs) * 100;

    // Top recommended crops
    const topCrops = Object.entries(this.kpis.recommendations.topCrops)
      .map(([crop, data]) => ({
        crop,
        recommendedCount: data.count,
        acceptedCount: data.acceptedCount,
        acceptanceRate: Math.round((data.acceptedCount / data.count) * 100),
        avgConfidence: Math.round(data.averageConfidence)
      }))
      .sort((a, b) => b.recommendedCount - a.recommendedCount)
      .slice(0, 10);

    // Daily recommendation rate
    const last24h = this.kpis.recommendations.recommendationHistory.filter(
      c => new Date() - c.date < 86400000
    );
    const dailyRate = last24h.length;

    return {
      totalRecommendations: totalRecs,
      acceptanceRate: Math.round(acceptanceRate * 100) / 100,
      acceptedCount: acceptedRecs,
      topCrops,
      dailyRecommendationRate: dailyRate,
      targetDailyRate: this.targets.dailyRecommendationRate,
      targetMet: dailyRate >= this.targets.dailyRecommendationRate
    };
  }

  // ===== RETENTION TRACKING =====
  recordDailyActiveUser(farmerId) {
    const today = this.getDateKey(new Date());

    if (!this.kpis.retention.dailyActiveUsers.find(d => d.date === today)) {
      this.kpis.retention.dailyActiveUsers.push({
        date: today,
        users: new Set()
      });
    }

    const todayEntry = this.kpis.retention.dailyActiveUsers.find(d => d.date === today);
    todayEntry.users.add(farmerId);

    this.updateFarmerActivity(farmerId);
  }

  recordWeeklyActiveUser(farmerId) {
    const week = this.getWeekKey(new Date());

    if (!this.kpis.retention.weeklyActiveUsers.find(w => w.week === week)) {
      this.kpis.retention.weeklyActiveUsers.push({
        week,
        users: new Set()
      });
    }

    const weekEntry = this.kpis.retention.weeklyActiveUsers.find(w => w.week === week);
    weekEntry.users.add(farmerId);
  }

  recordMonthlyActiveUser(farmerId) {
    const month = this.getMonthKey(new Date());

    if (!this.kpis.retention.monthlyActiveUsers.find(m => m.month === month)) {
      this.kpis.retention.monthlyActiveUsers.push({
        month,
        users: new Set()
      });
    }

    const monthEntry = this.kpis.retention.monthlyActiveUsers.find(m => m.month === month);
    monthEntry.users.add(farmerId);
  }

  updateFarmerActivity(farmerId) {
    const now = new Date();
    this.kpis.retention.lastActivityDates[farmerId] = now;
    if (this.kpis.farmers.profiles[farmerId]) {
      this.kpis.farmers.profiles[farmerId].lastActivityDate = now;
    }
  }

  calculateRetentionRate() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    let retainedUsers = 0;
    let eligibleUsers = 0;

    // Eligible: registered for at least 30 days. Retained: active in last 30 days.
    for (const farmer of Object.values(this.kpis.farmers.profiles)) {
      const registeredAt = new Date(farmer.registrationDate);
      const lastActivityAt = new Date(
        this.kpis.retention.lastActivityDates[farmer.id] || farmer.lastActivityDate || farmer.registrationDate
      );
      if (registeredAt <= thirtyDaysAgo) {
        eligibleUsers++;
        if (lastActivityAt >= thirtyDaysAgo) {
          retainedUsers++;
        }
      }
    }

    const retentionRate = eligibleUsers === 0 ? 100 : (retainedUsers / eligibleUsers) * 100;

    this.kpis.retention.churnRate = 100 - retentionRate;

    return {
      retention30DayRate: Math.round(retentionRate * 100) / 100,
      churnRate: Math.round(this.kpis.retention.churnRate * 100) / 100,
      activeUsers: Object.keys(this.kpis.retention.lastActivityDates).length,
      inactiveUsers: this.kpis.farmers.inactive,
      targetRetentionRate: this.targets.farmerRetentionRate,
      targetMet: retentionRate >= this.targets.farmerRetentionRate
    };
  }

  getRetentionMetrics() {
    const dau = this.kpis.retention.dailyActiveUsers.length > 0
      ? this.kpis.retention.dailyActiveUsers[this.kpis.retention.dailyActiveUsers.length - 1].users.size
      : 0;

    const wau = this.kpis.retention.weeklyActiveUsers.length > 0
      ? this.kpis.retention.weeklyActiveUsers[this.kpis.retention.weeklyActiveUsers.length - 1].users.size
      : 0;

    const mau = this.kpis.retention.monthlyActiveUsers.length > 0
      ? this.kpis.retention.monthlyActiveUsers[this.kpis.retention.monthlyActiveUsers.length - 1].users.size
      : 0;

    return {
      dailyActiveUsers: dau,
      weeklyActiveUsers: wau,
      monthlyActiveUsers: mau,
      wauDauRatio: dau === 0 ? 0 : Math.round((wau / dau) * 100) / 100,
      mauWauRatio: wau === 0 ? 0 : Math.round((mau / wau) * 100) / 100,
      ...this.calculateRetentionRate()
    };
  }

  // ===== YIELD IMPROVEMENT TRACKING =====
  recordYieldImprovement(farmerId, cropType, baselineYield, projectedYield, improvementFactors = []) {
    const improvementDelta = ((projectedYield - baselineYield) / baselineYield) * 100;

    const improvement = {
      date: new Date(),
      farmerId,
      cropType,
      baselineYield,
      projectedYield,
      improvementDelta,
      improvementFactors,
      estimatedIncome: projectedYield * 100 // Assuming KSh 100/kg average
    };

    this.kpis.yield.improvements.push(improvement);

    // Keep last 5000 improvements
    if (this.kpis.yield.improvements.length > 5000) {
      this.kpis.yield.improvements.shift();
    }

    return improvement;
  }

  recordFarmOutcome(farmerId, cropType, plannedYield, actualYield, feedback = {}) {
    const actualImprovement = ((actualYield - plannedYield) / plannedYield) * 100;

    const outcome = {
      date: new Date(),
      farmerId,
      cropType,
      plannedYield,
      actualYield,
      actualImprovement,
      feedback,
      recommendationWorked: actualYield > plannedYield
    };

    this.kpis.yield.farmOutcomes.push(outcome);

    // Keep last 1000 outcomes
    if (this.kpis.yield.farmOutcomes.length > 1000) {
      this.kpis.yield.farmOutcomes.shift();
    }

    return outcome;
  }

  getYieldMetrics() {
    const totalImprovements = this.kpis.yield.improvements.length;
    const totalOutcomes = this.kpis.yield.farmOutcomes.length;

    // Average improvement delta
    const avgImprovementDelta = totalImprovements === 0
      ? 0
      : this.kpis.yield.improvements.reduce((sum, i) => sum + i.improvementDelta, 0) /
        totalImprovements;

    // Success rate (recommendations that resulted in actual improvement)
    const successfulOutcomes = this.kpis.yield.farmOutcomes.filter(
      o => o.recommendationWorked
    ).length;
    const successRate = totalOutcomes === 0 ? 0 : (successfulOutcomes / totalOutcomes) * 100;

    // Average actual improvement
    const avgActualImprovement = totalOutcomes === 0
      ? 0
      : this.kpis.yield.farmOutcomes.reduce((sum, o) => sum + o.actualImprovement, 0) /
        totalOutcomes;

    // Estimated total income improvement
    const totalIncomeImprovement = this.kpis.yield.improvements.reduce(
      (sum, i) => sum + i.estimatedIncome,
      0
    );

    // Top improvement factors
    const factorCounts = {};
    this.kpis.yield.improvements.forEach(imp => {
      imp.improvementFactors.forEach(factor => {
        factorCounts[factor] = (factorCounts[factor] || 0) + 1;
      });
    });

    return {
      projectionCount: totalImprovements,
      outcomeCount: totalOutcomes,
      avgProjectedImprovement: Math.round(avgImprovementDelta * 100) / 100,
      avgActualImprovement: Math.round(avgActualImprovement * 100) / 100,
      recommendationSuccessRate: Math.round(successRate * 100) / 100,
      estimatedTotalIncomeImprovement: totalIncomeImprovement,
      topImprovementFactors: Object.entries(factorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([factor, count]) => ({ factor, count })),
      targetImprovement: this.targets.yieldImprovement,
      targetMet: avgActualImprovement >= this.targets.yieldImprovement
    };
  }

  // ===== ENGAGEMENT METRICS =====
  recordChatbotInteraction(farmerId) {
    this.kpis.engagement.chatbotInteractions++;
    this.recordDailyActiveUser(farmerId);
  }

  getEngagementMetrics() {
    const totalFarmers = this.kpis.farmers.total;
    const chatbotUsers = new Set();

    // Count unique farmers who used chatbot (approximate from tracked interactions)
    const chatbotEngagementRate = totalFarmers === 0
      ? 0
      : (this.kpis.engagement.chatbotInteractions / (totalFarmers * 5)) * 100; // Normalized

    return {
      totalChatbotInteractions: this.kpis.engagement.chatbotInteractions,
      feedbackResponses: this.kpis.engagement.feedbackResponses,
      chatbotEngagementRate: Math.round(Math.min(100, chatbotEngagementRate * 100)) / 100,
      targetEngagement: this.targets.engagement
    };
  }

  // ===== COMPREHENSIVE KPI DASHBOARD =====
  getComprehensiveKPIs() {
    return {
      timestamp: new Date().toISOString(),
      farmers: {
        total: this.kpis.farmers.total,
        active: this.kpis.farmers.active,
        inactive: this.kpis.farmers.inactive,
        byLocation: this.kpis.farmers.byLocation
      },
      recommendations: this.getRecommendationMetrics(),
      retention: this.getRetentionMetrics(),
      yield: this.getYieldMetrics(),
      engagement: this.getEngagementMetrics(),
      targets: this.targets
    };
  }

  // ===== HELPER FUNCTIONS =====
  getDateKey(date) {
    return date.toISOString().split('T')[0];
  }

  getWeekKey(date) {
    const d = new Date(date);
    const week = Math.ceil((d.getDate() + new Date(d.getFullYear(), 0, 1).getDay()) / 7);
    return `${d.getFullYear()}-W${week}`;
  }

  getMonthKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  getLocationFromFarmerId(farmerId) {
    return this.kpis.farmers.profiles[farmerId]?.subCounty || null;
  }

  // ===== PERSISTENCE =====
  saveKPISnapshot() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(KPI_DIR, `kpi-${timestamp}.json`);

    fs.writeFileSync(filename, JSON.stringify(this.getComprehensiveKPIs(), null, 2));
    return filename;
  }

  loadKPISnapshot(timestamp) {
    const filename = path.join(KPI_DIR, `kpi-${timestamp}.json`);
    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename, 'utf8'));
    }
    return null;
  }

  // ===== REPORTING =====
  generateKPIReport() {
    const kpis = this.getComprehensiveKPIs();
    const report = {
      timestamp: kpis.timestamp,
      summary: {
        totalFarmers: kpis.farmers.total,
        totalRecommendations: kpis.recommendations.totalRecommendations,
        recommendationAcceptanceRate: kpis.recommendations.acceptanceRate,
        farmerRetention30Day: kpis.retention.retention30DayRate,
        avgYieldImprovement: kpis.yield.avgActualImprovement,
        dailyActiveUsers: kpis.retention.dailyActiveUsers,
        monthlyActiveUsers: kpis.retention.monthlyActiveUsers
      },
      meetsTargets: {
        dailyRecommendationRate: kpis.recommendations.targetMet,
        farmerRetention: kpis.retention.targetMet,
        yieldImprovement: kpis.yield.targetMet
      },
      alerts: this.generateAlerts(kpis)
    };

    return report;
  }

  generateAlerts(kpis) {
    const alerts = [];

    if (!kpis.recommendations.targetMet) {
      alerts.push({
        level: 'WARNING',
        message: `Daily recommendation rate is ${kpis.recommendations.dailyRecommendationRate} (target: ${kpis.recommendations.targetDailyRate})`
      });
    }

    if (!kpis.retention.targetMet) {
      alerts.push({
        level: 'WARNING',
        message: `30-day farmer retention is ${kpis.retention.retention30DayRate}% (target: ${kpis.retention.targetRetentionRate}%)`
      });
    }

    if (!kpis.yield.targetMet) {
      alerts.push({
        level: 'INFO',
        message: `Average yield improvement is ${kpis.yield.avgActualImprovement}% (target: ${kpis.yield.targetImprovement}%)`
      });
    }

    if (kpis.retention.churnRate > 50) {
      alerts.push({
        level: 'CRITICAL',
        message: `High churn rate detected: ${kpis.retention.churnRate}%`
      });
    }

    return alerts;
  }
}

export default new KPITracker();
