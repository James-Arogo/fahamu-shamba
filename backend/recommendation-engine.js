// ML-based Recommendation Engine for Fahamu Shamba
// Uses rule-based logic + scoring to recommend crops

import demoData from './demo-data.js';
import farmInputsData from './farm-inputs-data.js';

class RecommendationEngine {
  constructor() {
    this.modelVersion = process.env.RECOMMENDATION_MODEL_VERSION || 'fahamu-rec-v2.0.0';
    this.minimumEvidenceSamples = 5;
    this.scoringWeights = {
      rule: 0.55,
      regional: 0.25,
      feedback: 0.15,
      market: 0.05
    };
    this.cropRules = demoData.cropRules;
    this.soilData = demoData.soilData;
    this.weatherData = demoData.weatherData;
    this.marketPrices = demoData.marketPrices;
    this.cropInputs = farmInputsData.cropInputs;
    this.essentialTools = farmInputsData.essentialTools;
    this.costSavingStrategies = farmInputsData.costSavingStrategies;
  }

  /**
   * Main recommendation function
   * @param {Object} farmerData - farmer's conditions { subCounty, soilType, season, budget, farmSize, waterSource }
   * @returns {Object} - top 3 crop recommendations with scores
   */
  getRecommendations(farmerData, options = {}) {
    const { subCounty = '', soilType = '', season = '', budget = 5000, farmSize = 1, waterSource = 'Rainfall' } = farmerData || {};
    const historicalSummary = options.historicalSummary || null;
    const regionalProfile = options.regionalProfile || [];
    const feedbackSignals = options.feedbackSignals || [];
    const qualitySnapshot = this.buildQualitySnapshot(farmerData, historicalSummary);

    // Calculate score for each crop
    const cropScores = this.cropRules.map(rule => {
      const ruleScore = this.calculateCropScore(rule, {
        subCounty: (subCounty || '').toLowerCase(),
        soilType: (soilType || '').toLowerCase(),
        season: (season || '').toLowerCase(),
        budget,
        farmSize,
        waterSource
      });
      const regionalScore = this.getRegionalCalibrationScore(rule.name, regionalProfile);
      const feedbackScore = this.getFeedbackAdjustmentScore(rule.name, feedbackSignals);
      const marketScore = this.getMarketMomentumScore(rule.name, subCounty);
      const score = this.calculateHybridScore({
        ruleScore,
        regionalScore,
        feedbackScore,
        marketScore
      });

      return {
        ...rule,
        score,
        componentScores: {
          ruleScore,
          regionalScore,
          feedbackScore,
          marketScore
        },
        confidenceScore: this.calculateConfidenceScore(score, qualitySnapshot),
        evidenceLevel: qualitySnapshot.evidenceLevel,
        marketPrice: this.getMarketPrice(rule.name, subCounty)
      };
    });

    // Sort by score descending
    cropScores.sort((a, b) => b.score - a.score);

    // Return top 3
    const topRecommendations = cropScores.slice(0, 3);
    const topScore = topRecommendations[0]?.score || 0;
    const insufficientData =
      qualitySnapshot.missingRequiredFields.length > 0 ||
      qualitySnapshot.hasLowEvidence ||
      topScore < 55;

    const fallbackRecommendations = insufficientData
      ? this.buildFallbackRecommendations({
          subCounty: (subCounty || '').toLowerCase(),
          soilType: (soilType || '').toLowerCase(),
          season: (season || '').toLowerCase()
        })
      : topRecommendations;

    return {
      recommendations: fallbackRecommendations,
      allScores: cropScores,
      metadata: {
        timestamp: new Date().toISOString(),
        modelVersion: this.modelVersion,
        location: subCounty,
        soil: soilType,
        season,
        budget,
        farmSize,
        confidence: {
          overall: this.calculateOverallConfidence(topRecommendations, qualitySnapshot),
          evidenceLevel: qualitySnapshot.evidenceLevel,
          insufficientData
        },
        quality: qualitySnapshot
      },
      diagnostics: {
        weights: this.scoringWeights,
        regionalSignals: regionalProfile.length,
        feedbackSignals: feedbackSignals.length
      },
      insufficientData,
      fallbackReason: insufficientData
        ? this.buildFallbackReason(qualitySnapshot, topScore)
        : null
    };
  }

