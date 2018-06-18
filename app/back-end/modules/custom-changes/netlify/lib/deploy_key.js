var model = require("./model")

var DeployKey = model.constructor();
DeployKey.path = "/deploy_keys";

exports.DeployKey = DeployKey;
