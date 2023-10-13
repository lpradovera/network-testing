require('dotenv').config();
let express = require('express');
let app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const axios = require('axios');

async function apiRequest(endpoint, payload = {}, method = 'POST') {
  var url = `https://${process.env.SIGNALWIRE_SPACE}${endpoint}`

  resp = await axios.post(url, payload, {
    auth: {
      username: process.env.SIGNALWIRE_PROJECT_KEY,
      password: process.env.SIGNALWIRE_TOKEN
    }
  })
  return resp.data
}

app.get('/', async (req, res) => {
  var defaultDestination = process.env.DEFAULT_DESTINATION
  var projectId = process.env.SIGNALWIRE_PROJECT_KEY
  var tokenName = req.query.tokenName || 'myclient'
  var forceTcp = req.query.forceTcp == 'true';
  var relayHost = process.env.SIGNALWIRE_RELAY_HOST || 'relay.signalwire.com'
  var token = await apiRequest('/api/relay/rest/jwt', { expires_in: 120, resource: tokenName })
  console.log(`curl -XPOST --location 'https://${process.env.SIGNALWIRE_SPACE}/api/laml/2010-04-01/Accounts/${process.env.SIGNALWIRE_PROJECT_KEY}/Calls' --user '${process.env.SIGNALWIRE_PROJECT_KEY}:${process.env.SIGNALWIRE_TOKEN}' --data-urlencode 'Url=https://lpradovera.signalwire.com/laml-bins/ac601f38-be7a-4c53-a557-2d033c53b7e4' --data-urlencode 'From=${process.env.CALLER_ID}' --data-urlencode 'To=verto:${tokenName}@${process.env.SIGNALWIRE_VERTO_DOMAIN}'`)
  res.render('index', { defaultDestination, projectId, token: token.jwt_token, name: tokenName, forceTcp, relayHost });
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`http/ws server listening on ${port}`);
});