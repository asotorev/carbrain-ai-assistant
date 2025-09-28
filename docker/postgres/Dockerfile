# Custom PostgreSQL container for CarBrain AI Assistant
# Extends official PostgreSQL with automotive-specific configurations

# Base image: PostgreSQL 15 on Alpine Linux (lightweight)
FROM postgres:15-alpine  

# Install extensions for vector similarity search (future AI features)
# Alpine package manager, don't cache packages
# C compiler and build tools for extensions
# PostgreSQL development headers for custom extensions
RUN apk add --no-cache \  
    build-base \           
    postgresql-dev         

# Set locale for proper text handling in Spanish/English
# System language for Spanish market
# Text sorting rules for Spanish characters
# Character classification for Spanish text
ENV LANG es_ES.UTF-8      
ENV LC_COLLATE es_ES.UTF-8  
ENV LC_CTYPE es_ES.UTF-8    

# Copy custom configuration if needed (commented out for now)
# COPY postgresql.conf /etc/postgresql/postgresql.conf

# Document that container listens on PostgreSQL port
EXPOSE 5432  