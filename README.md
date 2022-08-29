# netlifydd

A tool for quickly deploying prebuilt assets to Netlify.

## Why?

The official `netlify-cli` package has a ton of dependencies, a lot of which
are unnecessary for deploying prebuilt assets.

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
