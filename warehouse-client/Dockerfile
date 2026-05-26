# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

COPY warehouse-client/package*.json ./
RUN npm ci

COPY warehouse-client/ ./
ARG VITE_API_URL=/api/warehouse
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY warehouse-client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
