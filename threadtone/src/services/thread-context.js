'use strict';

/**
 * Fetch recent messages in a thread (or the parent message alone).
 * @param {import('@slack/web-api').WebClient} client
 * @param {{ channel: string, threadTs: string }} params
 */
async function fetchThreadContext(client, { channel, threadTs }) {
  const result = await client.conversations.replies({
    channel,
    ts: threadTs,
    limit: 40,
    inclusive: true,
  });

  const messages = (result.messages || []).filter((m) => !m.subtype || m.subtype === 'thread_broadcast');
  const texts = messages
    .map((m) => (m.text || '').trim())
    .filter(Boolean);

  return {
    channel,
    threadTs,
    messageCount: texts.length,
    messages: texts,
    rawMessages: messages,
  };
}

/**
 * Resolve thread ts from a message payload (parent or reply).
 */
function resolveThreadTs(message) {
  if (!message) return null;
  return message.thread_ts || message.ts || null;
}

module.exports = {
  fetchThreadContext,
  resolveThreadTs,
};
