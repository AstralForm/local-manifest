'use strict';

const { labelTone } = require('./tone-analyzer');

/**
 * Rewrite a draft so it fits the thread's tone and topics.
 * Uses an LLM when configured; otherwise a deterministic heuristic rewriter.
 *
 * @param {{ draft: string, analysis: object, threadMessages?: string[] }} input
 */
async function rewriteMessage(input) {
  const draft = (input.draft || '').trim();
  if (!draft) {
    throw new Error('Draft message is empty.');
  }

  const provider = resolveProvider();
  if (provider === 'openai') {
    return rewriteWithOpenAI(draft, input.analysis, input.threadMessages);
  }
  if (provider === 'anthropic') {
    return rewriteWithAnthropic(draft, input.analysis, input.threadMessages);
  }
  return rewriteHeuristic(draft, input.analysis);
}

function resolveProvider() {
  const explicit = (process.env.LLM_PROVIDER || 'auto').toLowerCase();
  if (explicit === 'openai' && process.env.OPENAI_API_KEY) return 'openai';
  if (explicit === 'anthropic' && process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (explicit === 'auto') {
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  }
  return 'heuristic';
}

function buildSystemPrompt(analysis, threadMessages = []) {
  const topics = (analysis.topics || []).join(', ') || 'general discussion';
  const sample = (threadMessages || []).slice(-8).join('\n---\n');
  return [
    'You rewrite Slack replies so they match the thread.',
    `Target tone: ${labelTone(analysis.primaryTone)}${analysis.secondaryTone ? ` (secondary: ${labelTone(analysis.secondaryTone)})` : ''}.`,
    `Topics to stay aligned with: ${topics}.`,
    'Rules:',
    '- Keep the author\'s intent and facts.',
    '- Match Slack style: concise, scannable, no email greetings unless the thread uses them.',
    '- Do not invent commitments, dates, or decisions that were not in the draft.',
    '- Return only the rewritten message text, no quotes or preamble.',
    sample ? `Recent thread context:\n${sample}` : '',
  ].filter(Boolean).join('\n');
}

async function rewriteWithOpenAI(draft, analysis, threadMessages) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        { role: 'system', content: buildSystemPrompt(analysis, threadMessages) },
        { role: 'user', content: draft },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI rewrite failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenAI returned an empty rewrite.');
  return { text, engine: 'openai' };
}

async function rewriteWithAnthropic(draft, analysis, threadMessages) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
      max_tokens: 1024,
      temperature: 0.4,
      system: buildSystemPrompt(analysis, threadMessages),
      messages: [{ role: 'user', content: draft }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic rewrite failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.content?.find((c) => c.type === 'text')?.text?.trim();
  if (!text) throw new Error('Anthropic returned an empty rewrite.');
  return { text, engine: 'anthropic' };
}

/**
 * Deterministic rewriter used when no LLM key is configured.
 */
function rewriteHeuristic(draft, analysis) {
  let text = draft.trim();
  text = text.replace(/\s+/g, ' ');
  text = stripAwkwardOpeners(text);

  const tone = analysis.primaryTone;
  const secondary = analysis.secondaryTone;
  const scores = analysis.toneScores || {};
  const topics = analysis.topics || [];

  text = applyToneTransform(text, tone);

  // Blend a strong secondary signal (e.g. technical + urgent)
  if (secondary && (scores[secondary] || 0) >= 2) {
    if (secondary === 'urgent' && tone !== 'urgent') {
      text = makeDirect(text);
    } else if (secondary === 'formal' && tone === 'technical') {
      text = softenSlang(text);
      text = ensureSentenceCase(text);
    } else if (secondary === 'collaborative') {
      text = makeCollaborative(text);
    }
  }

  if (topics.length && !topics.some((t) => text.toLowerCase().includes(t))) {
    const tip = topics.slice(0, 2).join(' / ');
    text = `${text} (re: ${tip})`;
  }

  return { text, engine: 'heuristic' };
}

function applyToneTransform(text, tone) {
  switch (tone) {
    case 'formal': {
      let t = ensureSentenceCase(softenSlang(text));
      if (!/[.!?]$/.test(t)) t = `${t}.`;
      if (!/^(thanks|thank you|please|hi|hello)/i.test(t)) {
        t = `Thanks — ${decapitalize(t)}`;
      }
      return t;
    }
    case 'casual':
      return lightenFormality(text);
    case 'urgent':
      return makeDirect(text);
    case 'supportive':
      return addSupportiveFrame(text);
    case 'technical':
      return tightenTechnical(softenSlang(text));
    case 'collaborative':
      return makeCollaborative(text);
    default:
      return text;
  }
}

function stripAwkwardOpeners(text) {
  return text.replace(/^(hey team[,!]?\s*|hi all[,!]?\s*|hello[,!]?\s*)/i, '').trim();
}

function ensureSentenceCase(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function decapitalize(text) {
  if (!text) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function softenSlang(text) {
  return text
    .replace(/\bgonna\b/gi, 'going to')
    .replace(/\bwanna\b/gi, 'want to')
    .replace(/\bkinda\b/gi, 'kind of')
    .replace(/\blol\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function lightenFormality(text) {
  return text
    .replace(/\bI would like to\b/gi, "I'd like to")
    .replace(/\bplease be advised that\b/gi, 'heads-up:')
    .replace(/\bregarding the aforementioned\b/gi, 'on that')
    .trim();
}

function makeDirect(text) {
  let t = text.replace(/\b(maybe|perhaps|I think we might)\b/gi, '');
  t = t.replace(/\s{2,}/g, ' ').trim();
  if (!/^(need|blocker|urgent|asap|can we|please)/i.test(t)) {
    t = `Quick ask: ${decapitalize(t)}`;
  }
  return t;
}

function addSupportiveFrame(text) {
  if (/^(happy to|glad to|thanks|great|nice)/i.test(text)) return text;
  return `Happy to help — ${decapitalize(text)}`;
}

function tightenTechnical(text) {
  return text
    .replace(/\bthing\b/gi, 'change')
    .replace(/\bstuff\b/gi, 'implementation')
    .trim();
}

function makeCollaborative(text) {
  return text
    .replace(/\bI need you to\b/gi, "could we")
    .replace(/\byou should\b/gi, 'we could')
    .replace(/\bmy opinion is\b/gi, 'one option is')
    .trim();
}

module.exports = {
  rewriteMessage,
  rewriteHeuristic,
  resolveProvider,
};
