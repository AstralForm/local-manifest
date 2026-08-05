'use strict';

const { fetchThreadContext } = require('../../services/thread-context');
const { analyzeThread } = require('../../services/tone-analyzer');
const { buildRewriteModal } = require('../../blocks/views');

/**
 * /threadtone [draft]
 * Opens the rewrite modal. If invoked in a thread, loads that thread's context.
 */
function registerCommands(app) {
  app.command('/threadtone', async ({ command, ack, client, logger }) => {
    await ack();

    try {
      const draft = (command.text || '').trim();
      const channel = command.channel_id;
      const threadTs = command.thread_ts || null;

      let analysis;
      if (channel && threadTs) {
        const context = await fetchThreadContext(client, { channel, threadTs });
        analysis = analyzeThread(context.messages);
      }

      await client.views.open({
        trigger_id: command.trigger_id,
        view: buildRewriteModal({
          analysis,
          channel,
          threadTs: threadTs || '',
          draft,
        }),
      });
    } catch (error) {
      logger.error(error);
    }
  });
}

module.exports = { registerCommands };
