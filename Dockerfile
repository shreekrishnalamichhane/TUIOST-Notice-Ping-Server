FROM node:slim
RUN mkdir /app
WORKDIR /app
COPY . .
RUN npm install
ENV NODE_ENV production
CMD ["node","index.js"]
