'use strict';

const { labelTone } = require('../services/tone-analyzer');

/**
 * Build the ThreadTone rewrite modal.
 * @param {{ analysis?: object, channel?: string, threadTs?: string, draft?: string, rewritten?: string, engine?: string }} opts
 */
function buildRewriteModal(opts = {}) {
  const {
    analysis,
    channel = '',
    threadTs = '',
    draft = '',
    rewritten = '',
    engine = '',
  } = opts;

  const privateMetadata = JSON.stringify({ channel, threadTs, engine });

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: analysis
          ? `*Thread read:* ${analysis.summary}`
          : '*No thread context yet.* Use the message shortcut on a thread reply, or paste a draft below.',
      },
    },
  ];

  if (analysis) {
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Tone:* ${labelTone(analysis.primaryTone)}${
            analysis.secondaryTone ? ` · also ${labelTone(analysis.secondaryTone)}` : ''
          }`,
        },
        {
          type: 'mrkdwn',
          text: analysis.topics?.length
            ? `*Topics:* ${analysis.topics.map((t) => `\`${t}\``).join(' ')}`
            : '*Topics:* _(not enough signal)_',
        },
      ],
    });
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'input',
      block_id: 'draft_block',
      optional: false,
      label: { type: 'plain_text', text: 'Your draft' },
      element: {
        type: 'plain_text_input',
        action_id: 'draft_input',
        multiline: true,
        initial_value: draft || undefined,
        placeholder: {
          type: 'plain_text',
          text: 'What you want to say — ThreadTone reshapes it for this thread.',
        },
      },
    },
    {
      type: 'actions',
      block_id: 'rewrite_actions',
      elements: [
        {
          type: 'button',
          action_id: 'run_rewrite',
          text: { type: 'plain_text', text: rewritten ? 'Rewrite again' : 'Rewrite' },
          style: 'primary',
        },
      ],
    },
  );

  if (rewritten) {
    blocks.push(
      { type: 'divider' },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: engine
              ? `Rewritten with *${engine}* — edit freely, then submit to post.`
              : 'Edit freely, then submit to post into the thread.',
          },
        ],
      },
      {
        type: 'input',
        block_id: 'result_block',
        optional: true,
        label: { type: 'plain_text', text: 'Rewritten reply' },
        element: {
          type: 'plain_text_input',
          action_id: 'result_input',
          multiline: true,
          initial_value: rewritten,
        },
      },
    );
  }

  return {
    type: 'modal',
    callback_id: 'rewrite_modal',
    title: { type: 'plain_text', text: 'ThreadTone' },
    submit: { type: 'plain_text', text: 'Post to thread' },
    close: { type: 'plain_text', text: 'Close' },
    private_metadata: privateMetadata,
    blocks,
  };
}

/**
 * Home tab introduction.
 */
function buildHomeView() {
  return {
    type: 'home',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'ThreadTone' },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Rewrite Slack replies so they match the *tone* and *topic* of the thread — especially handy in Slack for Mac.',
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            '*How to use*',
            '1. Open any message → *More actions* → *Rewrite for thread*',
            '2. Or run `/threadtone your draft here` inside a thread',
            '3. Review the tone/topic read, tweak your draft, hit *Rewrite*',
            '4. Edit the result if needed, then *Post to thread*',
          ].join('\n'),
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'Tip: set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for higher-quality rewrites. Without a key, ThreadTone uses a built-in heuristic rewriter.',
          },
        ],
      },
    ],
  };
}

module.exports = {
  buildRewriteModal,
  buildHomeView,
};
