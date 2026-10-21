# Topik MQTT, skema InfluxDB, dan wiring

## Aliran data

```
SHT40 -> ESP32 --MQTT--> Broker --> Node-RED --HTTP--> InfluxDB --> Dashboard (Next.js) -> Browser
                   ^                                                    |
                   +------ perintah (mode, aktuator, threshold) <-------+  /api/control, /api/threshold
```

## Relay 4 channel

| Channel | Perangkat | Nama di dashboard dan MQTT | GPIO ESP32 (`config.h`) |
|---|---|---|---|
| IN1 | Kompresor | `kompresor` | 25 |
| IN2 | Buzzer | `buzzer` | 26 |
| IN3 | Fan | `fan` | 27 |
| IN4 | Mist maker | `mist` | 33 |

GPIO di atas hanya usulan; ubah di `config.h` bila rangkaian berbeda (hindari GPIO 0, 2, 5, 12, 15 karena dipakai saat boot).

## Perilaku kontrol

| Mode | Kompresor, fan, mist | Buzzer |
|---|---|---|
| AUTO | Mengikuti threshold, histeresis, dan jeda pengaman kompresor | Bunyi jika suhu atau kelembapan di luar threshold selama 60 detik; otomatis diam setelah 120 detik; bunyi lagi jika kondisi sempat normal lalu abnormal lagi |
| MANUAL | Mengikuti tombol ON/OFF di dashboard (kompresor tetap menunggu jeda pengaman) | Mengikuti tombol di dashboard, tanpa alarm otomatis |
| SAFE (dipilih admin) | Semua mati | Mati |
| SAFE (otomatis, sensor gagal baca 5 kali berturut-turut) | Semua mati | Langsung bunyi; berhenti saat sensor pulih (maksimal 120 detik) |

Threshold suhu dan kelembapan diubah dari dashboard. Nilainya dikirim ke ESP32 lewat MQTT dan disimpan di memori ESP32, jadi tidak perlu upload ulang program.
Nilai 60 detik, 120 detik, histeresis, dan jeda kompresor ada di `config.h`.

## LCD 16x2

```
21.3°C 73.4%   [Wi-Fi]     baris 1: suhu, kelembapan, ikon Wi-Fi
14:05:09 AUTO  !           baris 2: jam (WIB), mode, "!" jika di luar threshold
```

- Ikon Wi-Fi: busur sinyal saat terhubung, busur bergaris miring saat terputus.
- Jam diambil dari NTP, jadi Wi-Fi harus punya akses internet. Sebelum tersinkron tampil `--:--:--`. Setelah sinkron, jam tetap jalan walau Wi-Fi putus.
- `SENSOR ERROR` tampil di baris 1 jika SHT40 gagal dibaca.

## Topik MQTT  (DEVICE_ID = andaliman01)

| Topik | Arah | Isi | Retained |
|---|---|---|---|
| `andaliman/andaliman01/data` | ESP32 -> broker | `{"suhu":21.3,"kelembapan":73.4}` tiap 5 detik | tidak |
| `andaliman/andaliman01/state` | ESP32 -> broker | `{"kompresor":1,"buzzer":0,"fan":0,"mist":0,"mode":"AUTO"}` saat berubah dan tiap 10 detik | tidak |
| `andaliman/andaliman01/status` | ESP32 / broker | `online` atau `offline` (Last Will) | ya |
| `andaliman/andaliman01/cmd/mode` | dashboard -> ESP32 | `{"mode":"AUTO"}` / `MANUAL` / `SAFE` | tidak |
| `andaliman/andaliman01/cmd/actuator` | dashboard -> ESP32 | `{"target":"kompresor","state":true}` (`buzzer`, `fan`, `mist`) | tidak |
| `andaliman/andaliman01/cmd/threshold` | dashboard -> ESP32 | `{"tmin":18,"tmax":24,"hmin":70,"hmax":85}` | ya |
| `andaliman/andaliman01/cmd/wifi` | dashboard -> ESP32 | `{"action":"scan","id":"ab12cd34"}` atau `{"action":"connect","ssid":"..","password":"..","id":"ab12cd34"}` | **tidak** (berisi password) |
| `andaliman/andaliman01/wifi` | ESP32 -> broker | `{"connected":1,"ssid":"..","rssi":-55,"ip":"..","hasil":"ok","target":"..","id":".."}` saat terhubung ke broker, saat ada hasil, dan tiap 15 detik | tidak |
| `andaliman/andaliman01/wifi/scan` | ESP32 -> broker | `{"id":"..","networks":[{"s":"nama","r":-55,"x":1}]}` (maks. 8 jaringan, sinyal terkuat dulu) | tidak |

Perintah mode dan aktuator sengaja tidak retained: setelah ESP32 restart ia kembali ke AUTO, bukan terjebak di MANUAL dengan relay menyala.
Threshold retained: ESP32 yang baru menyala langsung menerima nilai terakhir, dan juga menyimpannya di memorinya sendiri.

## Skema InfluxDB (dibaca dashboard, ditulis Node-RED)

| Measurement | Tag | Field |
|---|---|---|
| `environment` | `device_id` | `suhu` (float), `kelembapan` (float) |
| `actuator_state` | `device_id` | `kompresor`, `buzzer`, `fan`, `mist` (integer 0/1), `mode` (string) |
| `wifi_state` | `device_id` | `connected`, `rssi` (integer), `ssid`, `ip`, `hasil`, `target`, `id` (string) |
| `wifi_scan` | `device_id` | `networks` (string berisi JSON daftar jaringan), `id` (string) |

