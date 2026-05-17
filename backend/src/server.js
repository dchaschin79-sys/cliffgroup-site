const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { ensureSchema, createLead, listLeads, getLead, updateLeadStatus, healthCheck } = require('./db');
const { normalizeLead, FORM_TYPES, STATUSES } = require('./validation');
const { sendLeadNotifications } = require('./email');
const { requireAdmin, leadListPage, leadDetailPage, parseFilter, normalizeStatus } = require('./admin');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

const corsOptions = {
  origin(origin, callback) {
    if (!origin || config.allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin not allowed.'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 204,
  maxAge: 86400
};

app.use('/api', cors(corsOptions));
app.options('/api/*', cors(corsOptions));
app.use(express.json({ limit: '24kb' }));
app.use(express.urlencoded({ extended: false, limit: '12kb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false
});

const leadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests. Please try again later.' }
});

app.use('/api', apiLimiter);

app.get('/api/health', async (req, res) => {
  try {
    await healthCheck();
    res.json({ ok: true, service: 'cliff-group-leads-api' });
  } catch (error) {
    res.status(503).json({ ok: false, service: 'cliff-group-leads-api' });
  }
});

function leadRoute(formType) {
  return async (req, res) => {
    const normalized = normalizeLead(req.body || {}, formType, req);

    if (normalized.spam) {
      res.status(202).json({ ok: true, status: 'received' });
      return;
    }

    if (normalized.errors.length) {
      res.status(400).json({ ok: false, error: normalized.errors[0], errors: normalized.errors });
      return;
    }

    try {
      const lead = await createLead(normalized.lead);
      let notifications = { internal: { status: 'skipped' }, confirmation: { status: 'skipped' } };

      try {
        notifications = await sendLeadNotifications(lead);
      } catch (error) {
        console.error('Lead notification failed', { leadId: lead.id, message: error.message });
        notifications = { error: true };
      }

      res.status(201).json({
        ok: true,
        status: 'received',
        id: lead.id,
        notifications
      });
    } catch (error) {
      console.error('Lead storage failed', { message: error.message });
      res.status(500).json({ ok: false, error: 'We could not save the request. Please try again.' });
    }
  };
}

app.post('/api/leads', leadLimiter, leadRoute(null));
app.post('/api/leads/demo', leadLimiter, leadRoute('demo'));
app.post('/api/leads/contact', leadLimiter, leadRoute('contact'));
app.post('/api/leads/walkthrough', leadLimiter, leadRoute('walkthrough'));

app.get('/admin', requireAdmin, async (req, res) => {
  try {
    const formType = parseFilter(req.query.form_type, FORM_TYPES);
    const status = parseFilter(req.query.status, STATUSES);
    const leads = await listLeads({ formType, status, limit: req.query.limit });
    res.send(leadListPage(leads, { formType, status }));
  } catch (error) {
    res.status(500).send('Unable to load leads.');
  }
});

app.get('/admin/leads/:id', requireAdmin, async (req, res) => {
  try {
    const lead = await getLead(req.params.id);
    if (!lead) {
      res.status(404).send('Lead not found.');
      return;
    }
    res.send(leadDetailPage(lead));
  } catch (error) {
    res.status(500).send('Unable to load lead.');
  }
});

app.post('/admin/leads/:id/status', requireAdmin, async (req, res) => {
  const status = normalizeStatus(req.body.status);
  if (!status) {
    res.status(400).send('Invalid status.');
    return;
  }

  try {
    const lead = await updateLeadStatus(req.params.id, status);
    if (!lead) {
      res.status(404).send('Lead not found.');
      return;
    }
    res.redirect(`/admin/leads/${lead.id}`);
  } catch (error) {
    res.status(500).send('Unable to update lead.');
  }
});

app.use((error, req, res, next) => {
  if (error && error.message === 'Origin not allowed.') {
    res.status(403).json({ ok: false, error: 'Origin not allowed.' });
    return;
  }
  next(error);
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Not found.' });
});

async function start() {
  try {
    await ensureSchema();
    app.listen(config.port, () => {
      console.log(`Cliff Group leads API listening on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start leads API', { message: error.message });
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;
