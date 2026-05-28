-- ============================================================
-- AGRIMAPS DATABASE SCHEMA
-- PostgreSQL 15+
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('da_field', 'da_monitoring', 'admin');

CREATE TYPE submission_status AS ENUM ('pending', 'validated', 'rejected', 'flagged');

CREATE TYPE forecast_model_type AS ENUM ('ARIMA', 'SARIMA');

CREATE TYPE commodity_category AS ENUM (
  'rice', 'vegetables', 'spices', 'fish',
  'meat_poultry', 'fruits', 'sugar_oil', 'other'
);

CREATE TYPE price_deviation_level AS ENUM (
  'significantly_below', 'below_average',
  'average', 'above_average', 'significantly_above'
);

-- ============================================================
-- TABLES
-- ============================================================

-- Users (DA personnel only — vendors/consumers are unauthenticated)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'da_field',
    assigned_market_id UUID,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NCR Public Markets (31 DA-monitored markets)
CREATE TABLE markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    market_name VARCHAR(255) NOT NULL,
    market_code VARCHAR(20) UNIQUE NOT NULL,
    city VARCHAR(100) NOT NULL,
    region VARCHAR(50) DEFAULT 'NCR',
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    geom GEOMETRY (Point, 4326),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    da_monitoring BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_markets_city ON markets (city);

CREATE INDEX idx_markets_geom ON markets USING GIST (geom);

-- Commodity Taxonomy
CREATE TABLE commodities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    commodity_name VARCHAR(255) NOT NULL,
    canonical_name VARCHAR(255) NOT NULL,
    category commodity_category NOT NULL,
    subcategory VARCHAR(100),
    unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'per_kg',
    is_imported BOOLEAN DEFAULT false,
    is_forecastable BOOLEAN DEFAULT false,
    data_start_year INTEGER,
    fill_rate DECIMAL(5, 2),
    coefficient_of_variation DECIMAL(6, 2),
    da_taxonomy_version VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commodities_category ON commodities (category);

CREATE INDEX idx_commodities_canonical ON commodities (canonical_name);

-- Historical Prices (Bantay Presyo 2020–2025 weekly averages)
CREATE TABLE historical_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    commodity_id UUID NOT NULL REFERENCES commodities (id),
    market_id UUID REFERENCES markets (id),
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    retail_price DECIMAL(10, 2),
    is_imputed BOOLEAN DEFAULT false,
    is_outlier BOOLEAN DEFAULT false,
    data_source VARCHAR(50) DEFAULT 'bantay_presyo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (
        commodity_id,
        market_id,
        week_start_date
    )
);

CREATE INDEX idx_prices_commodity_week ON historical_prices (commodity_id, week_start_date);

CREATE INDEX idx_prices_year_week ON historical_prices (year, week_number);

CREATE INDEX idx_prices_market ON historical_prices (market_id);

-- Field Submissions (digital replacement of pen-and-paper)
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    submitted_by UUID NOT NULL REFERENCES users (id),
    market_id UUID NOT NULL REFERENCES markets (id),
    submission_date DATE NOT NULL,
    submission_time TIMESTAMPTZ NOT NULL,
    status submission_status DEFAULT 'pending',
    validated_by UUID REFERENCES users (id),
    validated_at TIMESTAMPTZ,
    rejection_reason TEXT,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submissions_field_user ON submissions (submitted_by, submission_date);

CREATE INDEX idx_submissions_market ON submissions (market_id, submission_date);

CREATE INDEX idx_submissions_status ON submissions (status);

-- Submission Line Items (individual commodity prices within a submission)
CREATE TABLE submission_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    submission_id UUID NOT NULL REFERENCES submissions (id) ON DELETE CASCADE,
    commodity_id UUID NOT NULL REFERENCES commodities (id),
    retail_price DECIMAL(10, 2) NOT NULL,
    price_deviation price_deviation_level,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submission_items_commodity ON submission_items (commodity_id);

-- Forecast Results
CREATE TABLE forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    commodity_id UUID NOT NULL REFERENCES commodities (id),
    model_type forecast_model_type NOT NULL,
    model_parameters JSONB NOT NULL,
    forecast_horizon INTEGER NOT NULL, -- 4 or 13 weeks
    forecast_values JSONB NOT NULL, -- [{week, predicted_price, lower_ci, upper_ci}]
    confidence_level DECIMAL(3, 2) DEFAULT 0.95,
    rmse DECIMAL(10, 4),
    mae DECIMAL(10, 4),
    mape DECIMAL(6, 2),
    aic DECIMAL(10, 4),
    bic DECIMAL(10, 4),
    is_low_confidence BOOLEAN DEFAULT false,
    confidence_reason TEXT,
    training_data_start DATE NOT NULL,
    training_data_end DATE NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL,
    generated_by UUID REFERENCES users (id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_forecasts_commodity ON forecasts (
    commodity_id,
    generated_at DESC
);

CREATE INDEX idx_forecasts_model ON forecasts (model_type);

-- Forecast Validation Results (walk-forward)
CREATE TABLE forecast_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    forecast_id UUID NOT NULL REFERENCES forecasts (id),
    validation_week DATE NOT NULL,
    actual_price DECIMAL(10, 2),
    predicted_price DECIMAL(10, 2),
    error DECIMAL(10, 4),
    absolute_error DECIMAL(10, 4),
    percentage_error DECIMAL(6, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID REFERENCES users (id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs (user_id, created_at DESC);

CREATE INDEX idx_audit_action ON audit_logs (action, created_at DESC);

-- Commodity Name Canonicalization Map
CREATE TABLE commodity_name_map (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    raw_name VARCHAR(255) NOT NULL,
    canonical_id UUID NOT NULL REFERENCES commodities (id),
    source_year INTEGER,
    source_context VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_name_map_raw ON commodity_name_map (raw_name);

-- Collection Progress Tracking
CREATE VIEW collection_progress AS
SELECT
  s.submission_date,
  s.market_id,
  m.market_name,
  m.city,
  s.status,
  COUNT(si.id) AS items_submitted,
  (SELECT COUNT(*) FROM commodities WHERE is_forecastable = true) AS total_commodity_count,
  ROUND(
    COUNT(si.id)::DECIMAL /
    NULLIF((SELECT COUNT(*) FROM commodities WHERE is_forecastable = true), 0) * 100,
    1
  ) AS completion_percentage
FROM submissions s
JOIN markets m ON s.market_id = m.id
LEFT JOIN submission_items si ON s.id = si.submission_id
GROUP BY s.submission_date, s.market_id, m.market_name, m.city, s.status;

-- Market Coverage View
CREATE VIEW market_coverage AS
SELECT
    m.id AS market_id,
    m.market_name,
    m.city,
    COUNT(DISTINCT s.submission_date) AS days_reported,
    MAX(s.submission_date) AS last_submission_date,
    COUNT(DISTINCT si.commodity_id) AS commodities_reported
FROM
    markets m
    LEFT JOIN submissions s ON m.id = s.market_id
    AND s.status = 'validated'
    LEFT JOIN submission_items si ON s.id = si.submission_id
WHERE
    m.da_monitoring = true
GROUP BY
    m.id,
    m.market_name,
    m.city;