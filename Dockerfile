# ---------- Base ----------
FROM node:20-alpine AS base
WORKDIR /app

# ---------- Dependencies ----------
FROM base AS deps
COPY package*.json ./
RUN npm install

# ---------- Build ----------
FROM deps AS build
COPY . .
RUN npm run build
RUN npx prisma generate

# ---------- Production ----------
FROM node:20-alpine AS production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./

EXPOSE 5000

CMD ["node", "dist/main.js"]
