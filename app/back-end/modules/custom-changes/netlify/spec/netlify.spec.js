if (typeof(require) !== 'undefined') {
  var netlify  = require("../lib/netlify.js"),
      crypto      = require("crypto"),
      fs          = require("fs");
}

var Emitter = function() {
  var subscribers = {};
  this.emit = function(event) {
    var args = Array.prototype.slice.call(arguments, 1);
    subscribers[event].forEach(function(subscriber) {
      subscriber.apply(null, args);
    });
  },
  this.on = function(event, cb) {
    subscribers[event] = subscribers[event] || [];
    subscribers[event].push(cb);
  }
};

// Mock the node http lib
var http = {
  request: function(options, cb) {
    var test = firstIfArray(http.test),
        request = new Emitter(),
        response = new Emitter(),
        requestBody = "";

    request.write = function(data) { requestBody += data; };
    request.end = function() {
      options.body = requestBody;
      test.expectations(options);

      response.statusCode = test.status;
      response.headers = test.headers;

      setTimeout(function() {
        cb(response);
        response.emit('data', test.response);
        response.emit('end');
      }, 0);
    }
    request.setTimeout = function() { }

    return request;
  }
};

var firstIfArray = function(obj) {
  return Array.isArray(obj) ? obj.shift() : obj;
};

