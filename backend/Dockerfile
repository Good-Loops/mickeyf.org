# Use an official Node runtime as a parent image
FROM node:21.7.2-alpine

# Set the working directory in the container
WORKDIR /app

# Install any necessary dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your application's code
COPY . .

# Make port 8080 available to the world outside this container
EXPOSE 8080

# Run the app when the container launches
CMD ["npm", "run", "dev"]
