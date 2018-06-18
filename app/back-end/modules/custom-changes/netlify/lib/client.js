var base64 = require('base64-js'),
    when   = require("when"),
    nodefn = require("when/node"),
    fn     = require("when/function"),
    http   = require('http'),
    https  = require('https');

var Client = function(options) {
  options = options || {};
  this.access_token  = options.access_token;
  this.client_id     = options.client_id;
  this.client_secret = options.client_secret;
  this.redirect_uri  = options.redirect_uri;
  this.ENDPOINT      = options.endpoint || 'https://api.netlify.com';
  this.VERSION       = options.version  || 'v1';
  this.hostname = this.ENDPOINT.match(/^https?:\/\/([^:]+)/)[1];
  this.ssl = this.ENDPOINT.match(/^https:\/\//)
  this.port = this.ssl ? 443 : (this.ENDPOINT.match(/:(\d+)$/) || [])[1] || 80;
  this.http = options.http || (this.ssl ? https : http);
};

Client.models = {
  Site: require("./site").Site,
  Form: require("./form").Form,
  Submission: require("./submission").Submission,
  User: require("./user").User,
  Snippet: require("./snippet").Snippet,
  Deploy: require("./deploy").Deploy,
  DeployKey: require("./deploy_key").DeployKey,
  DnsZone: require("./dns-zone").DnsZone,
  AccessToken: require("./access-token").AccessToken,
  Ticket: require("./ticket").Ticket
};

var stringToByteArray = function(str) {
  return Array.prototype.map.call(str, function (char) { return char.charCodeAt(0); });
};

var prepareBody = function(body, headers) {
  return typeof(body) == "string" ? body : (headers['Content-Type'] == "application/json" ? JSON.stringify(body) : body);
};

Client.prototype = {
  isAuthorized: function() { return !(this.access_token == null); },

  authorizeFromCredentials: function() {
    var client = this;

    if (!(this.client_id && this.client_secret)) {
      throw("Instantiate the client with a client_id and client_secret to authorize from credentials");
    }

    return this.request({
      type: "post",
      url: "/oauth/token",
      raw_path: true,
      contentType: "application/x-www-form-urlencoded",
      auth: {
        user: this.client_id,
        password: this.client_secret
      },
      body: "grant_type=client_credentials"
    }).then(function(response) {
      client.access_token = response.data.access_token;
      return response.data.access_token;
    }).catch(function(response) {
      return when.reject(response.data);
    });
  },

  authorizeFromCode: function(code) {
    var client = this;

    if (!(this.client_id && this.client_secret && this.redirect_uri)) {
      throw("Instantiate the client with a client_id, client_secret and redirect_uri to authorize from code");
    }

    return this.request({
      type: "post",
      url: "/oauth/token",
      raw_path: true,
      contentType: "application/x-www-form-urlencoded",
      auth: {
        user: this.client_id,
        password: this.client_secret
      },
      body: [
        "grant_type=authorization_code",
        "code=" + code,
        "redirect_uri=" + encodeURIComponent(this.redirect_uri)
      ].join("&")
    }).then(function(response) {
      client.access_token = response.data.access_token;
      return response.data.access_token;
    }).catch(function(response) {
      return when.reject(response.data);
    });
  },

  authorizeUrl: function(options) {
    if (!(this.client_id && this.redirect_uri)) {
      throw("Instantiate the client with a client_id and a redirect_uri to generate an authorizeUrl");
    }
    return this.ENDPOINT + "/oauth/authorize?" + [
      "response_type=code",
      "client_id=" + this.client_id,
      "redirect_uri=" + encodeURIComponent(this.redirect_uri)
    ].join("&");
  },

  sites: function(options) { return this.collection({model: Client.models.Site}, options); },

  site: function(id) { return this.element({model: Client.models.Site, id: id}); },

  createSite: function(options) {
    return this.withAuthorization().then(function(client) {
      if (options.dir) {
        return Client.models.Site.createFromDir(client, options.dir);
      } else if (options.zip) {
        return Client.models.Site.createFromZip(client, options.zip);
      } else {
        return Client.models.Site.create(client, options);
      }
    });
  },

  forms: function() { return this.collection({model: Client.models.Form}); },

  form: function(id) { return this.element({model: Client.models.Form, id: id}); },

  submissions: function(options) { return this.collection({model: Client.models.Submission}, options); },

  submission: function(id) { return this.element({model: Client.models.Submission, id: id}); },

  users: function(options) { return this.collection({model: Client.models.User}, options); },

  user: function(id) { return this.element({model: Client.models.User, id: id}); },

  createUser: function(attributes) {
    return this.create({model: Client.models.User, attributes: attributes});
  },

  dnsZones: function(options) { return this.collection({model: Client.models.DnsZone}, options); },

  dnsZone: function(id) { return this.element({model: Client.models.DnsZone, id: id}); },

  createDnsZone: function(attributes) {
    return this.create({model: Client.models.DnsZone, attributes: attributes});
  },

  accessToken: function(id) { return this.element({model: Client.models.AccessToken, id: id}); },

  createAccessToken: function(attributes) {
    return this.create({model: Client.models.AccessToken, attributes: attributes});
  },

  createDeployKey: function(attributes) {
    return this.create({model: Client.models.DeployKey, attributes: attributes});
  },

  ticket: function(id) { return this.element({model: Client.models.Ticket, id: id}); },

  createTicket: function() {
    return this.request({
      url: Client.models.Ticket.path,
      type: "post",
      body: {client_id: this.client_id}
    }).then(function(response) {
      return new Client.models.Ticket(response.client, response.data);
    });
  },

  collection: function(options, meta) {
    meta = meta || {};
    var params = [];
    for (var key in meta.params || {}) {
      params.push(key + "=" + meta.params[key]);
    }
    if (meta.page) { params.push(["page", meta.page].join("=")) }
    if (meta.per_page) { params.push(["per_page", meta.per_page].join("=")) }
    return this.withAuthorization().then(function(client) {
      return client.request({
        url: (options.prefix || "") + options.model.path + (params.length ? "?" + params.join("&") : "")
      }).then(function(response) {
        var result = response.data.map(function(data) { return new options.model(response.client, data); });
        result.meta = response.meta
        return result;
      });
    });
  },

  element: function(options) {
    return this.withAuthorization().then(function(client) {
      return client.request({
        url: (options.prefix || "" ) + options.model.path + "/" + options.id
      }).then(function(response) {
        return new options.model(response.client, response.data);
      });
    });
  },

  create: function(options) {
    return this.withAuthorization().then(function(client) {
      return client.request({
        url: (options.prefix || "") + options.model.path,
        type: "post",
        body: options.attributes
      }).then(function(response) {
        return new options.model(response.client, response.data);
      });
    });
  },

  update: function(options) {
    return this.withAuthorization().then(function(client) {
      return client.request({
        url: (options.prefix || "") + options.element.apiPath,
        type: "put",
        body: options.attributes
      }).then(function(response) {
        options.model.call(options.element, response.client, response.data);
        return options.element;
      });
    });
  },

  destroy: function(options) {
    return this.withAuthorization().then(function(client) {
      return client.request({
        url: (options.prefix || "") + options.element.apiPath,
        type: "delete",
        ignoreResponse: true
      });
    });
  },

  request: function(options) {
    var client  = this,
        http    = this.http,
        path    = options.raw_path ? options.url : "/api/" + this.VERSION + options.url,
        headers = options.headers || {},
        retries = options.retries ? options.retries : options.retries === 0 ? 0 : 3,
        body    = null;

    headers['Content-Type'] = options.contentType || "application/json";

    if (options.body) {
      body = prepareBody(options.body, headers);
    }

    headers['Content-Length'] = body ? (typeof body == "string" ? Buffer.byteLength(body) : body.length) : 0;

    if (this.access_token && !options.auth) {
      headers['Authorization'] = "Bearer " + this.access_token
    }

    var requestOptions = {
      method: (options.type || "get").toLowerCase(),
      hostname: this.hostname,
      path: path,
      port: this.port,
      headers: headers,
      auth: options.auth ? options.auth.user + ":" + options.auth.password : null,
    }

    return when.promise(function(resolve, reject) {
      var request = http.request(requestOptions, function(res) {
        var body = "",
            data = null;

        res.on("data", function(chunk) {
          body += chunk;
        });
        res.on("end", function() {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            if (body && !options.ignoreResponse) {
              data = JSON.parse(body);
            }
            resolve({client: client, data: data, meta: client.metadata(res)});
          } else if (res.statusCode == 401 || res.statusCode == 403) {
            reject({data: "Authentication failed", client: client, meta: client.metadata(res)});
          } else {
            if ((requestOptions.method === "get" ||
                 requestOptions.method === "put" ||
                 requestOptions.method === "delete") &&
                (retries > 0 && res.statusCode !== 422 && res.statusCode !== 404)) {
              options.retries = retries - 1;
              setTimeout(function() { client.request(options).then(resolve).catch(reject); }, 500);
            } else {
              reject({client: client, data: body, meta: client.metadata(res)});
            }
          }
        });
      });

      request.setTimeout(300000, function() {
        request.abort();
      });

      request.on("error", function(err) {
        if ((requestOptions.method == "get" ||
             requestOptions.method == "put" ||
             requestOptions.method == "delete") &&
             retries > 0) {
          options.retries = retries - 1;
          setTimeout(function() { client.request(options).then(resolve).catch(reject); }, 500);
        } else {
          reject({client: client, data: err, meta: null});
        }
      });

      if (body) {
        request.write(body);
      }
      request.end();
    });
  },

  withAuthorization: function() {
    if (!this.isAuthorized()) return when.reject("Not authorized: Instantiate client with access_token");
    return when.resolve(this);
  },

  metadata: function(res) {
    var meta = {},
        links     = res.headers && res.headers.link,
        limit     = res.headers && res.headers["x-ratelimit-limit"],
        remaining = res.headers && res.headers["x-ratelimit-remaining"],
        reset     = res.headers && res.headers["x-ratelimit-reset"];

    if (links) {
      meta.pagination = {};
      var parts = links.split(",");
      for (var i=0, len=parts.length; i<len; i++) {
        var part = parts[i];
        var link = part.replace(/(^\s*|\s*$)/, '');
        var segments = link.split(";");

        var m = segments[0].match(/page=(\d+)/);
        var page = m && parseInt(m[1],10);
        m = segments[0].match(/^\<(.+)\>\s*$/);

        if (segments[1].match(/last/)) {
          meta.pagination.last = page;
        } else if (segments[1].match(/next/)) {
          meta.pagination.next = page;
        } else if (segments[1].match(/prev/)) {
          meta.pagination.prev = page;
        } else if (segments[1].match(/first/)) {
          meta.pagination.first = page;
        }
      }
    }
    meta.rate = {};
    if (limit) {
      meta.rate.limit = parseInt(limit, 10);
    }
    if (remaining) {
      meta.rate.remaining = parseInt(remaining, 10);
    }
    if (reset) {
      meta.rate.reset = parseInt(reset, 10);
    }
    return meta;
  }
};

exports.Client = Client;
