# Specifying the base image
FROM node:21.7.2-alpine

# Update and upgrade the system packages, and remove unnecessary cache and temporary files
RUN apk update && \
    apk upgrade && \
    rm -rf /var/cache/apk/*

# Create and set the working directory    
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# Copying this separately prevents re-running npm install on every code change.
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies for backend and frontend
RUN cd backend && npm install
RUN cd frontend && npm install

# Copy local code to the container image for backend and frontend
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Build the application using webpack for both backend and frontend
RUN cd backend && npm run prod
RUN cd frontend && npm run prod

# Create a new non-root user for running applications securely
RUN addgroup -S nodegroup && adduser -S nodeuser -G nodegroup
# Change to non-root user
USER nodeuser

# Inform Docker that the container is listening on the specified port at runtime.
EXPOSE 8080

# Command to start the backend server
CMD ["node", "/usr/src/app/backend/dist/server.min.js"]