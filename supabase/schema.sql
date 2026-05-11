-- SV Booking Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- Hotels table
CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  image TEXT NOT NULL,
  rating DECIMAL(2, 1) DEFAULT 4.5,
  stars INTEGER DEFAULT 4,
  amenities TEXT[] DEFAULT ARRAY['WiFi', 'Pool', 'Restaurant'],
  coordinates JSONB DEFAULT '{"lat": 0, "lng": 0}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_hotels_city ON hotels(city);
CREATE INDEX IF NOT EXISTS idx_hotels_country ON hotels(country);
CREATE INDEX IF NOT EXISTS idx_hotels_name_trgm ON hotels USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_hotels_city_trgm ON hotels USING gin(city gin_trgm_ops);

-- Prices table for caching hotel prices
CREATE TABLE IF NOT EXISTS prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_key TEXT NOT NULL REFERENCES hotels(hotel_key) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  code TEXT NOT NULL,
  rate DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(hotel_key, provider, code, check_in, check_out)
);

-- Create indexes for prices
CREATE INDEX IF NOT EXISTS idx_prices_hotel_key ON prices(hotel_key);
CREATE INDEX IF NOT EXISTS idx_prices_check_dates ON prices(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_prices_provider ON prices(provider);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON hotels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prices_updated_at BEFORE UPDATE ON prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- Allow public read access (adjust as needed for your security requirements)
CREATE POLICY "Public read access to hotels" ON hotels
  FOR SELECT USING (true);

CREATE POLICY "Public read access to prices" ON prices
  FOR SELECT USING (true);

-- Optional: Allow authenticated users to write
-- CREATE POLICY "Authenticated write access to hotels" ON hotels
--   FOR ALL USING (auth.role() = 'authenticated');

-- CREATE POLICY "Authenticated write access to prices" ON prices
--   FOR ALL USING (auth.role() = 'authenticated');
