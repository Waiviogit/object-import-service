FROM node:20.10-alpine3.18

# Install Python3
RUN apk add --no-cache python3 py3-pip

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY ./package.json ./

RUN npm install
COPY . .

CMD ["npm", "run", "start"]
