FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
COPY docs ./docs
RUN npm ci
EXPOSE 3000 5173
