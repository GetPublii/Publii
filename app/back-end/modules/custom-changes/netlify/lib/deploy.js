var when      = require("when"),
    nodefn    = require("when/node"),
    semaphore = require("semaphore"),
    model     = require("./model");

if (typeof(require) !== 'undefined') {
  var fs = require("graceful-fs");
}

var Deploy = model.constructor();
Deploy.path = "/deploys";

Deploy.prototype = {
  isReady: function() {
    return this.state == "ready" || this.state == "current";
  },
  isPrepared: function() {
    return this.isReady() || this.state === "prepared";
  },
  restore: function() {
    var self = this;
    return this.client.request({
      url: "/sites/" + this.site_id + "/deploys/" + this.id + "/restore",
      type: "post"
    }).then(function(response) {
      Deploy.call(self, response.client, response.data);
      return self;
    }).catch(function(response) {
      return when.reject(response.data);
    });
  },
  publish: function() {
    return this.restore();
  },
  waitForReady: function() {
    if (this.isReady()) {
      return when.resolve(this);
    } else {
      return when.resolve().delay(1000).then(this.refresh.bind(this)).then(this.waitForReady.bind(this));
    }
  },
  waitForPreparation: function() {
    if (this.isPrepared()) {
      return when.resolve(this);
    } else {
      return when.resolve().delay(1000).then(this.refresh.bind(this)).then(this.waitForPreparation.bind(this));
    }
  },
  uploadFiles: function(files, progress) {
    if (!(this.state == "uploading" || this.state == "prepared")) return when.resolve(this);
    if (files.length == 0) { return this.refresh(); }

    progress && progress("start", {total: files.length});

    var self = this;
    var sem = semaphore(2);
    var results = files.map(function(file) {
      sem.take(function() {
        return nodefn.call(fs.readFile, file.abs).then(function(data) {
          var filePath = file.rel.split("/").map(function(segment) {
            return encodeURIComponent(segment);
          }).join("/");

          return self.client.request({
            url: "/deploys/" + self.id + "/files/" + filePath,
            type: "put",
            body: data,
            contentType: "application/octet-stream",
            ignoreResponse: true
          }).then(function(response) {
            progress && progress("upload", {file: file, total: files.length});
            sem.leave();
            return file;
          }).catch(function(response) {
            progress && progress("uploadError", {file:file, message: response.data});
            sem.leave();
            return when.reject(response.data);
          });
        });
      });
    });

    return when.all(results).then(self.refresh.bind(self));
  }
};

exports.Deploy = Deploy;
