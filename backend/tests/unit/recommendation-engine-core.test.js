import RecommendationEngine from '../../recommendation-engine.js';

describe('RecommendationEngine core behavior', () => {
  let engine;

  beforeEach(() => {
    engine = new RecommendationEngine();
  });

  test('returns top 3 recommendations with deterministic ordering', () => {
    const input = {
      subCounty: 'bondo',
      soilType: 'loam',
      season: 'long_rains',
      budget: 5000,
      farmSize: 2,
      waterSource: 'Rainfall'
    };

    const resultA = engine.getRecommendations(input);
    const resultB = engine.getRecommendations(input);

    expect(resultA.recommendations.length).toBeLessThanOrEqual(3);
    expect(resultA.recommendations.length).toBeGreaterThan(0);
    expect(resultA.recommendations[0].name).toBe(resultB.recommendations[0].name);
    expect(resultA.recommendations[0].score).toBe(resultB.recommendations[0].score);
  });

  test('falls back when required context is missing', () => {
    const result = engine.getRecommendations({
      soilType: 'loam'
    });

    expect(result.insufficientData).toBe(true);
    expect(result.fallbackReason).toBeDefined();
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});
