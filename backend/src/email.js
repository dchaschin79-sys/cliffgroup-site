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

async function sendResendEmail({ to, subject, html, text }) {
  if (!config.emailEnabled) return { status: 'skipped', reason: 'email disabled' };
  if (!config.resendApiKey) return { status: 'skipped', reason: 'missing RESEND_API_KEY' };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: config.resendFromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text
    })
  });

  if (!response.ok) {
    const message = await response.text().catch(() => 'Resend request failed.');
    throw new Error(`Resend request failed with ${response.status}: ${message.slice(0, 240)}`);
  }

  return { status: 'sent' };
}

async function sendLeadNotifications(lead) {
  const results = {};

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
  } else {
    results.internal = { status: 'skipped', reason: 'missing INTERNAL_NOTIFICATION_EMAIL' };
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

  results.confirmation = await sendResendEmail({
    to: lead.email,
    subject: 'We received your Cliff Group walkthrough request',
    html: confirmationHtml,
    text: `Hi ${lead.full_name}, thanks for reaching out to Cliff Group Florida. We received your request and will follow up within one business day.`
  });

  return results;
}

module.exports = {
  sendLeadNotifications
};
