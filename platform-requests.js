(() => {
  const PRODUCTION_PLATFORM_WEB_URL = 'https://platform-web-production-db95.up.railway.app';

  function defaultPlatformWebUrl() {
    return PRODUCTION_PLATFORM_WEB_URL;
  }

  const DEFAULT_ENDPOINT = `${defaultPlatformWebUrl()}/api/website-requests`;

  const endpoint = (
    window.CLIFF_PLATFORM_REQUESTS_API_URL ||
    document.querySelector('meta[name="platform-requests-api-url"]')?.content?.trim() ||
    DEFAULT_ENDPOINT
  ).replace(/\/+$/, '');

  let pendingRequestContext = {};

  function text(value) {
    return String(value || '').trim();
  }

  function detectProduct(form) {
    const explicit = text(form.dataset.product || pendingRequestContext.product).toUpperCase();
    if (['HVAC_PRO', 'SALES_PRO', 'ESTIMATE_PRO'].includes(explicit)) return explicit;

    const haystack = `${window.location.pathname} ${document.title} ${text(form.closest('[data-product]')?.dataset.product)}`.toLowerCase();
    if (haystack.includes('salespro') || haystack.includes('sales pro')) return 'SALES_PRO';
    if (haystack.includes('estimatepro') || haystack.includes('estimate pro')) return 'ESTIMATE_PRO';
    return 'HVAC_PRO';
  }

  function detectPlan(trigger) {
    const planHost = trigger?.closest?.('[data-plan], .pcard, .pricing-card, .price-card, .plan-card');
    if (!planHost) return '';
    return text(planHost.dataset?.plan || planHost.querySelector?.('.pname, .plan-name, h3, h4')?.textContent);
  }

  function detectCatalogCode(trigger, key) {
    const attribute = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    const host = trigger?.closest?.(`[data-${attribute}], [data-plan], [data-bundle]`);
    return text(host?.dataset?.[key]);
  }

  function detectType(formType, requestedPlan) {
    const raw = text(formType).toLowerCase();
    if (requestedPlan || raw.includes('plan') || raw.includes('trial')) return 'PLAN';
    if (raw.includes('support')) return 'SUPPORT';
    if (raw.includes('contact') || raw.includes('info')) return 'INFORMATION';
    return 'DEMO';
  }

  function setFormState(form, state, message) {
    const button = form.querySelector('button[type="submit"]');
    const label = button?.querySelector('[data-submit-label]');
    const status = form.querySelector('.form-status');

    if (button && label && !button.dataset.defaultLabel) button.dataset.defaultLabel = label.textContent;
    if (button) {
      button.disabled = state === 'loading' || state === 'success';
      button.classList.toggle('is-loading', state === 'loading');
    }
    if (label && button) {
      label.textContent = state === 'loading' ? 'Sending...' : state === 'success' ? 'Sent' : button.dataset.defaultLabel;
    }
    if (status) {
      status.textContent = message || '';
      status.classList.toggle('error', state === 'error');
      status.classList.toggle('success', state === 'success');
    }
  }

  function notify(message, variant = 'success') {
    if (typeof window.toast === 'function') {
      window.toast(message, variant);
    }
  }

  function closeModal(form) {
    const modal = form.closest('.modal-backdrop, .estimate-modal-backdrop');
    if (modal) modal.classList.remove('open');
  }

  function payloadFor(form, formType) {
    const data = new FormData(form);
    const requestedPlan = text(data.get('requested_plan') || data.get('plan') || pendingRequestContext.plan);
    const planCode = text(data.get('plan_code') || data.get('planCode') || pendingRequestContext.planCode);
    const bundleCode = text(data.get('bundle_code') || data.get('bundleCode') || pendingRequestContext.bundleCode);
    const contactName = text(data.get('full_name') || data.get('name'));
    const companyName = text(data.get('company'));
    const message = text(data.get('message') || data.get('operational_problem'));
    const product = detectProduct(form);

    const requestedCatalogItem = requestedPlan || planCode || bundleCode;

    return {
      type: detectType(formType, requestedCatalogItem),
      requestType: detectType(formType, requestedCatalogItem),
      source: 'cliffgroup-site',
      product,
      productCode: product,
      planCode: planCode || undefined,
      bundleCode: bundleCode || undefined,
      requestedPlan: planCode || bundleCode ? undefined : requestedPlan || undefined,
      companyName: companyName || undefined,
      contactName,
      email: text(data.get('email')),
      phone: text(data.get('phone')) || undefined,
      message: message || undefined,
      pageUrl: window.location.href,
      referrer: document.referrer || undefined,
      utmSource: new URLSearchParams(window.location.search).get('utm_source') || undefined,
      utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
      utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
      metadataJson: {
        formType: text(formType),
        productPage: window.location.pathname,
        requestedPlanLabel: requestedPlan || undefined,
        triggerText: pendingRequestContext.triggerText || undefined
      },
      website: text(data.get('website')) || undefined
    };
  }

  function validate(payload) {
    if (!payload.contactName) return 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(payload.email)) return 'Please enter a valid email.';
    if (String(payload.message || '').length > 2000) return 'Please keep the message under 2000 characters.';
    return '';
  }

  async function postRequest(payload) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'We could not send this request. Please try again.');
    return body;
  }

  async function submitPlatformRequest(event, fallbackType) {
    event.preventDefault();
    const form = event.target;
    const formType = form.dataset.leadForm || fallbackType || 'demo';
    if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;

    const payload = payloadFor(form, formType);
    const error = validate(payload);
    if (error) {
      setFormState(form, 'error', error);
      notify(error, 'error');
      return;
    }

    setFormState(form, 'loading', '');
    try {
      await postRequest(payload);
      form.reset();
      const success = "Thanks — we'll contact you shortly.";
      setFormState(form, 'success', success);
      notify(success, 'success');
      pendingRequestContext = {};
      setTimeout(() => {
        closeModal(form);
        setFormState(form, 'idle', '');
      }, 1800);
    } catch (err) {
      const message = err?.message || 'We could not send this request. Please try again.';
      setFormState(form, 'error', message);
      notify(message, 'error');
    }
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-modal], a[href*="pricing"], a[href*="trial"], a[href*="demo"]');
    if (!trigger) return;
    pendingRequestContext = {
      plan: detectPlan(trigger),
      planCode: detectCatalogCode(trigger, 'planCode') || detectCatalogCode(trigger, 'plan'),
      bundleCode: detectCatalogCode(trigger, 'bundleCode') || detectCatalogCode(trigger, 'bundle'),
      product: trigger.dataset.product,
      triggerText: text(trigger.textContent)
    };
  }, true);

  window.submitModal = function(event, which) {
    submitPlatformRequest(event, which === 'demo' ? 'demo' : 'walkthrough');
  };

  window.submitContact = function(event) {
    submitPlatformRequest(event, 'contact');
  };
})();
