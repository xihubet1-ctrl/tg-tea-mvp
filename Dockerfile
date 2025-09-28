FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm ci
COPY tsconfig.json ./
COPY server ./server
COPY webapp ./webapp
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
