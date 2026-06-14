const crypto = require('crypto');
const config = require('./config');
const { cleanString, normalizeStatus, FORM_TYPES, STATUSES } = require('./validation');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function requireAdmin(req, res, next) {
  if (!config.adminPassword) {
    res.status(503).send('Admin password is not configured.');
    return;
  }

  const header = req.get('authorization') || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme !== 'Basic' || !encoded) {
    res.set('WWW-Authenticate', 'Basic realm="Cliff Group Leads"');
    res.status(401).send('Authentication required.');
    return;
  }

  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator < 0) {
    res.set('WWW-Authenticate', 'Basic realm="Cliff Group Leads"');
    res.status(401).send('Authentication required.');
    return;
  }
  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);

  if (!safeEqual(username, config.adminUsername) || !safeEqual(password, config.adminPassword)) {
    res.set('WWW-Authenticate', 'Basic realm="Cliff Group Leads"');
    res.status(401).send('Authentication required.');
    return;
  }

  next();
}

function leadMetadata(lead) {
  if (!lead || !lead.metadata) return {};
  if (typeof lead.metadata === 'object') return lead.metadata;

  try {
    return JSON.parse(lead.metadata);
  } catch {
    return {};
  }
}

function layout(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · Cliff Group Leads</title>
  <style>
    :root{--ink:#1C2A3E;--cream:#EFEAE0;--gold:#C9AE7A;--line:rgba(28,42,62,.14);--muted:#5E6678}
    *{box-sizing:border-box}body{margin:0;background:var(--cream);color:var(--ink);font:14px/1.5 Inter,system-ui,-apple-system,sans-serif}
    header{background:var(--ink);color:var(--cream);padding:24px 28px}header a{color:var(--cream)}
    main{max-width:1120px;margin:0 auto;padding:28px}h1,h2{font-family:Georgia,serif;line-height:1.1;margin:0}
    a{color:var(--ink);font-weight:700;text-decoration:none}.muted{color:var(--muted)}
    .panel{background:#fffdf7;border:1px solid var(--line);border-radius:12px;padding:20px;box-shadow:0 10px 30px rgba(28,42,62,.06)}
    table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted)}
    .filters{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0}.filters a,.button,button,select{border:1px solid var(--line);background:#fffdf7;border-radius:8px;padding:8px 10px;color:var(--ink);font-weight:700}
    .badge{display:inline-flex;border-radius:999px;padding:4px 8px;background:rgba(201,174,122,.24);font-size:12px;font-weight:800;text-transform:capitalize}
    .grid{display:grid;grid-template-columns:220px 1fr;gap:0}.grid div{padding:12px;border-bottom:1px solid var(--line)}.grid div:nth-child(odd){font-weight:800;color:var(--muted)}
    form.inline{display:flex;gap:8px;align-items:center;margin-top:18px}
    @media(max-width:720px){main{padding:18px}.grid{grid-template-columns:1fr}table{font-size:13px}th:nth-child(4),td:nth-child(4){display:none}}
  </style>
</head>
<body>
  <header><h1>Cliff Group Leads</h1><div class="muted">Internal lead capture dashboard</div></header>
  <main>${body}</main>
</body>
</html>`;
}

function leadListPage(leads, filters = {}) {
  const formTypeLinks = ['all', ...FORM_TYPES].map(type => {
    const href = type === 'all' ? '/admin' : `/admin?form_type=${encodeURIComponent(type)}`;
    return `<a class="button" href="${href}">${escapeHtml(type)}</a>`;
  }).join('');

  const rows = leads.map(lead => `
    <tr>
      <td><a href="/admin/leads/${lead.id}">#${lead.id}</a></td>
      <td>${escapeHtml(new Date(lead.created_at).toLocaleString())}</td>
      <td><span class="badge">${escapeHtml(lead.form_type)}</span></td>
      <td>${escapeHtml(lead.status)}</td>
      <td><strong>${escapeHtml(lead.full_name)}</strong><br><span class="muted">${escapeHtml(lead.email)}</span></td>
      <td>${escapeHtml(lead.company || '')}</td>
    </tr>
  `).join('');

  return layout('Leads', `
    <div class="panel">
      <h2>Recent Leads</h2>
      <div class="filters">${formTypeLinks}</div>
      <table>
        <thead><tr><th>ID</th><th>Created</th><th>Type</th><th>Status</th><th>Lead</th><th>Company</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" class="muted">No leads found.</td></tr>'}</tbody>
      </table>
    </div>
  `);
}

function leadDetailPage(lead) {
  const metadata = leadMetadata(lead);
  const fields = [
    ['ID', `#${lead.id}`],
    ['Created', new Date(lead.created_at).toLocaleString()],
    ['Updated', new Date(lead.updated_at).toLocaleString()],
    ['Form type', lead.form_type],
    ['Status', lead.status],
    ['Name', lead.full_name],
    ['Email', lead.email],
    ['Company', lead.company],
    ['Phone', lead.phone],
    ['Product Interest', metadata.product_interest],
    ['Operational problem', lead.operational_problem],
    ['Source Page', metadata.source_label || lead.source_page],
    ['URL', metadata.page_url || lead.source_page]
  ];

  const detailRows = fields.map(([label, value]) => `
    <div>${escapeHtml(label)}</div><div>${escapeHtml(value || '')}</div>
  `).join('');

  const statusOptions = [...STATUSES].map(status => (
    `<option value="${status}" ${status === lead.status ? 'selected' : ''}>${status}</option>`
  )).join('');

  return layout(`Lead #${lead.id}`, `
    <p><a href="/admin">← Back to leads</a></p>
    <div class="panel">
      <h2>${escapeHtml(lead.full_name)}</h2>
      <p class="muted">${escapeHtml(lead.email)}</p>
      <div class="grid" style="margin-top:20px">${detailRows}</div>
      <form class="inline" method="post" action="/admin/leads/${lead.id}/status">
        <label for="status"><strong>Status</strong></label>
        <select id="status" name="status">${statusOptions}</select>
        <button type="submit">Update</button>
      </form>
    </div>
  `);
}

function parseFilter(value, allowedSet) {
  const cleaned = cleanString(value, 32);
  return allowedSet.has(cleaned) ? cleaned : '';
}

module.exports = {
  requireAdmin,
  leadListPage,
  leadDetailPage,
  parseFilter,
  normalizeStatus
};