describe("netlify", function() {
  var testApiCall = function(options) {
    var httpCalls = Array.isArray(options.http) ? options.http : [options.http];
    httpCalls.forEach(function(httpCall) {
      http.test.push({
        expectations: httpCall.expectations,
        status: httpCall.status || 200,
        headers: httpCall.headers,
        response: httpCall.response ? JSON.stringify(httpCall.response) : ""
      });
    });

    runs(options.apiCall);
    waitsFor(options.waitsFor, 100);
    runs(options.expectations);
  };

  beforeEach(function() {
    http.test = [];
  });

  it("should create a client", function() {
    var client = netlify.createClient({access_token: "1234"});
    expect(client.access_token).toEqual("1234");
    expect(client.isAuthorized()).toEqual(true);
  });

  it("should authenticate from credentials", function() {
    var client = netlify.createClient({client_id: "client_id", client_secret: "client_secret", http: http});
    var access_token = null;

    testApiCall({
      http: {
        expectations: function(options) {
          expect(options.headers['Content-Type']).toEqual("application/x-www-form-urlencoded");
          expect(options.auth).toEqual("client_id:client_secret");
          expect(options.method).toEqual("post");
        },
        response: {access_token: "1234"}
      },
      apiCall: function() {
        client.authorizeFromCredentials().then(function(token) {
          access_token = token;
        });
      },
      waitsFor: function() { return access_token; },
      expectations: function() {
        expect(access_token).toEqual("1234");
        expect(client.isAuthorized()).toEqual(true);
      }
    });
  });

  it("should generate an authorize url", function() {
    var client = netlify.createClient({
      client_id: "client_id",
      client_secret: "client_secret",
      redirect_uri: "http://www.example.com/callback"
    });
    var url = client.authorizeUrl();

    expect(url).toEqual("https://api.netlify.com/oauth/authorize?response_type=code&client_id=client_id&redirect_uri=http%3A%2F%2Fwww.example.com%2Fcallback")
  });

  it("should authorize from authorization code", function() {
    var client = netlify.createClient({
      client_id: "client_id",
      client_secret: "client_secret",
      redirect_uri: "http://www.example.com/callback",
      http: http
    });
    var access_token = null;

    testApiCall({
      http: {
        expectations: function(options) {
          expect(options.headers['Content-Type']).toEqual("application/x-www-form-urlencoded");
          expect(options.auth).toEqual("client_id:client_secret");
          expect(options.method).toEqual("post");
        },
        response: {access_token: "1234"}
      },
      apiCall: function() {
        client.authorizeFromCode("my-code").then(function(token) {
          access_token = token;
        });
      },
      waitsFor: function() { return access_token },
      expectations: function() {
        expect(access_token).toEqual("1234");
        expect(client.isAuthorized()).toEqual(true);
      }
    });
  });

  it("should get a list of sites", function() {
    var client = netlify.createClient({access_token: "1234", http: http}),
        sites  = [];

    testApiCall({
      http: {
        expectations: function(options) {
          expect(options.headers['Authorization']).toEqual("Bearer 1234");
          expect(options.method).toEqual("get");
          expect(options.path).toEqual("/api/v1/sites");
        },
        response: [{id: 1}, {id: 2}, {id: 3}, {id: 4}]
      },
      apiCall: function() { client.sites().then(function(data) { sites = data; }); },
      waitsFor: function() { return sites.length; },
      expectations: function() {
        expect(sites.map(function(s) { return s.id; })).toEqual([1,2,3,4]);
      }
    });
  });

  it("should get a list of sites with pagination", function() {
    var client = netlify.createClient({access_token: "1234", http: http}),
        sites  = [];

    testApiCall({
      http: {
        expectations: function(options) {
          expect(options.headers['Authorization']).toEqual("Bearer 1234");
          expect(options.method).toEqual("get");
          expect(options.path).toEqual("/api/v1/sites?page=2&per_page=4");
        },
        headers: {
          link: '<https://api.netlify.com/api/v1/sites?page=3&per_page=4>; rel="next", <https://api.netlify.com/api/v1/sites?page=5&per_page=4>; rel="last"'
        },
        response: [{id: 1}, {id: 2}, {id: 3}, {id: 4}]
      },
      apiCall: function() { client.sites({page: 2, per_page: 4}).then(function(data) { sites = data; }); },
      waitsFor: function() { return sites.length; },
      expectations: function() {
        expect(sites.map(function(s) { return s.id; })).toEqual([1,2,3,4]);
        expect(sites.meta.pagination.next).toEqual(3);
        expect(sites.meta.pagination.last).toEqual(5);
      }
    });
  });

  it("should get a single site", function() {
    var client = netlify.createClient({access_token: "1234", http: http}),
        site   = null;

    testApiCall({
      http: {
        expectations: function(options) {
          expect(options.headers['Authorization']).toEqual("Bearer 1234");
          expect(options.method).toEqual("get");
          expect(options.path).toEqual("/api/v1/sites/123");
        },
        response: {id: "123"}
      },
      apiCall: function() { client.site("123").then(function(data) { site = data; }); },
      waitsFor: function() { return site; },
      expectations: function() {
        expect(site.id).toEqual("123");
      }
    });
  });

  it("should refresh the state of a site", function() {
    var client = netlify.createClient({access_token: "1234", http: http}),
        site   = new netlify.Client.models.Site(client, {id: "123", state: "processing"});

    testApiCall({
      http: {
        expectations: function(options) {
          expect(options.headers['Authorization']).toEqual("Bearer 1234");
          expect(options.method).toEqual("get");
          expect(options.path).toEqual("/api/v1/sites/123");
        },
        response: {id: 123, state: "current"}
      },
      apiCall: function() { site.refresh(); },
      waitsFor: function() { return site.isReady(); },
      expectations: function() {
        expect(site.state).toEqual("current");
      }
    });
  });

  it("should update a site", function() {
    var client = netlify.createClient({access_token: "1234", http: http}),
        site   = new netlify.Client.models.Site(client, {id: "123", name: "test"});

    testApiCall({
      http: {
        expectations: function(options) {
          expect(options.headers['Authorization']).toEqual("Bearer 1234");
          expect(options.method).toEqual("put");
          expect(options.path).toEqual("/api/v1/sites/123");
        },
        response: {id: 123, name: "changed"}
      },
      apiCall: function() { site.update({name: "changed"}).then(function(s) {
        site = s;
      })},
      waitsFor: function() { return site.name == "changed" },
      expectations: function() {
        expect(site.name).toEqual("changed");
      }
    });
  });

  it("should destroy a site", function() {
    var client = netlify.createClient({access_token: "1234", http: http}),
        site   = new netlify.Client.models.Site(client, {id: "123", name: "test"}),
        done   = false;

    testApiCall({
      http: {
        expectations: function(options) {
          expect(options.headers['Authorization']).toEqual("Bearer 1234");
          expect(options.method).toEqual("delete");
          expect(options.path).toEqual("/api/v1/sites/123");
        },
        response: ""
      },
      apiCall: function() { site.destroy().then(function() {
        done = true;
      })},
      waitsFor: function() { return done },
      expectations: function() {
        expect(done).toEqual(true);
      }
    });
  });

  it("should list all forms", function() {
    var client = netlify.createClient({access_token: "1234", http: http}),
        forms = null;

    testApiCall({
      http: {
        expectations: function(options) {
          expect(options.method).toEqual("get");
          expect(options.path).toEqual("/api/v1/forms");
        },
        response: [{id: 1, name: "Form 1"}, {id: 2, name: "Form 2"}]
      },
      apiCall: function() { client.forms().then(function(result) { forms = result; }); },
      waitsFor: function() { return forms; },
      expectations: function() {
        expect(forms.map(function(f) { return f.name; })).toEqual(["Form 1", "Form 2"]);
      }
    });
  });

  it("should list forms for a site", function() {
    var client = netlify.createClient({access_token: "1234", http: http}),
        site   = new netlify.Client.models.Site(client, {id: "123", name: "test"}),
        forms  = null;

    testApiCall({
      http: {
        expectations: function(options) {
          expect(options.method).toEqual("get");
          expect(options.path).toEqual("/api/v1/sites/123/forms");
        },
        response: [{id: 1, name: "Form 1"}, {id: 2, name: "Form 2"}]
      },
      apiCall: function() { site.forms().then(function(result) { forms = result; })},
      waitsFor: function() { return forms; },
      expectations: function() {
        expect(forms.map(function(f) { return f.name })).toEqual(["Form 1", "Form 2"]);
      }
    });
  })

  it("should create a user", function() {
    var client = netlify.createClient({access_token: "1234", http: http}),
        user = null;

    testApiCall({
      http: {
        expectations: function(options) {
          expect(options.method).toEqual("post");
          expect(options.path).toEqual("/api/v1/users");
        },
        response: {id: "123", email: "user@example.com"}
      },
      apiCall: function() {
        client.createUser({email: "user@example.com"}).then(function(u) {
          user = u;
        });
      },
      waitsFor: function() { return user; },
      expectations: function() {
        expect(user.id).toEqual("123");
      }
    })
  });

  it("should update a user", function() {
    var client = netlify.createClient({access_token: "1234", http: http}),
        user   = new netlify.Client.models.User(client, {id: "123", email: "test@example.com"}),
        done   = false;

    testApiCall({
      http: {
        expectations: function(options) {
          expect(options.method).toEqual("put");
          expect(options.path).toEqual("/api/v1/users/123");
        },
        response: {id: "123", email: "user@example.com"}
      },
      apiCall: function() {
        user.update({email: "user@example.com"}).then(function(u) {
          done = true;
        });
      },
      waitsFor: function() { return done; },
      expectations: function() {
        expect(user.email).toEqual("user@example.com");
      }
    });
  });

  it("should destroy a user", function() {
    var client = netlify.createClient({access_token: "1234", http: http}),
        user   = new netlify.Client.models.User(client, {id: "123", email: "test@example.com"}),
        done   = false;

    testApiCall({
      http: {
        expectations: function(options) {
          expect(options.method).toEqual("delete");
          expect(options.path).toEqual("/api/v1/users/123");
        },
        response: ""
      },
      apiCall: function() {
        user.destroy().then(function() {
          done = true;
        });
      },
      waitsFor: function() { return done; },
      expectations: function() {
        expect(done).toEqual(true);
      }
    });
  });

  it("should create a snippet", function() {
    var client  = netlify.createClient({access_token: "1234", http: http}),
        site    = new netlify.Client.models.Site(client, {id: "123", name: "test"}),
        snippet = null;

    testApiCall({
      http: {
        expectations: function(options) {
          expect(options.method).toEqual("post");
          expect(options.path).toEqual("/api/v1/sites/123/snippets");
        },
        response: {general: "<script>alert('Hello')</script>", title: "Alert"}
      },
      apiCall: function() {
        site.createSnippet({
          general: "<script>alert('Hello')</script>",
          title: "Alert"
        }).then(function(s) {
          snippet = s;
        });
      },
      waitsFor: function() { return snippet; },
      expectations: function() {
        expect(snippet.title).toEqual("Alert");
      }
    });
  });

  it("should update a snippet", function() {
    var client  = netlify.createClient({access_token: "1234", http: http}),
        snippet = new netlify.Client.models.Snippet(client, {id: "1", title: "test", site_id: "123"}),
        done    = false;

    testApiCall({
      http: {
        expectations: function(options) {
          expect(options.method).toEqual("put");
          expect(options.path).toEqual("/api/v1/sites/123/snippets/1");
        },
        response: {title: "hello"}
      },
      apiCall: function() {
        snippet.update({
          title: "hello"
        }).then(function(s) {
          done = true;
        });
      },
      waitsFor: function() { return done; },
      expectations: function() {
        expect(snippet.title).toEqual("hello");
      }
    })
  });

  it("should delete a snippet", function() {
    var client  = netlify.createClient({access_token: "1234", http: http}),
        snippet = new netlify.Client.models.Snippet(client, {id: "1", title: "test", site_id: "123"}),
        done    = false;

    testApiCall({
      http: {
        expectations: function(options) {
          expect(options.method).toEqual("delete");
          expect(options.path).toEqual("/api/v1/sites/123/snippets/1");
        },
        response: ""
      },
      apiCall: function() {
        snippet.destroy().then(function(s) {
          done = true;
        });
      },
      waitsFor: function() { return done; },
      expectations: function() {
        expect(done).toEqual(true);
      }
    })
  });

  it("should restore an old deploy", function() {
    var client  = netlify.createClient({access_token: "1234", http: http}),
        deploy = new netlify.Client.models.Deploy(client, {id: "1", state: "old", site_id: "123"}),
        done    = false;

    testApiCall({
      http: {
        expectations: function(options) {
          expect(options.method).toEqual("post");
          expect(options.path).toEqual("/api/v1/sites/123/deploys/1/restore");
        },
        response: {id: "1", state: "current", site_id: "123"}
      },
      apiCall: function() {
        deploy.restore().then(function(s) {
          done = true;
        });
      },
      waitsFor: function() { return done; },
      expectations: function() {
        expect(done).toEqual(true);
      }
    });
  });

  // Node specific methods
  if (typeof(window) === "undefined") {
    var crypto = require('crypto'),
        fs     = require('fs');

    it("should upload a site from a dir", function() {
      var client = netlify.createClient({access_token: "1234", http: http}),
          site   = null,
          shasum = crypto.createHash('sha1');

      shasum.update(fs.readFileSync(__dirname + '/files/site-dir/index.html'));

      var index_sha = shasum.digest('hex');

      testApiCall({
        http: [
          {
            expectations: function(options) {
              expect(options.headers['Authorization']).toEqual("Bearer 1234");
              expect(options.method).toEqual("post");
              expect(options.path).toEqual("/api/v1/sites");
            },
            status: 201,
            response: {id: 123, state: "uploading", required: [index_sha]}
          },
          {
            expectations: function(options) {
              expect(options.headers['Authorization']).toEqual("Bearer 1234");
              expect(options.method).toEqual("post");
              expect(options.path).toEqual("/api/v1/sites/123/deploys");
            },
            status: 201,
            response: {id: 234, state: "uploading", required: [index_sha]}
          },
          {
            expectations: function(options) {
              expect(options.headers['Authorization']).toEqual("Bearer 1234");
              expect(options.method).toEqual("put");
              expect(options.path).toEqual("/api/v1/deploys/234/files/index.html");
            },
            status: 201,
            response: "Hello, World"
          },
          {
            expectations: function(options) {
              expect(options.headers['Authorization']).toEqual("Bearer 1234");
              expect(options.method).toEqual("get");
              expect(options.path).toEqual("/api/v1/deploys/234");
            },
            response: {id: 234, state: "processing"}
          }
        ],
        apiCall: function() { client.createSite({dir: "spec/files/site-dir"}).then(function(s) {
          site = s;
        })},
        waitsFor: function() { return site; },
        expectations: function() {
          expect(site.state).toEqual("uploading");
        }
      });
    });

    it("should upload a site from a zip", function() {
      var client = netlify.createClient({access_token: "1234", http: http}),
          site   = null;

      testApiCall({
        http: [{
          expectations: function(options) {
            expect(options.headers['Authorization']).toEqual("Bearer 1234");
            expect(options.method).toEqual("post");
            expect(options.path).toEqual("/api/v1/sites");
          },
          status: 201,
          response: {id: 123, state: "processing"}
        },
        {
          expectations: function(options) {
            expect(options.headers['Authorization']).toEqual("Bearer 1234");
            expect(options.method).toEqual("post");
            expect(options.path).toEqual("/api/v1/sites/123/deploys");
          },
          status: 201,
          response: {id: 234, state: "processing", required: []}
        }],
        apiCall: function() { client.createSite({zip: "spec/files/site-dir.zip"}).then(function(s) {
          site = s;
        })},
        waitsFor: function() { return site; },
        expectations: function() {
          expect(site.state).toEqual("processing");
        }
      })
    });
  }
});
