FROM node:24.20.0-alpine

WORKDIR /usr/src

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]