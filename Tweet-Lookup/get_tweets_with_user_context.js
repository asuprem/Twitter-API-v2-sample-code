const got = require('got');
const crypto  = require('crypto');
const OAuth = require('oauth-1.0a');
const qs = require('querystring');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
})

// The code below sets the consumer key and consumer secret from your environment variables
// To set environment variables on Mac OS X, run the export commands below from the terminal:
// export CONSUMER_KEY='YOUR-KEY' 
// export CONSUMER_SECRET='YOUR-SECRET'
const consumer_key = process.env.CONSUMER_KEY; 
const consumer_secret = process.env.CONSUMER_SECRET; 

const tweetIDs = '1278747501642657792,1275828087666679809' // Edit the Tweet IDs to look up
const params = 'tweet.fields=lang,author_id&user.fields=created_at' // Edit optional query parameters here

const endpointURL = `https://api.twitter.com/2/tweets?ids=${tweetIDs}&${params}`;
const requestTokenURL = 'https://api.twitter.com/oauth/request_token';
const authorizeURL = new URL('https://api.twitter.com/oauth/authorize');
const accessTokenURL = 'https://api.twitter.com/oauth/access_token';

const oauth = OAuth({
  consumer: {
    key: consumer_key,
    secret: consumer_secret
  },
  signature_method: 'HMAC-SHA1',
  hash_function: (baseString, key) => crypto.createHmac('sha1', key).update(baseString).digest('base64')
});

async function input(prompt) {
  return new Promise(async (resolve, reject) => {
    readline.question(prompt, (out) => {
      readline.close();
      resolve(out);
    });
  });
}

async function requestToken() {

  const authHeader = oauth.toHeader(oauth.authorize({url: requestTokenURL, method: 'POST'}));

  const req = await got.post(requestTokenURL, {
    json: {
      "oauth_callback": "oob"
    }, 
    headers: { 
      Authorization: authHeader["Authorization"]
    }
  });

  if (req.body) {
    return qs.parse(req.body); 
  } else {
    throw new Error('Cannot get an OAuth request token');
  }
}

async function accessToken({oauth_token, oauth_token_secret}, verifier) {

  const authHeader = oauth.toHeader(oauth.authorize({url: accessTokenURL, method: 'POST'}));

  const path = `https://api.twitter.com/oauth/access_token?oauth_verifier=${verifier}&oauth_token=${oauth_token}`

  const req = await got.post(path, {
    headers: { 
      Authorization: authHeader["Authorization"]
    }
  });

  if (req.body) {
    return qs.parse(req.body);
  } else {
    throw new Error('Cannot get an OAuth request token');
  } 
}

async function getRequest({oauth_token, oauth_token_secret}) {

  const token = {
    key: oauth_token,
    secret: oauth_token_secret
  };

  const authHeader = oauth.toHeader(oauth.authorize({url: endpointURL, method: 'GET'}, token));

  const req = await got(endpointURL, {
    headers: { 
      Authorization: authHeader["Authorization"]
    }
  });
  
  if (req.body) {
      return JSON.parse(req.body);
  } else {
      throw new Error('Unsuccessful request');
  }
}

(async () => {
    try {

      // Get request token 
      const oAuthRequestToken = await requestToken();

      // Get authorization
      authorizeURL.searchParams.append('oauth_token', oAuthRequestToken.oauth_token);
      console.log('Please go here and authorize:', authorizeURL.href);
      const pin = await input('Paste the PIN here: ');

      // Get the access token
      const oAuthAccessToken = await accessToken(oAuthRequestToken, pin.trim());

      // Make the request
      const response = await getRequest(oAuthAccessToken);
      console.log(response);
      
    } catch(e) {
        console.log(e);
        process.exit(-1);
    }
    process.exit();
})();