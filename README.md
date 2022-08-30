# netlifydd

A tool for quickly deploying prebuilt assets to Netlify.

## Why?

The official Netlify CLI has a ton of dependencies, a lot of which are
are unnecessary if you're just planning to deploy prebuilt assets.

## Getting started

```sh
# install `netlifydd`, preferably as a dev dependency of your project
$ npm install --save-dev @intrnl/netlifydd

# login to your Netlify account
$ npm exec netlifydd login

# link project folder to a Netlify site
$ npm exec netlifydd link

# create a deployment!
$ npm exec netlifydd deploy dist
```

### Single-Page Application setup

Add a file named `_redirects` on your asset directory with the following:

```
/*   /index.html   200
```

### Serverless and Edge Functions?

There's currently no plans to support deploying either serverless or edge
functions. You might be better off with the official Netlify CLI as it offers
you a development environment for working with them locally.
