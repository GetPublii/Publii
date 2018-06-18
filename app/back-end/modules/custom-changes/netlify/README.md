Netlify Node Client
======================

Netlify is a hosting service for the programmable web. It understands your documents, processes forms and lets you do deploys, manage forms submissions, inject javascript snippets into sites and do intelligent updates of HTML documents through it's API.

Installation
============

Install by running

    npm install netlify


Authenticating
==============

Register a new application at https://app.netlify.com/applications to get your Oauth2 secret and key.

Once you have your credentials you can instantiate a Netlify client.

```js
var netlify = require("netlify"),
    client     = netlify.createClient(options);
```

Typically you'll have an `access_token` stored that you want to instantiate the client with:

```
var client = netlify.createClient({access_token: "my-access-token"});
```

A client need an access token before it can make requests to the Netlify API. Oauth2 gives you two ways to get an access token:

1. **Authorize from credentials**: Authenticate directly with your API credentials.
2. **Authorize from a URL**: send a user to a URL, where she can grant your access API access on her behalf.

The first method is the simplest, and works when you don't need to authenticate on behalf of some other user:

```js
var client = netlify.createClient({client_id: CLIENT_ID, client_secret: CLIENT_SECRET});

client.authorizeFromCredentials().then(function(access_token) {
  // Client is now ready to do requests
  // You can store the access_token to avoid authorizing in the future
});

```
To authorize on behalf of a user, you first need to send the user to a Netlify url where she'll be asked to grant your application permission. Once the user has visited that URL, she'll be redirected back to a redirect URI you specify (this must match the redirect URI on file for your Application). When the user returns to your app, you'll be able to access a `code` query parameter, that you can use to obtain the final `access_token`

```js
var client = netlify.createClient({
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  redirect_uri: "http://www.example.com/callback"
});

var url = client.authorizeUrl();

// Send the client to the url, they will be redirected back to the redirect_uri
// Once they are back at your url, grab the code query param and use it to authorize

client.authorizeFromCode(params.code).then(function(access_token) {
  // Client is now ready to do requests
  // You can store the access_token to avoid authorizing in the future  
});
```

Deploy a new version of a site
==============================

If you're just going to deploy a new version of a site from a script, the module exports a simple deploy method that will handle this:

```js
var netlify = require("netlify");

netlify.deploy({access_token: "some-token", site_id: "some-site", dir: "/path/to/site"}).then(function(deploy) {
  console.log("New deploy is live");
});
```

Sites
=====

Getting a list of all sites you have access to:

```js
client.sites().then(function(sites) {
  // do work
});
```

Getting a specific site by id:

```js
client.site(id).then(function(site) {
  // do work
})
```

Creating a new empty site:

```js
client.createSite({
  name: "my-unique-site-name",
  domain: "example.com",
  password: "secret"
}).then(function(site) {
  console.log(site);
})
```

To deploy a site from a dir and wait for the processing of the site to finish:

```js
client.createSite({}).then(function(site) {
  site.createDeploy({dir: "/tmp/my-site"}).then(function(deploy) {
    deploy.waitForReady().then(function() {
      console.log("Deploy is done: ", deploy);
    });
  });
});
```

Creating a new deploy for a site from a zip file:

```ruby
client.site(id).then(function(site) {
  site.createDeploy({zip: "/tmp/my-site.zip"}).then(function(deploy) {
    deploy.waitForReady().then(function() {
      console.log("Site redeployed");
    });
  });
});
```

Update the name of the site (its subdomain), the custom domain and the notification email for form submissions:

```js
site.update({name: "my-site", customDomain: "www.example.com", notificationEmail: "me@example.com", password: "secret"}).then(function(site) {
  console.log("Updated site");
});
```

Deleting a site:

```js
site.destroy().then(function() {
  console.log("Site deleted");
});
```

Pagination and Rate Limits
==========================

Any collection returned by the client will have a meta attribute that lets you check pagination and rate limit values:

```js
client.sites().then(function(sites) {
  // Pagination has first, next, prev and last
  console.log(sites.meta.pagination);
  // Rate has the rate limit, remaining requests and the unix timestamp when the limit will reset
  console.log(sites.meta.rate);
});
```

You can use `page` and `per_page` as options to any of the paginatied collection methods:

```js
client.sites({page: 2, per_page: 10}).then(function(sites) {
  console.log("Page 2: ", sites);
});
```

Forms
=====

Access all forms you have access to:

```js
client.forms().then(function(forms) {
  // do work
})
```

Access forms for a specific site:

```js
client.site(id).then(function(site) {
  site.forms().then(function(forms) {
    // do work
  });
});
```

Access a specific form:

```js
client.form(id).then(function(form) {
  // do work
});
```

Access a list of all form submissions you have access to:

```js
client.submissions().then(function(submissions) {
  // do work
});
```

Access submissions from a specific site:

```js
client.site(id).then(function(site) {
  site.submissions().then(function(submissions) {
    // do work
  });
});
```

Access submissions from a specific form:

```js
client.form(id).then(function(form) {
  form.submissions().then(function(submissions) {
    // do work
  });
});
```

Get a specific submission:

