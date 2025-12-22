FROM node:25-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install --omit=dev

FROM node:25-alpine AS runner

WORKDIR /home/node/app

USER node

COPY --from=builder --chown=node:node /app/node_modules ./node_modules

COPY --chown=node:node package.json .
COPY --chown=node:node server.js .
COPY --chown=node:node src ./src

EXPOSE 80

CMD ["npm", "start"]