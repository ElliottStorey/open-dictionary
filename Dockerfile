FROM node:23-alpine

WORKDIR /home/node/app

COPY . .

RUN npm install

USER node

EXPOSE 80

CMD ["npm", "start"]