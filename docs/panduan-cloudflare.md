# Mengakses dashboard melalui Cloudflare Quick Tunnel

Panduan ini memasang `cloudflared`, lalu mengakses dashboard Next.js yang berjalan
di komputer lokal melalui alamat HTTPS sementara Cloudflare. Quick Tunnel
cocok untuk demo dan pengujian, bukan hosting permanen.

## Cara kerjanya

1. Dashboard berjalan di komputer sendiri pada `http://localhost:3000`.
2. `cloudflared` membuat koneksi keluar yang aman dari komputer ke jaringan
   Cloudflare.
3. Cloudflare memberikan alamat HTTPS sementara, misalnya
   `https://nama-acak.trycloudflare.com`.
4. Saat alamat itu dibuka, Cloudflare meneruskan permintaan melalui koneksi
   `cloudflared` ke dashboard lokal di port `3000`.

Karena koneksinya dibuat dari dalam komputer ke Cloudflare, biasanya tidak perlu
mengatur DNS, membuka port masuk pada router, atau membuat akun Cloudflare untuk
Quick Tunnel. Website dan proses `cloudflared` harus tetap berjalan agar alamat
tersebut bisa digunakan.

## 1. Pasang cloudflared di Windows

1. Buka halaman [unduhan resmi Cloudflare](https://developers.cloudflare.com/tunnel/downloads/).
2. Pada bagian **Windows**, unduh installer **MSI 64-bit** (`cloudflared-windows-amd64.msi`)
   untuk Windows 64-bit. Jika komputer menggunakan Windows 32-bit, pilih MSI
   32-bit.
3. Buka file MSI yang diunduh dan ikuti petunjuk instalasi.
4. Tutup lalu buka kembali PowerShell, kemudian pastikan instalasi berhasil:

   ```powershell
   cloudflared --version
   ```

Quick Tunnel tidak memerlukan login akun Cloudflare atau domain milik sendiri.

## 2. Siapkan dan jalankan website

- Pastikan Node.js dan npm tersedia.
- Siapkan `dashboard-andaliman/.env.local` seperti biasa. Jangan bagikan atau
  unggah file tersebut karena dapat berisi kredensial.

1. Buka PowerShell pada folder utama repositori, lalu pindah ke folder dashboard:

   ```powershell
   cd .\dashboard-andaliman
   ```

2. Jalankan server pengembangan:

   ```powershell
   npm run dev
   ```

3. Pastikan dashboard dapat dibuka di <http://localhost:3000>. Biarkan terminal
   ini tetap berjalan.

## 3. Buka tunnel

1. Buka jendela PowerShell kedua.
2. Jalankan tunnel yang menunjuk ke alamat lokal dashboard:

   ```powershell
   cloudflared tunnel --url http://localhost:3000
   ```

3. Tunggu sampai terminal menampilkan alamat publik berakhiran
   `trycloudflare.com`.
4. Buka alamat tersebut di browser. Biarkan kedua terminal tetap berjalan
   selama website digunakan.

## Menghentikan dan menjalankan kembali

Tekan **Ctrl+C** pada terminal `cloudflared` untuk menutup tunnel, lalu tekan
**Ctrl+C** pada terminal Next.js untuk menghentikan website. Jika Quick Tunnel
dijalankan lagi, alamat publiknya dapat berubah; gunakan alamat terbaru yang
ditampilkan di terminal.

## Catatan keamanan dan batasan

- Siapa pun yang mengetahui alamat tunnel dapat membuka halaman website selama
  tunnel aktif. Bagikan alamat hanya kepada pihak yang perlu mengakses demo dan
  tetap gunakan autentikasi aplikasi.
- Jangan membagikan atau mengunggah `.env.local`; alamat tunnel bukan pengganti
  perlindungan kredensial.
- Komputer harus tetap menyala dan terhubung ke internet. Jika server Next.js
  atau tunnel berhenti, alamat publik tidak akan menampilkan website.
- Tunnel ini hanya meneruskan website pada port `3000`; jangan mengarahkan
  tunnel ke port broker MQTT `1883` atau Node-RED `1880`.
- Quick Tunnel ditujukan untuk pengujian, tidak memiliki alamat tetap atau
  jaminan uptime. Untuk penggunaan permanen, gunakan deployment terkelola atau
  Cloudflare Tunnel bernama dengan domain yang dikelola.

Referensi: [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).
