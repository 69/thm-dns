const { CookieJar } = require('tough-cookie');
const cheerio = require('cheerio');
const Client = require('./client');

const verifyCookie = async (jar) => {
  const client = new Client(jar);

  const response = await client({
    url: 'message/get-unseen',
		responseType: 'json',
    followRedirect: false
  })

  return response && response.body && response.body.success
}

const signIn = async (username, password) => {
  const jar = new CookieJar();
  const client = new Client(jar);
  const initialCookies = await client('login');
  const $ = cheerio.load(initialCookies.body)
  const csrfToken = $('input[name="_csrf"]').val().trim();
  await client.post('login', {
    json: {
      _csrf: csrfToken,
      email: username,
      password
    },
    followRedirect: false
  })
  
  const isValid = await verifyCookie(jar);
  if(isValid) {
    return jar;
  } else {
    throw new Error('Login failed')
  }
    
}

module.exports = {
  verifyCookie,
  signIn
}
