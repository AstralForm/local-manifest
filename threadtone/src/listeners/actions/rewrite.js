'use strict';

const { fetchThreadContext } = require('../../services/thread-context');
const { analyzeThread } = require('../../services/tone-analyzer');
const { rewriteMessage } = require('../../services/rewriter');
const { buildRewriteModal } = require('../../blocks/views');

function parseMetadata(view) {
  try {
    return JSON.parse(view.private_metadata || '{}');
  } catch {
    return {};
  }
}

function getDraft(view) {
  return view.state?.values?.draft_block?.draft_input?.value || '';
}

function getResult(view) {
  return view.state?.values?.result_block?.result_input?.value || '';
}

/**
 * Button: run rewrite (updates the modal in place).
 */
function registerActions(app) {
  app.action('run_rewrite', async ({ ack, body, client, logger }) => {
    await ack();

    try {
      const view = body.view;
      const meta = parseMetadata(view);
      const draft = getDraft(view);

      if (!draft.trim()) {
        await client.views.update({
          view_id: view.id,
          hash: view.hash,
          view: buildRewriteModal({
            channel: meta.channel,
            threadTs: meta.threadTs,
            draft: '',
          }),
        });
        return;
      }

      let analysis;
      let threadMessages = [];

      if (meta.channel && meta.threadTs) {
        const context = await fetchThreadContext(client, {
          channel: meta.channel,
          threadTs: meta.threadTs,
        });
        threadMessages = context.messages;
        analysis = analyzeThread(context.messages);
      } else {
        analysis = analyzeThread([draft]);
      }

      const result = await rewriteMessage({
        draft,
        analysis,
        threadMessages,
      });

      await client.views.update({
        view_id: view.id,
        hash: view.hash,
        view: buildRewriteModal({
          analysis,
          channel: meta.channel,
          threadTs: meta.threadTs,
          draft,
          rewritten: result.text,
          engine: result.engine,
        }),
      });
    } catch (error) {
      logger.error(error);
      try {
        const meta = parseMetadata(body.view);
        await client.views.update({
          view_id: body.view.id,
          view: buildRewriteModal({
            channel: meta.channel,
            threadTs: meta.threadTs,
            draft: getDraft(body.view),
            rewritten: `Could not rewrite: ${error.message}`,
            engine: 'error',
          }),
        });
      } catch (nested) {
        logger.error(nested);
      }
    }
  });
}

/**
 * Modal submit: post rewritten text to the thread (or channel).
 */
function registerViews(app) {
  app.view('rewrite_modal', async ({ ack, view, client, logger, body }) => {
    const meta = parseMetadata(view);
    const draft = getDraft(view);
    const result = getResult(view);

    if (!meta.channel) {
      await ack({
        response_action: 'errors',
        errors: {
          draft_block:
            'Open ThreadTone from a message shortcut (or /threadtone in a thread) so it knows where to post.',
        },
      });
      return;
    }

    let textToPost = (result || draft || '').trim();

    if (!textToPost) {
      await ack({
        response_action: 'errors',
        errors: { draft_block: 'Add a draft before posting.' },
      });
      return;
    }

    await ack();

    try {
      // If user never hit Rewrite, do a final pass on submit
      if (!result) {
        let analysis;
        let threadMessages = [];
        if (meta.threadTs) {
          const context = await fetchThreadContext(client, {
            channel: meta.channel,
            threadTs: meta.threadTs,
          });
          threadMessages = context.messages;
          analysis = analyzeThread(context.messages);
        } else {
          analysis = analyzeThread([draft]);
        }
        const rewritten = await rewriteMessage({ draft, analysis, threadMessages });
        textToPost = rewritten.text;
      }

      await client.chat.postMessage({
        channel: meta.channel,
        thread_ts: meta.threadTs || undefined,
        text: textToPost,
      });
    } catch (error) {
      logger.error(error);
      try {
        await client.chat.postEphemeral({
          channel: meta.channel,
          user: body.user.id,
          thread_ts: meta.threadTs || undefined,
          text: `ThreadTone could not post: ${error.message}`,
        });
      } catch (nested) {
        logger.error(nested);
      }
    }
  });
}

module.exports = { registerActions, registerViews };
