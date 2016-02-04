import { method } from 'marsdb-sync-server';


method('sayHello', (ctx, name = 'unknown') => {
  const msg = 'Hello, ' + name;
  console.log(msg);
  return msg;
});
