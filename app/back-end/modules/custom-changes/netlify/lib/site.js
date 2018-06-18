var path       = require("path"),
    when       = require("when"),
    nodefn     = require("when/node"),
    glob       = require("glob"),
    crypto     = require("crypto"),
    fs         = require("fs");
    model      = require("./model"),
    Form       = require("./form").Form,
    Submission = require("./submission").Submission,
    File       = require("./file").File,
    Snippet    = require("./snippet").Snippet,
    Deploy     = require("./deploy").Deploy;

var Site = model.constructor();
Site.path = "/sites";

var MaxFilesForSyncDeploy = 1000;

function globFiles(dir) {
  return nodefn.call(glob, "**/*", {cwd: dir}).then(function(files) {
    var filtered = files.filter(function(file) {
      return file.match(/(\/__MACOSX|\/\.)/) ? false : true;
    }).map(function(file) { return {rel: file, abs: path.resolve(dir, file)}; });

    return filterFiles(filtered);
  })
};

function filterFiles(filesAndDirs) {
  var lstats = filesAndDirs.map(function(fileOrDir) {
    return nodefn.call(fs.lstat, fileOrDir.abs)
  });

  return when.all(lstats).then(function(fileData) {
    var result = [];
    for (var i=0,len=fileData.length; i<len; i++) {
      var file = filesAndDirs[i],
          data = fileData[i];

      if (data.isFile()) {
        result.push(file);
      }
    }
    return result;
  });
};

function calculateShas(files) {
  var shas = files.map(function(file) {
    return nodefn.call(fs.readFile, file.abs).then(function(data) {
      var shasum = crypto.createHash('sha1');
      shasum.update(data);
      file.sha = shasum.digest('hex');
      return true;
    });
  });

  return when.all(shas).then(function() {
    var result = {};
    files.forEach(function(file) {
      result[file.rel] = file.sha;
    });
    return {files: files, shas: result};
  });
};

function deployFromDir(site, dir, draft, progress) {
  var fullDir = path.resolve(dir);

  return nodefn.call(fs.stat, fullDir).then(function(stat) {
    if (stat.isFile()) {
      throw("No such dir " + dir + " (" + fullDir + ")");
    }

    return globFiles(fullDir).then(calculateShas).then(function(filesWithShas) {
      var params = {
        files: filesWithShas.shas,
        draft: draft
      };
      if (Object.keys(filesWithShas.shas).length > MaxFilesForSyncDeploy) {
        params.async = true;
      }

      return site.client.request({
        url: site.apiPath + "/deploys",
        type: "post",
        body: JSON.stringify(params)
      }).then(function(response) {
        return new Deploy(site.client, response.data);
      }).then(function(deploy) {
        return params.async ? deploy.waitForPreparation() : deploy;
      }).then(function(deploy) {
        var shas = {};
        deploy.required.forEach(function(sha) { shas[sha] = true; });
        var filtered = filesWithShas.files.filter(function(file) { return shas[file.sha]; });
        return deploy.uploadFiles(filtered, progress);
      });
    });
  }).catch(function(err) {
    return when.reject(err);
  });
};

function deployFromZip(site, zip, draft) {
  var fullPath = zip.match(/^\//) ? zip : process.cwd() + "/" + zip;

  return nodefn.call(fs.readFile, fullPath).then(function(zipData) {
    var path = site.apiPath + "/deploys";

    if (draft) { path += "?draft=true"; }

    return site.client.request({
      url: path,
      type: "post",
      body: zipData,
      contentType: "application/zip"
    }).then(function(response) {
      return new Deploy(site.client, response.data);
    });
  });
};

var attributesForUpdate = function(attributes) {
  var mapping = {
        name: "name",
        customDomain: "custom_domain",
        notificationEmail: "notification_email",
        password: "password",
        github: "github",
        repo: "repo",
        domainAliases: "domain_aliases"
      },
      result = {};

  for (var key in attributes) {
    if (mapping[key]) result[mapping[key]] = attributes[key];
  }

  return result;
};

Site.createFromDir = function(client, dir, progress) {
  return Site.create(client, {}).then(function(site) {
    return site.createDeploy({dir: dir, progress: progress}).then(function(deploy) {
      site.deploy_id = deploy.id;
      return site;
    });
  });
};

Site.createFromZip = function(client, zip) {
  return Site.create(client, {}).then(function(site) {
    return site.createDeploy({zip: zip}).then(function(deploy) {
      site.deploy_id = deploy.id;
      return site;
    });
  });
};

Site.create = function(client, attributes) {
  return client.create({model: Site, attributes: attributesForUpdate(attributes)});
};

Site.prototype = {
  isReady: function() {
    return this.state == "current";
  },
  refresh: function() {
    var self = this;
    return this.client.request({
      url: "/sites/" + this.id
    }).then(function(response) {
      Site.call(self, response.client, response.data);
      return self;
    });
  },

  update: function(attributes) {
    attributes = attributes || {};

    var self = this;

    if (attributes.dir) {
      return createFromDir(this.client, attributes.dir, this.id);
    } else if (attributes.zip) {
      return createFromZip(this.client, attributes.zip, this.id);
    } else {
      return this.client.update({model: Site, element: this, attributes: attributesForUpdate(attributes)});
    }
  },

  destroy: function() {
    return this.client.destroy({element: this});
  },

  createDeploy: function(attributes) {
    if (attributes.dir) {
      return deployFromDir(this, attributes.dir, attributes.draft || false, attributes.progress);
    } else if (attributes.zip) {
      return deployFromZip(this, attributes.zip, attributes.draft || false);
    } else {
      return when.reject("You must specify a 'dir' or a 'zip' to deploy");
    }
  },

  createDraftDeploy: function(attributes) {
    attributes.draft = true;
    return this.createDeploy(attributes);
  },

  waitForReady: function() {
    if (this.isReady()) {
      return when.resolve(this);
    }

    return when.resolve().delay(1000).then(this.refresh.bind(this)).then(this.waitForReady.bind(this));
  },

  forms: function(options) {
    return this.client.collection({prefix: this.apiPath, model: Form}, options);
  },

  submissions: function(options) {
    return this.client.collection({prefix: this.apiPath, model: Submission}, options);
  },

  files: function() {
    return this.client.collection({prefix: this.apiPath, model: File});
  },

  file: function(path) {
    return this.client.element({prefix: this.apiPath, model: File, id: path});
  },

  snippets: function() {
    return this.client.collection({prefix: this.apiPath, model: Snippet});
  },

  snippet: function(id) {
    return this.client.element({prefix: this.apiPath, model: Snippet, id: id});
  },

  createSnippet: function(attributes) {
    return this.client.create({prefix: this.apiPath, model: Snippet, attributes: attributes});
  },

  deploys: function(options) {
    return this.client.collection({prefix: this.apiPath, model: Deploy}, options);
  },

  deploy: function(id) {
    return this.client.element({prefix: this.apiPath, model: Deploy, id: id});
  }
};

exports.Site = Site;
