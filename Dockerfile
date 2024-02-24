# Specify the base image
FROM node:latest

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the dependencies
RUN npm install --legacy-peer-deps

# Copy the application code to the working directory
COPY . .

# Expose a port the application will run on
EXPOSE 9002

# Run the application
CMD npm run dev:start