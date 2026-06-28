FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV PORT=3000
ENV DATABASE_PATH=/data/iac.db
EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "server/index.js"]
