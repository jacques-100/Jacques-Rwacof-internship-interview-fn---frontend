# --- Build ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Serve ---
FROM nginx:1.27-alpine
# nginx fills ${BACKEND_URL} into the template at start-up (only that variable, so nginx's own $vars survive).
ENV BACKEND_URL=http://backend:8080 NGINX_ENVSUBST_FILTER=BACKEND_URL
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
