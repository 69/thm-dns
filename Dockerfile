FROM node:latest

WORKDIR /root
COPY . .

RUN yarn

EXPOSE 53/tcp
EXPOSE 53/udp

ENTRYPOINT [ "node", "app" ]
