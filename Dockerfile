# Node.js Dockerfile for CarBrain AI Assistant API
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for ts-node-dev)
RUN npm ci

# Copy source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose port
EXPOSE 3000

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Start the application (production mode)
CMD ["npm", "start"]