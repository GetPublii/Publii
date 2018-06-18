var when   = require("when"),
    Client = require("./client").Client;

exports.createClient = function(options) {
  return new Client(options);
};

exports.deploy = function(options) {
  if (typeof options !== "object") {
    return when.reject("deploy needs an options object");
  }

  if (!options.access_token) {
    return when.reject("deploy needs an access_token");
  }

  if (!options.site_id) {
    return when.reject("deploy needs a site_id");
  }

  if (!(options.dir || options.zip)) {
    return when.reject("deploy needs a dir or a zip to deploy");
  }

  return this.createClient({access_token: options.access_token}).site(options.site_id).then(function(site) {
    return site.createDeploy({dir: options.dir, zip: options.zip}).then(function(deploy) {
      return deploy.waitForReady();
    });
  });
};

exports.Client = Client;

if (typeof(window) !== 'undefined') {
  window.netlify = exports;
}
