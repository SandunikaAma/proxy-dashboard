# backend/Dockerfile
FROM node:18

# Create app directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies inside the container (Linux)
RUN npm install --build-from-source sqlite3

# Copy the rest of backend source code
COPY . .

# Expose port
EXPOSE 3004

# Start the backend server
CMD ["node", "server.js"]
