// config.h
// Semua pengaturan yang mungkin perlu diubah ada di sini.
// JANGAN di-upload ke GitHub setelah diisi password asli.

#pragma once

// ===== Wi-Fi =====
#define WIFI_SSID       "ISI_NAMA_WIFI"
#define WIFI_PASSWORD   "ISI_PASSWORD_WIFI"

// ===== MQTT =====
// Sementara (broker di Docker laptop): isi dengan IP Wi-Fi laptop, contoh "192.168.1.23".
// Nanti (broker online): isi dengan domain broker, lalu ubah MQTT_USE_TLS ke 1 dan MQTT_PORT ke 8883.
#define MQTT_HOST       "192.168.1.23"
#define MQTT_PORT       1883
#define MQTT_USER       "esp32"     // pengguna Mosquitto untuk ESP32 (kosongkan jika broker tanpa login)
#define MQTT_PASSWORD   "ISI_PASSWORD_MQTT_ESP32"
#define MQTT_USE_TLS    0

// Harus SAMA dengan DEVICE_ID di .env.local dashboard (default dashboard: andaliman01)
#define DEVICE_ID       "andaliman01"

// ===== Pin ESP32 (SESUAIKAN dengan rangkaian) =====
#define PIN_SDA             21      // SHT40 dan LCD
#define PIN_SCL             22

// Modul relay 4 channel. Urutan channel:
//   IN1 = kompresor, IN2 = buzzer, IN3 = fan, IN4 = mist maker
#define PIN_RELAY_KOMPRESOR 25      // IN1
#define PIN_RELAY_BUZZER    26      // IN2
#define PIN_RELAY_FAN       27      // IN3
#define PIN_RELAY_MIST      33      // IN4

// Modul relay 4 channel yang umum: AKTIF saat pin LOW (isi 1). Jika relay terbalik, isi 0.
#define RELAY_ACTIVE_LOW    1

// ===== LCD 16x2 I2C =====
// Library: "LiquidCrystal I2C" (Frank de Brabander). Alamat umum: 0x27 atau 0x3F.
// Isi 0 jika LCD belum terpasang.
#define USE_LCD             1
#define LCD_ADDR            0x27

// ===== Jam (NTP) =====
// Jam diambil dari internet lewat Wi-Fi, jadi Wi-Fi yang dipakai harus punya akses internet.
// Setelah sekali tersinkron, jam tetap berjalan sendiri walau Wi-Fi putus.
#define NTP_SERVER1         "pool.ntp.org"
#define NTP_SERVER2         "time.google.com"
#define TZ_OFFSET_SEC       (7 * 3600)   // WIB = UTC+7

// ===== Waktu =====
#define SENSOR_INTERVAL_MS   2000UL   // baca sensor dan jalankan kontrol
#define DATA_INTERVAL_MS     5000UL   // kirim suhu dan kelembapan ke MQTT
#define STATE_INTERVAL_MS   10000UL   // kirim status aktuator (juga dikirim saat berubah)
#define LCD_INTERVAL_MS      1000UL   // perbarui LCD (jam bertambah tiap detik)

// ===== Parameter kontrol =====
#define HIST_SUHU            1.0f     // histeresis suhu (°C)
#define HIST_LEMBAP          3.0f     // histeresis kelembapan (%)
// Jeda pengaman kompresor sebelum boleh menyala lagi (dan setelah ESP32 baru menyala).
// Nilai 30 detik mengikuti mockup dashboard. Untuk kompresor sungguhan, 180000 (3 menit) lebih aman.
#define KOMPRESOR_MIN_OFF_MS 30000UL
// Jumlah gagal baca sensor berturut-turut sebelum masuk mode SAFE otomatis (x SENSOR_INTERVAL_MS)
#define SENSOR_GAGAL_BATAS   5

// ===== Buzzer =====
// Buzzer bunyi jika suhu/kelembapan di luar threshold selama BUZZER_TUNDA_MS (memberi waktu
// kompresor/mist bekerja dulu), dan otomatis diam setelah BUZZER_MAKS_MS agar tidak bunyi terus.
// Jika sensor rusak, buzzer langsung bunyi.
#define BUZZER_TUNDA_MS      60000UL
#define BUZZER_MAKS_MS      120000UL

// Threshold awal, dipakai sampai dashboard mengirim nilai dari database
// (sama dengan nilai bawaan dashboard: 18-24 °C dan 70-85 %)
#define TH_DEFAULT_TMIN   18.0f
#define TH_DEFAULT_TMAX   24.0f
#define TH_DEFAULT_HMIN   70.0f
#define TH_DEFAULT_HMAX   85.0f