  buildQualitySnapshot(farmerData, historicalSummary) {
    const missingRequiredFields = [];
    ['subCounty', 'soilType', 'season'].forEach((field) => {
      if (!farmerData[field]) missingRequiredFields.push(field);
    });

    const summary = historicalSummary || {};
    const sampleSize = Number(summary.sampleSize || 0);
    const dataQualityScore = Math.max(0, Math.min(100, Number(summary.dataQualityScore || 0)));
    const inputCompletenessScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          ((['subCounty', 'soilType', 'season', 'budget', 'farmSize', 'waterSource'].filter(
            (field) => farmerData[field] !== undefined && farmerData[field] !== null && farmerData[field] !== ''
          ).length /
            6) *
            100)
        )
      )
    );

    let evidenceLevel = 'low';
    if (sampleSize >= 20) evidenceLevel = 'high';
    else if (sampleSize >= this.minimumEvidenceSamples) evidenceLevel = 'medium';

    return {
      sampleSize,
      dataQualityScore,
      inputCompletenessScore,
      evidenceLevel,
      hasLowEvidence: sampleSize < this.minimumEvidenceSamples,
      missingRequiredFields
    };
  }

  calculateConfidenceScore(score, qualitySnapshot) {
    const evidenceScore = Math.min(100, qualitySnapshot.sampleSize * 5);
    const confidence = Math.round(
      score * 0.65 +
      qualitySnapshot.dataQualityScore * 0.2 +
      qualitySnapshot.inputCompletenessScore * 0.1 +
      evidenceScore * 0.05
    );
    return Math.max(0, Math.min(100, confidence));
  }

  calculateHybridScore({ ruleScore, regionalScore, feedbackScore, marketScore }) {
    const weighted = Math.round(
      ruleScore * this.scoringWeights.rule +
      regionalScore * this.scoringWeights.regional +
      feedbackScore * this.scoringWeights.feedback +
      marketScore * this.scoringWeights.market
    );
    return Math.max(0, Math.min(100, weighted));
  }

  getRegionalCalibrationScore(cropName, regionalProfile = []) {
    if (!Array.isArray(regionalProfile) || regionalProfile.length === 0) return 50;

    const crop = regionalProfile.find(
      (item) => (item.crop || '').toLowerCase() === cropName.toLowerCase()
    );
    if (!crop) return 48;

    const yieldScore = Number.isFinite(crop.avgYield) ? Math.min(100, crop.avgYield * 15) : 50;
    const marketScore = Number.isFinite(crop.avgMarketPrice)
      ? Math.min(100, crop.avgMarketPrice / 2)
      : 50;
    const costPenalty = Number.isFinite(crop.avgInputCost) ? Math.min(35, crop.avgInputCost / 1200) : 15;
    const pestPenalty = Number.isFinite(crop.avgPestIncidents) ? Math.min(25, crop.avgPestIncidents * 4) : 10;
    const sampleBonus = Math.min(15, Number(crop.sampleSize || 0));

    const calibrated = Math.round((yieldScore * 0.5 + marketScore * 0.3 + 55 * 0.2) - costPenalty - pestPenalty + sampleBonus);
    return Math.max(0, Math.min(100, calibrated));
  }

  getFeedbackAdjustmentScore(cropName, feedbackSignals = []) {
    if (!Array.isArray(feedbackSignals) || feedbackSignals.length === 0) return 50;
    const signal = feedbackSignals.find(
      (item) => (item.crop || '').toLowerCase() === cropName.toLowerCase()
    );
    if (!signal) return 50;

    const helpfulRatio = Number(signal.helpfulRatio || 0.5);
    const feedbackCount = Number(signal.feedbackCount || 0);
    const confidenceFactor = Math.min(1, feedbackCount / 20);
    const centered = (helpfulRatio - 0.5) * 100;
    const adjusted = Math.round(50 + centered * confidenceFactor);
    return Math.max(0, Math.min(100, adjusted));
  }

  getMarketMomentumScore(cropName, subCounty) {
    const price = this.getMarketPrice(cropName, subCounty);
    if (!price) return 50;

    const trend = (price.trend || '').toLowerCase();
    if (trend.includes('up')) return 72;
    if (trend.includes('down')) return 42;
    return 58;
  }

  calculateOverallConfidence(topRecommendations, qualitySnapshot) {
    if (!topRecommendations || topRecommendations.length === 0) return 0;
    const averageTopConfidence = Math.round(
      topRecommendations.reduce((sum, item) => sum + (item.confidenceScore || item.score || 0), 0) /
        topRecommendations.length
    );
    const lowEvidencePenalty = qualitySnapshot.hasLowEvidence ? 15 : 0;
    return Math.max(0, averageTopConfidence - lowEvidencePenalty);
  }

  buildFallbackRecommendations(farmerData) {
    const fallback = this.cropRules
      .filter((rule) => rule.conditions.soil === farmerData.soilType || rule.conditions.season === farmerData.season)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map((rule) => ({
        ...rule,
        score: Math.max(45, Math.min(70, rule.confidence - 20)),
        confidenceScore: Math.max(40, Math.min(65, rule.confidence - 25)),
        advisory: 'Limited local evidence. Recommendation based on generalized agronomic patterns.'
      }));

    if (fallback.length > 0) return fallback;

    return this.cropRules.slice(0, 3).map((rule) => ({
      ...rule,
      score: 50,
      confidenceScore: 45,
      advisory: 'Insufficient data for precise recommendation.'
    }));
  }

  buildFallbackReason(qualitySnapshot, topScore) {
    if (qualitySnapshot.missingRequiredFields.length > 0) {
      return `Missing required fields: ${qualitySnapshot.missingRequiredFields.join(', ')}`;
    }
    if (qualitySnapshot.hasLowEvidence) {
      return `Insufficient historical evidence for this context (samples: ${qualitySnapshot.sampleSize}).`;
    }
    if (topScore < 55) {
      return 'Low suitability score across candidate crops.';
    }
    return 'Insufficient data quality for high-confidence recommendations.';
  }

  /**
   * Calculate suitability score for a crop (0-100)
   */
  calculateCropScore(rule, farmerData) {
    let score = 0;

    // 1. Soil match (30 points max)
    const soilMatch = rule.conditions.soil === farmerData.soilType;
    score += soilMatch ? 30 : 10;

    // 2. Season match (20 points max)
    const seasonMatch = rule.conditions.season === farmerData.season;
    score += seasonMatch ? 20 : 8;

    // 3. Sub-county match (20 points max)
    const subCountyMatch = rule.conditions.subcounty === farmerData.subCounty;
    score += subCountyMatch ? 20 : 5;

    // 4. Water requirement vs water source (15 points max)
    const waterScore = this.getWaterCompatibilityScore(rule.waterReq, farmerData.waterSource);
    score += waterScore;

    // 5. Budget feasibility (10 points max)
    const budgetScore = this.getBudgetScore(rule.inputs, farmerData.budget);
    score += budgetScore;

    // 6. Farm size suitability (5 points max)
    const sizeScore = this.getFarmSizeScore(rule.name, farmerData.farmSize);
    score += sizeScore;

    return Math.min(100, Math.round(score));
  }

  /**
   * Score water requirement vs water source (0-15)
   */
  getWaterCompatibilityScore(waterReq, waterSource) {
    const waterMap = {
      'Low': 1,
      'Low-Medium': 2,
      'Moderate': 3,
      'Moderate-High': 4,
      'High': 5,
      'Very High': 6
    };

    const sourceRating = {
      'Rainfall': { low: 15, medium: 12, high: 5 },
      'Well': { low: 12, medium: 15, high: 10 },
      'Borehole': { low: 12, medium: 15, high: 15 },
      'Irrigation': { low: 13, medium: 15, high: 15 }
    };

    const extractLevel = (req) => {
      if (!req) return 'low';
      if (req.includes('Very High')) return 'high';
      if (req.includes('High')) return 'high';
      if (req.includes('Moderate')) return 'medium';
      return 'low';
    };

    const level = extractLevel(waterReq || '');
    const ratings = sourceRating[waterSource] || sourceRating['Rainfall'];
    return ratings[level] || 10;
  }

  /**
   * Score budget feasibility (0-10)
   */
  getBudgetScore(inputs, budget) {
    // Very rough estimate: simple inputs ~1500-3000, moderate ~3000-6000, intensive ~6000+
    const estimatedCost = this.estimateInputCost(inputs);
    
    if (budget >= estimatedCost) {
      return 10; // Budget sufficient
    } else if (budget >= estimatedCost * 0.7) {
      return 7; // Marginal
    } else if (budget >= estimatedCost * 0.5) {
      return 4; // Tight budget
    } else {
      return 1; // Insufficient budget
    }
  }

  /**
   * Estimate input cost based on description
   */
  estimateInputCost(inputs) {
    if (!inputs) return 3000; // Default moderate cost
    
    const costMap = {
      'minimal': 1000,
      'low': 1500,
      'moderate': 3500,
      'intensive': 6000,
      'high': 8000
    };

    const lower = inputs.toLowerCase();
    if (lower.includes('fertilizer') && lower.includes('fungicide')) return 5000;
    if (lower.includes('fungicide') || lower.includes('intensive')) return 4500;
    if (lower.includes('manure') || lower.includes('mulch')) return 2500;
    if (lower.includes('minimal') || lower.includes('low')) return 1500;
    
    return 3000; // Default moderate cost
  }

  /**
   * Score farm size suitability (0-5)
   */
  getFarmSizeScore(cropName, farmSize) {
    // Different crops suit different farm sizes
    const suitability = {
      'Maize': { small: 4, medium: 5, large: 4 },
      'Beans': { small: 5, medium: 5, large: 4 },
      'Rice': { small: 3, medium: 5, large: 5 },
      'Sorghum': { small: 5, medium: 5, large: 4 },
      'Groundnuts': { small: 5, medium: 5, large: 4 },
      'Cassava': { small: 4, medium: 5, large: 5 },
      'Sweet Potatoes': { small: 5, medium: 5, large: 4 },
      'Tomatoes': { small: 5, medium: 4, large: 3 },
      'Soybean': { small: 4, medium: 5, large: 5 },
      'Kales': { small: 5, medium: 4, large: 3 }
    };

    const getSize = (ha) => {
      if (ha < 1) return 'small';
      if (ha < 3) return 'medium';
      return 'large';
    };

    const size = getSize(farmSize);
    const scores = suitability[cropName] || { small: 3, medium: 3, large: 3 };
    return scores[size] || 3;
  }

  /**
   * Get market price for a crop in a specific location
   */
  getMarketPrice(cropName, subCounty) {
    const priceData = this.marketPrices.find(p => p.crop === cropName);
    if (!priceData) return null;

    const key = subCounty.toLowerCase();
    return {
      crop: cropName,
      price: priceData[key] || 0,
      trend: priceData.trend,
      lastUpdated: priceData.lastUpdated
    };
  }

  /**
   * Get soil quality assessment for a location
   */
  getSoilAssessment(subCounty, soilType) {
    const soilData = this.soilData[subCounty.toLowerCase()]?.[soilType.toLowerCase()];
    if (!soilData) return null;

    return {
      location: subCounty,
      soilType: soilType,
      pH: soilData.pH,
      nitrogen: soilData.nitrogen,
      phosphorus: soilData.phosphorus,
      potassium: soilData.potassium,
      organicMatter: soilData.organicMatter,
      assessment: this.assessSoilQuality(soilData)
    };
  }

  /**
   * Assess soil quality based on chemical properties
   */
  assessSoilQuality(soilData) {
    const { pH, nitrogen, phosphorus, potassium, organicMatter } = soilData;
    let quality = 'Good';
    let issues = [];

    if (pH < 6 || pH > 7.5) {
      issues.push(`pH ${pH} (ideal 6.0-7.0) - adjust with lime or sulfur`);
    }
    if (nitrogen < 1.0) {
      issues.push('Low nitrogen - apply manure or fertilizer');
    }
    if (phosphorus < 10) {
      issues.push('Low phosphorus - apply Single Super Phosphate');
    }
    if (potassium < 100) {
      issues.push('Low potassium - apply K fertilizer');
    }
    if (organicMatter < 2.5) {
      issues.push('Low organic matter - add compost or manure');
    }

    if (issues.length > 2) quality = 'Poor';
    else if (issues.length > 0) quality = 'Fair';

    return { quality, issues };
  }

  /**
   * Get comprehensive farm analysis
   */
  analyzeFarm(farmerData, options = {}) {
    if (!farmerData) farmerData = {};
    const recommendationsResult = this.getRecommendations(farmerData, options);
    const soilAssessment = this.getSoilAssessment(farmerData.subCounty || '', farmerData.soilType || '');
    const weather = this.weatherData[(farmerData.subCounty || '').toLowerCase()]?.[(farmerData.season || '').toLowerCase()];

    return {
      recommendations: recommendationsResult.recommendations,
      soilAssessment,
      weather: {
        location: farmerData.subCounty || 'Unknown',
        season: farmerData.season || 'Unknown',
        ...weather
      },
      analysis: {
        budget: farmerData.budget || 0,
        farmSize: farmerData.farmSize || 1,
        waterSource: farmerData.waterSource || 'Unknown',
        suggestions: this.generateSuggestions(farmerData, soilAssessment)
      }
    };
  }

  /**
   * Get farm input recommendations for a specific crop
   */
  getFarmInputRecommendations(cropName, farmSize = 1) {
    const cropInputs = this.cropInputs[cropName];
    if (!cropInputs) {
      return {
        error: `No input recommendations found for ${cropName}`,
        crop: cropName
      };
    }

    const totalInputCost = cropInputs.totalEstimatedCost * farmSize;

    return {
      crop: cropName,
      farmSize: farmSize,
      fertilizers: cropInputs.fertilizers,
      pesticides: cropInputs.pesticides,
      herbicides: cropInputs.herbicides || [],
      soilAmendments: cropInputs.soilAmendments || [],
      tools: cropInputs.tools || [],
      micronutrients: cropInputs.micronutrients || [],
      totalEstimatedCost: cropInputs.totalEstimatedCost,
      totalCostForFarmSize: Math.round(totalInputCost),
      summary: {
        message: `For a ${farmSize} hectare ${cropName} farm, you'll need:`,
        fertilizers: cropInputs.fertilizers.length,
        pesticides: cropInputs.pesticides.length,
        herbicides: (cropInputs.herbicides || []).length,
        soilAmendments: cropInputs.soilAmendments.length,
        tools: cropInputs.tools.length
      }
    };
  }

  /**
   * Get cost breakdown and budget-adjusted recommendations
   */
  getBudgetAdjustedInputs(cropName, budget, farmSize = 1) {
    const fullInputs = this.getFarmInputRecommendations(cropName, farmSize);
    if (fullInputs.error) return fullInputs;

    const requiredCost = fullInputs.totalCostForFarmSize;
    const budgetRatio = budget / requiredCost;

    // Categorize inputs by priority
    const prioritized = {
      essential: [],
      important: [],
      optional: []
    };

    // Fertilizers - always essential
    fullInputs.fertilizers.forEach((fert, idx) => {
      if (idx === 0) {
        prioritized.essential.push(fert); // Base fertilizer is essential
      } else if (idx === 1) {
        prioritized.important.push(fert);
      } else {
        prioritized.optional.push(fert);
      }
    });

    // Fungicides - important for disease prevention
    fullInputs.pesticides.forEach((pest, idx) => {
      if (idx === 0) {
        prioritized.important.push(pest);
      } else {
        prioritized.optional.push(pest);
      }
    });

    // Soil amendments - important
    (fullInputs.soilAmendments || []).forEach((amend, idx) => {
      if (idx === 0) {
        prioritized.important.push(amend);
      } else {
        prioritized.optional.push(amend);
      }
    });

    // Seeds - essential
    (fullInputs.tools || []).forEach((tool) => {
      if (tool.name.includes('Seed') || tool.name.includes('Cuttings') || tool.name.includes('Seedlings')) {
        prioritized.essential.push(tool);
      } else {
        prioritized.optional.push(tool);
      }
    });

    return {
      crop: cropName,
      farmSize,
      budget,
      budgetSufficiency: {
        required: requiredCost,
        available: budget,
        ratio: Math.round(budgetRatio * 100) + '%',
        status: budgetRatio >= 0.9 ? 'Sufficient' : budgetRatio >= 0.6 ? 'Tight' : 'Limited'
      },
      recommendations: {
        essential: prioritized.essential,
        important: prioritized.important,
        optional: prioritized.optional
      },
      costBreakdown: {
        fertilizers: Math.round(fullInputs.fertilizers.reduce((sum, f) => sum + (f.costPerUnit * (farmSize || 1) / 50), 0)),
        pesticides: Math.round(fullInputs.pesticides.reduce((sum, p) => sum + (p.costPerUnit * (farmSize || 1) / 50), 0)),
        soilAmendments: Math.round((fullInputs.soilAmendments || []).reduce((sum, s) => sum + (s.costPerUnit * (farmSize || 1)), 0)),
        tools: Math.round((fullInputs.tools || []).reduce((sum, t) => sum + (t.costPerUnit * (farmSize || 1)), 0))
      }
    };
  }

  /**
   * Get cost-saving recommendations
   */
  getCostSavingTips(budget, farmSize = 1) {
    const tips = [];

    // If budget is tight, recommend specific strategies
    if (budget < 5000 * farmSize) {
      tips.push({
        strategy: 'Group Buying',
        description: 'Join a farmer group and buy inputs together',
        potential_savings: '15-25%',
        contact: 'Visit your sub-county agricultural office'
      });
      tips.push({
        strategy: 'Use Farm Manure',
        description: 'Rely on farmyard manure instead of expensive synthetic fertilizers',
        potential_savings: '30-40%',
        requirement: '10-15 tons/ha available'
      });
    }

    // General tips
    tips.push({
      strategy: 'Organic Pest Control',
      description: 'Use neem oil, soap spray, or companion planting',
      potential_savings: '25-35%',
      benefit: 'Safer for family and environment'
    });

    tips.push({
      strategy: 'Mulching',
      description: 'Use farm waste as mulch instead of buying',
      potential_savings: '20-30%',
      benefit: 'Reduces watering and weeding needs'
    });

    tips.push({
      strategy: 'Seed Saving',
      description: 'Save seeds from good plants for next season',
      potential_savings: '15-25%',
      note: 'Works better for open-pollinated varieties'
    });

    return tips;
  }

  /**
   * Get essential tools checklist
   */
  getEssentialToolsChecklist() {
    return {
      tools: this.essentialTools,
      totalEstimatedCost: this.essentialTools.reduce((sum, tool) => sum + tool.cost, 0),
      message: 'These are basic tools every farmer should have. Buy gradually if budget is limited.',
      purchasePriority: [
        '1. Hand hoe (most important)',
        '2. Knapsack sprayer (for chemical application)',
        '3. Machete/Panga (for clearing)',
        '4. Watering can (for dry season)',
        '5. Measuring equipment (for accurate input application)'
      ]
    };
  }

  /**
   * Soil improvement recommendations based on soil assessment
   */
  getSoilImprovementPlan(subCounty, soilType, cropName) {
    const soilAssessment = this.getSoilAssessment(subCounty, soilType);
    const improvements = {
      subCounty,
      soilType,
      currentQuality: soilAssessment?.assessment?.quality || 'Unknown',
      issues: soilAssessment?.assessment?.issues || [],
      recommendedAmendments: [],
      estimatedCost: 0,
      timeline: '2-3 months before planting'
    };

    if (soilAssessment?.assessment?.issues?.length > 0) {
      const issues = soilAssessment.assessment.issues;

      if (issues.some(i => i.includes('pH'))) {
        if (issues[0].includes('Low')) {
          improvements.recommendedAmendments.push({
            amendment: 'Lime (CaCO3)',
            quantity: '2-3 tons/ha',
            cost: '2400-3600 KSh/ha'
          });
        } else {
          improvements.recommendedAmendments.push({
            amendment: 'Sulfur',
            quantity: '1-2 tons/ha',
            cost: '2000-4000 KSh/ha'
          });
        }
      }

      if (issues.some(i => i.includes('nitrogen'))) {
        improvements.recommendedAmendments.push({
          amendment: 'Farmyard manure or Compost',
          quantity: '10-15 tons/ha',
          cost: '5000-7500 KSh/ha'
        });
      }

      if (issues.some(i => i.includes('organic'))) {
        improvements.recommendedAmendments.push({
          amendment: 'Compost/Green manure',
          quantity: '8-12 tons/ha',
          cost: '4000-7200 KSh/ha'
        });
      }
    } else {
      improvements.message = 'Soil is in good condition. Maintain fertility by adding manure annually.';
    }

    return improvements;
  }

  /**
   * Generate actionable suggestions
   */
  generateSuggestions(farmerData, soilAssessment) {
    const suggestions = [];

    if (soilAssessment?.assessment?.issues?.length > 0) {
      suggestions.push({
        type: 'soil',
        priority: 'high',
        message: 'Address soil issues',
        actions: soilAssessment.assessment.issues
      });
    }

    if (farmerData.budget < 3000) {
      suggestions.push({
        type: 'budget',
        priority: 'medium',
        message: 'Your budget is limited. Focus on crops with low input requirements.',
        actions: ['Consider cassava, sorghum, or beans', 'Explore group buying for inputs']
      });
    }

    if (farmerData.farmSize < 1) {
      suggestions.push({
        type: 'farm-size',
        priority: 'medium',
        message: 'Your farm is small. Optimize with high-value crops.',
        actions: ['Grow tomatoes or leafy vegetables', 'Intercrop with legumes']
      });
    }

    suggestions.push({
      type: 'market',
      priority: 'low',
      message: 'Check current market prices before planting',
      actions: ['Contact local agricultural office', 'Check weekly market reports']
    });

    return suggestions;
  }
}

export default RecommendationEngine;
