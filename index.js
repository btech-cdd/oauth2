const axios = require('axios');
const mongoose = require('mongoose');
const LTIUser = require('schema/LTIUser.js').model;

const oauth2 = {
  postIndex: function(req, res) {
    console.log("INDEX INIT");
    let oauth_url = LTI_URL_BASE + req.originalUrl;
    let parameters = {};
    for (let key in req.body) {
      if (key.toString() != "oauth_signature") {
        parameters[key] = req.body[key];
      }
    }

    const sig = oauthSign.hmacsign("POST", oauth_url, parameters, 'btech');
    //need to verify sig and time here
    if (sig === req.body.oauth_signature) {
      let role = req.body.roles.replace('urn:lti:instrole:ims/lis/', '');
      let url = './public/index.html';
      let filePath = path.resolve(__dirname, url);
      res.sendFile(filePath);
    }
  },

  genCanvasRequestAuthUrl: function(client_id, redirect_uri) {
    let redirectUrl = 'https://btech.instructure.com/login/oauth2/auth?client_id='+client_id+'&response_type=code&redirect_uri=' + redirect_uri;
      return redirectUrl;
  },

  genUserData: async function(lti_name, client_id, client_secret, code, redirect_uri) {
    let userData = {};
    await axios.post("https://btech.instructure.com/login/oauth2/token?refresh_type=authorization_token&client_id=" + client_id + "&client_secret="+client_secret+ "&code=" + code + "&redirect_uri=" + redirect_uri).then(async function(data) {
      userData = {
          lti: lti_name,
          canvasUserId: data.data.user.id,
          accessToken: data.data.access_token,
          refreshToken: data.data.refresh_token
        }
    });
    return userData;
  },

  getUser: async function(lti_name, user_id) {
    let user = undefined;
    await LTIUser.find({
      lti: lti_name,
      canvasUserId: user_id 
    }, function(err, users) {
      if (err) {
        console.log(err);
      } else {
        if (users.length > 0) {
          user = users[0];
        }
      }
    });
    return user;
  },

  getAccessToken: async function(lti_name, client_id, client_secret, user_id, redirect_uri) {
    //look up the user,
    let user = await this.getUser(lti_name, user_id);
    if (user === undefined) return undefined;
    let timeDiff = new Date() - user.lastRefresh;
    let diffInMinutes = timeDiff / (1000 * 60);
    if (diffInMinutes < 59) return user.accessToken;

    // if the time is older than 50 minutes (or something just shy of an hour), refresh
    let accessToken = await this.genAccessToken(lti_name, client_id, client_secret, redirect_uri, user_id, user);
    //return the access token
    return accessToken;
  },

  genAccessToken: async function(lti_name, client_id, client_secret, redirect_uri, user_id, user=undefined) {
    if (user === undefined) {
      user = await this.getUser(lti_name, user_id);
    }
    await axios.post("https://btech.instructure.com/login/oauth2/token?grant_type=refresh_token&client_id=" + client_id + "&client_secret="+client_secret+ "&refresh_token=" + user.refreshToken+ "&redirect_uri=" + redirect_uri).then(async function(data) {
      let access_token = data.data.access_token;
      user.accessToken = access_token;
      user.save();
    });
    return user.accessToken;
  }

};

module.exports = oauth2;
