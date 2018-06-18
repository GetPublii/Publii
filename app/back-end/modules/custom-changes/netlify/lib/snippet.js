var model = require("./model");

var Snippet = model.constructor();
Snippet.path = "/snippets";

Snippet.prototype = {
  update: function(attributes) {
    return this.client.update({prefix: "/sites/" + this.site_id, model: Snippet, element: this, attributes: attributes});
  },
  destroy: function() {
    return this.client.destroy({prefix: "/sites/" + this.site_id, model: Snippet, element: this});
  }
}

exports.Snippet = Snippet;
