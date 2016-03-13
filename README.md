[MarsDB DDP Client](https://github.com/c58/marsdb-sync-client)
=========

[![Build Status](https://travis-ci.org/c58/marsdb-sync-client.svg?branch=master)](https://travis-ci.org/c58/marsdb-sync-client)
[![npm version](https://badge.fury.io/js/marsdb-sync-client.svg)](https://www.npmjs.com/package/marsdb-sync-client)
[![Coverage Status](https://coveralls.io/repos/c58/marsdb-sync-client/badge.svg?branch=master&service=github)](https://coveralls.io/github/c58/marsdb-sync-client?branch=master)
[![Dependency Status](https://david-dm.org/c58/marsdb-sync-client.svg)](https://david-dm.org/c58/marsdb-sync-client)

It's a Meteor compatible [DDP](https://github.com/meteor/meteor/blob/devel/packages/ddp/DDP.md) client, based on [MarsDB](https://github.com/c58/marsdb). It supports **methods**, **pub/sub** and **collection operations**. It is very similar to Meteor, but it also have some killer features...

## Features

* **Cache collections** – with [LocalForage](https://github.com/c58/marsdb-localforage), for example
* **Auto subcribe/unsubscribe** - see [examples](https://github.com/c58/marsdb-sync-client#examples)
* **Smart subscriptions** – any subscription will be stopped only after 15 sec delay.
* **Framework agnostic**
* **Works in any JS environment** – browser, Node.JS, Electron, NW.js, Cordova

## WARNING

It's only a concept until 1.0. Use it for your own risk.

## Examples

### Basic example
The repository comes with a simple example. To try it out:

```
git clone https://github.com/c58/marsdb-sync-client.git
cd marsdb-sync-client/example && npm install
npm start
```

Then, just point your browser at `http://localhost:3000`.

### Usage with Meteor server and LocalForage
`marsdb-sync-client` is a DDP client, so it should work well with Meteor server.
But it have an extension for syncing local cache with a server side. The extension is
implemented by `marsdb-sync-server` and is follow:

  * Each collection have additional server method called `/${myCollection}/sync`
  * This method invoked by MarsSync client on init stage for each collection
  * Method invoked with one argument: list of all available document ids in a local cache
  * Method must return a sublist of given ids that is NOT presented in a server anymore (deleted ids).

You should implement it by yourself for each collection in Meteor's server-side code.
In the future it might be a package for Meteor (it would be great if you implement it).

Example of a sync method for some collection:

```javascript
// /server/collections/Posts.js
Posts = new Meteor.Collection('posts');

Meteor.methods({
  '/posts/sync': function(remoteIds) {
    const existingDocs = Posts.find({_id: {$in: remoteIds}}, {fields: {_id: 1}}).fetch();
    const existingIdsSet = new Set(existingDocs.map(doc => doc._id));
    return remoteIds.filter(id => !existingIdsSet.has(id));
  }
});
```

### Configure a client
```javascript
import Collection from 'marsdb';
import * as MarsSync from 'marsdb-sync-client';

// Setup marsdb-sync-client
MarsSync.configure({ url: 'ws://localhost:3000' });

// User your collections
const posts = new Collection('posts');
const observer = posts.find(
  {author: 'me'},
  {sub: ['postsByAuthor', 'me']}
).observe((posts) => {
  // Subscribe to "postsByAuthor" publisher and update any time when
  // some documents added (but with debounce)
});

// When you stop all observers of a cursor
// subscription will be automatically stopped
// (after 15 sec for optimal client/server communication)
observer.stop();
```

### Wait for subscription ready
```javascript
// Sometimes you need to show a result only when
// all documents of a subscription received.
// There is special options "waitReady" for this.
const posts = new Collection('posts');
posts.find(
  {author: 'me'},
  {sub: ['postsByAuthor', 'me'], waitReady: true}
).observe((posts) => {
  // Subscribe to "postsByAuthor" publisher and wait until
  // subscription ready (observer called only when sub ready)
});
```

### Decide when to use cache
```javascript
// Cache is good, but sometimes you need to decide when to use
// cache, and when to wait new data from the server...
const posts = new Collection('posts');
posts.find(
  {author: 'me'},
  {sub: ['postsByAuthor', 'me'], tryCache: true}
).observe((posts) => {
  // Subscribe to "postsByAuthor" publisher and try
  // to get posts from cache. If "tryCache" is true, then
  // cache is used when it's not empty array or not empty object.
  // In other cases it will wait subscription ready.
});

posts.find(
  {author: 'not_me'},
  {sub: ['postsByAuthor', 'not_me'], tryCache: (posts) => true}
).observe((posts) => {
  // Subscribe to "postsByAuthor" publisher and try
  // to get posts from cache. If "tryCache" is a function, then
  // the function will be called with cache result. If function returns
  // true, then cache will be used.
});
```

### Methods and subscriptions
```javascript
import * as MarsSync from 'marsdb-sync-client';

MarsSync.call('myMethod', 1, 2, 3).result().then((res) => {
  // Result of the method in "res"
}).updated().then(() => {
  // Invoked when "updated" message received.
});

// Similar for "apply"
MarsSync.apply('myMethod', [1, 2, 3])

// You can also subscribe just like in Meteor
const sub = MarsSync.subscribe('myPublisher', 1, 2, '3th arg');
sub.ready().then(() => {
  // When ready
}).stopped().then(() => {
  // When stopped
});
// Stop the subscription
sub.stop();
```

## Roadmap
* More examples of usage and tests
* Documentation

## Contributing
I'm waiting for your pull requests and issues.
Don't forget to execute `gulp lint` before requesting. Accepted only requests without errors.

## License
See [License](LICENSE)
