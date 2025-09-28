-- CarBrain AI Assistant Database Initialization
-- This script sets up the initial database schema for the automotive sales platform
-- Follows Clean Architecture domain models with proper constraints and indexes

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID generation functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- Cryptographic functions for security

-- Create tables following Clean Architecture domain models

-- Locations table (for dealerships, customers, service centers)
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(2) DEFAULT 'MX' CHECK (country IN ('MX', 'US')),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    type VARCHAR(50) DEFAULT 'dealership' CHECK (type IN ('dealership', 'customer', 'service_center')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle specifications table
CREATE TABLE vehicle_specifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engine VARCHAR(100) NOT NULL,
    transmission VARCHAR(20) CHECK (transmission IN ('manual', 'automatic', 'cvt')),
    fuel_type VARCHAR(20) CHECK (fuel_type IN ('gasoline', 'diesel', 'hybrid', 'electric')),
    drivetrain VARCHAR(10) CHECK (drivetrain IN ('fwd', 'rwd', 'awd', '4wd')),
    doors INTEGER CHECK (doors BETWEEN 2 AND 5),
    seats INTEGER CHECK (seats BETWEEN 2 AND 8),
    safety_features JSONB DEFAULT '[]'::jsonb,
    tech_features JSONB DEFAULT '[]'::jsonb,
    comfort_features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    make VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1990 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    mileage INTEGER NOT NULL CHECK (mileage >= 0),
    condition VARCHAR(20) CHECK (condition IN ('new', 'certified_pre_owned', 'used', 'salvage')),
    vin VARCHAR(17) UNIQUE NOT NULL,
    color VARCHAR(50) NOT NULL,
    is_available BOOLEAN DEFAULT true,
    images JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    specification_id UUID REFERENCES vehicle_specifications(id),
    location_id UUID REFERENCES locations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    language VARCHAR(2) DEFAULT 'es' CHECK (language IN ('es', 'en')),
    budget_min DECIMAL(12, 2) CHECK (budget_min >= 0),
    budget_max DECIMAL(12, 2) CHECK (budget_max >= budget_min),
    budget_currency VARCHAR(3) DEFAULT 'MXN' CHECK (budget_currency IN ('MXN', 'USD')),
    monthly_budget DECIMAL(10, 2),
    preferences JSONB DEFAULT '{}'::jsonb,
    contact_preferences JSONB DEFAULT '[]'::jsonb,
    has_test_driven BOOLEAN DEFAULT false,
    is_financing_pre_approved BOOLEAN DEFAULT false,
    credit_score INTEGER CHECK (credit_score BETWEEN 300 AND 850),
    trade_in_vehicle VARCHAR(255),
    notes TEXT,
    source VARCHAR(20) DEFAULT 'website' CHECK (source IN ('website', 'referral', 'advertising', 'walk_in', 'phone')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Leads table
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    vehicle_of_interest_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    stage VARCHAR(20) DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'qualified', 'demo_scheduled', 'demo_completed', 'negotiating', 'closed_won', 'closed_lost')),
    score INTEGER DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
    qualification JSONB DEFAULT '{}'::jsonb,
    assigned_agent VARCHAR(100),
    last_contact_date TIMESTAMP WITH TIME ZONE,
    next_follow_up_date TIMESTAMP WITH TIME ZONE,
    source VARCHAR(20) CHECK (source IN ('website_chat', 'vehicle_inquiry', 'phone_call', 'walk_in', 'referral', 'advertising')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    tags JSONB DEFAULT '[]'::jsonb,
    notes JSONB DEFAULT '[]'::jsonb,
    estimated_close_date DATE,
    estimated_value DECIMAL(12, 2) CHECK (estimated_value >= 0),
    lost_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    type VARCHAR(30) CHECK (type IN ('test_drive', 'vehicle_inspection', 'financing_meeting', 'delivery', 'service_consultation')),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    estimated_duration INTEGER DEFAULT 60 CHECK (estimated_duration BETWEEN 15 AND 480),
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    location_id UUID REFERENCES locations(id),
    agent_id VARCHAR(100),
    notes TEXT,
    preparation_items JSONB DEFAULT '[]'::jsonb,
    follow_up_required BOOLEAN DEFAULT false,
    customer_confirmed BOOLEAN DEFAULT false,
    reminder_sent BOOLEAN DEFAULT false,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    next_steps JSONB DEFAULT '[]'::jsonb,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_vehicles_make_model ON vehicles(make, model);
CREATE INDEX idx_vehicles_year_price ON vehicles(year, price);
CREATE INDEX idx_vehicles_available ON vehicles(is_available) WHERE is_available = true;
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_leads_customer_stage ON leads(customer_id, stage);
CREATE INDEX idx_leads_score ON leads(score DESC);
CREATE INDEX idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);

-- Create trigger to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial location (main dealership)
INSERT INTO locations (address, city, state, postal_code, country, type) VALUES
('Av. Revolución 1234', 'Ciudad de México', 'CDMX', '01000', 'MX', 'dealership');

-- Database setup completed
SELECT 'CarBrain database initialized successfully' AS status;