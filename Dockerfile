# syntax=docker/dockerfile:1
FROM node:latest
WORKDIR /app
RUN useradd -m yampuser
RUN apt-get update
COPY biome.json ./
COPY package.json ./
COPY tsconfig.json ./
COPY svelte.config.js ./
COPY vite.config.ts ./
COPY server ./server
COPY src ./src
COPY static ./static
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "start"]
