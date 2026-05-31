# ──────────────────────────────────────────────────────
# Etapa 1: Compilar Angular
# ──────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

# ──────────────────────────────────────────────────────
# Etapa 2: Servir con nginx
# ──────────────────────────────────────────────────────
FROM nginx:alpine

# Copiar el build de Angular
COPY --from=build /app/dist/sakai-ng/browser /usr/share/nginx/html

# Config nginx embebida: sirve el SPA en puerto 80
# El nginx del servidor maneja SSL, Keycloak y el proxy a la API
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    include /etc/nginx/mime.types;\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
