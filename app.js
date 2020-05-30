const dns = require('native-dns')
const fs = require('fs')

const logger = require('./lib/logger');
const auth = require('./lib/auth')
const Client = require('./lib/client');

const interval = 1000 * 30; // poll every 30s
const cfgFile = 'config.json';
const isDebug = process.argv.includes('-v');
const exampleConfig = { username: '', password: '', server: '8.8.8.8', port: 53 }

let boxes = [], client;

const fetchBoxes = async () => {
  const request = await client('api/running-instances', { responseType: 'json' });
  if(isDebug) logger.log(`[fetchBoxes] ${request.statusCode}`);
  boxes = request.body;
  return true;
}

const setupDNS = (address, port) => {
  if(isDebug) logger.log(`[setupDNS] proxying from ${address}`);
  const authority = { address, port: 53, type: 'udp' };
  const server = dns.createServer();
  
  server.on('listening', () => {
    logger.log(`Listening on port ${port}!`);
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

    request.question.forEach(question => {
      if(question.name.endsWith('.thm')) {
        const s = question.name.split('.')
        const name = s[s.length - 2]
        const box = boxes.find(a => a.roomId.toLowerCase() === name);
        if(box) {
          response.answer.push(dns.A({
            name: question.name,
            address: box.internalIP,
            ttl: 300,
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
    const { username, password, server, port } = require('./config');
    if(isDebug) logger.log('Signing into THM...');
    const cookie = await auth.signIn(username, password);
    client = new Client(cookie);
    logger.log('Signed in!')
    await fetchBoxes()
    if(isDebug) logger.log('Initial box fetch complete')
    setInterval(fetchBoxes, interval)
    if(isDebug) logger.log('Setting up DNS')
    setupDNS(server, port);
  
  }
}

init()
