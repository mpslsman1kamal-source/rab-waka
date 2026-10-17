# PANDUAN INSTALASI — RAB Waka

## A. Backend (Google Apps Script)
1. Buka https://script.google.com → **Proyek baru**.
2. Ganti isi `Code.gs` dengan isi **Kode.gs** (rename file menjadi `Kode`).
3. Tampilkan `appsscript.json`: ⚙️ Project Settings → centang *Show "appsscript.json"*, lalu ganti isinya dengan berkas **appsscript.json**.
4. Pilih fungsi **setupAppEnvironment** → ▶ Run → izinkan akses. **JALANKAN SEKALI SAJA.**
5. Buka **Execution log**: catat email + sandi awal tiap akun (admin, kepsek, bendahara, 4 waka, staf).
6. Buka spreadsheet "Database — RAB Waka" (ada di folder Drive "RAB Waka"). Di sheet `USERS` **ganti email dengan email asli** dan isi `no_wa`. Ubah sandi lewat menu Administrasi setelah login.
7. (Opsional WhatsApp) Project Settings → Script Properties → tambah `WA_TOKEN` (token Fonnte). Tanpa token, notifikasi memakai email saja.
8. **Deploy → New deployment → Web app** · Execute as: **Me** · Who has access: **Anyone** → salin URL `/exec`.
   Untuk update berikutnya: Deploy → *Manage deployments* → ✏️ → *New version* (URL tidak berubah).

## B. Frontend (GitHub Pages)
1. Ekstrak ZIP. Folder hasil ekstrak (yang langsung berisi `index.html`) adalah folder kerja.
2. Edit `js/config.js` → isi `GAS_URL` dengan URL `/exec`.
3. Di terminal, `cd` ke folder tadi, pastikan `dir`/`ls` menampilkan `index.html`, lalu:
```
git init
git add .
git commit -m "RAB Waka"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```
4. GitHub → Settings → Pages → Deploy from branch → `main` / root. Tunggu 1–2 menit.

## C. Uji terima (sesuai PRD)
- Waka A tidak bisa membuka RAB Waka B · Staf bisa mengetik/unggah tetapi tidak bisa mengirim.
- Volume × Frekuensi × Harga dan total benar · item "sudah didanai APBD/pusat" ditolak.
- RAB melebihi pagu ditolak saat dikirim.
- Alur: Waka → Bendahara (revisi → kirim ulang) → Kepala Sekolah → PDF.
- Notifikasi email/WA terkirim; kegagalan tercatat di sheet `NOTIF_LOG`.

## D. Memperbarui dari versi sebelumnya (tampilan Stitch)
1. Tempel ulang **Kode.gs** terbaru ke editor Apps Script (data di Sheets tidak berubah; **jangan** jalankan `setupAppEnvironment` lagi).
2. Deploy → *Manage deployments* → ✏️ → Version: **New version** → Deploy (URL `/exec` tetap).
3. Ganti seluruh isi repo frontend dengan isi ZIP baru, isi lagi `js/config.js`, lalu `git add . && git commit -m "UI Stitch" && git push`.
4. Buka situs, tekan **Ctrl+Shift+R**, lalu masuk ulang.
Catatan: tampilan memakai Tailwind CDN dan Google Fonts, jadi perangkat pengguna perlu terhubung internet.
