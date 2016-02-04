import Collection from 'marsdb';
import MarsClient from 'marsdb-sync-client';

if (typeof window !== 'undefined') {
  MarsClient.configure({ url: 'ws://localhost:3000' });
  Collection.defaultStorageManager(require('marsdb-localforage'));
}

export default Collection;