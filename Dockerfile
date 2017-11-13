FROM node:9.1

COPY ./app /app
WORKDIR /app
RUN yarn
