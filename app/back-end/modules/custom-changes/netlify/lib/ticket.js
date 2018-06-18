var model = require("./model");

var Ticket = model.constructor();
Ticket.path = "/oauth/tickets";

Ticket.prototype = {
  exchange: function() {
    var client = this.client;
    return client.request({
      url: this.apiPath + "/exchange",
      type: "post"
    }).then(function(response) {
      client.access_token = response.data.access_token;
      return response.data;
    });
  }
}

exports.Ticket = Ticket;
