/**
 * Unit Tests - Recommendation Engine
 * Tests core recommendation scoring and crop analysis logic
 */

let RecommendationEngine;

beforeAll(async () => {
  const module = await import('../../recommendation-engine.js');
  RecommendationEngine = module.default;
});

describe('RecommendationEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new RecommendationEngine();
  });

  // ===== CROP SCORING TESTS =====
  describe('calculateCropScore()', () => {
    test('should return score between 0 and 100', () => {
      const farmerData = {
        soilType: 'loam',
        season: 'long_rains',
        subCounty: 'bondo',
        budget: 5000,
        farmSize: 2.5,
        waterSource: 'rainfall'
      };

      const rule = {
        name: 'Maize',
        conditions: { soil: 'loam', season: 'long_rains', subcounty: 'bondo' },
        confidence: 85
      };

      const score = engine.calculateCropScore(rule, farmerData);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should score highest when all conditions match', () => {
      const farmerData = {
        soilType: 'loam',
        season: 'long_rains',
        subCounty: 'bondo',
        budget: 5000,
        farmSize: 2.5,
        waterSource: 'rainfall'
      };

      const matchingRule = {
        name: 'Maize',
        conditions: { soil: 'loam', season: 'long_rains', subcounty: 'bondo' }
      };

      const nonMatchingRule = {
        name: 'Rice',
        conditions: { soil: 'clay', season: 'dry', subcounty: 'alego' }
      };

      const matchingScore = engine.calculateCropScore(matchingRule, farmerData);
      const nonMatchingScore = engine.calculateCropScore(nonMatchingRule, farmerData);

      expect(matchingScore).toBeGreaterThan(nonMatchingScore);
    });

    test('should penalize insufficient budget', () => {
      const lowBudgetData = {
        soilType: 'loam',
        season: 'long_rains',
        subCounty: 'bondo',
        budget: 1000,
        farmSize: 0.5,
        waterSource: 'rainfall'
      };

      const highBudgetData = {
        soilType: 'loam',
        season: 'long_rains',
        subCounty: 'bondo',
        budget: 8000,
        farmSize: 3,
        waterSource: 'rainfall'
      };

      const rule = {
        name: 'Maize',
        conditions: { soil: 'loam', season: 'long_rains', subcounty: 'bondo' }
      };

      const lowScore = engine.calculateCropScore(rule, lowBudgetData);
      const highScore = engine.calculateCropScore(rule, highBudgetData);

      // Higher budget should not result in lower score
      expect(highScore).toBeGreaterThanOrEqual(lowScore);
    });

    test('should handle missing data gracefully', () => {
      const incompleteData = {
        soilType: 'loam',
        season: 'long_rains'
        // Missing subCounty, budget, farmSize
      };

      const rule = {
        name: 'Maize',
        conditions: { soil: 'loam', season: 'long_rains', subcounty: 'bondo' }
      };

      expect(() => {
        engine.calculateCropScore(rule, incompleteData);
      }).not.toThrow();

      const score = engine.calculateCropScore(rule, incompleteData);
      expect(typeof score).toBe('number');
    });
  });

  // ===== WATER COMPATIBILITY TESTS =====
  describe('getWaterCompatibilityScore()', () => {
    test('should score high when water requirements match', () => {
      const waterReq = 'High (600-800mm)';
      const waterSource = 'rainfall';

      const score = engine.getWaterCompatibilityScore(waterReq, waterSource);
      expect(score).toBeGreaterThan(0);
    });

    test('should handle drought conditions', () => {
      const waterSource = 'rainfall';

      const droughtTolerantReq = 'Low-Medium (300-500mm)';
      const waterHeavyReq = 'High (800-1200mm)';

      const droughtScore = engine.getWaterCompatibilityScore(droughtTolerantReq, waterSource);
      const waterScore = engine.getWaterCompatibilityScore(waterHeavyReq, waterSource);

      expect(droughtScore).toBeGreaterThanOrEqual(waterScore);
    });

    test('should prioritize guaranteed water sources', () => {
      const waterReq = 'High (600-800mm)';

      const irrigationScore = engine.getWaterCompatibilityScore(waterReq, 'irrigation');
      const rainfallScore = engine.getWaterCompatibilityScore(waterReq, 'rainfall');

      expect(irrigationScore).toBeGreaterThanOrEqual(rainfallScore);
    });
  });

  // ===== BUDGET FEASIBILITY TESTS =====
  describe('getBudgetScore()', () => {
    test('should return higher score for adequate budget', () => {
      const inputs = 'NPK 17:17:17, improved seed, mulching';
      const adequateBudget = 5000;
      const lowBudget = 1500;

      const adequateScore = engine.getBudgetScore(inputs, adequateBudget);
      const lowScore = engine.getBudgetScore(inputs, lowBudget);

      expect(adequateScore).toBeGreaterThan(lowScore);
    });

    test('should handle zero budget', () => {
      const inputs = 'fertilizer and fungicide';
      const budget = 0;

      const score = engine.getBudgetScore(inputs, budget);
      expect(score).toBeLessThanOrEqual(10); // Should be very low
    });

    test('should not penalize excess budget', () => {
      const inputs = 'manure and mulching';
      const smallBudget = 5000;
      const largeBudget = 20000;

      const smallScore = engine.getBudgetScore(inputs, smallBudget);
      const largeScore = engine.getBudgetScore(inputs, largeBudget);

      // Excess budget shouldn't dramatically increase score
      expect(largeScore - smallScore).toBeLessThanOrEqual(10);
    });
  });

  // ===== SOIL ASSESSMENT TESTS =====
  describe('getSoilAssessment()', () => {
    test('should identify soil nutrient issues', () => {
      const assessment = engine.getSoilAssessment('bondo', 'sandy');

      expect(assessment).toBeDefined();
      expect(assessment.pH).toBeDefined();
      expect(assessment.nitrogen).toBeDefined();
      expect(assessment.phosphorus).toBeDefined();
    });

    test('should provide improvement recommendations', () => {
      const assessment = engine.getSoilAssessment('ugunja', 'sandy');

      expect(assessment).not.toBeNull();
      expect(assessment.assessment).toBeDefined();
      expect(assessment.assessment.issues).toBeDefined();
      expect(Array.isArray(assessment.assessment.issues)).toBe(true);
    });

    test('should differentiate between soil types', () => {
      const sandyAssessment = engine.getSoilAssessment('bondo', 'sandy');
      const clayAssessment = engine.getSoilAssessment('bondo', 'clay');
      const loamAssessment = engine.getSoilAssessment('bondo', 'loam');

      // They should have different properties
      expect(sandyAssessment).not.toEqual(clayAssessment);
      expect(clayAssessment).not.toEqual(loamAssessment);
    });
  });

  // ===== FARM ANALYSIS TESTS =====
  describe('analyzeFarm()', () => {
    test('should return recommendations array', () => {
      const farmerData = {
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains',
        budget: 5000,
        farmSize: 2.5,
        waterSource: 'rainfall'
      };

      const analysis = engine.analyzeFarm(farmerData);

      expect(analysis.recommendations).toBeDefined();
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });

    test('should return top 3 recommendations', () => {
      const farmerData = {
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains',
        budget: 5000,
        farmSize: 2.5,
        waterSource: 'rainfall'
      };

      const analysis = engine.analyzeFarm(farmerData);

      expect(analysis.recommendations.length).toBeLessThanOrEqual(3);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    test('should include soil and weather analysis', () => {
      const farmerData = {
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains',
        budget: 5000,
        farmSize: 2.5,
        waterSource: 'rainfall'
      };

      const analysis = engine.analyzeFarm(farmerData);

      expect(analysis.soilAssessment).toBeDefined();
      expect(analysis.weather).toBeDefined();
    });

    test('should generate farm-specific suggestions', () => {
      const farmerData = {
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains',
        budget: 5000,
        farmSize: 2.5,
        waterSource: 'rainfall'
      };

      const analysis = engine.analyzeFarm(farmerData);

      expect(analysis.analysis.suggestions).toBeDefined();
      expect(Array.isArray(analysis.analysis.suggestions)).toBe(true);
      expect(analysis.analysis.suggestions.length).toBeGreaterThan(0);
    });

    test('should handle edge case: very small farm', () => {
      const smallFarmData = {
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains',
        budget: 1000,
        farmSize: 0.25, // Very small
        waterSource: 'rainfall'
      };

      const analysis = engine.analyzeFarm(smallFarmData);

      expect(analysis.recommendations).toBeDefined();
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      // Small farms should get intensive crop recommendations
    });

    test('should handle edge case: very large farm', () => {
      const largeFarmData = {
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains',
        budget: 50000,
        farmSize: 10, // Very large
        waterSource: 'irrigation'
      };

      const analysis = engine.analyzeFarm(largeFarmData);

      expect(analysis.recommendations).toBeDefined();
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      // Large farms should get mechanizable crop recommendations
    });
  });

  // ===== SUGGESTIONS GENERATION TESTS =====
  describe('generateSuggestions()', () => {
    test('should generate actionable suggestions', () => {
      const farmerData = {
        subCounty: 'bondo',
        soilType: 'sandy',
        season: 'long_rains',
        budget: 3000,
        farmSize: 1.5,
        waterSource: 'rainfall'
      };

      const suggestions = engine.generateSuggestions(farmerData);

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      suggestions.forEach(suggestion => {
        expect(typeof suggestion).toBe('object');
        expect(suggestion.message || suggestion.type).toBeDefined();
      });
    });

    test('should provide budget-specific suggestions', () => {
      const lowBudgetData = {
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains',
        budget: 2000,
        farmSize: 1.5,
        waterSource: 'rainfall'
      };

      const suggestions = engine.generateSuggestions(lowBudgetData);
      const suggestionText = suggestions.map(s => (s.message || s.type || '')).join(' ').toLowerCase();

      expect(suggestionText).toContain('budget');
    });

    test('should address soil-specific issues', () => {
      const sandySoilData = {
        subCounty: 'bondo',
        soilType: 'sandy',
        season: 'long_rains',
        budget: 5000,
        farmSize: 2,
        waterSource: 'rainfall'
      };

      const suggestions = engine.generateSuggestions(sandySoilData);
      const suggestionText = suggestions.map(s => (s.message || s.type || '')).join(' ').toLowerCase();

      expect(suggestionText).toMatch(/soil|sand|market|farm/);
    });
  });

  // ===== RECOMMENDATION CONSISTENCY TESTS =====
  describe('Recommendation Consistency', () => {
    test('should produce consistent recommendations for same input', () => {
      const farmerData = {
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains',
        budget: 5000,
        farmSize: 2.5,
        waterSource: 'rainfall'
      };

      const analysis1 = engine.analyzeFarm(farmerData);
      const analysis2 = engine.analyzeFarm(farmerData);

      expect(analysis1.recommendations[0].name).toBe(analysis2.recommendations[0].name);
      expect(analysis1.recommendations[0].score).toBe(analysis2.recommendations[0].score);
    });

    test('should rank recommendations by score (descending)', () => {
      const farmerData = {
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains',
        budget: 5000,
        farmSize: 2.5,
        waterSource: 'rainfall'
      };

      const analysis = engine.analyzeFarm(farmerData);

      for (let i = 0; i < analysis.recommendations.length - 1; i++) {
        expect(analysis.recommendations[i].score).toBeGreaterThanOrEqual(
          analysis.recommendations[i + 1].score
        );
      }
    });

    test('should not have null or undefined scores', () => {
      const farmerData = {
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains',
        budget: 5000,
        farmSize: 2.5,
        waterSource: 'rainfall'
      };

      const analysis = engine.analyzeFarm(farmerData);

      analysis.recommendations.forEach(rec => {
        expect(rec.score).not.toBeNull();
        expect(rec.score).not.toBeUndefined();
        expect(typeof rec.score).toBe('number');
      });
    });
  });

  // ===== ERROR HANDLING TESTS =====
  describe('Error Handling', () => {
    test('should handle null farmer data', () => {
      expect(() => {
        engine.analyzeFarm(null);
      }).not.toThrow();
    });

    test('should handle undefined farmer data', () => {
      expect(() => {
        engine.analyzeFarm(undefined);
      }).not.toThrow();
    });

    test('should handle empty object', () => {
      expect(() => {
        engine.analyzeFarm({});
      }).not.toThrow();
    });

    test('should handle invalid soil types', () => {
      const invalidData = {
        soilType: 'plutonium', // Invalid
        subCounty: 'bondo',
        season: 'long_rains',
        budget: 5000,
        farmSize: 2.5,
        waterSource: 'rainfall'
      };

      expect(() => {
        engine.analyzeFarm(invalidData);
      }).not.toThrow();
    });
  });
});
