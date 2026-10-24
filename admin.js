(() => {
  const cfg = window.SPACE_CONFIG || {};
  const client = window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY) : null;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const say = (s, t) => { const el = $(s); if (el) el.textContent = t; };
  const money = n => new Intl.NumberFormat('ar-IQ', {maximumFractionDigits: 0}).format(Number(n || 0)) + ' د.ع';
  const page = document.body.dataset.page;

  // ===== قائمة التنقل بين الصفحات =====
  const NAV = [
    ['index.html', 'overview', 'نظرة عامة'],
    ['settings.html', 'settings', 'معلومات الشركة'],
    ['services.html', 'services', 'الخدمات'],
    ['portfolio.html', 'portfolio', 'المعرض'],
    ['requests.html', 'requests', 'طلبات العملاء'],
    ['sales.html', 'sales', 'الحسابات والإيرادات']
  ];
  function renderNav() {
    const el = $('#adminNav');
    if (!el) return;
    el.innerHTML = NAV.map(([href, key, label]) =>
      `<a class="tab-button ${key === page ? 'active' : ''}" href="${href}">${label}</a>`).join('');
  }

  // ===== تسجيل الدخول (صفحة login.html) =====
  function initLogin() {
    $('#loginForm').addEventListener('submit', async e => {
      e.preventDefault();
      if (!client) { say('#loginStatus', 'إعدادات Supabase غير مكتملة داخل config.js.'); return; }
      const f = new FormData(e.currentTarget);
      say('#loginStatus', 'جاري تسجيل الدخول...');
      const { error } = await client.auth.signInWithPassword({ email: f.get('email'), password: f.get('password') });
      if (error) { say('#loginStatus', 'تعذّر الدخول؛ تأكد من الإيميل وكلمة المرور.'); console.error(error); return; }
      say('#loginStatus', 'تم تسجيل الدخول.');
      location.replace('index.html');
    });
  }

  // ===== نظرة عامة =====
  async function initOverview() {
    const [sales, reqs] = await Promise.all([
      client.from('sales').select('*').order('sale_date', { ascending: false }).limit(1000),
      client.from('customer_requests').select('*', { count: 'exact', head: true })
    ]);
    if (!reqs.error) $('#requestCount').textContent = reqs.count ?? 0;
    if (sales.error) { say('#overviewStatus', 'جهّز جدول المبيعات من ملف SUPABASE-SETUP-SQL.txt أولاً.'); return; }
    const list = sales.data || [], now = new Date();
    const monthly = list.filter(x => { const d = new Date(x.sale_date + 'T12:00:00'); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const received = x => Number(x.amount_received || 0);
    $('#monthSales').textContent = monthly.length;
    $('#monthRevenue').textContent = money(monthly.reduce((a, x) => a + received(x), 0));
    $('#allRevenue').textContent = money(list.reduce((a, x) => a + received(x), 0));
  }

  // ===== معلومات الشركة =====
  async function initSettings() {
    const form = $('#settingsForm');
    const showLogo = url => { const img = $('#logoPreview'); if (img) { img.src = url || ''; img.style.display = url ? 'block' : 'none'; } };
    const { data, error } = await client.from('site_settings').select('*').limit(1).maybeSingle();
    if (error) say('#settingsStatus', 'تعذر تحميل الإعدادات.');
    else if (data) { for (const k of ['company_name', 'description', 'whatsapp', 'instagram']) form.elements[k].value = data[k] || ''; showLogo(data.logo_url); }
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const payload = { company_name: f.get('company_name'), description: f.get('description'), whatsapp: f.get('whatsapp'), instagram: f.get('instagram'), updated_at: new Date().toISOString() };
      const logo = f.get('logo_file');
      if (logo && logo.size) {
        if (!logo.type.startsWith('image/')) { say('#settingsStatus', 'الشعار لازم يكون صورة.'); return; }
        if (logo.size > 5 * 1024 * 1024) { say('#settingsStatus', 'الحد الأقصى لحجم الشعار 5 ميغابايت.'); return; }
        say('#settingsStatus', 'جاري رفع الشعار...');
        const path = 'logo-' + Date.now() + '-' + logo.name.replace(/[^a-zA-Z0-9._-]/g, '-');
        const { data: up, error: upErr } = await client.storage.from('space-media').upload(path, logo, { upsert: false, contentType: logo.type });
        if (upErr) { say('#settingsStatus', 'فشل رفع الشعار. تأكد من إعداد التخزين.'); console.error(upErr); return; }
        payload.logo_url = client.storage.from('space-media').getPublicUrl(up.path).data.publicUrl;
      }
      const { data: existing, error: readError } = await client.from('site_settings').select('id').limit(1).maybeSingle();
      if (readError) { say('#settingsStatus', 'تعذر قراءة الإعدادات.'); return; }
      const result = existing ? await client.from('site_settings').update(payload).eq('id', existing.id) : await client.from('site_settings').insert(payload);
      if (result.error) { say('#settingsStatus', 'ما انحفظت المعلومات؛ تحقق من الصلاحيات ومن إضافة عمود logo_url.'); console.error(result.error); return; }
      if (payload.logo_url) { showLogo(payload.logo_url); form.elements.logo_file.value = ''; }
      say('#settingsStatus', 'تم حفظ معلومات الشركة.');
    });
  }

  // ===== الخدمات =====
  async function loadServices() {
    const { data, error } = await client.from('services').select('*').order('created_at', { ascending: false });
    if (error) { $('#servicesList').innerHTML = '<small>تعذر تحميل الخدمات.</small>'; return; }
    $('#servicesList').innerHTML = (data || []).map(s => `<div class="admin-item"><span>${esc(s.title)}<small>${esc(s.description)}</small></span><button class="btn-small btn-danger" data-delete-service="${s.id}">حذف</button></div>`).join('') || '<small>ماكو خدمات مضافة بعد.</small>';
    $('#servicesList').querySelectorAll('[data-delete-service]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('متأكد تريد حذف الخدمة؟')) return;
      const { error } = await client.from('services').delete().eq('id', b.dataset.deleteService);
      if (error) alert('تعذر الحذف؛ تحقق من صلاحيات المدير.'); else loadServices();
    }));
  }
  function initServices() {
    $('#serviceForm').addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const { error } = await client.from('services').insert({ title: f.get('title'), description: f.get('description') });
      say('#serviceStatus', error ? 'تعذرت الإضافة؛ تحقق من الصلاحيات.' : 'تمت إضافة الخدمة.');
      if (!error) { e.currentTarget.reset(); loadServices(); }
    });
    loadServices();
  }

  // ===== المعرض =====
  async function loadPortfolio() {
    const { data, error } = await client.from('portfolio').select('*').order('created_at', { ascending: false });
    if (error) { $('#portfolioList').innerHTML = '<small>تعذر تحميل الأعمال.</small>'; return; }
    $('#portfolioList').innerHTML = (data || []).map(p => `<div class="admin-item"><span>${esc(p.title)}<small>${esc(p.media_type)} · ${esc(p.media_url)}</small></span><button class="btn-small btn-danger" data-delete-portfolio="${p.id}" data-media-url="${esc(p.media_url)}">حذف</button></div>`).join('') || '<small>ماكو أعمال مضافة بعد.</small>';
    $('#portfolioList').querySelectorAll('[data-delete-portfolio]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('متأكد تريد حذف العمل؟')) return;
      const { error } = await client.from('portfolio').delete().eq('id', b.dataset.deletePortfolio);
      if (error) { alert('تعذر الحذف؛ تحقق من الصلاحيات.'); return; }
      try {
        const u = new URL(b.dataset.mediaUrl);
        const marker = '/storage/v1/object/public/space-media/';
        const i = u.pathname.indexOf(marker);
        if (i >= 0) await client.storage.from('space-media').remove([decodeURIComponent(u.pathname.slice(i + marker.length))]);
      } catch (_) {}
      loadPortfolio();
    }));
  }
  function initPortfolio() {
    $('#portfolioForm').addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.currentTarget, f = new FormData(form), file = f.get('media_file');
      if (!file || !file.size) { say('#portfolioStatus', 'اختار صورة أو فيديو من جهازك.'); return; }
      if (file.size > 50 * 1024 * 1024) { say('#portfolioStatus', 'الحد الأقصى لحجم الملف 50 ميغابايت.'); return; }
      const isVideo = file.type.startsWith('video/');
      const requested = f.get('media_type');
      if ((requested === 'video') !== isVideo) { say('#portfolioStatus', 'اختار نوع الوسائط المطابق للملف.'); return; }
      say('#portfolioStatus', 'جاري رفع الملف...');
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const path = Date.now() + '-' + Math.random().toString(36).slice(2) + '-' + safe;
      const { data: uploaded, error: upErr } = await client.storage.from('space-media').upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) { say('#portfolioStatus', 'فشل الرفع. نفّذ إعداد التخزين من ملف SUPABASE-SETUP-SQL.txt ثم جرّب.'); console.error(upErr); return; }
      const { data: { publicUrl } } = client.storage.from('space-media').getPublicUrl(uploaded.path);
      const { error } = await client.from('portfolio').insert({ title: f.get('title'), description: f.get('description'), media_url: publicUrl, media_type: requested });
      if (error) { say('#portfolioStatus', 'انرفع الملف لكن تعذرت إضافته للمعرض. تحقق من صلاحيات جدول portfolio.'); console.error(error); return; }
      say('#portfolioStatus', 'تم رفع الملف وإضافة العمل بنجاح.');
      form.reset();
      loadPortfolio();
    });
    loadPortfolio();
  }

  // ===== طلبات العملاء =====
  async function initRequests() {
    const { data, error } = await client.from('customer_requests').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) { $('#requestsList').innerHTML = '<small>تعذر تحميل الطلبات؛ تحقق من صلاحيات المدير.</small>'; return; }
    $('#requestsList').innerHTML = (data || []).map(r => `<div class="admin-item"><span><b>${esc(r.customer_name)}</b> — ${esc(r.phone)}<small>${esc(r.service)} · ${esc(r.details)}<br>${r.created_at ? new Date(r.created_at).toLocaleString('ar-IQ') : ''}</small></span></div>`).join('') || '<small>ماكو طلبات جديدة حالياً.</small>';
  }

  // ===== الحسابات والإيرادات =====
  async function loadSales() {
    const { data, error } = await client.from('sales').select('*').order('sale_date', { ascending: false }).limit(500);
    if (error) { $('#salesList').innerHTML = '<small>جهّز جدول المبيعات من ملف SUPABASE-SETUP-SQL.txt أولاً.</small>'; return; }
    const sales = data || [];
    $('#salesList').innerHTML = sales.map(x => `<div class="admin-item"><span><b>${esc(x.item_name)}</b><small>${esc(x.customer_name || 'بدون اسم عميل')} · ${esc(x.sale_date)}<br>قيمة البيع: ${money(x.amount)} · المستلم: ${money(x.amount_received)} · ${x.payment_status === 'paid' ? 'مدفوع بالكامل' : x.payment_status === 'partial' ? 'مدفوع جزئياً' : 'غير مدفوع'}</small></span><button class="btn-small btn-danger" data-delete-sale="${x.id}">حذف</button></div>`).join('') || '<small>ماكو مبيعات مسجلة بعد.</small>';
    $('#salesList').querySelectorAll('[data-delete-sale]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('متأكد تريد حذف عملية البيع؟')) return;
      const { error } = await client.from('sales').delete().eq('id', b.dataset.deleteSale);
      if (error) say('#salesStatus', 'تعذر الحذف؛ تحقق من صلاحيات المدير.');
      else { say('#salesStatus', 'تم حذف العملية.'); loadSales(); }
    }));
  }
  function initSales() {
    const dateInput = $('#saleForm').elements.sale_date;
    dateInput.value = new Date().toISOString().slice(0, 10);
    $('#saleForm').addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.currentTarget, f = new FormData(form), amount = Number(f.get('amount')), received = Number(f.get('amount_received'));
      if (received > amount) { say('#saleStatus', 'المبلغ المستلم لا يمكن أن يكون أكبر من قيمة البيع.'); return; }
      if (received < 0) { say('#saleStatus', 'المبلغ المستلم لا يمكن أن يكون سالباً.'); return; }
      say('#saleStatus', 'جاري حفظ البيع...');
      const { error } = await client.from('sales').insert({ customer_name: f.get('customer_name') || null, item_name: f.get('item_name'), amount, amount_received: received, payment_status: f.get('payment_status'), sale_date: f.get('sale_date'), notes: f.get('notes') || null });
      if (error) { say('#saleStatus', 'تعذر الحفظ. تأكد من إعداد جدول sales وصلاحيات المدير.'); console.error(error); return; }
      say('#saleStatus', 'تم حفظ عملية البيع.');
      form.reset();
      dateInput.value = new Date().toISOString().slice(0, 10);
      loadSales();
    });
    loadSales();
  }

  const pages = { login: initLogin, overview: initOverview, settings: initSettings, services: initServices, portfolio: initPortfolio, requests: initRequests, sales: initSales };

  // ===== نقطة البداية: حماية الصفحات =====
  async function start() {
    if (page === 'login') {
      pages.login();
      if (client) { const { data: { session } } = await client.auth.getSession(); if (session) location.replace('index.html'); }
      return;
    }
    if (!client) { location.replace('login.html'); return; }
    const { data: { session } } = await client.auth.getSession();
    if (!session) { location.replace('login.html'); return; }
    renderNav();
    $('#page').classList.remove('hidden');
    const out = $('#logoutBtn');
    if (out) out.addEventListener('click', async () => { await client.auth.signOut(); location.replace('login.html'); });
    if (pages[page]) pages[page]();
  }
  document.addEventListener('DOMContentLoaded', start);
})();
