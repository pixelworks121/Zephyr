# Use Node 22 on Debian
FROM node:22-slim

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Cloud Run provides PORT env var
ENV NODE_ENV=production
EXPOSE 8080

# Start server
CMD ["node", "index.js"]
