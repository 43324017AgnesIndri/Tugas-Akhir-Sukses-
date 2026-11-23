# Ringkasan Temuan OWASP ZAP

## Cakupan

Temuan berikut berasal dari pemindaian ZAP terhadap website Andaliman melalui
Cloudflare Quick Tunnel. Pemindaian yang terlihat pada tangkapan layar mencakup
halaman utama, login, lupa password, aset statis, dan `sitemap.xml`.

Ini adalah peringatan konfigurasi dan informasi dari pemindai, bukan bukti bahwa
setiap temuan dapat dieksploitasi. Nomor baris tidak berlaku untuk header HTTP
yang tidak dikonfigurasi; sebagian header juga dapat diubah pada lapisan
Cloudflare.

## Temuan

| # | Severity | Area | Temuan | Penilaian dan tindak lanjut |
|---|----------|------|--------|-----------------------------|
| 1 | 🟡 MEDIUM | Header HTTP aplikasi | Content-Security-Policy tidak disetel pada halaman utama, login, dan lupa password. | Tambahkan CSP yang sesuai dengan kebutuhan Next.js, Supabase, dan aset aplikasi. Kebijakan perlu diuji agar tidak memblokir skrip hidrasi atau koneksi autentikasi. |
| 2 | 🟡 MEDIUM | Header HTTP aplikasi | Header anti-clickjacking tidak ditemukan. | Tambahkan `X-Frame-Options: DENY` dan/atau `frame-ancestors 'none'` pada CSP, kecuali aplikasi memang perlu ditanam di situs lain. |
| 3 | ⚪ LOW | Header HTTP aplikasi | `X-Powered-By` mengungkap bahwa aplikasi menggunakan Next.js. | Setel `poweredByHeader: false` pada konfigurasi Next.js. Periksa juga apakah Cloudflare atau proxy menambahkan header kembali. |
| 4 | 🟡 MEDIUM | HTTPS / Cloudflare | Strict-Transport-Security tidak ditemukan. ZAP juga mencatat URL HTTP. | Terapkan HSTS pada respons HTTPS dan pastikan HTTP dialihkan ke HTTPS di lapisan yang mengelola domain. HSTS tidak melindungi respons HTTP awal. |
| 5 | 🟡 MEDIUM | Header HTTP aplikasi | `X-Content-Type-Options: nosniff` tidak ditemukan. | Tambahkan header global untuk mencegah browser menebak tipe konten. |
| 6 | 🟡 MEDIUM | Tipe konten | ZAP melaporkan `Content-Type` hilang pada halaman utama dan `sitemap.xml`. | Verifikasi respons aktual. Next.js biasanya mengirim tipe konten yang sesuai; `/sitemap.xml` perlu diperiksa karena pemindaian tidak membuktikan bahwa route tersebut tersedia. |
| 7 | ⚪ LOW | Aset JavaScript hasil build | Pemindai menemukan komentar mencurigakan di bundle JavaScript. | Penilaian awal: kemungkinan informasi komentar biasa, bukan kerentanan. Tinjau detail alert dan ulangi pemindaian pada build produksi. |
| 8 | ⚪ LOW | Cache halaman autentikasi | ZAP meminta pemeriksaan ulang kebijakan cache untuk login dan lupa password. | Tinjau respons halaman autentikasi dan pastikan tidak disimpan oleh shared cache; gunakan kebijakan privat/no-store bila sesuai. |

## Status perbaikan

- Header HSTS, `X-Content-Type-Options`, anti-clickjacking, dan kebijakan
  referrer dikonfigurasi di [next.config.ts](./dashboard-andaliman/next.config.ts).
- CSP nonce per-request diterapkan di [proxy.ts](./dashboard-andaliman/src/proxy.ts).
- Halaman autentikasi dan sitemap mengirim
  `Cache-Control: no-store, no-cache, must-revalidate`; API privat tetap memakai
  `private, no-store`.
- Route sitemap publik menyediakan XML dengan `Content-Type` yang eksplisit.
- CSP memakai nonce per-request pada halaman utama, login, pemulihan, dan
  sitemap; halaman autentikasi tidak lagi mengizinkan `unsafe-inline`.
- Build produksi berhasil dan respons publik halaman login/pemulihan telah
  diverifikasi: nonce cocok dengan semua tag script/style dan tidak ada atribut
  style inline.
- Bundle produksi saat ini tidak memuat marker komentar `FIXME`, `TODO`, atau
  `XXX`. ZAP dapat tetap menampilkan temuan lama sampai sesi/riwayat hasilnya
  dibersihkan dan situs dipindai ulang.
- Cloudflare Quick Tunnel menyediakan hostname sementara. Redirect HTTP dan
  header yang diubah pada edge tidak selalu dapat dikendalikan dari aplikasi.
- Jangan menaruh token, password, cookie, atau nilai `.env` di laporan.

## Referensi konfigurasi proyek

- [Konfigurasi Next.js](./dashboard-andaliman/next.config.ts)
- [Proxy autentikasi](./dashboard-andaliman/src/proxy.ts)
