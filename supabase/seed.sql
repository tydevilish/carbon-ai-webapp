-- ========================================
-- CarbonLens AI — Database Schema
-- Run this in Supabase SQL Editor
-- ========================================

-- 1. Carbon Emissions (daily aggregate)
CREATE TABLE IF NOT EXISTS carbon_emissions (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_type VARCHAR(50) NOT NULL, -- 'vehicle', 'electricity', 'water', 'waste'
  amount_kg DECIMAL(10, 2) NOT NULL DEFAULT 0,
  cost_baht DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Vehicle Entries
CREATE TABLE IF NOT EXISTS vehicle_entries (
  id BIGSERIAL PRIMARY KEY,
  plate_number VARCHAR(20),
  vehicle_type VARCHAR(30) NOT NULL, -- 'car', 'truck', 'bus', 'van', 'motorbike', 'threewheel'
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  camera_id INT DEFAULT 1,
  carbon_kg DECIMAL(10, 2) NOT NULL DEFAULT 0,
  direction VARCHAR(10) DEFAULT 'entry', -- 'entry' or 'exit'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Energy Usage (daily)
CREATE TABLE IF NOT EXISTS energy_usage (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  electricity_kwh DECIMAL(10, 2) DEFAULT 0,
  water_m3 DECIMAL(10, 2) DEFAULT 0,
  waste_kg DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Detection Logs (from camera AI)
CREATE TABLE IF NOT EXISTS detection_logs (
  id BIGSERIAL PRIMARY KEY,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  object_type VARCHAR(30) NOT NULL, -- 'person', 'vehicle', 'clothing'
  object_class VARCHAR(30) NOT NULL, -- specific class name
  carbon_kg DECIMAL(10, 2) DEFAULT 0,
  track_id INT,
  camera_id INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Cameras
CREATE TABLE IF NOT EXISTS cameras (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(200),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'maintenance'
  stream_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Indexes for performance
-- ========================================
CREATE INDEX IF NOT EXISTS idx_emissions_date ON carbon_emissions(date);
CREATE INDEX IF NOT EXISTS idx_emissions_source ON carbon_emissions(source_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_detected ON vehicle_entries(detected_at);
CREATE INDEX IF NOT EXISTS idx_energy_date ON energy_usage(date);
CREATE INDEX IF NOT EXISTS idx_detection_detected ON detection_logs(detected_at);

-- ========================================
-- Row Level Security (optional — enable as needed)
-- ========================================
ALTER TABLE carbon_emissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE detection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;

-- Allow read access for anon users (adjust as needed)
CREATE POLICY "Allow read access" ON carbon_emissions FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON vehicle_entries FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON energy_usage FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON detection_logs FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON cameras FOR SELECT USING (true);

-- Allow insert for anon (for camera detection logging)
CREATE POLICY "Allow insert" ON detection_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON vehicle_entries FOR INSERT WITH CHECK (true);

-- ========================================
-- Seed Data (30 days of mock data)
-- ========================================

-- Camera
INSERT INTO cameras (name, location, status) VALUES
  ('Gate 1 Camera', 'Main Entrance', 'active'),
  ('Gate 2 Camera', 'Side Entrance', 'active'),
  ('Parking Camera', 'Parking Lot A', 'active');

-- Energy Usage (last 30 days)
INSERT INTO energy_usage (date, electricity_kwh, water_m3, waste_kg)
SELECT 
  CURRENT_DATE - (generate_series || ' days')::INTERVAL,
  380 + FLOOR(RANDOM() * 340),
  80 + FLOOR(RANDOM() * 170),
  25 + FLOOR(RANDOM() * 50)
FROM generate_series(0, 29);

-- Vehicle Entries (sample data)
INSERT INTO vehicle_entries (plate_number, vehicle_type, detected_at, camera_id, carbon_kg, direction)
VALUES
  ('ABC 1234', 'car', NOW() - INTERVAL '2 hours', 1, 1.05, 'entry'),
  ('DEF-5678', 'van', NOW() - INTERVAL '3 hours', 1, 1.35, 'entry'),
  ('GHI 9101', 'truck', NOW() - INTERVAL '4 hours', 2, 3.10, 'entry'),
  ('JKL 2345', 'motorbike', NOW() - INTERVAL '5 hours', 1, 0.36, 'entry'),
  ('MNO 6789', 'car', NOW() - INTERVAL '6 hours', 2, 1.05, 'entry'),
  ('PQR 1122', 'bus', NOW() - INTERVAL '7 hours', 1, 0.45, 'entry'),
  ('STU 3344', 'car', NOW() - INTERVAL '8 hours', 1, 1.05, 'exit'),
  ('VWX 5566', 'threewheel', NOW() - INTERVAL '9 hours', 2, 0.75, 'entry'),
  ('YZA 7788', 'van', NOW() - INTERVAL '10 hours', 1, 1.35, 'exit'),
  ('BCD 9900', 'motorbike', NOW() - INTERVAL '11 hours', 1, 0.36, 'entry');

-- Carbon Emissions (last 30 days, by source)
INSERT INTO carbon_emissions (date, source_type, amount_kg, cost_baht)
SELECT 
  CURRENT_DATE - (d || ' days')::INTERVAL,
  source,
  CASE source
    WHEN 'electricity' THEN 150 + FLOOR(RANDOM() * 100)
    WHEN 'water' THEN 8 + FLOOR(RANDOM() * 12)
    WHEN 'waste' THEN 15 + FLOOR(RANDOM() * 15)
    WHEN 'vehicle' THEN 50 + FLOOR(RANDOM() * 100)
  END,
  CASE source
    WHEN 'electricity' THEN 1500 + FLOOR(RANDOM() * 1000)
    WHEN 'water' THEN 200 + FLOOR(RANDOM() * 300)
    WHEN 'waste' THEN 50 + FLOOR(RANDOM() * 50)
    WHEN 'vehicle' THEN 0
  END
FROM generate_series(0, 29) AS d,
     (VALUES ('electricity'), ('water'), ('waste'), ('vehicle')) AS sources(source);
