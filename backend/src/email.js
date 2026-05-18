const config = require('./config');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function leadRows(lead) {
  const rows = [
    ['Form type', lead.form_type],
    ['Name', lead.full_name],
    ['Email', lead.email],
    ['Company', lead.company],
    ['Role', lead.role],
    ['Phone', lead.phone],
    ['Team size', lead.team_size],
    ['Operational problem', lead.operational_problem],
    ['Message', lead.message],
    ['Source page', lead.source_page]
  ];

  return rows
    .filter(([, value]) => value)
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join('');
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

  const fromAddress = extractEmailAddress(config.resendFromEmail);
  if (!isValidEmail(fromAddress)) {
    return { status: 'failed', reason: 'invalid RESEND_FROM_EMAIL' };
  }
  const sender = config.resendFromEmail.includes('<') && config.resendFromEmail.includes('>')
    ? config.resendFromEmail.trim().replace(/^['"]|['"]$/g, '').trim()
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
      `New ${lead.form_type} request`,
      `
        <p style="font-size:15px;line-height:1.6;margin:0 0 18px">A new marketing-site lead was captured.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          ${leadRows(lead)}
        </table>
        <p style="font-size:13px;color:#6E7485;margin:22px 0 0">Lead ID: ${escapeHtml(lead.id)}</p>
      `
    );

    results.internal = await sendResendEmail({
      to: config.internalNotificationEmail,
      subject: `New Cliff Group ${lead.form_type} request from ${lead.full_name}`,
      html,
      text: `New ${lead.form_type} request from ${lead.full_name} (${lead.email}). Lead ID: ${lead.id}.`
    });
    logNotificationResult('internal', lead, results.internal);
  }

  const confirmationHtml = emailShell(
    'We received your request',
    `
      <p style="font-size:15px;line-height:1.6;margin:0 0 14px">Hi ${escapeHtml(lead.full_name)},</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 14px">Thanks for reaching out to Cliff Group Florida. We received your request and will follow up within one business day.</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 20px">We will focus the conversation on the HVAC workflow you shared and the best starting point across estimating, dispatch, field coordination, invoicing, and operating visibility.</p>
      <p style="font-size:13px;color:#6E7485;margin:0">Cliff Group Florida Inc.</p>
    `
  );

  results.customer = await sendResendEmail({
    to: lead.email,
    subject: 'We received your Cliff Group walkthrough request',
    html: confirmationHtml,
    text: `Hi ${lead.full_name}, thanks for reaching out to Cliff Group Florida. We received your request and will follow up within one business day.`
  });
  logNotificationResult('customer', lead, results.customer);

  return results;
}

module.exports = {
  sendLeadNotifications
};
