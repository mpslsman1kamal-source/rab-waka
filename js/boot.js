'use strict';
// Inisialisasi: pulihkan sesi dari cache perangkat (tampil instan), lalu segarkan data di latar.
S.token = store.get('token'); S.boot = store.get('boot');
if (!/ISI_URL/.test(GAS_URL)) fetch(GAS_URL + '?ping=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
if (S.token && S.boot && S.boot.rev) { shell(); route(); refresh(true); } else { store.del('token'); store.del('boot'); S.token = S.boot = null; viewLogin(); }
