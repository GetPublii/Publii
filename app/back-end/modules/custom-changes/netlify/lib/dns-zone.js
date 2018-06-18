var model = require("./model"),
    DnsRecord = require("./dns-record").DnsRecord;

var DnsZone = model.constructor();
DnsZone.path = "/dns_zones";

DnsZone.prototype = {
  destroy: function() {
    return this.client.destroy({element: this});
  },
  records: function(options) {
    return this.client.collection({prefix: this.apiPath, model: DnsRecord}, options);
  },
  record: function(id) {
    return this.client.element({prefix: this.apiPath, model: DnsRecord, id: id});
  },
  createRecord: function(attributes) {
    return this.client.create({prefix: this.apiPath, model: DnsRecord, attributes: attributes});
  }
};

exports.DnsZone = DnsZone;
