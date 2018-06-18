var model = require("./model"),
    DnsZone = require("./dns-zone");

var DnsRecord = model.constructor();
DnsRecord.path = "/dns_records";

DnsRecord.prototype = {
  destroy: function() {
    return this.client.destroy({prefix: "/dns_zones/" + this.domain_id, element: this});
  },
};

exports.DnsRecord = DnsRecord;
