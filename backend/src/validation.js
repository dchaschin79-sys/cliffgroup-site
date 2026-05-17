const FORM_TYPES = new Set(['demo', 'contact', 'walkthrough']);
const STATUSES = new Set(['new', 'contacted', 'qualified', 'unqualified', 'archived']);

function cleanString(value, max = 500) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/\u0000/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function cleanLongText(value, max = 3000) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, max);
}

function normalizeEmail(value) {
  return cleanString(value, 254).toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function inferFormTypeFromSource(value) {
  const prefix = cleanString(value, 80).split(':')[0];
  return FORM_TYPES.has(prefix) ? prefix : '';
}

function normalizeLead(body, routeFormType, req) {
  const errors = [];
  const formType = cleanString(
    routeFormType || body.form_type || inferFormTypeFromSource(body.source) || 'contact',
    32
  );

  if (!FORM_TYPES.has(formType)) {
    errors.push('Invalid form type.');
  }

  const honeypot = cleanString(body.website || body.company_website, 200);
  if (honeypot) {
    return { spam: true, errors: [] };
  }

  const fullName = cleanString(body.full_name || body.name, 160);
  const email = normalizeEmail(body.email || body.work_email);
  const company = cleanString(body.company, 180);
  const role = cleanString(body.role, 120);
  const phone = cleanString(body.phone, 80);
  const teamSize = cleanString(body.team_size, 80);
  const message = cleanLongText(body.message, 3000);
  const operationalProblem = cleanLongText(
    body.operational_problem || body.problem || body.handoff || body.message,
    3000
  );
  const sourcePage = cleanString(body.source_page || body.source || req.get('referer') || '', 1000);

  if (!fullName) errors.push('Full name is required.');
  if (!email || !isEmail(email)) errors.push('A valid email is required.');
  if ((formType === 'contact' || formType === 'walkthrough') && !operationalProblem && !message) {
    errors.push('Please include a short note about the operation.');
  }

  return {
    errors,
    lead: {
      form_type: formType,
      full_name: fullName,
      email,
      company,
      role,
      phone,
      team_size: teamSize,
      message,
      operational_problem: operationalProblem,
      source_page: sourcePage,
      metadata: {
        user_agent: cleanString(req.get('user-agent') || '', 500),
        ip_hint: cleanString(req.ip || '', 80)
      }
    }
  };
}

function normalizeStatus(value) {
  const status = cleanString(value, 32);
  return STATUSES.has(status) ? status : '';
}

module.exports = {
  FORM_TYPES,
  STATUSES,
  normalizeLead,
  normalizeStatus,
  cleanString
};
