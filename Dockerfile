# Specifying the base image
FROM node:21.7.2-alpine

# Specifying the base image
FROM node:21.7.2-alpine

# Update and upgrade the system packages, and remove unnecessary cache and temporary files
RUN apk update && \
    apk upgrade && \
    rm -rf /var/cache/apk/*

# Create and set the working directory    
WORKDIR /usr/src/app

# Copy backend application dependency manifests to the container image.
COPY backend/package*.json ./backend/

# Install backend dependencies
RUN cd backend && npm install

# Copy local backend code to the container image
COPY backend/ ./backend/

# Build the backend application using webpack
RUN cd backend && npm run prod

# Create a new non-root user for running applications securely
RUN addgroup -S nodegroup && adduser -S nodeuser -G nodegroup
# Change to non-root user
USER nodeuser

# Inform Docker that the container is listening on the specified port at runtime.
EXPOSE 8080

# Command to start the backend server
CMD ["node", "/usr/src/app/backend/dist/server.min.js"]
