# 1️⃣ Build stage
FROM node:18 as build

WORKDIR /app

# Copy package.json and package-lock.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source files and build React app
COPY . .
RUN npm run build

# 2️⃣ Production stage using Nginx
FROM nginx:stable-alpine

# Remove default Nginx site
RUN rm -rf /usr/share/nginx/html/*

# Copy build output from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom Nginx configuration for React SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
