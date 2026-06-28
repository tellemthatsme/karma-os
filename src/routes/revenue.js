const http = require('http');
const https = require('https');
const url = require('url');

// ═══════════════════════════════════════════════════════════════════════════════
//  KARMA REVENUE ENGINE — Core Framework + Lead Hunter Module
//  Autonomous revenue generation with zero-approval guardrails
// ═══════════════════════════════════════════════════════════════════════════════

// ── Module Registry ──────────────────────────────────────────────────────────
const MODULES = {
  leadHunter: {
    name: 'Lead Hunter',
    description: 'Auto-scrape leads, enrich contacts, send AI-personalized outreach',
    enabled: true,
    config: {
      maxDailyEmails: 50,
      signalSources: ['reddit', 'indiehackers', 'jobboards'],
      niches: ['saas', 'ai-tools', 'automation'],
      emailTemplate: 'personalized-value-first',
      replyMonitoring: true,
    },
  },
  contentBot: {
    name: 'Content Arbitrage Bot',
    description: 'Auto-generate content with affiliate links across platforms',
    enabled: false,
    config: {
      platforms: ['twitter', 'linkedin', 'medium'],
      postFrequency: 3,
      niches: ['ai', 'productivity', 'saas'],
    },
  },
  microSaaS: {
    name: 'Micro-SaaS Factory',
    description: 'Auto-build and deploy micro-tools from pain signals',
    enabled: false,
    config: {},
  },
  priceArbitrage: {
    name: 'Price Arbitrage Scanner',
    description: 'Monitor price discrepancies across marketplaces',
    enabled: false,
    config: {},
  },
  assetFlipper: {
    name: 'Asset Flipper',
    description: 'Monitor and acquire undervalued digital assets',
    enabled: false,
    config: {},
  },
};

// ── Guardrail Defaults ───────────────────────────────────────────────────────
const DEFAULT_GUARDRAILS = {
  maxDailySpend: 50,        // USD
  maxDailyEmails: 100,
  maxDailyApiCalls: 1000,
  minProfitMargin: 0.20,    // 20%
  riskLevel: 'conservative', // conservative | moderate | aggressive
  autoExecuteConfidence: 0.85,
  notificationLevel: 'important', // all | important | critical
};

// ── In-memory state (per-process; persisted to DB) ───────────────────────────
const state = {
  today: new Date().toISOString().slice(0, 10),
  dailyCounters: { emails: 0, spend: 0, apiCalls: 0, decisions: 0 },
  leadQueue: [],
  opportunityQueue: [],
};

function resetDailyCounters() {
  const today = new Date().toISOString().slice(0, 10);
  if (state.today !== today) {
    state.today = today;
    state.dailyCounters = { emails: 0, spend: 0, apiCalls: 0, decisions: 0 };
  }
}

// ── Guardrail Engine ─────────────────────────────────────────────────────────
function checkGuardrails(action, payload, guardrails) {
  resetDailyCounters();
  let ctx, g;
  if (typeof action === 'object' && action !== null && payload && typeof payload === 'object') {
    ctx = action;
    g = { ...DEFAULT_GUARDRAILS, ...payload };
  } else {
    g = { ...DEFAULT_GUARDRAILS, ...guardrails };
  }
  const violations = [];

  if (ctx) {
    if (ctx.todaySpend > g.maxDailySpend) violations.push(`Daily spend limit (${g.maxDailySpend}) exceeded`);
    if (ctx.todayEmails > g.maxDailyEmails) violations.push(`Daily email limit (${g.maxDailyEmails}) exceeded`);
    if (ctx.todayTrades > (g.maxDailyTrades || 100)) violations.push('Daily trade limit exceeded');
    if (ctx.pendingChoices > 10) violations.push('Too many pending choices');
  } else {
    if (action === 'sendEmail') {
      if (state.dailyCounters.emails >= g.maxDailyEmails) {
        violations.push(`Daily email limit (${g.maxDailyEmails}) reached`);
      }
    }
    if (action === 'spend') {
      const projected = state.dailyCounters.spend + (payload.amount || 0);
      if (projected > g.maxDailySpend) {
        violations.push(`Daily spend limit (${g.maxDailySpend}) would be exceeded`);
      }
    }
    if (action === 'apiCall') {
      if (state.dailyCounters.apiCalls >= g.maxDailyApiCalls) {
        violations.push(`Daily API call limit (${g.maxDailyApiCalls}) reached`);
      }
    }
  }

  const approved = violations.length === 0;
  return { approved, violations, riskLevel: g.riskLevel };
}

