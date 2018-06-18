var model = require("./model"),
    Site  = require("./site").Site;

var User = model.constructor();
User.path = "/users";

User.prototype = {
  update: function(attributes) {
    return this.client.update({element: this, model: User, attributes: attributes});
  },
  destroy: function() {
    return this.client.destroy({element: this});
  },
  sites: function(options) {
    return this.client.collection({prefix: this.apiPath, model: Site}, options);
  }
};

exports.User = User;
