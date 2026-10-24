(() => {
  const cfg = window.SPACE_CONFIG || {};
  const client = window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY) : null;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const page = document.body.dataset.page;

  // قيم افتراضية؛ تنستبدل بالقيم المحفوظة في لوحة الإدارة (site_settings)
  const S = {
    company_name: 'SPACE Y',
    logo_url: '',
    description: 'نساعد أصحاب المشاريع التجارية بصناعة محتوى إعلاني يوصل مشروعهم للجمهور المطلوب.',
    whatsapp: '9647716702502',
    instagram: 's.pace_y'
  };
  const DEFAULT_SERVICES = [
    ['إعلانات سينمائية', 'محتوى إعلاني بصري بروح سينمائية يلفت الانتباه ويثبّت اسم مشروعك.'],
    ['موشن غرافيك', 'فيديوهات متحركة ومونتاج احترافي توصّل فكرتك بسرعة ووضوح.'],
    ['هوية بصرية وتصميم', 'تصميم هوية متكاملة وتصاميم سوشيال ميديا تعبّر عن مشروعك.'],
    ['واجهات المواقع والتطبيقات', 'تصميم واجهات استخدام واضحة وجذابة تخلي الزبون يفهم ويطلب.'],
    ['فن الذكاء الاصطناعي', 'صور ومحتوى بصري مبتكر بأدوات الذكاء الاصطناعي.'],
    ['إعلانات السيارات', 'محتوى إعلاني احترافي لمعارض ومشاريع السيارات.']
  ];
  const NAV = [['index.html','home','الرئيسية'],['about.html','about','من نحن'],['services.html','services','الخدمات'],['work.html','work','أعمالنا'],['contact.html','contact','تواصل معنا']];
  const igUrl = v => /^https?:/i.test(v) ? v : 'https://instagram.com/' + String(v).replace(/^@/, '');
  const waNum = () => String(S.whatsapp).replace(/\D/g, '');

  function layout() {
    const name = S.company_name.trim() || 'SPACE Y';
    const mark = S.logo_url ? `<img class="brand-logo" src="${esc(S.logo_url)}" alt="">` : `<span class="brand-mark">${esc(name.charAt(0).toUpperCase())}</span>`;
    document.title = document.title.replace(/^[^|]*\|/, name + ' |');
    $('#siteHeader').innerHTML = `<a class="brand" href="index.html">${mark}<span>${esc(name)}<small>CREATIVE STUDIO</small></span></a><nav id="mainNav">${NAV.map(([h,k,t]) => `<a href="${h}" class="${k === page ? 'active' : ''}">${t}</a>`).join('')}</nav><a class="nav-cta" href="contact.html">ابدأ مشروعك</a><button class="menu-toggle" id="menuBtn" aria-label="القائمة">☰</button>`;
    $('#menuBtn').addEventListener('click', () => $('#mainNav').classList.toggle('open'));
    $('#siteFooter').innerHTML = `<span class="footer-brand">${esc(S.company_name.trim() || 'SPACE Y')}</span><span>© ${new Date().getFullYear()} جميع الحقوق محفوظة</span><a id="footIg" class="admin-foot-link" target="_blank" rel="noopener">Instagram</a>`;
  }

  async function loadSettings() {
    if (!client) return;
    try {
      const { data } = await client.from('site_settings').select('*').limit(1).maybeSingle();
      if (data) for (const k of ['company_name', 'logo_url', 'description', 'whatsapp', 'instagram']) if (data[k]) S[k] = data[k];
    } catch (_) {}
  }

  function applySettings() {
    document.querySelectorAll('[data-name]').forEach(el => el.textContent = S.company_name.trim() || 'SPACE Y');
    document.querySelectorAll('[data-desc]').forEach(el => el.textContent = S.description);
    $('#footIg').href = igUrl(S.instagram);
    const wa = document.createElement('a');
    wa.className = 'wa-float'; wa.target = '_blank'; wa.rel = 'noopener';
    wa.href = 'https://wa.me/' + waNum(); wa.textContent = 'واتساب 💬';
    document.body.appendChild(wa);
    const links = $('#contactLinks');
    if (links) links.innerHTML = `<a href="https://wa.me/${waNum()}" target="_blank" rel="noopener">واتساب ↗</a><a href="${esc(igUrl(S.instagram))}" target="_blank" rel="noopener">إنستغرام ↗</a><a href="tel:+${waNum()}" dir="ltr">+${waNum()}</a>`;
  }

  async function getServices() {
    if (client) {
      const { data, error } = await client.from('services').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length) return data.map(s => [s.title, s.description]);
    }
    return DEFAULT_SERVICES;
  }
  const cards = list => list.map(([t, d], i) => `<article class="service-card"><span class="service-no">${String(i + 1).padStart(2, '0')}</span><div class="service-icon">✦</div><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join('');

  async function getWork() {
    if (!client) return [];
    const { data, error } = await client.from('portfolio').select('*').order('created_at', { ascending: false });
    return error ? [] : data || [];
  }
  const workHtml = list => list.length ? list.map(p => `<div class="portfolio-item">${p.media_type === 'video' ? `<video src="${esc(p.media_url)}" controls muted playsinline preload="metadata"></video>` : `<img src="${esc(p.media_url)}" alt="${esc(p.title)}" loading="lazy">`}<div class="portfolio-caption"><strong>${esc(p.title)}</strong>${p.description ? `<p>${esc(p.description)}</p>` : ''}</div></div>`).join('')
    : '<div class="portfolio-placeholder"><span>COMING SOON</span><strong>أعمالنا قريباً</strong><p>نجهّز معرض أعمالنا، ترقبوه.</p></div>';

  function initContact() {
    $('#requestForm').addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.currentTarget, f = new FormData(form), msg = $('#formMessage'), btn = form.querySelector('button');
      if (!client) { msg.textContent = 'الخدمة غير متاحة حالياً، تواصل وياهم واتساب.'; return; }
      btn.disabled = true; msg.textContent = 'جاري الإرسال...';
      const { error } = await client.from('customer_requests').insert({
        customer_name: String(f.get('customer_name')).trim(), phone: String(f.get('phone')).trim(),
        service: String(f.get('service') || '').trim(), details: String(f.get('details')).trim(), status: 'new'
      });
      btn.disabled = false;
      if (error) { msg.textContent = 'تعذّر الإرسال، جرّب مرة ثانية أو تواصل واتساب.'; console.error(error); return; }
      msg.textContent = 'وصل طلبك ✓ راح نتواصل وياك قريباً.';
      form.reset();
    });
  }

  async function start() {
    await loadSettings();
    layout();
    applySettings();
    if (page === 'home') {
      getServices().then(l => $('#homeServices').innerHTML = cards(l.slice(0, 3)));
      getWork().then(l => $('#homeWork').innerHTML = workHtml(l.slice(0, 4)));
    } else if (page === 'services') getServices().then(l => $('#servicesGrid').innerHTML = cards(l));
    else if (page === 'work') getWork().then(l => $('#workGrid').innerHTML = workHtml(l));
    else if (page === 'contact') initContact();
  }
  start();
})();
