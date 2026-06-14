const config = require('./config');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function productInterest(lead) {
  return leadMetadata(lead).product_interest || '';
}

function sourceDetails(lead) {
  const metadata = leadMetadata(lead);
  const rawPage = metadata.source_label || lead.source_page || metadata.page_url || '';
  const rawUrl = metadata.page_url || lead.source_page || '';
  const cleanedUrl = String(rawUrl || '').replace(/^(workflow-review|route|source|page_type):/i, '');

  return {
    page: rawPage || 'Website',
    url: cleanedUrl
  };
}

function leadRows(lead) {
  const source = sourceDetails(lead);
  const rows = [
    ['Name', lead.full_name],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Company', lead.company],
    ['Product Interest', productInterest(lead)],
    ['Operational problem', lead.operational_problem],
    ['Source Page', source.page],
    ['URL', source.url],
    ['Lead ID', lead.id]
  ];

  return rows
    .filter(([, value]) => value)
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join('');
}

function productBadge(lead) {
  const product = productInterest(lead);
  if (!product) return '';

  return `
    <div style="display:inline-block;background:#D6B76A;color:#1C2A3E;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin:0 0 18px">
      ${escapeHtml(product)}
    </div>
  `;
}

function internalSubject(lead) {
  const name = lead.full_name || 'New lead';
  const company = lead.company ? ` (${lead.company})` : '';
  return `Workflow Review Request — ${name}${company}`;
}

function customerFocusSentence(lead) {
  const product = String(productInterest(lead)).toLowerCase();

  if (product === 'hvac pro') {
    return 'We will focus the conversation on the HVAC workflow you shared, including scheduling, dispatch, field coordination, closeout, invoicing, and the next practical step for your team.';
  }

  if (product === 'estimatepro') {
    return 'We will focus the conversation on the estimating workflow you shared, including plan review, quantity checks, scope adjustments, proposal preparation, and the next practical step for your estimating process.';
  }

  if (product === 'salespro') {
    return 'We will focus the conversation on the business operations workflow you shared, including inventory visibility, orders, invoices, purchasing, payments, and the next practical step for your business.';
  }

  return 'We will review the workflow challenge you shared and discuss the best next step for your business.';
}

function emailShell(title, body) {
  return `
    <div style="margin:0;padding:0;background:#EFEAE0;font-family:Inter,Arial,sans-serif;color:#1C2A3E">
      <div style="max-width:640px;margin:0 auto;padding:32px 18px">
        <div style="background:#1C2A3E;color:#EFEAE0;border-radius:14px 14px 0 0;padding:22px 26px">
          <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#C9AE7A">Cliff Group Florida</div>
          <h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.12;margin:8px 0 0">${escapeHtml(title)}</h1>
        </div>
        <div style="background:#fffdf7;border:1px solid rgba(28,42,62,.14);border-top:0;border-radius:0 0 14px 14px;padding:26px">
          ${body}
        </div>
      </div>
    </div>
  `;
}

function safeEmailList(to) {
  return (Array.isArray(to) ? to : [to])
    .map(value => String(value || '').trim())
    .filter(Boolean);
}

function extractEmailAddress(value) {
  const text = String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .trim();
  const match = text.match(/<\s*([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)\s*>/);
  if (match) return match[1];

  const looseMatch = text.match(/[^\s<>"']+@[^\s<>"']+\.[^\s<>"']+/);
  return looseMatch ? looseMatch[0] : text;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

async function parseResendError(response) {
  const text = await response.text().catch(() => '');
  if (!text) return `Resend request failed with ${response.status}.`;

  try {
    const body = JSON.parse(text);
    return body.message || body.error || text.slice(0, 240);
  } catch {
    return text.slice(0, 240);
  }
}

function logNotificationResult(channel, lead, result) {
  if (result.status === 'sent' || result.status === 'skipped') return;

  console.warn('Lead notification failed', {
    channel,
    leadId: lead.id,
    status: result.status,
    reason: result.reason,
    statusCode: result.statusCode
  });
}

async function sendResendEmail({ to, subject, html, text }) {
  if (!config.emailEnabled) return { status: 'skipped', reason: 'email disabled' };
  if (!config.resendApiKey) return { status: 'skipped', reason: 'missing RESEND_API_KEY' };

  const recipients = safeEmailList(to);
  if (!recipients.length || recipients.some(recipient => !isValidEmail(recipient))) {
    return { status: 'failed', reason: 'invalid recipient email' };
  }

  let senderSource = config.resendFromEmail;
  let fromAddress = extractEmailAddress(senderSource);
  if (!isValidEmail(fromAddress)) {
    console.warn('Invalid RESEND_FROM_EMAIL; using fallback sender.');
    senderSource = config.resendFallbackFromEmail;
    fromAddress = extractEmailAddress(senderSource);
  }

  if (!isValidEmail(fromAddress)) {
    return { status: 'failed', reason: 'invalid RESEND_FROM_EMAIL' };
  }
  const sender = senderSource.includes('<') && senderSource.includes('>')
    ? senderSource.trim().replace(/^['"]|['"]$/g, '').trim()
    : fromAddress;

  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: sender,
        to: recipients,
        subject,
        html,
        text
      })
    });
  } catch (error) {
    return { status: 'failed', reason: 'resend network error' };
  }

  if (!response.ok) {
    return {
      status: 'failed',
      reason: await parseResendError(response),
      statusCode: response.status
    };
  }

  const body = await response.json().catch(() => ({}));
  return { status: 'sent', id: body.id || '' };
}

async function sendLeadNotifications(lead) {
  const results = {
    internal: { status: 'skipped', reason: 'missing INTERNAL_NOTIFICATION_EMAIL' },
    customer: { status: 'skipped', reason: 'missing lead email' }
  };

  if (config.internalNotificationEmail) {
    const html = emailShell(
      'New Workflow Review',
      `
        ${productBadge(lead)}
        <p style="font-size:15px;line-height:1.6;margin:0 0 18px">A new Workflow Review request was captured.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          ${leadRows(lead)}
        </table>
      `
    );

    results.internal = await sendResendEmail({
      to: config.internalNotificationEmail,
      subject: internalSubject(lead),
      html,
      text: `${internalSubject(lead)}. Product Interest: ${productInterest(lead) || 'Not specified'}. Operational Problem: ${lead.operational_problem || 'Not specified'}. Lead ID: ${lead.id}.`
    });
    logNotificationResult('internal', lead, results.internal);
  }

  const confirmationHtml = emailShell(
    'We received your request',
    `
      <p style="font-size:15px;line-height:1.6;margin:0 0 14px">Hi ${escapeHtml(lead.full_name)},</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 14px">Thanks for reaching out to Cliff Group Florida. We received your request and will follow up within one business day.</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 20px">${escapeHtml(customerFocusSentence(lead))}</p>
      <p style="font-size:13px;color:#6E7485;margin:0">Cliff Group Florida Inc.</p>
    `
  );

  results.customer = await sendResendEmail({
    to: lead.email,
    subject: 'We received your Cliff Group walkthrough request',
    html: confirmationHtml,
    text: `Hi ${lead.full_name}, thanks for reaching out to Cliff Group Florida. We received your request and will follow up within one business day. ${customerFocusSentence(lead)}`
  });
  logNotificationResult('customer', lead, results.customer);

  return results;
}

module.exports = {
  sendLeadNotifications
};
