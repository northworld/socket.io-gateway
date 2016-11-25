FROM node:7.2.0

COPY ./app /app
WORKDIR /app
RUN npm install