```js
client.submission(id).then(function(submission) {
  // do work
})
```

Files
=====

Access all files in a site:

```js
client.site(id).then(function(site) {
  site.files().then(function(files) {
    // do work
  });
});
```

Get a specific file:

```js
client.site(id).then(function(site) {
  site.file(path).then(function(file) {
    // do work
  });
});
```

Deploys
=======

Access all deploys for a site:

```js
site.deploys().then(function(deploys) {
  // do work
});
```

Access a specific deploy:

```js
site.deploy(id).then(function(deploy) {
  // do work
});
```

Create a new deploy:

```js
site.createDeploy({dir: "/path/to/folder"}).then(function(deploy) {
  console.log(deploy)
})
```

Create a draft deploy (wont get published after processing):

```js
site.createDeploy({dir: "/path/to/folder", draft: true}).then(function(deploy) {
  console.log(deploy);
})
```

Publish a deploy (makes it the current live version of the site):

```js
site.deploy(id).then(function(deploy) {
  deploy.publish().then(function(deploy) {
    // restored
  });
});
```


Snippets
========

Snippets are small code snippets injected into all HTML pages of a site right before the closing head or body tag. To get all snippets for a site:

```js
client.site(id).then(function(site) {
  site.snippets().then(function(snippets) {
    // do work
  });
});
```

Get a specific snippet:

```js
client.site(id).then(function(site) {
  site.snippet(snippetId).then(function(snippet) {
    // do work
  });
});
```

Add a snippet to a site

You can specify a `general` snippet that will be inserted into all pages, and a `goal` snippet that will be injected into a page following a successful form submission. Each snippet must have a title. You can optionally set the position of both the general and the goal snippet to `head` or `footer` to determine if it gets injected into the head tag or at the end of the page.

```js
client.site(id).then(function(site) {
  site.createSnippet({
    general: "<script>alert('Hello')</script>",
    general_position: "head",
    goal: "<script>alert('Success')</script>",
    goal_position: "footer",
    title: "Alerts"
  }).then(function(snippet) {
    console.log(snippet);
  });
});
```

Update a snippet:

```js
snippet.update({
  general: "<script>alert('Hello')</script>",
  general_position: "head",
  goal: "<script>alert('Success')</script>",
  goal_position: "footer",
  title: "Alerts"
}).then(function(snippet) {
  console.log(snippet);
});
```

Delete a snippet:

```js
snippet.destroy().then(function() {
  console.log("Snippet deleted");
});
```

Users
=====

The user methods are mainly useful for resellers. Creating, deleting and updating users are limited to resellers.

Getting a list of users:

```js
client.users().then(function(users) {
  // do work
});
```

Getting a specific user:

```js
client.user(id).then(function(user) {
  // do work
});
```

Creating a new user (`email` is required, `uid` is optional. Both must be unique):

```js
client.createUser({email: "user@example.com", uid: "12345"}).then(function(user) {
  console.log(user);
});
```

Updating a user:

```js
client.user(id).then(function(user) {
  user.update({email: "user@example.com", uid: "12345"}).then(function(user) {
    console.log(user);
  });
});
```

Deleting a user:

```js
client.user(id).then(function(user) {
  user.destroy().then(function() {
    console.log("User deleted");
  });
});
```

Getting sites belonging to a user:

```js
client.user(id).then(function(user) {
  user.sites().then(function(sites) {
    console.log(sites);
  });
});
```

DNS
===

Resellers can create and manage DNS Zones through the Netlify API.

Getting a list of DNS Zones:

```js
client.dnsZones().then(function(zones) {
  console.log(zones);
});
```

Getting a specific DNS zone:

```js
client.dnsZone(id).then(function(zone) {
  console.log(zone);
});
```

Creating a new zone:

```js
client.createDnsZone({name: "example.com"}).then(function(zone) {
  console.log(zone);
});
```

Deleting a zone:

```js
client.dnsZone(id).then(function(zone) {
  zone.destroy().then(function() {
    // Deleted
  });
});
```

Getting records for a zone:

```js
zone.records().then(function(records) {
  console.log(records);
});
```

Getting a specific record:

```js
zone.record(id).then(function(record) {
  console.log(record);
});
```

Adding a new record (supported types: A, CNAME, TXT, MX):

```js
zone.createRecord({
  hostname: "www",
  type: "CNAME",
  value: "netlify.com",
  ttl: 3600
}).then(function(record) {
  console.log(record);
});
```

Deleting a record:

```js
record.destroy().then(function() {
  // deleted
});
```

Access Tokens
=============

Resellers can use the node client to create and revoke access tokens on behalf of their users. To use any of these methods your OAuth access token must belong to a reseller admin user.

Creating an access token:

```js
client.createAccessToken({user: {email: "test@example.com", uid: "1234"}}).then(function(accessToken) {
  // accessToken.access_token
});
```

The user must have either an email or a uid (or both) as a unique identifier. If the user doesn't exist, a new user will be created on the fly.

Deleting an access token:

```js
client.accessToken("token-string").then(function(accessToken) {
  accessToken.destroy().then(function() {
    console.log("Access token revoked");
  });
});
```
