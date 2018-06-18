var model = require("./model")

var AccessToken = model.constructor();
AccessToken.path = "/access_tokens";

AccessToken.prototype = {
  destroy: function() {
    return this.client.destroy({element: this});
  },
};

exports.AccessToken = AccessToken;
