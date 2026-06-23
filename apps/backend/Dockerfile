FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/backend/package.json apps/backend/package.json
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -w @filerepo/backend

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY apps/backend/package.json ./apps/backend/package.json
EXPOSE 4000
CMD ["node", "apps/backend/dist/main.js"]
