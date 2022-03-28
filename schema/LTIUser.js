const mongoose = require('mongoose');
const LTIUserSchema = new mongoose.Schema({
  lti: String,
  canvasUserId: String,
  accessToken: String,
  refreshToken: String,
  sessionData: Object,
  lastRefresh: {
    type: Date,
    default: new Date()
  }
});

const LTIUser = mongoose.model('LTIUser', LTIUserSchema);

module.exports = {
	model: LTIUser
};