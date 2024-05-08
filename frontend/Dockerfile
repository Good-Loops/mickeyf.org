# Base image
FROM node:21.7.2-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy local files to container
COPY . .

# Expose port for the webpack dev server
EXPOSE 3000

# Command to start the dev server
CMD ["sh", "-c", "npm run sass & npm run dev"]