Jika bucket sebelumnya diisi `seed-influx.mjs`, tipe field-nya sudah sama dengan skema di atas, jadi tidak bentrok.
Data contoh itu tetap tercampur dengan data asli; hapus bucket atau buat bucket baru sebelum pengujian resmi.

## Wi-Fi dari dashboard

Tombol Wi-Fi di bagian atas semua halaman dashboard menampilkan ikon Wi-Fi dengan tulisan **Connect** (perangkat terhubung dan mengirim data) atau **Disconnect** (tidak ada kabar dari perangkat). Jika ditekan, panel terbuka: admin menekan **Cari jaringan Wi-Fi**, memilih jaringan, mengisi password, lalu **Hubungkan**. Akun viewer hanya melihat status.

```
Dashboard --cmd/wifi--> Mosquitto --> ESP32 (scan atau ganti Wi-Fi)
Dashboard <-- InfluxDB <-- Node-RED <-- wifi, wifi/scan <-- ESP32
```

Aturan keselamatan di ESP32 (`wifi_logic.h`, diuji di `test/`):
- Wi-Fi baru dipakai dan disimpan di memori ESP32 hanya jika ESP32 benar-benar terhubung ke Wi-Fi itu **dan** masih bisa menjangkau broker MQTT lewat jaringan itu.
- Jika password salah (20 detik) atau broker tidak terjangkau (30 detik), ESP32 kembali ke Wi-Fi sebelumnya, lalu melapor hasilnya ke dashboard (`gagal_wifi` atau `gagal_broker`).
- Wi-Fi yang tersimpan dipakai lebih dulu saat ESP32 menyala. Jika tidak terjangkau, ESP32 bergantian mencoba Wi-Fi di `config.h`.
- Selama pindah Wi-Fi, ESP32 terputus dari dashboard sekitar 5-60 detik. Kontrol AUTO tetap berjalan.

Catatan:
- Dashboard hanya dapat mengirim perintah selama ESP32 terhubung ke broker MQTT. Jika ESP32 offline, gunakan setup portal lokal di bawah ini.
- ESP32 hanya mendeteksi Wi-Fi 2,4 GHz. Wi-Fi tersembunyi tidak muncul di daftar.
- Password Wi-Fi lewat broker. Di jaringan lokal dengan port 1883 tanpa TLS, ini tidak terenkripsi. Saat broker dipindah online, wajib TLS (port 8883).
- Wi-Fi dengan halaman login (hotel, kampus dengan captive portal) tidak bisa dipakai.

## Setup Wi-Fi lokal saat ESP32 offline

Jika ESP32 gagal terhubung ke Wi-Fi saat boot, ESP32 menyalakan access point sementara setelah 10 detik. Jika Wi-Fi atau broker MQTT terputus setelah perangkat pernah online, access point setup menyala setelah 60 detik offline. Fitur ini tidak memerlukan dashboard, broker MQTT, atau Node-RED untuk mengirim kredensial.

1. Buka Serial Monitor Arduino IDE pada 115200 baud.
2. Cari pesan `[WiFi] portal setup aktif`; catat nama jaringan `ANDALIMAN-SETUP-XXXX` dan password unik yang dicetak.
3. Hubungkan laptop/HP ke jaringan setup tersebut. Koneksi internet perangkat akan terputus sementara.
4. Buka `http://192.168.4.1`, tekan **Cari jaringan**, pilih Wi-Fi 2,4 GHz, isi password, lalu hubungkan.
5. Perangkat menguji Wi-Fi baru dan koneksi ke broker MQTT. Kredensial hanya disimpan jika keduanya berhasil. Jika gagal, Wi-Fi sebelumnya tetap dipakai dan portal tetap tersedia untuk percobaan ulang.

Setelah berhasil, portal setup dimatikan dan ESP32 kembali memakai Wi-Fi baru. Pastikan jaringan tersebut dapat menjangkau alamat `MQTT_HOST` di `config.h`; tanpa broker, perangkat tidak akan menyimpan Wi-Fi baru.

## Pin I2C

| Fungsi | GPIO |
|---|---|
| SDA (SHT40, LCD) | 21 |
| SCL (SHT40, LCD) | 22 |

- SHT40 diberi daya 3,3 V.
- Modul relay umumnya aktif LOW (`RELAY_ACTIVE_LOW 1`). Uji dulu tanpa beban: jika relay menyala saat seharusnya mati, ubah ke 0.
- Beban AC kompresor dan mist maker dipasang lewat kontak relay dengan kabel dan pengaman yang sesuai arus beban.

## LCD I2C 5 V

Backpack LCD dengan VCC 5 V membuat pull-up SDA/SCL ikut ke 5 V, sedangkan GPIO ESP32 hanya 3,3 V.
Lewatkan SDA dan SCL LCD melalui level shifter I2C dua arah (sisi rendah 3,3 V ke ESP32 dan SHT40, sisi tinggi 5 V ke LCD).

## Pengujian logika kontrol (tanpa ESP32)

```
cd firmware-esp32
g++ -std=c++17 -I. test/test_control.cpp -o test_control && ./test_control
```
Hasil yang diharapkan: `Lulus: 87, Gagal: 0`. Skenario: histeresis, jeda kompresor, mist, buzzer (tunda, diam otomatis, sensor rusak), SAFE otomatis, MANUAL, luapan `millis()`, serta logika ganti Wi-Fi (berhasil, gagal, batas waktu) dan penyaringan hasil scan.
