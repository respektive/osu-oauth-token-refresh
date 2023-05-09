
const { ClientCredentials, ResourceOwnerPassword, AuthorizationCode } = require('simple-oauth2');
var express = require('express')
const storage = require('node-persist');
const fs = require('fs');

const config = require('./config.json');

const clientConf = {
  client: {
    id: config["id"],
    secret: config["secret"]
  },
  auth: {
    tokenHost: 'https://osu.ppy.sh',
    tokenPath: '/oauth/token'
  }
};

const client = new AuthorizationCode(clientConf);

const authorizationUri = client.authorizeURL({
  redirect_uri: 'http://localhost:18821/callback',
  scope: 'public identify'
});

let access_token;

async function refreshToken() {

    await storage.init({
        dir: 'storage',

        stringify: JSON.stringify,

        parse: JSON.parse,

        encoding: 'utf8',

        logging: false,  // can also be custom logging function

        ttl: false, // ttl* [NEW], can be true for 24h default or a number in MILLISECONDS or a valid Javascript Date object

        expiredInterval: 2 * 60 * 1000, // every 2 minutes the process will clean-up the expired cache

        // in some cases, you (or some other service) might add non-valid storage files to your
        // storage dir, i.e. Google Drive, make this true if you'd like to ignore these files and not throw an error
        forgiveParseErrors: false

    });

    let accessToken;
    let accessTokenJSONString = await storage.getItem('access_token')
    if(accessTokenJSONString) {
        accessToken = client.createToken(JSON.parse(accessTokenJSONString));
    }
    console.log(accessToken)

    if (!accessToken || accessToken.expired(300)) {
    try {
        const refreshParams = {
          scope: 'public identify',
        };
        
        accessToken = await accessToken.refresh(refreshParams);
        console.log("refreshed token");
        
        await storage.setItem('access_token', JSON.stringify(accessToken))
        access_token = accessToken.token.access_token
        console.log(access_token)
        await storage.setItem('token', access_token)
        fs.writeFileSync('./access_token.json', `{"access_token": "${access_token}"}`, err => {
          if (err) {
            console.error(err);
          }
          // file written successfully
        })
        return;
      } catch (error) {
        console.log('Error refreshing access token: ', error.message);
        getToken();
        return;
      }
    }

    fs.writeFileSync('./access_token.json', `{"access_token": "${accessToken.token.access_token}"}`, err => {
      if (err) {
        console.error(err);
      }
      // file written successfully
    })
    
    console.log("token still valid");
    access_token = accessToken.token.access_token
    await storage.setItem('token', access_token)
    return access_token
}

async function getToken() {
    var app = express()

    console.log("url:", authorizationUri)
    
    app.get('/callback', async (req, res) => {
    const { code } = req.query;
    const options = {
        code,
        redirect_uri: 'http://localhost:18821/callback',
        scope: 'public identify'
    };

    try {
        console.log('Getting new Token...')
        const accessToken = await client.getToken(options, {json: 'force'});

        console.log('The resulting token: ', accessToken.token);

        await storage.setItem('access_token', JSON.stringify(accessToken))
        access_token = accessToken.token.access_token
        await storage.setItem('token', access_token)
        fs.writeFileSync('./access_token.json', `{"access_token": "${access_token}"}`, err => {
          if (err) {
            console.error(err);
          }
          // file written successfully
        })
        res.send("Authentication succeeded!")
        server.close()
    } catch (error) {
        console.error('Access Token Error', error.message);
        res.send('Authentication failed');
    }
    });

    var server = app.listen(18821)
}

module.exports = {
    refreshToken,
 }