#!/bin/bash

# Database migration runner script
# Executes SQL migration files against the PostgreSQL database

set -e

# Check if migration file provided
if [ -z "$1" ]; then
    echo "ERROR: No migration file specified"
    echo "Usage: ./scripts/run-migration.sh <migration-file.sql>"
    exit 1
fi

MIGRATION_FILE="$1"

# Check if file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "ERROR: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

# Check if database is running
if ! docker-compose exec -T postgres pg_isready -U carbrain_user -d carbrain_ai >/dev/null 2>&1; then
    echo "ERROR: PostgreSQL database is not running."
    echo "Please run './scripts/db-setup.sh' first to start the database."
    exit 1
fi

echo "Running migration: $MIGRATION_FILE"
echo "Database: carbrain_ai"
echo ""

# Execute migration
if docker-compose exec -T postgres psql -U carbrain_user -d carbrain_ai < "$MIGRATION_FILE"; then
    echo ""
    echo "SUCCESS: Migration completed successfully!"
else
    echo ""
    echo "ERROR: Migration failed"
    exit 1
fi
