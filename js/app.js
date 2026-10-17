'use strict';
// RAB Waka — inti SPA. Tampilan mengikuti sketsa Google Stitch (Tailwind + token yang sama); akses sebenarnya dicek di server.
const LS = 'rab:v2:', $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = n => 'Rp ' + Math.round(+n || 0).toLocaleString('id-ID');
const jt = n => { n = +n || 0; return n >= 1e6 ? (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' Jt' : rp(n); };
const tgl = x => x ? new Date(x).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const ROLE = { kepsek: 'Kepala Sekolah', bendahara: 'Bendahara BOSP', waka: 'Waka Bidang', admin: 'Admin', staf: 'Staf Operator' };
const store = { get(k) { try { return JSON.parse(localStorage.getItem(LS + k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { localStorage.removeItem(LS + k); } catch (e) {} } };
const S = { token: null, boot: null }; let E = null;

// ---------- API ----------
let busy = 0;
function bar(on) { busy += on ? 1 : -1; const b = $('#bar'); b.style.width = busy > 0 ? '70%' : '100%'; if (busy <= 0) setTimeout(() => b.style.width = '0', 300); }
async function once(action, data, ms, reqId) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(GAS_URL, { method: 'POST', redirect: 'follow', cache: 'no-store', signal: c.signal, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: S.token || '', reqId, data: data || {} }) });
    const tx = await r.text();
    try { return JSON.parse(tx); } catch (e) { return { success: false, net: 1, message: 'Server membalas bukan JSON (HTTP ' + r.status + '). Cek URL /exec & deployment.' }; }
  } catch (e) { return { success: false, net: 1, message: e.name === 'AbortError' ? 'Server terlalu lama merespons.' : 'Koneksi terputus.' }; }
  finally { clearTimeout(t); }
}
async function api(action, data, read) {
  bar(1); const reqId = read ? '' : (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random()); let r;
  for (let i = 0; i < (read ? 3 : 2); i++) { if (i) await new Promise(z => setTimeout(z, 1200 * i)); r = await once(action, data, read ? (i ? 40000 : 25000) : 90000, reqId); if (r.success || !r.net) break; }
  bar(0); if (!r.success && r.data && r.data.code === 'AUTH' && action !== 'login') logout(true); return r;
}
function toast(m, e) { const d = document.createElement('div'); d.className = 'px-4 py-3 rounded-lg shadow-lg font-body-md text-body-md text-white max-w-sm ' + (e ? 'bg-error' : 'bg-inverse-surface'); d.textContent = m; $('#toast').appendChild(d); setTimeout(() => d.remove(), 4500); }
async function refresh(quiet) {
  const r = await api('bootstrap', {}, true); if (!r.success) return false;
  const ch = JSON.stringify(r.data) !== JSON.stringify(S.boot); S.boot = r.data; store.set('boot', r.data); navCount(); if (ch && quiet && !/^#\/rab\/./.test(location.hash)) route(); return true;
}

// ---------- Komponen gaya Stitch ----------
const ic = (n, s = 20, x = '') => `<span class="material-symbols-outlined text-[${s}px] ${x}">${n}</span>`;
const LBL = 'font-label-code text-[11px] uppercase tracking-wider text-outline', CARD = 'bg-surface-container-lowest rounded-xl shadow-sm';
const BASE = 'inline-flex items-center justify-center gap-2 rounded-lg font-headline-sm text-headline-sm transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ';
const B1 = BASE + 'px-5 py-2.5 bg-primary text-on-primary hover:bg-primary-container shadow-md', B2 = BASE + 'px-4 py-2.5 bg-surface-container-low text-on-surface hover:bg-surface-container shadow-sm';
const BR = BASE + 'px-5 py-2.5 bg-error text-on-error hover:opacity-90 shadow-md', BG_ = BASE + 'px-5 py-2.5 bg-[#166534] text-white hover:opacity-90 shadow-md', BO = BASE + 'px-4 py-2.5 border border-error text-error hover:bg-error-container';
const INP = 'w-full rounded-lg bg-[#F6F9FF] border border-outline-variant px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60';
const bt = (t, a, c = B2, x = '') => `<button class="${c}" data-a="${a}" ${x}>${t}</button>`;
const fld = (l, h, x = '') => `<div class="${x}"><label class="${LBL} block mb-1.5">${l}</label>${h}</div>`;
const BDG = { 'Draft': ['bg-surface-container text-on-surface-variant', 'bg-outline'], 'Diajukan ke Bendahara': ['bg-[#FEF9C3] text-[#854D0E]', 'bg-[#EAB308]'], 'Diperiksa Bendahara': ['bg-[#FEF9C3] text-[#854D0E]', 'bg-[#EAB308]'], 'Perlu Revisi': ['bg-error-container text-on-error-container', 'bg-error'], 'Diajukan ke Kepsek': ['bg-primary-fixed text-on-primary-fixed', 'bg-primary'], 'Disetujui': ['bg-[#DCFCE7] text-[#166534]', 'bg-[#22C55E]'], 'Dibatalkan': ['bg-surface-container text-outline', 'bg-outline'] };
const badge = s => { const b = BDG[s] || BDG.Draft; return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${b[0]} font-label-code text-[11px] font-bold whitespace-nowrap"><span class="w-1.5 h-1.5 rounded-full ${b[1]}"></span>${esc(s)}</span>`; };
const pill = (t, c = 'bg-primary-fixed text-on-primary-fixed') => `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full ${c} font-label-code text-[11px] font-semibold">${esc(t)}</span>`;
const kpi = (l, v, icn, foot, extra = '') => `<div class="rounded-xl bg-surface-container-lowest p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"><div class="flex items-start justify-between"><div><span class="${LBL} block">${l}</span><div class="mt-2 font-currency-display text-headline-lg text-on-surface tracking-tight">${v}</div></div><div class="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">${ic(icn, 22)}</div></div>${extra}${foot ? `<div class="mt-3 pt-3 text-on-surface-variant font-body-sm text-body-sm">${foot}</div>` : ''}</div>`;
const prog = (v, m, h = 2) => { const p = m ? v / m * 100 : 0, c = p > 100 ? 'bg-error' : p > 95 ? 'bg-[#EAB308]' : 'bg-primary'; return `<div class="h-${h} w-full rounded-full bg-surface-container overflow-hidden"><div class="h-full ${c} rounded-full" style="width:${Math.min(p, 100)}%"></div></div>`; };
const THEAD = c => `<thead><tr class="bg-surface-container-low text-on-surface-variant font-label-code text-[11px] uppercase tracking-wider select-none">${c.map(x => `<th class="py-3 px-4 ${x[1] || ''}">${x[0]}</th>`).join('')}</tr></thead>`;
const TR = 'hover:bg-surface-container-low/60 transition-colors border-t border-[#DEE2E6]';
const head = (crumb, title, sub, act = '') => `<div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-space-lg"><div><div class="${LBL} mb-1">${crumb}</div><h1 class="font-headline-lg text-headline-lg text-on-surface">${title}</h1>${sub ? `<p class="font-body-md text-body-md text-on-surface-variant mt-1 max-w-3xl">${sub}</p>` : ''}</div><div class="flex flex-wrap items-center gap-3">${act}</div></div>`;
const note = (t, e) => `<div class="flex gap-2 items-start rounded-lg p-3 font-body-sm text-body-sm ${e ? 'bg-error-container text-on-error-container' : 'bg-primary-fixed/50 text-on-primary-fixed-variant'}">${ic(e ? 'warning' : 'info', 18)}<div>${t}</div></div>`;
const empty = t => `<div class="py-12 text-center text-outline font-body-md">${t}</div>`;
const wk = id => S.boot.wakas.find(x => x.id_user === id) || {}, wn = id => 'Waka ' + (wk(id).bidang_waka || '-');
const sum = (l, f) => l.reduce((s, x) => s + (+f(x) || 0), 0);
const pagu = (w, per) => sum(S.boot.pagu.filter(p => (w ? p.id_waka === w : p.id_waka !== '') && (!per || per === 'Tahunan' || p.semester === per)), p => p.nominal_pagu);
const perShort = (p, ta) => `${p === 'Semester 1' ? 'Sem. 1' : p === 'Semester 2' ? 'Sem. 2' : 'Tahunan'} ${ta || ''}`;
const can = r => S.boot.user.peran === r;
function dl(nama, mime, b64) { const by = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([by], { type: mime })); a.download = nama; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
function csv(nama, rows) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\n')], { type: 'text/csv' })); a.download = nama; a.click(); }
function stepper(st) {
  const cur = { 'Draft': 0, 'Perlu Revisi': 0, 'Diajukan ke Bendahara': 1, 'Diperiksa Bendahara': 1, 'Diajukan ke Kepsek': 2, 'Disetujui': 4, 'Dibatalkan': 3 }[st] ?? 0, T = ['Draft Usulan', 'Verifikasi Bendahara', 'Validasi Kepala Sekolah', 'Penetapan & Terbit PDF'];
  return `<div class="${CARD} p-space-md mb-space-lg"><div class="flex items-start">${T.map((t, i) => { const d = i < cur, a = i === cur, bad = st === 'Perlu Revisi' && i === 0 || st === 'Dibatalkan' && i === 3;
    return `<div class="flex-1 flex flex-col items-center text-center relative"><div class="w-9 h-9 rounded-full flex items-center justify-center z-10 ${bad ? 'bg-error text-on-error' : d ? 'bg-primary text-on-primary' : a ? 'bg-primary-container text-on-primary ring-4 ring-primary-fixed' : 'bg-surface-container text-outline'}">${bad ? ic('priority_high', 18) : d ? ic('check', 18) : `<span class="font-label-code text-body-sm">${i + 1}</span>`}</div>${i < 3 ? `<div class="absolute top-[18px] left-1/2 w-full h-0.5 ${d ? 'bg-primary' : 'bg-surface-container-high'}"></div>` : ''}<div class="mt-2 font-body-sm text-body-sm ${a || d ? 'font-semibold text-on-surface' : 'text-outline'} hidden sm:block">${t}</div></div>`; }).join('')}</div></div>`;
}

// ---------- Login (w_01) ----------
function viewLogin() {
  $('#app').innerHTML = `<div class="min-h-screen flex flex-col bg-gradient-to-br from-surface-container-low to-surface"><div class="flex items-center justify-between p-6"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center">${ic('account_balance', 24)}</div><div><div class="font-headline-sm text-headline-sm">SIPBOSP</div><div class="font-label-code text-[11px] text-on-surface-variant">Sistem Informasi Anggaran Sekolah</div></div></div></div>
  <div class="flex-1 flex items-center justify-center p-4"><div class="${CARD} w-full max-w-[400px] p-space-lg shadow-lg"><div class="text-center mb-5"><div class="w-16 h-16 mx-auto rounded-full border-4 border-primary-container flex items-center justify-center text-primary mb-3">${ic('school', 32)}</div>${pill('SMAN 01 UNGGUL')}<h1 class="font-headline-xl text-headline-xl mt-2">RAB Waka</h1><p class="font-body-md text-on-surface-variant">Aplikasi Rancangan Anggaran Belanja Wakil Kepala Sekolah</p></div>
  <h2 class="font-headline-sm text-headline-sm">Masuk ke Sistem</h2><p class="font-body-sm text-on-surface-variant mb-3 pb-3 border-b border-[#DEE2E6]">Gunakan akun resmi sekolah yang terdaftar</p>
  <div class="mb-4">${note('<b>Akses tertutup & otorisasi RBAC</b><br>Hanya tenaga pendidik & staf terdaftar yang dapat masuk. Tidak melayani registrasi publik.')}</div>
  <form id="lf" class="flex flex-col gap-4">${fld('Email dinas', `<div class="relative"><span class="absolute left-3 top-2.5 text-outline">${ic('mail')}</span><input id="em" type="email" required autocomplete="username" class="${INP} pl-10"></div>`)}
  ${fld('Kata sandi', `<div class="relative"><span class="absolute left-3 top-2.5 text-outline">${ic('lock')}</span><input id="pw" type="password" required autocomplete="current-password" class="${INP} pl-10 pr-10"><button type="button" data-a="eye" class="absolute right-3 top-2.5 text-outline">${ic('visibility')}</button></div>`)}
  <div id="le" class="hidden">${note('', 1)}</div><button id="lb" class="${B1} w-full">Masuk ke Sistem RAB ${ic('arrow_forward', 18)}</button></form></div></div>
  <div class="p-4 text-center font-label-code text-[11px] text-outline">RAB Waka v1.0 · Google Workspace for Education SMAN 01 Unggul</div></div>`;
  if (/ISI_URL/.test(GAS_URL)) { $('#le').classList.remove('hidden'); $('#le').lastChild.lastChild.textContent = 'GAS_URL di js/config.js belum diisi.'; }
  $('#lf').onsubmit = async e => {
    e.preventDefault(); const b = $('#lb'); b.disabled = true; b.textContent = 'Memeriksa…';
    const r = await api('login', { email: $('#em').value, password: $('#pw').value });
    if (!r.success) { $('#le').classList.remove('hidden'); $('#le').lastChild.lastChild.textContent = r.message; b.disabled = false; b.innerHTML = 'Masuk ke Sistem RAB'; return; }
    S.token = r.data.token; S.boot = r.data.boot; store.set('token', S.token); store.set('boot', S.boot); location.hash = '#/dashboard'; shell(); route();
  };
}
function logout(exp) { store.del('token'); store.del('boot'); S.token = S.boot = null; E = null; if (exp) toast('Sesi berakhir, silakan masuk lagi.', 1); viewLogin(); }

// ---------- Shell (sidebar + header Stitch) ----------
function menu() {
  const r = S.boot.user.peran, g = [['Menu Utama', [['dashboard', 'dashboard', 'Dashboard'], ['rab', 'description', r === 'waka' ? 'RAB Saya' : 'Daftar RAB']]]];
  if (r === 'bendahara' || r === 'kepsek') g[0][1].push(['persetujuan', 'task_alt', 'Persetujuan RAB']);
  if (r === 'waka' || r === 'staf') g[0][1].push(['revisi', 'edit_note', 'Revisi RAB']);
  g[0][1].push(['rekap', 'account_balance_wallet', 'Rekap & Sisa'], ['cetak', 'print', 'Cetak PDF']);
  if (r === 'admin') g.push(['Administrasi', [['pengguna', 'manage_accounts', 'Kelola Pengguna'], ['pagu', 'calculate', 'Pagu Anggaran'], ['ssh', 'receipt_long', 'Item Standar SSH']]], ['Sistem', [['sistem', 'hub', 'Notifikasi & Log']]]);
  return g;
}
function shell() {
  const b = S.boot, u = b.user, ini = u.nama.split(' ').filter(x => /^[A-Za-z]/.test(x)).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  $('#app').innerHTML = `<aside id="sd" class="fixed left-0 top-0 h-full w-[240px] bg-surface-container-lowest border-r border-[#DEE2E6] z-50 flex flex-col justify-between -translate-x-full md:translate-x-0 transition-transform"><div class="flex flex-col h-full overflow-hidden"><div class="h-16 px-space-md flex items-center gap-space-sm border-b border-[#DEE2E6]"><div class="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center">${ic('school', 20)}</div><div class="flex flex-col"><span class="font-headline-sm text-headline-sm text-primary leading-tight">RAB Waka</span><span class="font-body-sm text-[11px] text-on-surface-variant leading-none">${esc(b.sekolah)}</span></div></div>
  <nav class="flex-1 overflow-y-auto py-space-sm px-space-xs flex flex-col gap-1">${menu().map(g => `<div class="px-space-sm pt-space-md pb-1 ${LBL}">${g[0]}</div>` + g[1].map(m => `<a data-a="nav" data-p="${m[0]}" class="flex items-center justify-between px-space-sm py-2 rounded-DEFAULT cursor-pointer text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors border-l-[3px] border-transparent"><div class="flex items-center gap-2">${ic(m[1])}<span class="font-body-md text-body-md">${m[2]}</span></div><span id="bd-${m[0]}" class="hidden px-1.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-code text-body-sm font-semibold"></span></a>`).join('')).join('')}</nav>
  <div class="p-space-sm border-t border-[#DEE2E6]"><a data-a="out" class="flex items-center gap-2 px-space-sm py-2 rounded-DEFAULT cursor-pointer text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors">${ic('logout')}<span class="font-body-md text-body-md">Keluar Sesi</span></a></div></div></aside>
  <div class="md:pl-[240px]"><header class="fixed top-0 left-0 md:left-[240px] right-0 h-16 bg-surface-container-lowest border-b border-[#DEE2E6] z-40 px-space-md md:px-space-lg flex items-center justify-between"><div class="flex items-center gap-3"><button data-a="tog" class="md:hidden p-1 text-on-surface-variant">${ic('menu', 24)}</button><div class="hidden sm:flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm">${ic('school', 18)}<span>${esc(b.sekolah)}</span><span class="text-outline">/</span><span class="font-medium text-on-surface">RAB BOSP ${esc(b.tahun)}</span></div><div class="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-body-sm text-body-sm font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-primary"></span>${ROLE[u.peran]}${u.bidang_waka ? ' ' + esc(u.bidang_waka) : ''}</div></div>
  <div class="flex items-center gap-space-md"><div class="flex flex-col text-right hidden sm:flex"><span class="font-body-md text-body-md font-semibold text-on-surface leading-snug">${esc(u.nama)}</span><span class="font-label-code text-[11px] text-on-surface-variant leading-none">${esc(u.email)}</span></div><div class="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-label-code font-bold border border-[#DEE2E6]">${esc(ini)}</div></div></header>
  <main class="w-full pt-16 bg-[#F6F9FF] min-h-screen"><div id="v" class="px-space-md md:px-margin py-space-lg max-w-[1440px] mx-auto w-full"></div></main></div>`;
  navCount();
}
function navCount() {
  if (!S.boot || !$('#sd')) return; const r = S.boot.user.peran, L = S.boot.rab, set = (id, n) => { const el = $('#bd-' + id); if (el) { el.classList.toggle('hidden', !n); el.textContent = n; } };
  set('revisi', L.filter(x => x.status === 'Perlu Revisi').length); set('persetujuan', L.filter(x => r === 'bendahara' ? ['Diajukan ke Bendahara', 'Diperiksa Bendahara'].includes(x.status) : x.status === 'Diajukan ke Kepsek').length);
}

// ---------- Router & aksi ----------
const PAGES = {};
function route() {
  if (!S.boot) return viewLogin(); if (!$('#v')) shell();
  const [p, a] = location.hash.replace(/^#\/?/, '').split('/'), ok = menu().some(g => g[1].some(m => m[0] === p)), key = ok ? p : 'dashboard';
  $$('nav a[data-p]').forEach(x => { const on = x.dataset.p === key; x.classList.toggle('bg-[#EFF6FF]', on); x.classList.toggle('text-primary', on); x.classList.toggle('font-medium', on); x.classList.toggle('border-primary', on); x.classList.toggle('border-transparent', !on); });
  $('#sd').classList.add('-translate-x-full'); window.scrollTo(0, 0); PAGES[key](a ? decodeURIComponent(a) : '');
}
const ACT = {
  nav: t => location.hash = '#/' + t.dataset.p, out: () => logout(), tog: () => $('#sd').classList.toggle('-translate-x-full'),
  eye: t => { const i = $('#pw'); i.type = i.type === 'password' ? 'text' : 'password'; },
  go: t => location.hash = t.dataset.h, open: t => location.hash = '#/rab/' + encodeURIComponent(t.dataset.id)
};
document.addEventListener('click', e => { const t = e.target.closest('[data-a]'); if (t && ACT[t.dataset.a]) ACT[t.dataset.a](t, e); });
window.addEventListener('hashchange', () => route());
function bindF(id, obj, key, fn) { const el = $('#' + id); if (!el) return; el.oninput = () => { obj[key] = el.value; fn(); }; }
