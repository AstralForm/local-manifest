'use strict';

const TONE_SIGNALS = {
  formal: {
    weight: 0,
    patterns: [
      /\b(please|kindly|regarding|pursuant|appreciate|regarding|would you|could you|thank you)\b/i,
      /\b(as discussed|per our|following up|for your consideration)\b/i,
      /\b(dear|regards|sincerely|respectfully)\b/i,
    ],
  },
  casual: {
    weight: 0,
    patterns: [
      /\b(hey|hiya|yo|lol|haha|gonna|wanna|kinda|btw|fyi|tbh|imo)\b/i,
      /(!{2,}|\?{2,}|😂|😅|🙌|👍)/,
      /\b(cool|awesome|nice|sweet|yeah|yep|nah)\b/i,
    ],
  },
  urgent: {
    weight: 0,
    patterns: [
      /\b(asap|urgent|immediately|blocker|blocking|critical|p0|sev-?1|right now|today)\b/i,
      /\b(need this|deadline|eod|cob|outage|down)\b/i,
      /‼️|🚨|⚠️/,
    ],
  },
  supportive: {
    weight: 0,
    patterns: [
      /\b(happy to|glad to|no worries|no problem|you've got this|here to help|let me know)\b/i,
      /\b(great job|nice work|thanks for|appreciate you|congrats|well done)\b/i,
      /🙏|💪|✨/,
    ],
  },
  technical: {
    weight: 0,
    patterns: [
      /\b(api|endpoint|deploy|pr|ci|lint|build|stack|latency|throughput|schema|db|query)\b/i,
      /\b(refactor|merge|branch|commit|regression|flake|null|timeout|retry)\b/i,
      /```|`[^`]+`/,
    ],
  },
  collaborative: {
    weight: 0,
    patterns: [
      /\b(we|our|let's|together|sync|pair|review|thoughts|wdyt|open to)\b/i,
      /\b(what do you think|any objections|team|owners)\b/i,
    ],
  },
};

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
  'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'with', 'from', 'as', 'by',
  'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down',
  'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'also', 'if', 'because', 'while', 'what', 'which', 'who', 'whom', 'amp', 'http', 'https',
]);

/**
 * Analyze thread messages for dominant tone and topics.
 * @param {string[]} messages
 */
function analyzeThread(messages) {
  const joined = (messages || []).join('\n');
  const tones = Object.fromEntries(Object.keys(TONE_SIGNALS).map((k) => [k, 0]));

  for (const [tone, { patterns }] of Object.entries(TONE_SIGNALS)) {
    for (const pattern of patterns) {
      const matches = joined.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`));
      tones[tone] += matches ? matches.length : 0;
    }
  }

  // Light length / punctuation heuristics
  const avgLen = messages.length
    ? messages.reduce((s, m) => s + m.length, 0) / messages.length
    : 0;
  if (avgLen > 220) tones.formal += 1;
  if (avgLen < 60 && messages.length > 1) tones.casual += 1;

  const rankedTones = Object.entries(tones)
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > 0);

  const primaryTone = rankedTones[0]?.[0] || 'collaborative';
  const secondaryTone = rankedTones[1]?.[0] || null;

  const topics = extractTopics(joined);

  return {
    primaryTone,
    secondaryTone,
    toneScores: tones,
    topics,
    summary: buildSummary(primaryTone, secondaryTone, topics, messages.length),
    messageCount: messages.length,
  };
}

function extractTopics(text) {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^a-zA-Z0-9+#.\-\s]/g, ' ')
    .toLowerCase();

  const counts = new Map();
  for (const raw of cleaned.split(/\s+/)) {
    const word = raw.replace(/^[^a-z0-9+#]+|[^a-z0-9+#]+$/gi, '');
    if (word.length < 3 || STOPWORDS.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([word]) => word);
}

function buildSummary(primary, secondary, topics, count) {
  const tonePart = secondary
    ? `${labelTone(primary)} with a ${labelTone(secondary)} edge`
    : labelTone(primary);
  const topicPart = topics.length
    ? `Topics: ${topics.slice(0, 4).join(', ')}.`
    : 'Topic signals are light in this thread.';
  return `Across ${count} message${count === 1 ? '' : 's'}, the thread reads as ${tonePart}. ${topicPart}`;
}

function labelTone(tone) {
  const labels = {
    formal: 'formal / polished',
    casual: 'casual / conversational',
    urgent: 'urgent / time-sensitive',
    supportive: 'supportive / encouraging',
    technical: 'technical / precise',
    collaborative: 'collaborative / team-oriented',
  };
  return labels[tone] || tone;
}

module.exports = {
  analyzeThread,
  labelTone,
  extractTopics,
};
