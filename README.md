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

### Informative deployment info

Here's a shell script you can use to provide the Git commit and branch name used
for deployment.

```sh
#!/usr/bin/env bash

if [[ -n $(git status --porcelain) ]]; then
	echo 'Working directory is not clean'
	git status --short
	exit 1
fi

GIT_BRANCH=$(git rev-parse --symbolic-full-name --abbrev-ref HEAD)
GIT_COMMIT=$(git rev-parse HEAD)
npm exec netlifydd deploy -m "${GIT_BRANCH} ${GIT_COMMIT}" dist/
```
