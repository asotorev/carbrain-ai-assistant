#!/bin/bash

# CarBrain Database Seeding Script
# Populates database with realistic Mexican automotive market data

set -e

echo "Starting CarBrain database seeding..."

# Check if Node.js dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "ERROR: Node.js dependencies not found. Run 'npm install' first."
    exit 1
fi

# Check if database is running
if ! docker-compose exec -T postgres pg_isready -U carbrain_user -d carbrain_db >/dev/null 2>&1; then
    echo "ERROR: PostgreSQL database is not running."
    echo "Please run './scripts/db-setup.sh' first to start the database."
    exit 1
fi

# Parse command line arguments
FORCE_SEED=false
VERIFY_DATA=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE_SEED=true
            shift
            ;;
        --verify)
            VERIFY_DATA=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --force    Clear existing data and re-seed"
            echo "  --verify   Verify data integrity after seeding"
            echo "  --help     Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Seed data (skip if exists)"
            echo "  $0 --force           # Force re-seed (clear first)"
            echo "  $0 --verify          # Seed and verify data"
            echo "  $0 --force --verify  # Force re-seed and verify"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Build seeding command
SEED_CMD="npm run build && node -e \"
const { runSeeding } = require('./dist/infrastructure/database/seeders/seed-runner');
runSeeding({ force: $FORCE_SEED, verify: $VERIFY_DATA });
\""

# Check current vehicle count
CURRENT_COUNT=$(docker-compose exec -T postgres psql -U carbrain_user -d carbrain_db -t -c "SELECT COUNT(*) FROM vehicles;" | tr -d ' ')

if [ "$CURRENT_COUNT" -gt 0 ] && [ "$FORCE_SEED" = false ]; then
    echo "Database already contains $CURRENT_COUNT vehicles."
    echo "Use --force to clear and re-seed data."
    exit 0
fi

# Display seeding information
echo "Database Information:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: carbrain_db"
echo "   Current vehicles: $CURRENT_COUNT"

if [ "$FORCE_SEED" = true ]; then
    echo "   Mode: Force re-seed (will clear existing data)"
else
    echo "   Mode: Normal seed (skip if data exists)"
fi

if [ "$VERIFY_DATA" = true ]; then
    echo "   Verification: Enabled"
fi

echo ""

# Compile TypeScript first
echo "Compiling TypeScript..."
if ! npm run build >/dev/null 2>&1; then
    echo "ERROR: TypeScript compilation failed"
    echo "Please fix compilation errors and try again"
    exit 1
fi

echo "TypeScript compilation successful"

# Run the seeding process
echo "Running database seeding..."

# Create temporary seeding script
TEMP_SCRIPT=$(mktemp)
cat > "$TEMP_SCRIPT" << EOF
const { runSeeding } = require('./dist/infrastructure/database/seeders/seed-runner');

async function seed() {
    try {
        await runSeeding({
            force: $FORCE_SEED,
            verify: $VERIFY_DATA
        });
        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seed();
EOF

# Execute seeding
if node "$TEMP_SCRIPT"; then
    echo "SUCCESS: Database seeding completed!"

    # Show final statistics
    FINAL_COUNT=$(docker-compose exec -T postgres psql -U carbrain_user -d carbrain_db -t -c "SELECT COUNT(*) FROM vehicles;" | tr -d ' ')
    echo "   Total vehicles in database: $FINAL_COUNT"

    # Show sample data
    echo ""
    echo "Sample vehicles:"
    docker-compose exec -T postgres psql -U carbrain_user -d carbrain_db -c "
        SELECT make, model, year,
               CONCAT('\$', TO_CHAR(price, 'FM999,999,999')) as price_mxn,
               condition
        FROM vehicles
        ORDER BY created_at
        LIMIT 5;
    "
else
    echo "ERROR: Database seeding failed"
    exit 1
fi

# Cleanup
rm -f "$TEMP_SCRIPT"

echo ""
echo "Next steps:"
echo "   1. Run 'npm run dev' to start the application"
echo "   2. Use the vehicle search API to test the data"
echo "   3. Check vehicle inventory at http://localhost:3000/api/vehicles"
echo ""