'use strict';

const { fetchThreadContext, resolveThreadTs } = require('../services/thread-context');
const { analyzeThread } = require('../services/tone-analyzer');
const { buildRewriteModal } = require('../blocks/views');

/**
 * Message shortcut: Rewrite for thread
 */
function registerShortcuts(app) {
  app.shortcut('rewrite_for_thread', async ({ shortcut, ack, client, logger }) => {
    await ack();

    try {
      const message = shortcut.message;
      const channel = shortcut.channel?.id || message?.channel;
      const threadTs = resolveThreadTs(message);

      if (!channel || !threadTs) {
        await client.views.open({
          trigger_id: shortcut.trigger_id,
          view: buildRewriteModal({ draft: message?.text || '' }),
        });
        return;
      }

      const context = await fetchThreadContext(client, { channel, threadTs });
      const analysis = analyzeThread(context.messages);

      await client.views.open({
        trigger_id: shortcut.trigger_id,
        view: buildRewriteModal({
          analysis,
          channel,
          threadTs,
          draft: '',
        }),
      });
    } catch (error) {
      logger.error(error);
    }
  });
}

module.exports = { registerShortcuts };
