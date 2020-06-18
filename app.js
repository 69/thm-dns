#!/usr/bin/env node
const dns = require('native-dns')
const fs = require('fs')

const logger = require('./lib/logger');
const auth = require('./lib/auth')
const Client = require('./lib/client');
const Cache = require('./lib/cache');

const cfgFile = 'config.json';
const isDebug = process.argv.includes('-v');
const exampleConfig = { username: '', password: '', server: null, port: 53, ttl: 60, }

let cache;

const setupDNS = (address, port, ttl) => {
  const dnsServer = address || require('dns').getServers()[0];
  if(isDebug) logger.log(`[setupDNS] proxying from ${dnsServer}`);
  const authority = { address: dnsServer, port: 53, type: 'udp' };
  const server = dns.createServer();
  
  server.on('listening', () => {
    logger.success(`Listening on port ${port}!`);
  })

  server.on('error', (err) => {
    logger.error(err);
  })

  const proxy = (question, response) => new Promise((resolve, reject) => {
    if(isDebug) {
      logger.log(`Proxying ${question.name}`)
    }

    const request = dns.Request({
      question, 
      server: authority
    });
  
    request.on('message', (err, msg) => {
      msg.answer.forEach(a => response.answer.push(a))
    });
  
    request.on('end', resolve);
    request.send();
  })

  function handleRequest(request, response) {
    logger.log(`Request for ${request.question[0].name}`);
    let queue = []

    request.question.forEach(async (question) => {
      if(question.name.endsWith('.thm')) {
        const s = question.name.split('.')
        const name = s[s.length - 2]
        const box = await cache.getBox(name);
        if(box) {
          response.answer.push(dns.A({
            name: question.name,
            address: box.internalIP,
            ttl,
          }))
        } else {
          queue.push(proxy(question, response))
        }
      } else {
        queue.push(proxy(question, response))
      }
    })

    Promise.all(queue).then(() => {
      response.send()
    })

  }
  
  server.serve(port);
  server.on('request', handleRequest);
  server.on('error', (err) => logger.error(err));
  server.on('socketError', (err) => logger.error(err));
}

const init = async () => {
  if(!fs.existsSync(cfgFile)) {
    fs.writeFileSync(cfgFile, JSON.stringify(exampleConfig, null, 2));
    logger.log('Created config.json. Please populate it with your THM username/password');
  } else {
    const { username, password, server, port, ttl } = require('./config');
    if(isDebug) logger.log('Signing into THM...');
    const cookie = await auth.signIn(username, password);
    const client = new Client(cookie);
    logger.success('Signed in!')
    
    cache = new Cache(client, ttl || 60);
    await cache.fetchBoxes();
    if(isDebug) logger.success('Initial box fetch complete')
    if(isDebug) logger.log('Setting up DNS')
    setupDNS(server, port, ttl || 60);
  
  }
}

init()
