/**
 * Mars is a stand-alone Meteor implementation with
 * latency compensation.
 *
 * This class is just a deligate for a set
 * of managers.
 */
export class Mars {
  // @ngInject
  constructor(SubscriptionManager, MethodCallManager, CollectionManager) {
    this.SubscriptionManager = SubscriptionManager;
    this.MethodCallManager = MethodCallManager;
    this.CollectionManager = CollectionManager;
  }

  collection(...args) {
    return this.CollectionManager.getCollection(...args);
  }

  subscribe(...args) {
    return this.SubscriptionManager.subscribe(...args);
  }

  call(...args) {
    return this.MethodCallManager.call(...args);
  }

  apply(...args) {
    return this.MethodCallManager.apply(...args);
  }
}
