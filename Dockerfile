# Use a multi-stage build to keep the image size down
## Build Stage for Node.js backend
FROM node:21.7.2-alpine as builder

# Set up environment and install dependencies
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*
WORKDIR /usr/src/app
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/
RUN cd backend && npm run prod

## Final Stage - Nginx to serve static files and proxy requests to backend
FROM nginx:stable

# Nginx configuration
COPY /nginx.conf /etc/nginx/nginx.conf
RUN rm -rf /usr/share/nginx/html/*
COPY frontend/public /usr/share/nginx/html

# Copy the built backend files from the builder stage
COPY --from=builder /usr/src/app/backend/dist /usr/src/app/backend/dist

# Install Node.js in the final stage to run the backend server
RUN apk add --no-cache nodejs npm

# Set working directory and copy backend executable files
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/backend /usr/src/app/backend

# Expose port 8080 for Nginx
EXPOSE 8080

# Start Nginx and the backend server
CMD ["sh", "-c", "node /usr/src/app/backend/dist/server.min.js & nginx -g 'daemon off;'"]
