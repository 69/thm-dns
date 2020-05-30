const got = require('got')

module.exports = function createClient(cookieJar) {
  const client = got.extend({
    prefixUrl: 'https://tryhackme.com/',
    headers: {
      'User-Agent': 'thm-dns v1.0.0'
    },
    cookieJar
  })
  return client;
};
