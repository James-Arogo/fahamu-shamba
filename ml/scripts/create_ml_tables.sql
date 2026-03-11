-- ML data foundation tables for Fahamu Shamba (SQLite)

CREATE TABLE IF NOT EXISTS weather_observations (
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
);

CREATE TABLE IF NOT EXISTS soil_samples (
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
);

CREATE TABLE IF NOT EXISTS market_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sub_county TEXT NOT NULL,
  market_center TEXT,
  crop TEXT NOT NULL,
  price_ksh_per_kg REAL NOT NULL,
  trend TEXT DEFAULT 'stable',
  price_date TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'market_api',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS yield_outcomes (
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
);

CREATE INDEX IF NOT EXISTS idx_weather_subcounty_date ON weather_observations(sub_county, observation_date);
CREATE INDEX IF NOT EXISTS idx_weather_source ON weather_observations(source);
CREATE INDEX IF NOT EXISTS idx_soil_subcounty_date ON soil_samples(sub_county, sample_date);
CREATE INDEX IF NOT EXISTS idx_soil_type ON soil_samples(soil_type);
CREATE INDEX IF NOT EXISTS idx_market_subcounty_date ON market_prices(sub_county, price_date);
CREATE INDEX IF NOT EXISTS idx_market_crop_date ON market_prices(crop, price_date);
CREATE INDEX IF NOT EXISTS idx_yield_subcounty_season ON yield_outcomes(sub_county, season);
CREATE INDEX IF NOT EXISTS idx_yield_crop_season ON yield_outcomes(crop, season);
