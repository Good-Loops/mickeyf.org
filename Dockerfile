# Specifying the base image
FROM node:21.7.2-alpine

# Update and upgrade the system packages, and remove unnecessary cache and temporary files
RUN apk update && \
    apk upgrade && \
    rm -rf /var/cache/apk/*

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json ./

# Install production dependencies.
RUN npm install --only=production

# Copy local code to the container image.
COPY . .

# Run the web service on container startup.
CMD [ "npm", "start" ]

# Create a new group and user 'nodeuser'
RUN addgroup -S nodeuser && adduser -S nodeuser -G nodeuser

# Change to the 'nodeuser' user
USER nodeuser