// ── Decision Logger ──────────────────────────────────────────────────────────
function logDecision(db, moduleName, action, payload, guardrailResult, outcome) {
  if (!db) return;
  const ts = Date.now();
  db.run(
    `INSERT INTO revenue_decisions (ts, module, action, payload, approved, violations, outcome, date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [ts, moduleName, action, JSON.stringify(payload), guardrailResult.approved,
     JSON.stringify(guardrailResult.violations), outcome || 'pending', state.today]
  );
  state.dailyCounters.decisions++;
}

// ── Notification Router ──────────────────────────────────────────────────────
async function sendNotification(config, level, title, message) {
  const g = { ...DEFAULT_GUARDRAILS, ...config.guardrails };
  if (g.notificationLevel === 'critical' && level !== 'critical') return;
  if (g.notificationLevel === 'important' && level === 'info') return;

  const promises = [];

  // Discord
  if (config.discordWebhook) {
    const color = { info: 0x3498db, success: 0x2ecc71, warning: 0xf39c12, critical: 0xe74c3c }[level] || 0x95a5a6;
    promises.push(
      fetch(config.discordWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{ title, description: message, color, timestamp: new Date().toISOString() }],
        }),
      }).catch(() => {})
    );
  }

  // Slack
  if (config.slackWebhook) {
    promises.push(
      fetch(config.slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `*[${level.toUpperCase()}] ${title}*\n${message}` }),
      }).catch(() => {})
    );
  }

  // Telegram
  if (config.telegramBotToken && config.telegramChatId) {
    const tgUrl = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
    promises.push(
      fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.telegramChatId,
          text: `*${level.toUpperCase()}*\n*${title}*\n${message}`,
          parse_mode: 'Markdown',
        }),
      }).catch(() => {})
    );
  }

  await Promise.all(promises);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LEAD HUNTER MODULE
// ═══════════════════════════════════════════════════════════════════════════════

// ── Signal Scraper (simulated + extensible) ──────────────────────────────────
async function scrapeSignals(source, niche) {
  const signals = [];

  if (source === 'reddit') {
    // Reddit pain-point scraping via pushshift or reddit API
    // For now: simulated high-quality signals
    signals.push(
      { platform: 'reddit', subreddit: 'SaaS', title: 'Looking for better cold outreach tool', engagement: 45, sentiment: 'pain' },
      { platform: 'reddit', subreddit: 'startups', title: 'Need affordable lead generation', engagement: 32, sentiment: 'pain' },
    );
  }
  if (source === 'indiehackers') {
    signals.push(
      { platform: 'indiehackers', title: 'How do you find your first 10 customers?', engagement: 89, sentiment: 'question' },
    );
  }
  if (source === 'jobboards') {
    signals.push(
      { platform: 'jobboard', title: 'Hiring SDR / Lead Generation Specialist', engagement: 1, sentiment: 'hiring' },
    );
  }

  return signals.map(s => ({ ...s, niche, scrapedAt: Date.now() }));
}

// ── Lead Enricher ────────────────────────────────────────────────────────────
function enrichLead(signal) {
  // Simulate enrichment — in production, integrate Hunter.io/Apollo/clearbit
  const domainMap = {
    'cold outreach': 'outreachtools.com',
    'lead generation': 'leadgenpros.com',
    'first 10 customers': 'indiestartup.io',
    'SDR': 'salesforce.com',
  };

  const keyword = Object.keys(domainMap).find(k => signal.title.toLowerCase().includes(k.toLowerCase()));
  const domain = keyword ? domainMap[keyword] : 'example.com';

  return {
    id: 'lead_' + Math.random().toString(36).slice(2, 10),
    signal,
    company: domain.replace('.com', ''),
    domain,
    decisionMaker: 'founder',
    email: `founder@${domain}`,
    enrichedAt: Date.now(),
    confidence: 0.7 + Math.random() * 0.25,
  };
}

// ── AI Email Writer ──────────────────────────────────────────────────────────
function writeColdEmail(lead, template) {
  const pain = lead.signal.title;
  const company = lead.company;

  const templates = {
    'personalized-value-first': `Subject: Quick thought on ${company}'s outreach

Hi there,

I saw your post about "${pain}" — figured I'd share what worked for us.

We built an autonomous outreach system that finds high-intent leads and personalizes every email. No spray-and-pray. Results: 3x reply rates, zero manual work.

Worth a 5-minute chat this week?

Best,
KARMA Revenue Engine`,
    'problem-agitation-solution': `Subject: ${pain}?

Hey,

"${pain}" — I hear this every day.

Most teams burn 20+ hours/week on manual prospecting. We automated the entire pipeline: find → enrich → personalize → send → follow up.

${company} looks like a perfect fit. Want to see it in action?

Cheers,
KARMA`,
  };

  return templates[template] || templates['personalized-value-first'];
}

// ── Outreach Sender ──────────────────────────────────────────────────────────
async function sendOutreach(db, lead, emailBody, config) {
  // In production: integrate SendGrid, AWS SES, or SMTP
  // For now: simulate with realistic latency and log to DB

  const guardrail = checkGuardrails('sendEmail', {}, config.guardrails);
  if (!guardrail.approved) {
    logDecision(db, 'leadHunter', 'sendOutreach', { leadId: lead.id }, guardrail, 'blocked');
    return { ok: false, error: 'Guardrail blocked', violations: guardrail.violations };
  }

  state.dailyCounters.emails++;

  const outreachId = 'out_' + Math.random().toString(36).slice(2, 10);
  const ts = Date.now();

  db.run(
    `INSERT INTO revenue_outreach (id, leadId, emailBody, sentAt, status, replies, date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [outreachId, lead.id, emailBody, ts, 'sent', 0, state.today]
  );

  db.run(
    `UPDATE revenue_leads SET status = 'contacted', lastContacted = ? WHERE id = ?`,
    [ts, lead.id]
  );

  logDecision(db, 'leadHunter', 'sendOutreach', { leadId: lead.id, outreachId }, guardrail, 'sent');

  // Simulate reply monitoring (async)
  setTimeout(() => {
    const replyChance = lead.confidence * 0.3; // 30% of confidence
    if (Math.random() < replyChance) {
      db.run(`UPDATE revenue_outreach SET status = 'replied', replies = replies + 1 WHERE id = ?`, [outreachId]);
      db.run(`UPDATE revenue_leads SET status = 'hot', replyCount = replyCount + 1, lastReplyAt = ? WHERE id = ?`, [Date.now(), lead.id]);
    }
  }, 5000 + Math.random() * 10000).unref();

  return { ok: true, outreachId, status: 'sent' };
}

// ── Lead Hunter Run Cycle ────────────────────────────────────────────────────
async function runLeadHunterCycle(db, config) {
  const isEnabled = config?.modules?.leadHunter?.enabled ?? MODULES.leadHunter.enabled;
  if (!isEnabled) return { ran: false, reason: 'Module disabled' };

  const modConfig = { ...MODULES.leadHunter.config, ...config.modules?.leadHunter };
  const results = { signals: 0, enriched: 0, contacted: 0, blocked: 0 };
  const leads = [];

  for (const source of modConfig.signalSources) {
    for (const niche of modConfig.niches) {
      const signals = await scrapeSignals(source, niche);
      results.signals += signals.length;

      for (const signal of signals) {
        const lead = enrichLead(signal);
        results.enriched++;
        leads.push(lead);

        // Store lead
        db.run(
          `INSERT OR IGNORE INTO revenue_leads (id, company, domain, email, niche, source, confidence, status, createdAt, date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [lead.id, lead.company, lead.domain, lead.email, niche, source, lead.confidence, 'new', Date.now(), state.today]
        );

        // Check guardrails before outreach
        const guardrail = checkGuardrails('sendEmail', {}, config.guardrails);
        if (guardrail.approved && lead.confidence >= (config.guardrails?.autoExecuteConfidence || 0.85)) {
          const emailBody = writeColdEmail(lead, modConfig.emailTemplate);
          const sendResult = await sendOutreach(db, lead, emailBody, config);
          if (sendResult.ok) results.contacted++;
          else results.blocked++;
        } else {
          results.blocked++;
          logDecision(db, 'leadHunter', 'sendOutreach', { leadId: lead.id }, guardrail, 'pending_approval');
        }
      }
    }
  }

  return { ran: true, signalsFound: results.signals, leadsEnriched: results.enriched, emailsSent: results.contacted, leads };
}

// ── Lead Hunter Status ───────────────────────────────────────────────────────
function getLeadHunterStatus(db) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) as total FROM revenue_leads`, [], (err, leadCount) => {
      if (err) return reject(err);
      db.get(`SELECT COUNT(*) as total FROM revenue_leads WHERE status = 'hot'`, [], (err2, hotCount) => {
        db.get(`SELECT COUNT(*) as total FROM revenue_outreach WHERE date = ?`, [state.today], (err3, outreachCount) => {
          db.get(`SELECT COUNT(*) as total FROM revenue_outreach WHERE status = 'replied' AND date = ?`, [state.today], (err4, replyCount) => {
            db.get(`SELECT COUNT(*) as total FROM revenue_decisions WHERE module = 'leadHunter' AND date = ?`, [state.today], (err5, decisionCount) => {
              resolve({
                enabled: MODULES.leadHunter.enabled,
                today: state.today,
                totalLeads: leadCount?.total || 0,
                hotLeads: hotCount?.total || 0,
                emailsSentToday: outreachCount?.total || 0,
                repliesToday: replyCount?.total || 0,
                decisionsToday: decisionCount?.total || 0,
                dailyCounters: state.dailyCounters,
              });
            });
          });
        });
      });
    });
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
//  CONTENT ARBITRAGE BOT MODULE
// ═══════════════════════════════════════════════════════════════════════════════

// ── Trend Scraper (simulated + extensible) ───────────────────────────────────
async function scrapeTrends(niches) {
  const trends = [];
  const now = Date.now();
  for (const niche of niches) {
    trends.push(
      { niche, topic: `Top 5 ${niche} tools in 2026`, engagement: 1200 + Math.floor(Math.random() * 3000), platform: 'twitter', scrapedAt: now },
      { niche, topic: `Why ${niche} is changing everything`, engagement: 800 + Math.floor(Math.random() * 2000), platform: 'linkedin', scrapedAt: now },
      { niche, topic: `${niche} automation guide`, engagement: 500 + Math.floor(Math.random() * 1500), platform: 'medium', scrapedAt: now }
    );
  }
  return trends;
}

// ── Content Generator ────────────────────────────────────────────────────────
function generateContent(trend, template) {
  const templates = {
    'affiliate-review': `🧵 Top 5 ${trend.topic}\n\n1. ToolA — best for beginners\n2. ToolB — best for teams\n3. ToolC — best budget pick\n4. ToolD — most powerful\n5. ToolE — best AI features\n\nFull breakdown + affiliate links 👇`,
    'problem-solution': `Struggling with ${trend.niche}?\n\nI spent 100+ hours testing every solution.\n\nHere's the exact stack that saved me 10h/week:\n\n🧵👇`,
    'hot-take': `Hot take: 90% of ${trend.niche} advice is wrong.\n\nHere's what actually works in 2026:\n\n🧵👇`,
  };
  return templates[template] || templates['affiliate-review'];
}

// ── Content Poster (simulated + extensible) ──────────────────────────────────
async function postContent(db, trend, contentBody, config) {
  const guardrail = checkGuardrails('apiCall', {}, config.guardrails);
  if (!guardrail.approved) {
    logDecision(db, 'contentBot', 'postContent', { platform: trend.platform }, guardrail, 'blocked');
    return { ok: false, error: 'Guardrail blocked', violations: guardrail.violations };
  }

  state.dailyCounters.apiCalls++;

  const postId = 'post_' + Math.random().toString(36).slice(2, 10);
  const ts = Date.now();
  const engagement = Math.floor(trend.engagement * (0.5 + Math.random()));

  db.run(
    `INSERT INTO content_bot_posts (id, platform, niche, topic, content, engagement, status, postedAt, date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [postId, trend.platform, trend.niche, trend.topic, contentBody, engagement, 'posted', ts, state.today]
  );

  logDecision(db, 'contentBot', 'postContent', { postId, platform: trend.platform }, guardrail, 'posted');

  return { ok: true, postId, platform: trend.platform, engagement };
}

// ── Content Bot Run Cycle ────────────────────────────────────────────────────
async function runContentBotCycle(db, config) {
  const isEnabled = config?.modules?.contentBot?.enabled ?? MODULES.contentBot.enabled;
  if (!isEnabled) return { ran: false, reason: 'Module disabled' };

  const modConfig = { ...MODULES.contentBot.config, ...config.modules?.contentBot };
  const results = { trendsScraped: 0, postsGenerated: 0, postsPublished: 0, blocked: 0 };
  const posts = [];

  const trends = await scrapeTrends(modConfig.niches);
  results.trendsScraped = trends.length;

  for (const trend of trends) {
    const contentBody = generateContent(trend, modConfig.template || 'affiliate-review');
    results.postsGenerated++;

    const guardrail = checkGuardrails('apiCall', {}, config.guardrails);
    if (guardrail.approved) {
      const postResult = await postContent(db, trend, contentBody, config);
      if (postResult.ok) {
        results.postsPublished++;
        posts.push(postResult);
      } else {
        results.blocked++;
      }
    } else {
      results.blocked++;
      logDecision(db, 'contentBot', 'postContent', { platform: trend.platform }, guardrail, 'pending_approval');
    }
  }

  return { ran: true, ...results, posts };
}


// ═══════════════════════════════════════════════════════════════════════════════
//  STRIPE MONETIZATION MODULE
// ═══════════════════════════════════════════════════════════════════════════════

// ── Checkout Session ─────────────────────────────────────────────────────────
async function createCheckoutSession(config, lineItems, metadata) {
  const stripeKey = config.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { ok: false, error: 'Stripe secret key not configured' };
  }

  try {
    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'success_url': metadata.successUrl || 'https://example.com/success',
        'cancel_url': metadata.cancelUrl || 'https://example.com/cancel',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': lineItems[0]?.name || 'KARMA Service',
        'line_items[0][price_data][unit_amount]': String(Math.round((lineItems[0]?.amount || 0) * 100)),
        'line_items[0][quantity]': String(lineItems[0]?.quantity || 1),
        'metadata[karma_module]': metadata.module || '',
        'metadata[karma_user]': metadata.userId || '',
      }).toString(),
    });
    const data = await resp.json();
    if (data.error) {
      return { ok: false, error: data.error.message };
    }
    return { ok: true, sessionId: data.id, url: data.url };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Webhook Handler ──────────────────────────────────────────────────────────
async function handleStripeWebhook(db, payload, signature, webhookSecret) {
  // In production: verify signature with crypto
  // For now: parse and log
  const event = payload;
  const id = 'wh_' + Math.random().toString(36).slice(2, 10);
  const ts = Date.now();

  db.run(
    `INSERT INTO stripe_payments (id, ts, eventType, sessionId, amount, currency, status, customerEmail, metadata, date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, ts, event.type || 'unknown', event.data?.object?.id || '',
     (event.data?.object?.amount_total || 0) / 100,
     event.data?.object?.currency || 'usd',
     event.type === 'checkout.session.completed' ? 'completed' : event.type,
     event.data?.object?.customer_details?.email || '',
     JSON.stringify(event.data?.object?.metadata || {}),
     state.today]
  );

  logDecision(db, 'stripe', 'webhook', { eventType: event.type }, { approved: true, violations: [] }, 'processed');

  return { ok: true, id, eventType: event.type };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  API ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

function handleRevenueRoutes(req, res, startTime, deps) {
  const { db, logRequest, metrics, config } = deps;
  const parsed = url.parse(req.url, true);
  const today = new Date().toISOString().slice(0, 10);
  if (state.today !== today) { state.today = today; state.dailyCounters = { emails: 0, decisions: 0, revenue: 0 }; }
  const pathname = parsed.pathname;
  const method = req.method;

  // ── /api/revenue/dashboard ───────────────────────────────────────────────
  if (pathname === '/api/revenue/dashboard' && method === 'GET') {
    resetDailyCounters();
    db.all(`SELECT module, COUNT(*) as count FROM revenue_decisions WHERE date = ? GROUP BY module`, [state.today], (err, decisions) => {
      if (err) { res.writeHead(500); res.end(JSON.stringify({ error: err.message })); return; }

      db.get(`SELECT COUNT(*) as total FROM revenue_leads`, [], (err2, leadCount) => {
        db.get(`SELECT COUNT(*) as total FROM revenue_leads WHERE status = 'hot'`, [], (err3, hotCount) => {
          db.get(`SELECT COUNT(*) as total FROM revenue_outreach WHERE date = ?`, [state.today], (err4, outreachCount) => {
            db.get(`SELECT SUM(replies) as total FROM revenue_outreach`, [], (err5, replyCount) => {
              db.all(`SELECT module, action, approved, outcome, ts FROM revenue_decisions ORDER BY ts DESC LIMIT 20`, [], (err6, recentDecisions) => {
                const dashboard = {
                  ok: true,
                  today: state.today,
                  counters: state.dailyCounters,
                  modules: Object.entries(MODULES).map(([k, v]) => ({ id: k, name: v.name, description: v.description, enabled: v.enabled, estRevenue: 0 })),
                  guardrails: { ...DEFAULT_GUARDRAILS, minMarginPercent: DEFAULT_GUARDRAILS.minProfitMargin },
                  stats: {
                    todayRevenue: 0,
                    leadsGenerated: leadCount?.total || 0,
                    hotLeads: hotCount?.total || 0,
                    emailsSent: outreachCount?.total || 0,
                    totalReplies: replyCount?.total || 0,
                    todaysDecisions: decisions,
                  },
                  recentDecisions: recentDecisions || [],
                };
                res.writeHead(200, { 'Content-Type': 'application/json' });
                logRequest(req, res, startTime);
                res.end(JSON.stringify(dashboard));
              });
            });
          });
        });
      });
    });
    return true;
  }

  // ── /api/revenue/modules ───────────────────────────────────────────────────
  if (pathname === '/api/revenue/modules' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    logRequest(req, res, startTime);
    res.end(JSON.stringify({
      ok: true,
      modules: Object.entries(MODULES).map(([k, v]) => ({ id: k, name: v.name, description: v.description, enabled: v.enabled, config: v.config })),
    }));
    return true;
  }

  // ── /api/revenue/modules/:id/toggle ────────────────────────────────────────
  if (pathname.startsWith('/api/revenue/modules/') && pathname.endsWith('/toggle') && method === 'POST') {
    const moduleId = pathname.split('/')[4];
    if (MODULES[moduleId]) {
      MODULES[moduleId].enabled = !MODULES[moduleId].enabled;
      db.run(`INSERT INTO revenue_modules (id, name, enabled, updatedAt) VALUES (?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled, updatedAt=excluded.updatedAt`,
        [moduleId, MODULES[moduleId].name, MODULES[moduleId].enabled, Date.now()]);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime);
      res.end(JSON.stringify({ ok: true, module: { id: moduleId, name: MODULES[moduleId].name, enabled: MODULES[moduleId].enabled } }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime, { error: 'Module not found' });
      res.end(JSON.stringify({ error: 'Module not found', available: Object.keys(MODULES) }));
    }
    return true;
  }

  // ── /api/revenue/guardrails ────────────────────────────────────────────────
  if (pathname === '/api/revenue/guardrails' && method === 'GET') {
    db.get(`SELECT * FROM revenue_guardrails ORDER BY updatedAt DESC LIMIT 1`, [], (err, row) => {
      const guardrails = row ? JSON.parse(row.config) : DEFAULT_GUARDRAILS;
      const result = { ...guardrails, minMarginPercent: guardrails.minProfitMargin || guardrails.minMarginPercent || 0.20 };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime);
      res.end(JSON.stringify({ ok: true, guardrails: result }));
    });
    return true;
  }

  if (pathname === '/api/revenue/guardrails' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const newGuardrails = JSON.parse(body);
        const merged = { ...DEFAULT_GUARDRAILS, ...newGuardrails };
        db.run(`INSERT INTO revenue_guardrails (config, updatedAt) VALUES (?, ?)`,
          [JSON.stringify(merged), Date.now()]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        logRequest(req, res, startTime);
        res.end(JSON.stringify({ ok: true, guardrails: merged }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        logRequest(req, res, startTime, { error: e.message });
        res.end(JSON.stringify({ error: 'Invalid JSON', message: e.message }));
      }
    });
    return true;
  }

  // ── /api/revenue/decisions ─────────────────────────────────────────────────
  if (pathname === '/api/revenue/decisions' && method === 'GET') {
    const limit = parseInt(parsed.query.limit) || 50;
    const moduleFilter = parsed.query.module || '';
    const sql = moduleFilter
      ? `SELECT * FROM revenue_decisions WHERE module = ? ORDER BY ts DESC LIMIT ?`
      : `SELECT * FROM revenue_decisions ORDER BY ts DESC LIMIT ?`;
    const params = moduleFilter ? [moduleFilter, limit] : [limit];
    db.all(sql, params, (err, rows) => {
      if (err) { res.writeHead(500); res.end(JSON.stringify({ error: err.message })); return; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime);
      res.end(JSON.stringify({ ok: true, decisions: rows || [] }));
    });
    return true;
  }

  // ── /api/revenue/leads ─────────────────────────────────────────────────────
  if (pathname === '/api/revenue/leads' && method === 'GET') {
    const status = parsed.query.status || '';
    const limit = parseInt(parsed.query.limit) || 50;
    const sql = status
      ? `SELECT * FROM revenue_leads WHERE status = ? ORDER BY createdAt DESC LIMIT ?`
      : `SELECT * FROM revenue_leads ORDER BY createdAt DESC LIMIT ?`;
    const params = status ? [status, limit] : [limit];
    db.all(sql, params, (err, rows) => {
      if (err) { res.writeHead(500); res.end(JSON.stringify({ error: err.message })); return; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime);
      res.end(JSON.stringify({ ok: true, leads: rows || [] }));
    });
    return true;
  }

  // ── /api/revenue/outreach ──────────────────────────────────────────────────
  if (pathname === '/api/revenue/outreach' && method === 'GET') {
    const limit = parseInt(parsed.query.limit) || 50;
    db.all(`SELECT * FROM revenue_outreach ORDER BY sentAt DESC LIMIT ?`, [limit], (err, rows) => {
      if (err) { res.writeHead(500); res.end(JSON.stringify({ error: err.message })); return; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime);
      res.end(JSON.stringify({ ok: true, leads: rows || [] }));
    });
    return true;
  }

  // ── /api/revenue/run/:module ───────────────────────────────────────────────
  if (pathname.startsWith('/api/revenue/run/') && method === 'POST') {
    const moduleId = pathname.split('/')[4];
    const revenueConfig = config || {};

    if (moduleId === 'leadHunter') {
      runLeadHunterCycle(db, revenueConfig).then(result => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        logRequest(req, res, startTime);
        res.end(JSON.stringify({ ok: true, module: moduleId, result }));
      }).catch(e => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        logRequest(req, res, startTime, { error: e.message });
        res.end(JSON.stringify({ error: e.message }));
      });
      return true;
    }

    res.writeHead(400, { 'Content-Type': 'application/json' });
    logRequest(req, res, startTime, { error: 'Module not runnable' });
    res.end(JSON.stringify({ error: 'Module not runnable or not found', available: ['leadHunter'] }));
    return true;
  }

  // ── /api/revenue/ledger ────────────────────────────────────────────────────
  if (pathname === '/api/revenue/ledger' && method === 'GET') {
    db.all(`SELECT * FROM revenue_ledger ORDER BY ts DESC LIMIT 100`, [], (err, rows) => {
      if (err) { res.writeHead(500); res.end(JSON.stringify({ error: err.message })); return; }
      db.get(`SELECT SUM(amount) as total FROM revenue_ledger WHERE type = 'income'`, [], (err2, income) => {
        db.get(`SELECT SUM(amount) as total FROM revenue_ledger WHERE type = 'expense'`, [], (err3, expense) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          logRequest(req, res, startTime);
          res.end(JSON.stringify({
            ok: true,
            totalIncome: income?.total || 0,
            totalExpense: expense?.total || 0,
            netProfit: (income?.total || 0) - (expense?.total || 0),
            entries: rows || [],
          }));
        });
      });
    });
    return true;
  }

  if (pathname === '/api/revenue/ledger' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const entry = JSON.parse(body);
        const id = 'txn_' + Math.random().toString(36).slice(2, 10);
        db.run(
          `INSERT INTO revenue_ledger (id, ts, type, amount, source, description, module, date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, Date.now(), entry.type, entry.amount, entry.source, entry.description, entry.module || '', state.today]
        );
        res.writeHead(200, { 'Content-Type': 'application/json' });
        logRequest(req, res, startTime);
        res.end(JSON.stringify({ ok: true, id }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        logRequest(req, res, startTime, { error: e.message });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return true;
  }

  // ── /api/revenue/notify (test notification) ────────────────────────────────
  if (pathname === '/api/revenue/notify' && (method === 'POST' || method === 'GET')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        let payload;
        if (method === 'GET') {
          payload = { level: 'info', title: 'Test', message: parsed.query.msg || 'Hello from KARMA Revenue Engine' };
        } else {
          payload = JSON.parse(body);
        }
        sendNotification(config || {}, payload.level || 'info', payload.title || 'Test', payload.message || 'Hello from KARMA Revenue Engine');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        logRequest(req, res, startTime);
        res.end(JSON.stringify({ ok: true, message: 'Notification dispatched (mock)' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        logRequest(req, res, startTime, { error: e.message });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return true;
  }

  // ── /api/revenue/scheduler ─────────────────────────────────────────────────
  if (pathname === '/api/revenue/scheduler' && method === 'GET') {
    const enabledModules = Object.entries(MODULES).filter(([_, m]) => m.enabled).map(([k]) => k);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    logRequest(req, res, startTime);
    res.end(JSON.stringify({ ok: true, enabledModules, nextRuns: {} }));
    return true;
  }


  // ── /api/revenue/lead-hunter/status ────────────────────────────────────────
  if (pathname === '/api/revenue/lead-hunter/status' && method === 'GET') {
    getLeadHunterStatus(db).then(status => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime);
      res.end(JSON.stringify({ ok: true, status }));
    }).catch(e => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime, { error: e.message });
      res.end(JSON.stringify({ error: e.message }));
    });
    return true;
  }

  // ── /api/revenue/content-bot/cycle ─────────────────────────────────────────
  if (pathname === '/api/revenue/content-bot/cycle' && method === 'POST') {
    runContentBotCycle(db, config || {}).then(result => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime);
      res.end(JSON.stringify({ ok: true, cycle: result }));
    }).catch(e => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime, { error: e.message });
      res.end(JSON.stringify({ error: e.message }));
    });
    return true;
  }

  // ── /api/revenue/content-bot/posts ─────────────────────────────────────────
  if (pathname === '/api/revenue/content-bot/posts' && method === 'GET') {
    const limit = parseInt(parsed.query.limit) || 50;
    db.all(`SELECT * FROM content_bot_posts ORDER BY postedAt DESC LIMIT ?`, [limit], (err, rows) => {
      if (err) { res.writeHead(500); res.end(JSON.stringify({ error: err.message })); return; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime);
      res.end(JSON.stringify({ ok: true, posts: rows || [] }));
    });
    return true;
  }

  // ── /api/revenue/stripe/checkout ───────────────────────────────────────────
  if (pathname === '/api/revenue/stripe/checkout' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const result = await createCheckoutSession(config || {}, payload.lineItems || [], payload.metadata || {});
        res.writeHead(result.ok ? 200 : 400, { 'Content-Type': 'application/json' });
        logRequest(req, res, startTime);
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        logRequest(req, res, startTime, { error: e.message });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return true;
  }

  // ── /api/revenue/stripe/webhook ────────────────────────────────────────────
  if (pathname === '/api/revenue/stripe/webhook' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const signature = req.headers['stripe-signature'] || '';
        const webhookSecret = config?.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '';
        const result = await handleStripeWebhook(db, payload, signature, webhookSecret);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        logRequest(req, res, startTime);
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        logRequest(req, res, startTime, { error: e.message });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return true;
  }
  // ── /api/revenue/stripe/verify ─────────────────────────────────────────────
  if (pathname === '/api/revenue/stripe/verify' && method === 'GET') {
    const sessionId = url.searchParams.get('session_id') || '';
    if (!sessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime, { error: 'Missing session_id' });
      res.end(JSON.stringify({ ok: false, error: 'Missing session_id' }));
      return true;
    }
    // Mock verification for dashboard demo (replace with real Stripe API call)
    db.get(
      `SELECT * FROM stripe_payments WHERE sessionId = ? ORDER BY ts DESC LIMIT 1`,
      [sessionId],
      (err, row) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          logRequest(req, res, startTime, { error: err.message });
          res.end(JSON.stringify({ ok: false, error: err.message }));
          return;
        }
        if (row) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          logRequest(req, res, startTime);
          res.end(JSON.stringify({
            ok: true,
            verified: true,
            plan: (row.metadata && JSON.parse(row.metadata).plan) || 'Pro',
            amount: row.amount,
            currency: row.currency,
            customerEmail: row.customerEmail,
            status: row.status,
          }));
        } else {
          // Return a mock successful response for demo / testing
          res.writeHead(200, { 'Content-Type': 'application/json' });
          logRequest(req, res, startTime);
          res.end(JSON.stringify({
            ok: true,
            verified: true,
            plan: 'Pro',
            amount: 4900,
            currency: 'usd',
            customerEmail: 'customer@example.com',
            status: 'succeeded',
            note: 'Mock verification — integrate Stripe API for production',
          }));
        }
      }
    );
    return true;
  }

  // ── /api/revenue/lead-hunter/cycle ─────────────────────────────────────────
  if (pathname === '/api/revenue/lead-hunter/cycle' && method === 'POST') {
    runLeadHunterCycle(db, config || {}).then(result => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime);
      res.end(JSON.stringify({ ok: true, cycle: result }));
    }).catch(e => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime, { error: e.message });
      res.end(JSON.stringify({ error: e.message }));
    });
    return true;
  }

  // ── /api/scheduler/status ───────────────────────────────────────────────────
  if (pathname === '/api/scheduler/status' && method === 'GET') {
    try {
      const { getSchedulerStatus } = require('../scheduler');
      const status = getSchedulerStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime);
      res.end(JSON.stringify({ ok: true, status }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      logRequest(req, res, startTime, { error: e.message });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }

  // ── /api/revenue/lead-hunter/trigger ───────────────────────────────────────
  if (pathname === '/api/revenue/lead-hunter/trigger' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    logRequest(req, res, startTime);
    res.end(JSON.stringify({ ok: true, status: 'queued', module: 'leadHunter' }));
    return true;
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  handleRevenueRoutes,
  MODULES,
  DEFAULT_GUARDRAILS,
  checkGuardrails,
  logDecision,
  sendNotification,
  scrapeSignals,
  enrichLead,
  writeColdEmail,
  sendOutreach,
  runLeadHunterCycle,
  runContentBotCycle,
  createCheckoutSession,
  handleStripeWebhook,
  getLeadHunterStatus,
};
