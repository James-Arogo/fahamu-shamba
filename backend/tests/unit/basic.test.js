/**
 * Basic Unit Tests - Validation & Sanity Checks
 */

describe('Basic Application Tests', () => {
  
  // ===== SANITY CHECKS =====
  describe('Module Loading', () => {
    test('should load recommendation engine', async () => {
      const engine = await import('../../recommendation-engine.js');
      expect(engine).toBeDefined();
      expect(engine.default).toBeDefined();
    });

    test('should load demo data', async () => {
      const demoDataModule = await import('../../demo-data.js');
      const demoData = demoDataModule.default;
      expect(demoData).toBeDefined();
      expect(demoData.cropRules).toBeDefined();
    });
  });

  // ===== DEMO DATA VALIDATION =====
  describe('Demo Data Integrity', () => {
    test('should have valid crop rules', async () => {
      const demoDataModule = await import('../../demo-data.js');
      const { cropRules } = demoDataModule.default;
      
      expect(Array.isArray(cropRules)).toBe(true);
      expect(cropRules.length).toBeGreaterThan(0);
      
      cropRules.forEach(crop => {
        expect(crop.name).toBeDefined();
        expect(crop.conditions).toBeDefined();
        expect(crop.confidence).toBeGreaterThanOrEqual(0);
        expect(crop.confidence).toBeLessThanOrEqual(100);
      });
    });

    test('should have soil data', async () => {
      const demoDataModule = await import('../../demo-data.js');
      const { soilData } = demoDataModule.default;
      
      expect(soilData).toBeDefined();
      Object.values(soilData).forEach(location => {
        expect(location.sandy || location.loam || location.clay).toBeDefined();
      });
    });

    test('should have weather data', async () => {
      const demoDataModule = await import('../../demo-data.js');
      const { weatherData } = demoDataModule.default;
      
      expect(weatherData).toBeDefined();
    });

    test('should have market prices', async () => {
      const demoDataModule = await import('../../demo-data.js');
      const { marketPrices } = demoDataModule.default;
      
      expect(Array.isArray(marketPrices)).toBe(true);
      expect(marketPrices.length).toBeGreaterThan(0);
    });
  });

  // ===== BASIC FUNCTIONALITY =====
  describe('Recommendation Engine Basics', () => {
    let engine;

    beforeEach(async () => {
      const engineClass = await import('../../recommendation-engine.js');
      engine = new engineClass.default();
    });

    test('should return recommendations for valid input', () => {
      const farmData = {
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains',
        budget: 5000,
        farmSize: 2.5,
        waterSource: 'rainfall'
      };

      const result = engine.analyzeFarm(farmData);

      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should rank recommendations by score', () => {
      const farmData = {
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains',
        budget: 5000,
        farmSize: 2.5,
        waterSource: 'rainfall'
      };

      const result = engine.analyzeFarm(farmData);

      for (let i = 0; i < result.recommendations.length - 1; i++) {
        expect(result.recommendations[i].score).toBeGreaterThanOrEqual(
          result.recommendations[i + 1].score
        );
      }
    });

    test('should include soil assessment', () => {
      const farmData = {
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains',
        budget: 5000,
        farmSize: 2.5,
        waterSource: 'rainfall'
      };

      const result = engine.analyzeFarm(farmData);

      expect(result.soilAssessment).toBeDefined();
      expect(result.soilAssessment.pH).toBeDefined();
      expect(result.soilAssessment.nitrogen).toBeDefined();
    });

    test('should generate suggestions', () => {
      const farmData = {
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains',
        budget: 5000,
        farmSize: 2.5,
        waterSource: 'rainfall'
      };

      const result = engine.analyzeFarm(farmData);

      expect(result.analysis.suggestions).toBeDefined();
      expect(Array.isArray(result.analysis.suggestions)).toBe(true);
      expect(result.analysis.suggestions.length).toBeGreaterThan(0);
    });

    test('should handle different soil types', () => {
      const soilTypes = ['sandy', 'loam', 'clay'];

      soilTypes.forEach(soilType => {
        const farmData = {
          subCounty: 'bondo',
          soilType: soilType,
          season: 'long_rains',
          budget: 5000,
          farmSize: 2.5,
          waterSource: 'rainfall'
        };

        const result = engine.analyzeFarm(farmData);

        expect(result.recommendations).toBeDefined();
        expect(result.recommendations.length).toBeGreaterThan(0);
      });
    });

    test('should handle different seasons', () => {
      const seasons = ['long_rains', 'short_rains', 'dry'];

      seasons.forEach(season => {
        const farmData = {
          subCounty: 'bondo',
          soilType: 'loam',
          season: season,
          budget: 5000,
          farmSize: 2.5,
          waterSource: 'rainfall'
        };

        const result = engine.analyzeFarm(farmData);

        expect(result.recommendations).toBeDefined();
        expect(result.recommendations.length).toBeGreaterThan(0);
      });
    });

    test('should handle low budget scenarios', () => {
      const farmData = {
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains',
        budget: 1000,
        farmSize: 0.5,
        waterSource: 'rainfall'
      };

      const result = engine.analyzeFarm(farmData);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    test('should handle high budget scenarios', () => {
      const farmData = {
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains',
        budget: 50000,
        farmSize: 10,
        waterSource: 'irrigation'
      };

      const result = engine.analyzeFarm(farmData);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  // ===== SCORING CONSISTENCY =====
  describe('Scoring Consistency', () => {
    let engine;

    beforeEach(async () => {
      const engineClass = await import('../../recommendation-engine.js');
      engine = new engineClass.default();
    });

    test('should produce consistent scores for same input', () => {
      const farmData = {
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains',
        budget: 5000,
        farmSize: 2.5,
        waterSource: 'rainfall'
      };

      const result1 = engine.analyzeFarm(farmData);
      const result2 = engine.analyzeFarm(farmData);

      expect(result1.recommendations[0].name).toBe(result2.recommendations[0].name);
      expect(result1.recommendations[0].score).toBe(result2.recommendations[0].score);
    });

    test('should score between 0 and 100', () => {
      const farmData = {
        subCounty: 'bondo',
        soilType: 'loam',
        season: 'long_rains',
        budget: 5000,
        farmSize: 2.5,
        waterSource: 'rainfall'
      };

      const result = engine.analyzeFarm(farmData);

      result.recommendations.forEach(rec => {
        expect(rec.score).toBeGreaterThanOrEqual(0);
        expect(rec.score).toBeLessThanOrEqual(100);
      });
    });
  });

  // ===== ERROR HANDLING =====
  describe('Error Handling', () => {
    let engine;

    beforeEach(async () => {
      const engineClass = await import('../../recommendation-engine.js');
      engine = new engineClass.default();
    });

    test('should handle null input gracefully', () => {
      expect(() => {
        engine.analyzeFarm(null);
      }).not.toThrow();
    });

    test('should handle undefined input gracefully', () => {
      expect(() => {
        engine.analyzeFarm(undefined);
      }).not.toThrow();
    });

    test('should handle empty object', () => {
      expect(() => {
        engine.analyzeFarm({});
      }).not.toThrow();
    });

    test('should handle invalid soil type', () => {
      const farmData = {
        subCounty: 'bondo',
        soilType: 'plutonium',
        season: 'long_rains',
        budget: 5000,
        farmSize: 2.5,
        waterSource: 'rainfall'
      };

      expect(() => {
        engine.analyzeFarm(farmData);
      }).not.toThrow();
    });
  });
});
