FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG BUILD_CMD="build:prod"
RUN npm run $BUILD_CMD

EXPOSE 3000 3001 3002 3004 8000 9000

CMD ["npm", "start"]
