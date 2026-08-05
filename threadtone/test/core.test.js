'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { analyzeThread, extractTopics } = require('../src/services/tone-analyzer');
const { rewriteHeuristic, resolveProvider } = require('../src/services/rewriter');
const { resolveThreadTs } = require('../src/services/thread-context');
const { buildRewriteModal, buildHomeView } = require('../src/blocks/views');

describe('tone-analyzer', () => {
  it('detects technical + urgent tone', () => {
    const analysis = analyzeThread([
      'The API latency spiked after the deploy — this is a P0 blocker.',
      'CI is red on the schema migration PR. Need this fixed ASAP.',
    ]);
    assert.ok(['technical', 'urgent'].includes(analysis.primaryTone));
    assert.ok(analysis.topics.length > 0);
    assert.match(analysis.summary, /message/i);
  });

  it('detects casual supportive tone', () => {
    const analysis = analyzeThread([
      'hey awesome work on that!!',
      'lol no worries, happy to help anytime',
    ]);
    assert.ok(['casual', 'supportive'].includes(analysis.primaryTone));
  });

  it('extracts topics without stopwords', () => {
    const topics = extractTopics('The deployment pipeline failed during migration testing');
    assert.ok(!topics.includes('the'));
    assert.ok(topics.some((t) => ['deployment', 'pipeline', 'migration', 'testing'].includes(t)));
  });
});

describe('rewriter', () => {
  it('heuristic rewrite keeps intent for formal tone', () => {
    const analysis = {
      primaryTone: 'formal',
      secondaryTone: null,
      topics: ['budget', 'forecast'],
    };
    const { text, engine } = rewriteHeuristic('gonna send the forecast later', analysis);
    assert.equal(engine, 'heuristic');
    assert.match(text, /going to/i);
    assert.ok(text.toLowerCase().includes('budget') || text.toLowerCase().includes('forecast') || text.length > 10);
  });

  it('urgent rewrite frames a quick ask', () => {
    const analysis = { primaryTone: 'urgent', topics: ['outage'] };
    const { text } = rewriteHeuristic('maybe we can look at the logs', analysis);
    assert.match(text, /quick ask/i);
  });

  it('blends strong secondary urgent into technical rewrite', () => {
    const analysis = {
      primaryTone: 'technical',
      secondaryTone: 'urgent',
      toneScores: { technical: 6, urgent: 4, formal: 0, casual: 0, supportive: 0, collaborative: 0 },
      topics: ['api', 'deploy'],
    };
    const { text } = rewriteHeuristic('gonna look at the logs later', analysis);
    assert.match(text, /going to/i);
    assert.match(text, /quick ask/i);
  });

  it('resolveProvider defaults to heuristic without keys', () => {
    const prev = {
      LLM_PROVIDER: process.env.LLM_PROVIDER,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    };
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    process.env.LLM_PROVIDER = 'auto';
    assert.equal(resolveProvider(), 'heuristic');
    Object.assign(process.env, Object.fromEntries(
      Object.entries(prev).filter(([, v]) => v !== undefined),
    ));
  });
});

describe('thread-context', () => {
  it('resolves thread_ts from replies and parents', () => {
    assert.equal(resolveThreadTs({ ts: '1.0', thread_ts: '0.5' }), '0.5');
    assert.equal(resolveThreadTs({ ts: '1.0' }), '1.0');
    assert.equal(resolveThreadTs(null), null);
  });
});

describe('views', () => {
  it('builds a modal with draft and rewrite button', () => {
    const modal = buildRewriteModal({
      analysis: {
        summary: 'Across 2 messages, the thread reads as technical / precise. Topics: api, deploy.',
        primaryTone: 'technical',
        secondaryTone: 'urgent',
        topics: ['api', 'deploy'],
      },
      channel: 'C123',
      threadTs: '1.2',
      draft: 'looking into it',
    });
    assert.equal(modal.type, 'modal');
    assert.equal(modal.callback_id, 'rewrite_modal');
    assert.ok(modal.blocks.some((b) => b.block_id === 'draft_block'));
    assert.ok(modal.blocks.some((b) => b.type === 'actions'));
    const meta = JSON.parse(modal.private_metadata);
    assert.equal(meta.channel, 'C123');
  });

  it('includes editable result after rewrite', () => {
    const modal = buildRewriteModal({
      draft: 'hi',
      rewritten: 'Hello — looking into the API issue now.',
      engine: 'heuristic',
      channel: 'C1',
      threadTs: '1.0',
    });
    assert.ok(modal.blocks.some((b) => b.block_id === 'result_block'));
  });

  it('builds home view', () => {
    const home = buildHomeView();
    assert.equal(home.type, 'home');
    assert.ok(home.blocks.length >= 3);
  });
});
