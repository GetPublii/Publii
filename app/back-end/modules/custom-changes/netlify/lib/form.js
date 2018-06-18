var model = require("./model"),
    Submission = require("./submission").Submission;;

var Form = model.constructor();
Form.path = "/forms";

Form.prototype = {
  submissions: function() {
    return this.client.collection({prefix: this.apiPath, model: Submission});
  }
};

exports.Form = Form;
