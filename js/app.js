'use strict';
// RAB Waka — SPA vanilla (fetch ke GAS). Akses sebenarnya dicek di server; menu di sini hanya UX.
const LS = 'rab:v1:', $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = n => 'Rp ' + Math.round(+n || 0).toLocaleString('id-ID');
const tgl = x => x ? new Date(x).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const ROLE = { kepsek: 'Kepala Sekolah', bendahara: 'Bendahara', waka: 'Waka', admin: 'Admin', staf: 'Staf' };
const store = { get(k) { try { return JSON.parse(localStorage.getItem(LS + k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { localStorage.removeItem(LS + k); } catch (e) {} } };
const S = { token: null, boot: null }; let E = null, A = { tab: 'users', edit: null }, R = { w: '', p: '', s: '', q: '' };

// ---------- API: timeout, retry baca, reqId idempoten untuk tulis ----------
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
function toast(m, e) { const d = document.createElement('div'); d.className = 't' + (e ? ' e' : ''); d.textContent = m; $('#toast').appendChild(d); setTimeout(() => d.remove(), 4500); }
async function refresh() {
  const r = await api('bootstrap', {}, true); if (!r.success) return false;
  const ch = JSON.stringify(r.data) !== JSON.stringify(S.boot); S.boot = r.data; store.set('boot', r.data); if (ch) { navCount(); if (!/^#\/rab\/./.test(location.hash)) route(); } return true;
}

// ---------- Auth & shell ----------
function viewLogin() {
  $('#app').innerHTML = `<div class=login><div class=card><h1 style="color:var(--p)">RAB Waka</h1><p style="color:var(--tv)">Aplikasi Rancangan Anggaran Belanja Wakil Kepala Sekolah. Hanya akun sekolah terdaftar yang dapat masuk.</p>
  <form id=lf><div><label>Email dinas</label><input id=em type=email required autocomplete=username></div><div><label>Kata sandi</label><input id=pw type=password required autocomplete=current-password></div>
  <div class="note e" id=le hidden></div><button class="btn p" style="width:100%" id=lb>Masuk</button></form></div></div>`;
  if (/ISI_URL/.test(GAS_URL)) { $('#le').hidden = false; $('#le').textContent = 'GAS_URL di js/config.js belum diisi.'; }
  $('#lf').onsubmit = async e => {
    e.preventDefault(); $('#lb').disabled = true; $('#lb').textContent = 'Memeriksa…';
    const r = await api('login', { email: $('#em').value, password: $('#pw').value });
    if (!r.success) { $('#le').hidden = false; $('#le').textContent = r.message; $('#lb').disabled = false; $('#lb').textContent = 'Masuk'; return; }
    S.token = r.data.token; S.boot = r.data.boot; store.set('token', S.token); store.set('boot', S.boot); location.hash = '#/dashboard'; shell(); route();
  };
}
function logout(exp) { store.del('token'); store.del('boot'); S.token = S.boot = null; E = null; if (exp) toast('Sesi berakhir, silakan masuk lagi.', 1); viewLogin(); }
function menu() {
  const r = S.boot.user.peran, m = [['dashboard', 'dashboard', 'Dashboard'], ['rab', 'description', r === 'waka' ? 'RAB Saya' : 'Daftar RAB']];
  if (r === 'bendahara' || r === 'kepsek') m.push(['persetujuan', 'task_alt', 'Persetujuan']);
  m.push(['rekap', 'account_balance_wallet', 'Rekap & Sisa'], ['cetak', 'print', 'Cetak PDF']); if (r === 'admin') m.push(['admin', 'manage_accounts', 'Administrasi']); return m;
}
function shell() {
  const b = S.boot, u = b.user;
  $('#app').innerHTML = `<aside id=sd><div class=brand><span class=ms style="color:var(--p);font-size:30px">account_balance</span><div><b>RAB Waka</b><small>${esc(b.sekolah)}</small></div></div>
  <nav>${menu().map(m => `<a data-a=nav data-p=${m[0]}><span><span class=ms>${m[1]}</span> ${m[2]}</span><span class=bd id=bd-${m[0]} hidden></span></a>`).join('')}</nav>
  <nav style="flex:0;border-top:1px solid var(--bd)"><a data-a=out><span><span class=ms>logout</span> Keluar</span></a></nav></aside>
  <header><span style="display:flex;align-items:center;gap:8px"><button class=menu data-a=tog><span class=ms>menu</span></button><span style="color:var(--tv)">TA ${esc(b.tahun)}</span></span>
  <span><span class=b style="background:var(--pf);color:var(--p)">${ROLE[u.peran]}${u.bidang_waka ? ' ' + esc(u.bidang_waka) : ''}</span> <b style="margin-left:8px">${esc(u.nama)}</b></span></header><main id=v></main>`;
  navCount();
}
function navCount() {
  if (!S.boot) return; const r = S.boot.user.peran, el = $('#bd-rab'), p = $('#bd-persetujuan'), L = S.boot.rab;
  const n = r === 'waka' ? L.filter(x => x.status === 'Perlu Revisi').length : 0, q = L.filter(x => r === 'bendahara' ? ['Diajukan ke Bendahara', 'Diperiksa Bendahara'].includes(x.status) : x.status === 'Diajukan ke Kepsek').length;
  if (el) { el.hidden = !n; el.textContent = n; } if (p) { p.hidden = !q; p.textContent = q; }
}

// ---------- Router ----------
const PAGES = { dashboard: pDash, rab: pRab, persetujuan: pQueue, rekap: pRekap, cetak: pCetak, admin: pAdmin };
function route() {
  if (!S.boot) return viewLogin(); if (!$('#v')) shell();
  const [p, a] = location.hash.replace(/^#\/?/, '').split('/'), pg = PAGES[p] || pDash, ok = menu().some(m => m[0] === p);
  document.querySelectorAll('nav a[data-p]').forEach(x => x.classList.toggle('on', x.dataset.p === (ok ? p : 'dashboard')));
  $('#sd').classList.remove('open'); (ok ? pg : pDash)(a ? decodeURIComponent(a) : '');
}
const ACT = {
  nav: t => location.hash = '#/' + t.dataset.p, out: () => logout(), tog: () => $('#sd').classList.toggle('open'),
  open: t => location.hash = '#/rab/' + encodeURIComponent(t.dataset.id), back: () => location.hash = '#/rab',
  newrab: () => location.hash = '#/rab/baru', add: () => { E.det = readRows(); E.det.push({}); drawRows(); }, del: t => { E.det = readRows(); E.det.splice(+t.dataset.i, 1); drawRows(); },
  save: async () => { const id = await save(); if (id) open(id); }, send: async () => {
    const id = await save(); if (!id) return; const r = await api('rabSubmit', { id_rab: id }); toast(r.message, !r.success); if (r.success) { await refresh(); location.hash = '#/rab'; } },
  up: upload, brk: async t => { const r = await api('berkasGet', { id_berkas: t.dataset.id }, true); if (r.success) dl(r.data.nama, r.data.mime, r.data.b64); else toast(r.message, 1); },
  rev: async () => { const keputusan = E.detail.map(x => { const k = document.querySelector('input[name=d_' + x.id_detail + ']:checked'); return { id_detail: x.id_detail, keputusan: k ? k.value : '', alasan: $('#a_' + x.id_detail).value }; });
    const r = await api('review', { id_rab: E.h.id_rab, keputusan }); toast(r.message, !r.success); if (r.success) { await refresh(); open(E.h.id_rab); } },
  ajukan: async () => { const r = await api('ajukanKepsek', { id_rab: E.h.id_rab, catatan: $('#cat') ? $('#cat').value : '' }); toast(r.message, !r.success); if (r.success) { await refresh(); location.hash = '#/persetujuan'; } },
  putus: async t => { const r = await api('putusan', { id_rab: E.h.id_rab, keputusan: t.dataset.k, catatan: $('#cat').value }); toast(r.message, !r.success); if (r.success) { await refresh(); location.hash = '#/persetujuan'; } },
  pdf: async t => { t.disabled = true; const r = await api('pdf', { id_rab: t.dataset.id }, true); t.disabled = false; if (r.success) dl(r.data.nama, 'application/pdf', r.data.b64); else toast(r.message, 1); },
  tab: t => { A = { tab: t.dataset.t, edit: null }; pAdmin(); }, aedit: t => { A.edit = adminList().find(x => String(x[ENT[A.tab].key]) === t.dataset.id); pAdmin(); }, anew: () => { A.edit = null; pAdmin(); }, asave: asave
};
document.addEventListener('click', e => { const t = e.target.closest('[data-a]'); if (t && ACT[t.dataset.a]) ACT[t.dataset.a](t); });
function dl(nama, mime, b64) { const by = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([by], { type: mime })); a.download = nama; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
function open(id) { if (location.hash === '#/rab/' + encodeURIComponent(id)) route(); else location.hash = '#/rab/' + encodeURIComponent(id); }

// ---------- Komponen ----------
const sb = s => `<span class="b ${esc(String(s).split(' ')[0])}">${esc(s)}</span>`;
const wn = id => { const w = S.boot.wakas.find(x => x.id_user === id); return w ? w.bidang_waka : '-'; };
const sum = (l, f) => l.reduce((s, x) => s + (+f(x) || 0), 0);
const pagu = (w, per) => sum(S.boot.pagu.filter(p => (w ? p.id_waka === w : p.id_waka !== '') && (!per || per === 'Tahunan' || p.semester === per)), p => p.nominal_pagu);
const kpi = (t, v, s) => `<div class="card kpi" style="margin:0"><small>${t}</small><div class=v>${v}</div>${s ? `<small style="text-transform:none">${s}</small>` : ''}</div>`;
const prog = (v, m) => { const p = m ? v / m * 100 : 0; return `<div class="pr ${p > 100 ? 'e' : p > 90 ? 'w' : ''}"><i style="width:${Math.min(p, 100)}%"></i></div>`; };
const rabTable = l => l.length ? `<div class=tw><table><tr><th>No. RAB</th><th>Bidang</th><th>Periode</th><th>Total</th><th>Status</th><th></th></tr>${l.map(h => `<tr><td class=mono>${esc(h.id_rab)}</td><td>${esc(wn(h.id_waka))}</td><td>${esc(h.periode)}<br><small>${esc(h.tahun_ajaran)}</small></td><td class=num>${rp(h.total)}</td><td>${sb(h.status)}</td><td><button class=btn data-a=open data-id="${esc(h.id_rab)}">Buka</button></td></tr>`).join('')}</table></div>` : '<div class=empty>Belum ada RAB.</div>';

// ---------- Halaman ----------
function pDash() {
  const b = S.boot, u = b.user, L = b.rab.filter(x => x.status !== 'Dibatalkan'), pg = pagu(u.peran === 'waka' ? u.id_user : ''), us = sum(L, x => x.total), ap = sum(L.filter(x => x.status === 'Disetujui'), x => x.total);
  const todo = b.rab.filter(x => ({ waka: ['Draft', 'Perlu Revisi'], staf: ['Draft', 'Perlu Revisi'], bendahara: ['Diajukan ke Bendahara', 'Diperiksa Bendahara'], kepsek: ['Diajukan ke Kepsek'], admin: [] }[u.peran]).includes(x.status));
  const cnt = {}; b.rab.forEach(x => cnt[x.status] = (cnt[x.status] || 0) + 1);
  $('#v').innerHTML = `<div class=row><div><h1>Selamat datang, ${esc(u.nama)}</h1><span style="color:var(--tv)">${ROLE[u.peran]} · TA ${esc(b.tahun)}</span></div>${['waka', 'staf'].includes(u.peran) ? '<button class="btn p" data-a=newrab>+ Buat RAB</button>' : ''}</div>
  <div class=grid>${kpi('Pagu TA', rp(pg))}${kpi('Total usulan aktif', rp(us), prog(us, pg))}${kpi('Disetujui', rp(ap))}${kpi('Sisa pagu', rp(pg - us))}</div>
  <div class=card><h3>Status RAB</h3><p>${Object.keys(cnt).map(s => sb(s) + ' <b>' + cnt[s] + '</b>&nbsp;&nbsp;').join('') || 'Belum ada data.'}</p></div>
  <div class=card><h3 style="margin-bottom:12px">Perlu tindakan Anda</h3>${todo.length ? rabTable(todo) : '<div class=empty>Tidak ada.</div>'}</div>
  <div class=card><h3 style="margin-bottom:12px">RAB terbaru</h3>${rabTable(b.rab.slice(-6).reverse())}</div>`;
}
function pRab(id) { if (id) return pDetail(id); const r = S.boot.user.peran;
  $('#v').innerHTML = `<div class=row><h1>${r === 'waka' ? 'RAB Saya' : 'Daftar RAB'}</h1>${['waka', 'staf'].includes(r) ? '<button class="btn p" data-a=newrab>+ Buat RAB</button>' : ''}</div><div class=card>${rabTable(S.boot.rab.slice().reverse())}</div>`; }
function pQueue() { const r = S.boot.user.peran, st = r === 'bendahara' ? ['Diajukan ke Bendahara', 'Diperiksa Bendahara'] : ['Diajukan ke Kepsek'];
  $('#v').innerHTML = `<h1 style="margin-bottom:16px">Persetujuan</h1><div class=card>${rabTable(S.boot.rab.filter(x => st.includes(x.status)))}</div>`; }

// Editor / pemeriksaan / keputusan (satu halaman, mode ditentukan peran + status)
async function pDetail(id) {
  const b = S.boot, u = b.user; $('#v').innerHTML = '<div class=empty>Memuat…</div>';
  if (id === 'baru') E = { h: { periode: 'Semester 1', tahun_ajaran: b.tahun, status: 'Draft', id_waka: u.peran === 'waka' ? u.id_user : '' }, det: [{}], detail: [], revisi: [], persetujuan: [], berkas: [] };
  else { const r = await api('rabGet', { id_rab: id }, true); if (!r.success) { $('#v').innerHTML = `<div class="note e">${esc(r.message)}</div>`; return; } const d = r.data; E = { h: d.header, det: d.detail, detail: d.detail, revisi: d.revisi, persetujuan: d.persetujuan, berkas: d.berkas }; }
  const h = E.h, st = h.status, edit = ['waka', 'staf'].includes(u.peran) && ['Draft', 'Perlu Revisi'].includes(st) && (u.peran === 'staf' || !h.id_rab || h.id_waka === u.id_user);
  const rev = u.peran === 'bendahara' && ['Diajukan ke Bendahara', 'Diperiksa Bendahara'].includes(st), dec = u.peran === 'kepsek' && st === 'Diajukan ke Kepsek';
  E.mode = edit ? 'edit' : rev ? 'rev' : 'view';
  $('#v').innerHTML = `<div class=row><div><button class=btn data-a=back>← Kembali</button></div><div>${sb(st)} <span class=mono>${esc(h.id_rab || 'BARU')}</span></div></div>
  <div class=card><div class=f><div><label>Periode</label><select id=per ${edit ? '' : 'disabled'}>${['Semester 1', 'Semester 2', 'Tahunan'].map(p => `<option ${p === h.periode ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
  <div><label>Waka pemilik</label>${u.peran === 'staf' && !h.id_rab ? `<select id=wk>${b.wakas.map(w => `<option value="${esc(w.id_user)}">${esc(w.bidang_waka)} — ${esc(w.nama)}</option>`).join('')}</select>` : `<input disabled value="${esc(wn(h.id_waka))}">`}</div>
  <div><label>Tahun ajaran</label><input disabled value="${esc(h.tahun_ajaran)}"></div></div><div id=pg style="margin-top:14px"></div></div>
  <div class=card><div class=row><h3>Rincian anggaran</h3>${edit ? '<button class=btn data-a=add>+ Tambah baris</button>' : ''}</div><div class=tw><table><thead><tr><th>Kegiatan</th><th>Item standar (SSH)</th><th>Uraian</th><th>Vol</th><th>Frek</th><th>Satuan</th><th>Harga satuan</th><th>Subtotal</th>${rev ? '<th>Pemeriksaan</th>' : '<th></th>'}</tr></thead><tbody id=rows></tbody></table></div>
  <div class=row style="margin-top:12px"><b>Total: <span class=num id=tot></span></b><span>${edit ? `<button class=btn data-a=save>Simpan draft</button> ${u.peran === 'waka' ? '<button class="btn p" data-a=send>Kirim ke Bendahara</button>' : '<span class=note>Staf tidak dapat mengirim usulan; Waka yang mengirim.</span>'}` : ''}</span></div></div>
  ${rev ? `<div class=card><div class=row><span class=note>Pilih Setuju/Revisi per rincian. Alasan wajib bila Revisi.</span><span><button class="btn p" data-a=rev>Simpan pemeriksaan</button> ${st === 'Diperiksa Bendahara' ? '<button class=btn data-a=ajukan style="background:var(--ok);color:#fff">Ajukan ke Kepala Sekolah</button>' : ''}</span></div></div>` : ''}
  ${st === 'Diperiksa Bendahara' && !rev && u.peran !== 'bendahara' ? '' : ''}
  ${dec ? `<div class=card><h3>Keputusan Kepala Sekolah</h3><label style="margin-top:8px">Catatan (wajib bila dibatalkan)</label><textarea id=cat rows=2></textarea><div style="margin-top:12px;display:flex;gap:8px"><button class="btn g" data-a=putus data-k=Disetujui>Setujui & terbitkan PDF</button><button class="btn d" data-a=putus data-k=Dibatalkan>Batalkan</button></div></div>` : ''}
  <div class=card><h3 style="margin-bottom:8px">Berkas pendukung</h3>${E.berkas.map(k => `<div><button class=btn data-a=brk data-id="${esc(k.id_berkas)}">${esc(k.nama_file)}</button> <small>${esc(k.jenis)}</small></div>`).join('') || '<small>Belum ada.</small>'}
  ${edit && h.id_rab ? `<div class=f style="margin-top:12px"><div><label>Jenis</label><select id=jn><option>surat usulan</option><option>bukti pendanaan lain</option><option>foto kondisi</option></select></div><div><label>Berkas (maks 5 MB)</label><input type=file id=fl></div><div style="align-self:end"><button class=btn data-a=up>Unggah</button></div></div>` : edit ? '<small>Simpan draft dulu untuk mengunggah berkas.</small>' : ''}</div>
  ${E.revisi.length || E.persetujuan.length ? `<div class=card><h3 style="margin-bottom:8px">Riwayat</h3>${E.revisi.filter(r => r.keputusan === 'Revisi').map(r => `<p class="note e">${tgl(r.waktu)} · ${esc(r.oleh)}: ${esc(r.alasan)}</p>`).join('')}${E.persetujuan.map(p => `<p class=note>${tgl(p.waktu)} · ${esc(p.tahap)}: <b>${esc(p.keputusan)}</b> oleh ${esc(p.oleh)} ${esc(p.catatan)}</p>`).join('')}</div>` : ''}`;
  drawRows();
}
function rowHtml(r, i) {
  const m = E.mode, ed = m === 'edit', it = r.id_item ? S.boot.items.find(x => x.id_item === r.id_item) : null, alasan = (E.revisi.filter(x => x.id_detail === r.id_detail && x.keputusan === 'Revisi').pop() || {}).alasan;
  const inp = (n, v, t, ro) => `<input name=${n} value="${esc(v == null ? '' : v)}" ${t ? 'type=' + t : ''} ${ed && !ro ? '' : 'disabled'} ${t === 'number' ? 'min=0 step=any style="width:80px"' : ''}>`;
  return `<tr data-id="${esc(r.id_detail || '')}" class="${r.status_review === 'Revisi' ? 'rv' : ''}"><td>${inp('k', r.id_kegiatan)}</td>
  <td><select name=i ${ed ? '' : 'disabled'}><option value="">Kebutuhan riil (manual)</option>${S.boot.items.filter(x => x.status_aktif === 'Aktif').map(x => `<option value="${esc(x.id_item)}" ${x.id_item === r.id_item ? 'selected' : ''}>${esc(x.nama_item)}</option>`).join('')}</select>
  ${ed ? `<label style="margin-top:6px"><input type=checkbox name=x style="width:auto"> sudah didanai APBD/pusat</label>` : '<input type=checkbox name=x hidden>'}</td>
  <td>${inp('u', r.uraian)}${alasan ? `<div class="note e" style="margin-top:6px">Revisi: ${esc(alasan)}</div>` : ''}</td><td>${inp('v', r.volume, 'number')}</td><td>${inp('f', r.frekuensi || 1, 'number')}</td>
  <td>${inp('s', r.satuan, '', it)}</td><td>${inp('h', r.harga_satuan, 'number', it)}</td><td class=num name=st></td>
  <td>${ed ? `<button class=btn data-a=del data-i=${i}>✕</button>` : m === 'rev' ? ['Setuju', 'Revisi'].map(k => `<label><input type=radio name="d_${esc(r.id_detail)}" value=${k} ${(r.status_review === 'Revisi') === (k === 'Revisi') ? 'checked' : ''} style="width:auto"> ${k}</label>`).join('') + `<input id="a_${esc(r.id_detail)}" placeholder="Alasan revisi">` : sb(r.status_review || '—')}</td></tr>`;
}
function drawRows() { $('#rows').innerHTML = E.det.map(rowHtml).join(''); calc(); }
function readRows() { return [...document.querySelectorAll('#rows tr')].map(tr => { const g = n => tr.querySelector('[name=' + n + ']'); return { id_detail: tr.dataset.id, id_kegiatan: g('k').value, id_item: g('i').value, uraian: g('u').value, volume: g('v').value, frekuensi: g('f').value, satuan: g('s').value, harga_satuan: g('h').value, sudah_didanai_lain: g('x').checked ? 'Ya' : 'Tidak', sumber_dana: 'BOSP' }; }); }
function calc() {
  let t = 0; document.querySelectorAll('#rows tr').forEach(tr => { const g = n => +tr.querySelector('[name=' + n + ']').value || 0, s = g('v') * (g('f') || 1) * g('h'); t += s; tr.querySelector('[name=st]').textContent = rp(s); });
  $('#tot').textContent = rp(t); const per = $('#per').value, lim = pagu(E.h.id_waka || ($('#wk') && $('#wk').value), per);
  $('#pg').innerHTML = lim ? `<small>Pagu ${esc(per)}: <b>${rp(lim)}</b> · terpakai ${rp(t)} · sisa <b>${rp(lim - t)}</b></small>${prog(t, lim)}${t > lim ? '<div class="note e" style="margin-top:6px">Total melebihi pagu — usulan akan ditolak saat dikirim.</div>' : ''}` : '<small>Pagu belum ditetapkan untuk periode ini.</small>';
  if (document.querySelector('#rows [name=x]:checked')) $('#pg').innerHTML += '<div class="note e" style="margin-top:6px">Item yang sudah didanai APBD/pusat tidak boleh dianggarkan dari BOSP. Hapus item (dan unggah bukti pendanaan).</div>';
}
document.addEventListener('change', e => { if (!$('#rows')) return; if (e.target.name === 'i') { const tr = e.target.closest('tr'), it = S.boot.items.find(x => x.id_item === e.target.value), h = tr.querySelector('[name=h]'), s = tr.querySelector('[name=s]'); if (it) { h.value = it.harga_satuan_SSH; s.value = it.satuan; } h.readOnly = s.readOnly = !!it; } if (['i', 'x', 'per'].includes(e.target.name) || e.target.id === 'per' || e.target.id === 'wk') calc(); });
document.addEventListener('input', e => { if (['v', 'f', 'h'].includes(e.target.name) && $('#rows')) calc(); });
async function save() { const d = { id_rab: E.h.id_rab || '', periode: $('#per').value, tahun_ajaran: E.h.tahun_ajaran, id_waka: E.h.id_waka || ($('#wk') && $('#wk').value), details: readRows() };
  const r = await api('rabSave', d); toast(r.message, !r.success); if (!r.success) return null; await refresh(); return r.data.id_rab; }
async function upload() { const f = $('#fl').files[0]; if (!f) return toast('Pilih berkas dulu.', 1); if (f.size > 5e6) return toast('Maksimal 5 MB.', 1);
  const b64 = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result.split(',')[1]); r.onerror = no; r.readAsDataURL(f); });
  const r = await api('upload', { id_rab: E.h.id_rab, jenis: $('#jn').value, nama: f.name, mime: f.type, b64 }); toast(r.message, !r.success); if (r.success) pDetail(E.h.id_rab); }

function pRekap() {
  const b = S.boot, u = b.user, f = x => (!R.w || x.id_waka === R.w) && (!R.p || x.periode === R.p) && (!R.s || x.status === R.s) && (!R.q || (x.id_rab + wn(x.id_waka)).toLowerCase().includes(R.q.toLowerCase()));
  const L = b.rab.filter(f), act = b.rab.filter(x => x.status !== 'Dibatalkan'), ws = u.peran === 'waka' ? b.wakas.filter(w => w.id_user === u.id_user) : b.wakas, mx = Math.max(1, ...b.keg.map(k => k.total));
  const sel = (id, v, o) => `<select id=${id}><option value="">Semua</option>${o.map(x => `<option value="${esc(x[0])}" ${x[0] === v ? 'selected' : ''}>${esc(x[1])}</option>`).join('')}</select>`;
  $('#v').innerHTML = `<h1 style="margin-bottom:16px">Rekap & Sisa Anggaran</h1><div class=card><div class=f>${u.peran !== 'waka' ? `<div><label>Waka</label>${sel('fw', R.w, b.wakas.map(w => [w.id_user, w.bidang_waka]))}</div>` : ''}<div><label>Periode</label>${sel('fp', R.p, ['Semester 1', 'Semester 2', 'Tahunan'].map(x => [x, x]))}</div>
  <div><label>Status</label>${sel('fs', R.s, ['Draft', 'Diajukan ke Bendahara', 'Perlu Revisi', 'Diperiksa Bendahara', 'Diajukan ke Kepsek', 'Disetujui', 'Dibatalkan'].map(x => [x, x]))}</div><div><label>Cari</label><input id=fq value="${esc(R.q)}"></div></div></div>
  <div class=card><h3 style="margin-bottom:12px">Pagu vs usulan per Waka</h3><div class=tw><table><tr><th>Bidang</th><th>Pagu</th><th>Usulan aktif</th><th>Disetujui</th><th>Sisa</th><th style="min-width:120px">Serapan</th></tr>${ws.map(w => { const a = act.filter(x => x.id_waka === w.id_user), pg = pagu(w.id_user), us = sum(a, x => x.total); return `<tr><td>${esc(w.bidang_waka)}</td><td class=num>${rp(pg)}</td><td class=num>${rp(us)}</td><td class=num>${rp(sum(a.filter(x => x.status === 'Disetujui'), x => x.total))}</td><td class=num>${rp(pg - us)}</td><td>${prog(us, pg)}</td></tr>`; }).join('')}</table></div></div>
  <div class=card><h3 style="margin-bottom:12px">Anggaran per kegiatan</h3>${b.keg.map(k => `<div style="margin-bottom:10px"><div class=row style="margin:0"><span>${esc(k.kegiatan)}</span><b class=num>${rp(k.total)}</b></div>${prog(k.total, mx)}</div>`).join('') || '<div class=empty>Belum ada.</div>'}</div>
  <div class=card><h3 style="margin-bottom:12px">Daftar RAB (${L.length})</h3>${rabTable(L)}</div>`;
  const bind = (id, k) => { const el = $('#' + id); if (el) el.oninput = () => { R[k] = el.value; const c = el.selectionStart; pRekap(); const n = $('#' + id); n.focus(); try { n.setSelectionRange(c, c); } catch (e) {} }; };
  bind('fw', 'w'); bind('fp', 'p'); bind('fs', 's'); bind('fq', 'q');
}
function pCetak() { const L = S.boot.rab.filter(x => x.status === 'Disetujui');
  $('#v').innerHTML = `<h1 style="margin-bottom:16px">Cetak PDF RAB Disetujui</h1><div class=card>${L.length ? `<div class=tw><table><tr><th>No. RAB</th><th>Bidang</th><th>Periode</th><th>Total</th><th></th></tr>${L.map(h => `<tr><td class=mono>${esc(h.id_rab)}</td><td>${esc(wn(h.id_waka))}</td><td>${esc(h.periode)}</td><td class=num>${rp(h.total)}</td><td><button class="btn p" data-a=pdf data-id="${esc(h.id_rab)}">Unduh PDF</button></td></tr>`).join('')}</table></div>` : '<div class=empty>Belum ada RAB berstatus Disetujui.</div>'}</div>`; }

// ---------- Admin ----------
const ENT = {
  users: { t: 'Pengguna', key: 'id_user', act: 'userSave', cols: ['nama', 'email', 'peran', 'bidang_waka', 'status_aktif'], F: [['nama', 'Nama'], ['email', 'Email', 'email'], ['no_wa', 'No. WhatsApp'], ['peran', 'Peran', 'sel', ['waka', 'staf', 'bendahara', 'kepsek', 'admin']], ['bidang_waka', 'Bidang Waka'], ['status_aktif', 'Status', 'sel', ['Aktif', 'Nonaktif']], ['password', 'Sandi (baru / reset, min 8)', 'password']] },
  pagu: { t: 'Pagu', key: 'id_pagu', act: 'paguSave', cols: ['tahun_ajaran', 'semester', 'nominal_pagu', 'id_waka'], F: [['tahun_ajaran', 'Tahun Ajaran'], ['semester', 'Periode', 'sel', ['Semester 1', 'Semester 2', 'Tahunan']], ['sumber_dana', 'Sumber Dana'], ['nominal_pagu', 'Nominal (Rp)', 'number'], ['id_waka', 'Waka (kosong = pagu sekolah)', 'wk']] },
  items: { t: 'Item standar', key: 'id_item', act: 'itemSave', cols: ['id_item', 'nama_item', 'satuan', 'harga_satuan_SSH', 'status_aktif'], F: [['kategori', 'Kategori'], ['nama_item', 'Nama item'], ['satuan', 'Satuan'], ['harga_satuan_SSH', 'Harga SSH (Rp)', 'number'], ['catatan_juknis', 'Catatan juknis'], ['status_aktif', 'Status', 'sel', ['Aktif', 'Nonaktif']]] }
};
const adminList = () => ({ users: S.boot.users, pagu: S.boot.pagu, items: S.boot.items }[A.tab]);
function pAdmin() {
  const en = ENT[A.tab], ed = A.edit || {}, cell = (c, x) => c === 'id_waka' ? (x[c] ? esc(wn(x[c])) : 'Sekolah') : /nominal|harga/.test(c) ? rp(x[c]) : esc(x[c]);
  const fld = ([n, l, t, o]) => `<div><label>${l}</label>${t === 'sel' ? `<select name=${n}>${o.map(x => `<option ${ed[n] === x ? 'selected' : ''}>${x}</option>`).join('')}</select>` : t === 'wk' ? `<select name=${n}><option value="">Sekolah</option>${S.boot.wakas.map(w => `<option value="${esc(w.id_user)}" ${ed[n] === w.id_user ? 'selected' : ''}>${esc(w.bidang_waka)}</option>`).join('')}</select>` : `<input name=${n} type=${t || 'text'} value="${t === 'password' ? '' : esc(ed[n])}">`}</div>`;
  $('#v').innerHTML = `<h1 style="margin-bottom:16px">Administrasi</h1><div class=tabs>${Object.keys(ENT).map(k => `<button class="btn ${k === A.tab ? 'on' : ''}" data-a=tab data-t=${k}>${ENT[k].t}</button>`).join('')}</div>
  <div class=card><div class=tw><table><tr>${en.cols.map(c => `<th>${c.replace(/_/g, ' ')}</th>`).join('')}<th></th></tr>${adminList().map(x => `<tr>${en.cols.map(c => `<td>${cell(c, x)}</td>`).join('')}<td><button class=btn data-a=aedit data-id="${esc(x[en.key])}">Ubah</button></td></tr>`).join('')}</table></div></div>
  <div class=card id=af><div class=row><h3>${A.edit ? 'Ubah' : 'Tambah'} ${en.t.toLowerCase()}</h3>${A.edit ? '<button class=btn data-a=anew>Batal</button>' : ''}</div><div class=f>${en.F.map(fld).join('')}</div><div style="margin-top:14px"><button class="btn p" data-a=asave>Simpan</button></div></div>`;
}
async function asave() { const en = ENT[A.tab], d = {}; if (A.edit) d[en.key] = A.edit[en.key]; document.querySelectorAll('#af [name]').forEach(el => d[el.name] = el.value);
  const r = await api(en.act, d); toast(r.message, !r.success); if (r.success) { A.edit = null; await refresh(); pAdmin(); } }

// ---------- Init ----------
window.addEventListener('hashchange', route);
S.token = store.get('token'); S.boot = store.get('boot');
if (!/ISI_URL/.test(GAS_URL)) fetch(GAS_URL + '?ping=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
if (S.token && S.boot) { shell(); route(); refresh(); } else viewLogin();
