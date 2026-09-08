FROM node:22-alpine

WORKDIR /usr/src

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]