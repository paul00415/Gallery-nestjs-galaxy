# -------- Base image --------
FROM node:20-alpine

# -------- Set working dir --------
WORKDIR /app

# -------- Copy package files --------
COPY package*.json ./

# -------- Install dependencies --------
RUN npm install

# -------- Copy source --------
COPY . .

# -------- Generate Prisma Client --------
RUN npx prisma generate

# -------- Build NestJS --------
RUN npm run build

# -------- Expose port --------
EXPOSE 3000

# -------- Start app --------
CMD ["node", "dist/main.js"]
