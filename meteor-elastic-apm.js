/* eslint-disable no-undef */
const shimmer = require('shimmer');
const Fibers = require('fibers');
const Agent = require('elastic-apm-node');

const { Session, Subscription, MongoCursor } = require('./meteorx');

const instrumentErrors = require('./instrumenting/errors');
const instrumentHttp = require('./instrumenting/http');
const instrumentSession = require('./instrumenting/session');
const instrumentSubscription = require('./instrumenting/subscription');
const instrumentAsync = require('./instrumenting/async');
const instrumentDB = require('./instrumenting/db');

shimmer.wrap(Agent, 'start', function(startAgent) {
  return function(...args) {
    const config = args[0] || {};

    if (config.active !== false) {
      Meteor.startup(() => {
        const [framework, version] = Meteor.release.split('@');

        Agent.setFramework({
          name: framework,
          version
        });

        instrumentErrors(Agent, Meteor);
        instrumentHttp(Agent, WebApp);
        instrumentSession(Agent, Session);
        instrumentSubscription(Agent, Subscription);
        instrumentAsync(Agent, Fibers);
        instrumentDB(Agent, Meteor, MongoCursor);

        try {
          startAgent.apply(Agent, args);

          Agent.logger.info('meteor-elastic-apm completed instrumenting');
        } catch (e) {
          Agent.logger.error('Could not start meteor-elastic-apm');
        }
      });
    } else {
      Agent.logger.warn('meteor-elastic-apm is not active');
    }
  };
});

module.exports = Agent;
