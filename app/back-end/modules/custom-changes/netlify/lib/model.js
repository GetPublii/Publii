var when = require("when");

exports.constructor = function() {
  var obj = function(client, attributes) {
    for (var key in attributes) {
      this[key] = attributes[key]
    }

    this.client  = client;
    this.apiPath = obj.path + "/" + this.id;
    this.refresh = function() {
      var self = this;
      return client.request({
        url: this.apiPath
      }).then(function(response) {
        obj.call(self, response.client, response.data);
        return self;
      }).catch(function(response) {
        return when.reject(response.data);
      });
    }
  };
  return obj;
}
