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

function normalizeProductInterest(value) {
  const raw = cleanString(value, 80);
  const normalized = raw.toLowerCase().replace(/\s+/g, '');

  if (normalized === 'hvacpro' || normalized === 'hvac') return 'HVAC Pro';
  if (normalized === 'estimatepro' || normalized === 'estimate') return 'EstimatePro';
  if (normalized === 'salespro' || normalized === 'sales') return 'SalesPro';
  if (normalized === 'notsureyet') return 'Not sure yet';
  if (normalized === 'partnership') return 'Partnership';
  if (normalized === 'generalinquiry') return 'General inquiry';

  return raw;
}

function productInterestFromLegacyMessage(value) {
  const text = cleanString(value, 300);
  const lower = text.toLowerCase();

  if (lower === 'hvac pro' || lower.startsWith('hvac pro -')) return 'HVAC Pro';
  if (lower === 'estimatepro' || lower.startsWith('estimatepro -')) return 'EstimatePro';
  if (lower === 'salespro' || lower.startsWith('salespro -')) return 'SalesPro';

  return '';
}

function stripProductPrefix(value, product) {
  const text = cleanLongText(value, 3000);
  if (!text || !product) return text;

  const prefix = `${product} -`;
  if (text.toLowerCase().startsWith(prefix.toLowerCase())) {
    return cleanLongText(text.slice(prefix.length), 3000);
  }

  return text.toLowerCase() === product.toLowerCase() ? '' : text;
}

function pageLabelFromUrl(value) {
  const source = cleanString(value, 1000);
  if (!source) return '';

  const cleaned = source.replace(/^(workflow-review|route|source|page_type):/i, '');
  const knownLabel = normalizeProductInterest(cleaned);
  if (knownLabel === 'HVAC Pro' || knownLabel === 'EstimatePro' || knownLabel === 'SalesPro') {
    return knownLabel;
  }
  if (cleaned.toLowerCase() === 'contact') return 'Contact';
  if (cleaned.toLowerCase() === 'workflow review') return 'Workflow Review';

  try {
    const url = new URL(cleaned, 'https://cliffops.com');
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    if (pathname === '/') return 'Homepage';
    if (pathname === '/hvacpro') return 'HVAC Pro';
    if (pathname === '/estimatepro') return 'EstimatePro';
    if (pathname === '/salespro') return 'SalesPro';
    if (pathname === '/contact') return 'Contact';
    if (pathname === '/demo') return 'Workflow Review';
    return pathname
      .replace(/^\//, '')
      .split('/')
      .filter(Boolean)
      .map(part => part.replace(/[-_]+/g, ' '))
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' / ');
  } catch {
    return cleaned;
  }
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
  const rawMessage = cleanLongText(body.message, 3000);
  const productInterest = normalizeProductInterest(
    body.productInterest || body.product_interest || body.source_interest || body.product
  ) || productInterestFromLegacyMessage(rawMessage);
  const selectedProduct = normalizeProductInterest(
    body.selectedProduct || body.selected_product || productInterest
  );
  const selectedPlan = cleanString(
    body.selectedPlan || body.selected_plan || body.planCode || body.plan_code,
    120
  );
  const message = stripProductPrefix(rawMessage, productInterest);
  const operationalProblem = cleanLongText(
    body.operationalProblem || body.operational_problem || body.problem || body.handoff || stripProductPrefix(rawMessage, productInterest),
    3000
  );
  const pageUrl = cleanString(body.pageUrl || body.page_url || body.source || body.source_page || req.get('referer') || '', 1000)
    .replace(/^(workflow-review|route|source|page_type):/i, '');
  const sourcePage = cleanString(body.sourcePage || body.source_page || pageUrl || req.get('referer') || '', 1000)
    .replace(/^(workflow-review|route|source|page_type):/i, '');
  const sourceLabel = pageLabelFromUrl(sourcePage || pageUrl);

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
        product_interest: productInterest,
        selected_product: selectedProduct || productInterest,
        selected_plan: selectedPlan,
        source_label: sourceLabel,
        page_url: pageUrl,
        referrer: cleanString(body.referrer || body.referer || req.get('referer') || '', 1000),
        submitted_at: new Date().toISOString(),
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
