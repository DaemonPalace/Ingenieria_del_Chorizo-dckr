FROM node:18

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json .
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the backend port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
