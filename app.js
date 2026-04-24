/* =========================================================
   Cliff Group — interactions
   ========================================================= */
(() => {

  /* ---------- Variant switcher ---------- */
  const SWITCH_KEY = 'cliff-variant';
  const variants = document.querySelectorAll('.variant');
  const buttons = document.querySelectorAll('.switcher button');
  const saved = localStorage.getItem(SWITCH_KEY);
  if (saved) setVariant(saved, false);

  buttons.forEach(b => b.addEventListener('click', () => setVariant(b.dataset.variant, true)));
  function setVariant(name, animate) {
    variants.forEach(v => v.classList.toggle('active', v.id === 'v-' + name));
    buttons.forEach(b => b.classList.toggle('active', b.dataset.variant === name));
    localStorage.setItem(SWITCH_KEY, name);
    window.scrollTo({top:0, behavior: animate ? 'smooth' : 'instant'});
    // re-run reveals for the now-visible variant
    requestAnimationFrame(() => setupReveals());
  }

  /* ---------- Scroll reveal ---------- */
  let io;
  function setupReveals() {
    if (io) io.disconnect();
    io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.variant.active .reveal').forEach(el => {
      el.classList.remove('in');
      io.observe(el);
    });
  }
  setupReveals();

  /* ---------- Animated counters ---------- */
  const counters = document.querySelectorAll('[data-count]');
  const coIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.count;
      const dur = 1400;
      const start = performance.now();
      const initial = 0;
      const suffix = el.textContent.replace(/[\d.,]/g,'').trim();
      function tick(now) {
        const t = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(initial + (target - initial) * eased) + suffix;
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      coIO.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => coIO.observe(c));

  /* ---------- Parallax ---------- */
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  let py = 0, pyTarget = 0;
  window.addEventListener('scroll', () => { pyTarget = window.scrollY; }, {passive:true});
  function loopParallax() {
    py += (pyTarget - py) * 0.08;
    parallaxEls.forEach(el => {
      const strength = +el.dataset.parallax;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
      el.style.transform = `translateY(${(-py * strength).toFixed(2)}px)`;
    });
    requestAnimationFrame(loopParallax);
  }
  loopParallax();

  /* ---------- Magnetic cursor ---------- */
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  let mx = window.innerWidth/2, my = window.innerHeight/2;
  let rx = mx, ry = my;
  window.addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
  });
  function loopCursor() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(loopCursor);
  }
  loopCursor();

  const hoverTargets = 'a, button, .product, .why-item, input, textarea, select';
  document.addEventListener('pointerover', e => {
    if (e.target.closest(hoverTargets)) { dot.classList.add('hover'); ring.classList.add('hover'); }
  });
  document.addEventListener('pointerout', e => {
    if (e.target.closest(hoverTargets)) { dot.classList.remove('hover'); ring.classList.remove('hover'); }
  });

  /* ---------- Magnetic buttons ---------- */
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) * 0.25;
      const dy = (e.clientY - cy) * 0.35;
      btn.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  });

  /* ---------- 3D tilt card (variant B) ---------- */
  const tilt = document.getElementById('tiltCard');
  if (tilt) {
    const parent = tilt.parentElement;
    parent.addEventListener('pointermove', e => {
      const r = parent.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -14;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 14;
      tilt.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
    });
    parent.addEventListener('pointerleave', () => { tilt.style.transform = ''; });
  }

  /* ---------- Particles canvas (variant B) ---------- */
  const canvas = document.getElementById('particleCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let w, h, pts;
    function sizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = rect.width * dpr;
      h = canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.scale(1,1);
      pts = Array.from({length: 70}, () => ({
        x: Math.random()*w, y: Math.random()*h,
        vx: (Math.random()-0.5)*0.25*dpr, vy:(Math.random()-0.5)*0.25*dpr,
        r: Math.random()*1.4*dpr + 0.6*dpr
      }));
    }
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);

    let mouseX = -9999, mouseY = -9999;
    canvas.parentElement.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      mouseX = (e.clientX - r.left) * dpr;
      mouseY = (e.clientY - r.top) * dpr;
    });
    canvas.parentElement.addEventListener('pointerleave', () => { mouseX = -9999; mouseY = -9999; });

    function drawParticles() {
      ctx.clearRect(0,0,w,h);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // update
      pts.forEach(p => {
        // mouse repel
        const dx = p.x - mouseX, dy = p.y - mouseY;
        const d2 = dx*dx + dy*dy;
        const R = 120 * dpr;
        if (d2 < R*R) {
          const f = (R - Math.sqrt(d2)) / R;
          p.vx += (dx / (Math.sqrt(d2)+0.01)) * f * 0.06;
          p.vy += (dy / (Math.sqrt(d2)+0.01)) * f * 0.06;
        }
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.985; p.vy *= 0.985;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      });
      // lines
      for (let i=0; i<pts.length; i++) {
        for (let j=i+1; j<pts.length; j++) {
          const a = pts[i], b = pts[j];
          const dx = a.x-b.x, dy = a.y-b.y;
          const d2 = dx*dx + dy*dy;
          const MAX = 120 * dpr;
          if (d2 < MAX*MAX) {
            const alpha = 1 - Math.sqrt(d2)/MAX;
            ctx.strokeStyle = `rgba(94,234,212,${alpha * 0.22})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
          }
        }
      }
      // dots
      pts.forEach(p => {
        ctx.fillStyle = 'rgba(94,234,212,.55)';
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      });
      requestAnimationFrame(drawParticles);
    }
    drawParticles();
  }

  /* ---------- Modals ---------- */
  const productData = {
    salespro: {
      tag:'SalesPro · Sales & Inventory',
      title:'Everything you sell, in one system.',
      desc:'SalesPro ties quotes, inventory and invoicing into one tidy flow. No more spreadsheets, no more "which version is this".',
      features:[
        'Real-time inventory across locations',
        'Quotes → orders → invoices without re-typing',
        'QuickBooks and Stripe connectors',
        'Custom pricing rules per customer',
        'CSV export of everything, on demand'
      ],
      mock: makeMockSalesPro
    },
    hvacpro: {
      tag:'HVAC Pro · Dispatch',
      title:'Drag a job, route a truck, done.',
      desc:'A live dispatch board plus a phone-first app for your techs. Offline capable, so jobs keep moving in attics and basements.',
      features:[
        'Drag-and-drop schedule with ETAs',
        'Offline-capable tech app (iOS & Android)',
        'Auto routing across the day',
        'Customer history on every call',
        'In-app signature, photos, payment'
      ],
      mock: makeMockHvacPro
    },
    estimatepro: {
      tag:'Estimate Pro · Quoting',
      title:'Signed before the truck leaves.',
      desc:'Configure-to-quote for HVAC: equipment, labor, margin, all preset. Send, e-sign, and turn into a job with one click.',
      features:[
        'Drag-and-drop line items',
        'Pricing rules that respect your margin',
        'PDF + e-signature + payment link',
        'Template library per job type',
        'Converts straight into HVAC Pro'
      ],
      mock: makeMockEstimatePro
    }
  };

  function makeMockSalesPro(host){
    host.innerHTML = `
      <div style="display:flex;gap:6px;margin-bottom:10px">
        <span style="padding:3px 8px;border-radius:999px;background:rgba(20,184,166,.2);color:#5EEAD4;font-size:11px;font-weight:600">INV</span>
        <span style="padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.06);color:#9AA7BD;font-size:11px">42 SKUs</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${['Filter 16x25 · 48 in stock','Capacitor 45µF · 12 in stock','Condenser CX-7 · 3 in stock','Thermostat T3 · 21 in stock'].map(t=>`
          <div style="display:flex;justify-content:space-between;padding:8px 10px;background:rgba(255,255,255,.04);border-radius:8px;font-size:12px;color:#E6EDF7">
            <span>${t.split('·')[0]}</span>
            <span style="color:#5EEAD4;font-weight:600">${t.split('·')[1]}</span>
          </div>`).join('')}
      </div>
      <div style="margin-top:12px;padding:10px;border-radius:8px;background:rgba(94,234,212,.08);border:1px solid rgba(94,234,212,.2);font-size:12px;color:#5EEAD4">
        ▲ Monthly revenue · $48,200 · +12%
      </div>`;
  }
  function makeMockHvacPro(host){
    host.innerHTML = `
      <div style="display:grid;grid-template-columns:60px 1fr;gap:6px;font-size:11px;color:#9AA7BD">
        ${['09:00','10:30','12:00','13:30','15:00'].map((t,i)=>`
          <div style="padding:4px 0">${t}</div>
          <div style="padding:6px 10px;border-radius:6px;background:${['rgba(20,184,166,.2)','rgba(124,92,255,.18)','rgba(20,184,166,.15)','rgba(234,179,8,.18)','rgba(20,184,166,.2)'][i]};color:#E6EDF7">
            ${['Smith · AC tune-up','Patel · Install','Oak Apts · Repair','Hill Co · Estimate','Brown · Maintenance'][i]}
          </div>`).join('')}
      </div>`;
  }
  function makeMockEstimatePro(host){
    host.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:4px">
        ${[['3-ton AC unit','$3,400'],['Installation labor','$1,200'],['Ductwork','$640'],['Warranty','$180']].map(([a,b])=>`
          <div style="display:flex;justify-content:space-between;padding:8px 10px;background:rgba(255,255,255,.04);border-radius:6px;font-size:12px;color:#E6EDF7">
            <span>${a}</span><span style="color:#E6EDF7;font-weight:500">${b}</span>
          </div>`).join('')}
        <div style="display:flex;justify-content:space-between;padding:12px;border-radius:8px;background:rgba(94,234,212,.12);border:1px solid rgba(94,234,212,.3);font-size:13px;color:#5EEAD4;font-weight:600;margin-top:6px">
          <span>Total</span><span>$5,420.00</span>
        </div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <div style="flex:1;padding:8px;border-radius:6px;background:rgba(124,92,255,.15);color:#c4b5fd;font-size:11px;text-align:center">Send PDF</div>
          <div style="flex:1;padding:8px;border-radius:6px;background:rgba(20,184,166,.2);color:#5EEAD4;font-size:11px;text-align:center">Request e-sign</div>
        </div>
      </div>`;
  }

  document.addEventListener('click', e => {
    const open = e.target.closest('[data-modal]');
    if (open) {
      e.preventDefault();
      const key = open.dataset.modal;
      document.getElementById('modal-' + key)?.classList.add('open');
      return;
    }
    const prod = e.target.closest('[data-product]');
    if (prod) {
      const key = prod.dataset.product;
      const d = productData[key];
      document.getElementById('pmodal-tag').textContent = d.tag;
      document.getElementById('pmodal-title').textContent = d.title;
      document.getElementById('pmodal-desc').textContent = d.desc;
      document.getElementById('pmodal-features').innerHTML = d.features.map(f=>`<li>${f}</li>`).join('');
      d.mock(document.getElementById('pmodal-mock'));
      document.getElementById('modal-product').classList.add('open');
      return;
    }
    if (e.target.matches('[data-close]') || e.target.classList.contains('modal-backdrop')) {
      document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
  });

  /* ---------- Toasts ---------- */
  window.toast = function(msg, variant='success') {
    const wrap = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `
      <div class="toast-icon">${variant==='success'?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':'★'}</div>
      <div>${msg}</div>`;
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(()=>el.remove(),400); }, 4000);
  };

  window.submitModal = function(e, which) {
    e.preventDefault();
    e.target.closest('.modal-backdrop').classList.remove('open');
    e.target.reset();
    if (which === 'demo') toast("Got it — we'll reach out within one business day.");
    else toast("Welcome aboard! Check your inbox for login details.");
  };
  window.submitContact = function(e) {
    e.preventDefault();
    e.target.reset();
    toast('Message sent. A real human will reply soon.');
  };

  /* ---------- Cookie banner ---------- */
  const CKEY = 'cliff-cookies';
  if (!localStorage.getItem(CKEY)) {
    setTimeout(() => document.getElementById('cookies').classList.add('show'), 1200);
  }
  document.getElementById('acceptCookies').addEventListener('click', () => {
    localStorage.setItem(CKEY, 'accept');
    document.getElementById('cookies').classList.remove('show');
    toast('Cookie preferences saved.');
  });
  document.getElementById('denyCookies').addEventListener('click', () => {
    localStorage.setItem(CKEY, 'deny');
    document.getElementById('cookies').classList.remove('show');
  });

})();
