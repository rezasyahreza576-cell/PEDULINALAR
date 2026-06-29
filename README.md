# PeduliNalar — Frontend + Backend Proxy

Website 2 halaman (welcome + scan) yang dipanggil lewat backend Express,
sehingga **Gemini API Key tidak pernah terlihat di browser pengguna**.

## Struktur folder

```
pedulinalar-fullstack/
├── server.js          # backend Express (proxy ke Gemini API)
├── package.json
├── .env.example        # salin jadi .env dan isi API key
├── .gitignore
└── public/
    ├── index.html       # welcome page
    ├── app.html         # core scan page
    ├── style.css
    └── script.js        # frontend, panggil /api/scan & /api/faq
```

## 1. Instalasi

Pastikan Node.js versi 18 atau lebih baru terpasang (cek dengan `node -v`).

```bash
cd pedulinalar-fullstack
npm install
```

## 2. Konfigurasi API Key

```bash
cp .env.example .env
```

Buka file `.env`, isi:

```
GEMINI_API_KEY=isi_dengan_api_key_asli_anda
GEMINI_MODEL=gemini-1.5-flash
PORT=3000
```

Dapatkan API key gratis di https://aistudio.google.com/ — **jangan pernah
mengunggah file `.env` ke GitHub atau tempat publik manapun.**

## 3. Jalankan

```bash
npm start
```

Buka browser ke `http://localhost:3000`. Halaman welcome (`index.html`) dan
scan (`app.html`) sudah disajikan otomatis oleh server yang sama — tidak
ada lagi kolom API key di frontend.

## 4. Cara kerja proxy

- Frontend (`script.js`) hanya memanggil endpoint sendiri: `POST /api/scan`
  dan `POST /api/faq`.
- `server.js` menerima permintaan itu, lalu **server** yang memanggil Gemini
  API menggunakan key dari `.env`. Key tidak pernah dikirim ke browser.
- Ada rate limit sederhana (12 permintaan/menit per IP) supaya key tidak
  disalahgunakan kalau website ini publik.
- `GET /api/health` bisa dipakai untuk memeriksa apakah server sudah
  terkonfigurasi dengan benar (dipakai oleh badge kecil di sidebar/FAQ).

## 5. Deploy ke hosting (HTTPS otomatis)

Karena sekarang ada proses backend (Node.js), gunakan platform yang
mendukung Node, bukan hosting statis biasa:

- **Render** — gratis untuk trial, deploy dari GitHub, HTTPS otomatis
- **Railway** — sangat mudah, tinggal connect repo
- **Fly.io** — gratis untuk skala kecil
- **VPS sendiri** (misal lewat PM2 + Nginx reverse proxy + Certbot)

Langkah umum di platform seperti Render/Railway:
1. Push folder ini ke repo GitHub (pastikan `.env` **tidak** ikut ter-push —
   sudah ditangani oleh `.gitignore`)
2. Hubungkan repo ke platform pilihan Anda
3. Set environment variable `GEMINI_API_KEY` (dan `GEMINI_MODEL` jika perlu)
   langsung di dashboard platform, bukan lewat file `.env`
4. Build command: `npm install` — Start command: `npm start`
5. Platform akan memberi domain dengan HTTPS otomatis

## 6. Catatan keamanan

- Rate limit di atas masih sederhana (in-memory, reset saat server restart).
  Untuk produksi dengan trafik tinggi, pertimbangkan rate-limit berbasis
  Redis atau layanan seperti Cloudflare.
- Pertimbangkan menambah autentikasi sederhana (misalnya cek header rahasia,
  atau login) jika ingin membatasi siapa saja yang boleh memakai scan ini,
  karena tiap pemanggilan tetap memakai kuota Gemini API Anda.
