const client = require('./dist');
module.exports = {
  configure: client.configure,
  apply: client.apply,
  call: client.call,
  subscribe: client.subsctibe,
};
