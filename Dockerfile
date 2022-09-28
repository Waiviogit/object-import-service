FROM node:16.17

RUN apt-get update \
 && apt-get install -y chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends

WORKDIR /app

COPY ./package.json ./

RUN npm install
COPY . .

CMD ["npm", "run", "start:prod"]
