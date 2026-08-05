'use strict';

const { buildHomeView } = require('../../blocks/views');

function registerEvents(app) {
  app.event('app_home_opened', async ({ event, client, logger }) => {
    if (event.tab !== 'home') return;
    try {
      await client.views.publish({
        user_id: event.user,
        view: buildHomeView(),
      });
    } catch (error) {
      logger.error(error);
    }
  });
}

module.exports = { registerEvents };
