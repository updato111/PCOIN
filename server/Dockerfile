FROM node:lts-alpine3.20

WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 3000
RUN npx prisma generate
CMD [ "npm", "run", "start" ]
