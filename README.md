# Auto Vote Rating (AVR) v2.5

Ekstensi peramban modern berbasis **Manifest V3** untuk otomatisasi voting server Minecraft harian. Dirancang khusus untuk keandalan eksekusi 24/7 di peramban lokal maupun VPS (Linux/Windows).

**Pengembang:** Rara_IndiDev  
**Versi:** 2.5.0  
**Target:** Google Chrome / Chromium-based browsers (Edge, Brave, Vivaldi)  

---

## Arsitektur Proyek

Struktur kode telah disusun ulang menjadi arsitektur modular yang rapi dan terisolasi:

```text
Auto-Vote-Rating-dev/
├── manifest.json              # Konfigurasi ekstensi Chrome Manifest V3
├── PRIVACY.md                 # Kebijakan privasi
├── README.md                  # Dokumentasi proyek
├── _locales/                  # Internasionalisasi (id, en, dll.)
└── src/
    ├── background/            # Background Service Worker
    │   └── worker.js          # Lifecycle service worker, scheduler alarm, & listener
    │
    ├── core/                  # Core sistem
    │   ├── db.js              # Persistence IndexedDB ('avr' & 'logs') & error logger
    │   └── projects.js        # Registry aturan situs & timeout voting
    │
    ├── content/               # Script injeksi tab (Automation & Bypass)
    │   ├── runner.js          # Eksekusi alur vote pada halaman aktif
    │   ├── captcha.js         # Auto-solver Cloudflare Turnstile, reCAPTCHA & hCaptcha
    │   ├── timer.js           # HackTimer agar timer tidak dicekik saat tab background
    │   ├── visibility.js      # Spoofing status visibilitas tab (document.hidden)
    │   ├── trusted_main.js    # Proxy event isTrusted (MAIN world)
    │   ├── trusted_isolated.js# Event bridge (ISOLATED world)
    │   ├── dialog_main.js     # Guard dialog alert/confirm (MAIN world)
    │   └── dialog_isolated.js # Guard bridge (ISOLATED world)
    │
    ├── engines/               # Mesin voting spesifik tiap jaringan server
    │   ├── listforge.net.js   # Mesin utama ListForge (minecraft-mp.com, dll.)
    │   ├── minecraft-mp.com.js# Engine alias terintegrasi untuk Minecraft-MP
    │   └── ...                # Dukungan 100+ situs voting server lainnya
    │
    ├── ui/                    # Antarmuka dashboard (Options Page)
    │   ├── options.html       # Single Page Application dashboard
    │   ├── options.js         # Controller tampilan, timer countdown, & manajemen server
    │   └── options.css        # Tema responsif modern (Light & Dark mode)
    │
    └── assets/                # Aset statis & dependensi vendor
        ├── icons/             # Ikon aplikasi (16, 32, 48, 64, 128 px)
        ├── images/            # Logo & notifikasi
        ├── fonts/             # Font Roboto lokal
        └── vendor/            # Pustaka pihak ketiga (IDB Promise, LinkeDOM)
```

---

## Fitur Utama

1. **Auto Vote Otomatis 24 Jam**
   - Menghitung mundur jadwal reset vote tiap server secara otomatis.
   - Membuka tab secara mandiri saat waktu vote tiba, mengisi formulir nama, menyetujui TOS, dan mengirim vote.

2. **Bypass & Handling Captcha Cerdas**
   - Dukungan otomatisasi penyelesaian **Cloudflare Turnstile** secara native.
   - Kompatibel dengan ekstensi solver seperti Buster dan NopeCHA untuk reCAPTCHA & hCaptcha.

3. **Background Tab Preservation**
   - Memanipulasi `document.hidden` dan `visibilityState` agar halaman mengira tab sedang aktif ditonton.
   - Unthrottled timer memastikan hitung mundur script di halaman tidak macet saat tab berada di latar belakang.

4. **Privasi & Keamanan Data**
   - Seluruh data akun, URL server, dan log aktivitas tersimpan 100% secara lokal di IndexedDB peramban (`avr`).
   - Tidak ada pengiriman data ke server eksternal apa pun (zero telemetry).

---

## Cara Pemasangan di Chrome

1. Buka halaman ekstensi di Chrome dengan mengetik `chrome://extensions/` pada bilah alamat.
2. Aktifkan sakelar **Mode pengembang (Developer mode)** di pojok kanan atas.
3. Klik tombol **Muat yang belum dibongkar (Load unpacked)** di pojok kiri atas.
4. Pilih folder root proyek ini (`Auto-Vote-Rating-dev`).
5. Ekstensi akan langsung terpasang dan siap digunakan.

---

## Lisensi & Pembuat

Hak cipta dilindungi oleh **Rara_IndiDev**. Dibuat untuk tujuan automasi voting server Minecraft yang efisien, handal, dan aman.
