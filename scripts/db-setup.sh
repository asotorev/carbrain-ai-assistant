#!/bin/bash

# CarBrain Database Setup Script
# This script sets up the PostgreSQL database for local development

set -e

echo "Starting CarBrain database setup..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "ERROR: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down --volumes

# Build and start containers
echo "Building and starting database containers..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
timeout=60
counter=0

while ! docker-compose exec -T postgres pg_isready -U carbrain_user -d carbrain_db >/dev/null 2>&1; do
    if [ $counter -eq $timeout ]; then
        echo "ERROR: Timeout waiting for PostgreSQL to be ready"
        docker-compose logs postgres
        exit 1
    fi
    echo "   PostgreSQL is not ready yet... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 2))
done

echo "SUCCESS: PostgreSQL is ready!"

# Verify database setup
echo "Verifying database setup..."
if docker-compose exec -T postgres psql -U carbrain_user -d carbrain_db -c "SELECT 'Database setup verified' as status;" >/dev/null 2>&1; then
    echo "SUCCESS: Database verification successful!"
else
    echo "ERROR: Database verification failed"
    exit 1
fi

# Show database info
echo "Database Information:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: carbrain_db"
echo "   User: carbrain_user"

# Show table count
TABLE_COUNT=$(docker-compose exec -T postgres psql -U carbrain_user -d carbrain_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
echo "   Tables created: $TABLE_COUNT"

echo "SUCCESS: CarBrain database setup completed successfully!"
echo ""
echo "Next steps:"
echo "   1. Run 'npm run dev' to start the application"
echo "   2. Visit http://localhost:3000/health to verify the server"
echo "   3. Use 'docker-compose logs postgres' to view database logs"
echo ""