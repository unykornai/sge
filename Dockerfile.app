# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/app/package*.json ./packages/app/

# Install dependencies
RUN npm ci --workspace=@sge/shared --workspace=@sge/app

# Copy source
COPY packages/shared ./packages/shared
COPY packages/app ./packages/app

# Build shared package
RUN npm run build --workspace=@sge/shared

# Build app with production env
ARG VITE_ETH_RPC_HTTPS
ARG VITE_SGE_TOKEN
ARG VITE_SGE_CLAIM
ARG VITE_USDC
ARG VITE_USDT
ARG VITE_FEE_USD
ARG VITE_WALLETCONNECT_PROJECT_ID

RUN npm run build --workspace=@sge/app

# Production stage - serve with nginx
FROM nginx:alpine AS production

# Copy built files
COPY --from=builder /app/packages/app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
