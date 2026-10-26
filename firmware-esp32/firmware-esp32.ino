// firmware-esp32.ino
// Program utama: monitoring dan kontrol penyimpanan andaliman.
//
// Alur: baca SHT40 -> kontrol (AUTO/MANUAL/SAFE) -> relay -> kirim data dan status lewat MQTT.
// Mode AUTO tetap berjalan walau Wi-Fi atau broker putus.
//
// Relay 4 channel: 1 = kompresor, 2 = buzzer, 3 = fan, 4 = mist maker.
// LCD 16x2: suhu, kelembapan, jam (NTP), mode, dan ikon Wi-Fi.
// Threshold suhu dan kelembapan diubah dari dashboard (tanpa upload ulang ke ESP32).
// Wi-Fi juga bisa dipilih dari dashboard (scan, pilih, isi password); lihat wifi_manager.h.
//
// Library yang perlu dipasang (Arduino IDE -> Library Manager):
//   Adafruit SHT4x Library, PubSubClient, ArduinoJson (v7), LiquidCrystal I2C (Frank de Brabander)
// Board: "ESP32 Dev Module" (paket esp32 dari Espressif).

#include <WiFi.h>
#include <Preferences.h>
#include "config.h"
#include "control_logic.h"
#include "sensor.h"
#include "actuator.h"
#include "waktu.h"
#include "mqtt_client.h"
#include "wifi_manager.h"
#if USE_LCD
  #include "display.h"
#endif

static ControlLogic control(ControlSettings{HIST_SUHU, HIST_LEMBAP, KOMPRESOR_MIN_OFF_MS, SENSOR_GAGAL_BATAS,
                                            BUZZER_TUNDA_MS, BUZZER_MAKS_MS});
static Preferences prefs;

static float suhu = NAN, lembap = NAN;
static bool sensorOk = false;
static bool bacaSekarang = true;     // true = baca sensor dan jalankan kontrol di putaran berikutnya
static uint8_t gagalBaca = 0;
static bool statusDiminta = false;

// ---------- Threshold: disimpan di memori ESP32 agar tetap ada setelah restart ----------
static Thresholds muatThreshold() {
  Thresholds th = {TH_DEFAULT_TMIN, TH_DEFAULT_TMAX, TH_DEFAULT_HMIN, TH_DEFAULT_HMAX};
  prefs.begin("andaliman", false);  // false: tidak error di boot pertama saat memori belum berisi
  if (prefs.isKey("tmin")) {
    th.tmin = prefs.getFloat("tmin", th.tmin);
    th.tmax = prefs.getFloat("tmax", th.tmax);
    th.hmin = prefs.getFloat("hmin", th.hmin);
    th.hmax = prefs.getFloat("hmax", th.hmax);
  }
  prefs.end();
  return th;
}

static void simpanThreshold(const Thresholds &th) {
  prefs.begin("andaliman", false);
  prefs.putFloat("tmin", th.tmin);
  prefs.putFloat("tmax", th.tmax);
  prefs.putFloat("hmin", th.hmin);
  prefs.putFloat("hmax", th.hmax);
  prefs.end();
}

// ---------- Perintah dari dashboard ----------
static void onMode(ControlMode m) {
  Serial.printf("[CMD] mode -> %s\n", modeName(m));
  control.setMode(m);
  bacaSekarang = true;
  statusDiminta = true;
}

static void onActuator(ActuatorId id, bool on) {
  if (control.mode() != MODE_MANUAL) {
    Serial.printf("[CMD] aktuator %d diabaikan: mode bukan MANUAL (%s)\n", (int)id, modeName(control.mode()));
    statusDiminta = true;
    return;
  }
  Serial.printf("[CMD] aktuator %d -> %s\n", (int)id, on ? "ON" : "OFF");
  control.setManual(id, on);
  bacaSekarang = true;
  statusDiminta = true;
}

static void onThreshold(const Thresholds &th) {
  Serial.printf("[CMD] threshold suhu %.1f-%.1f, kelembapan %.1f-%.1f\n", th.tmin, th.tmax, th.hmin, th.hmax);
  control.setThresholds(th);
  simpanThreshold(th);
  bacaSekarang = true;
}

void setup() {
  actuatorBegin();  // paling awal: semua relay OFF
  Serial.begin(115200);
  delay(200);
  Serial.println("\n=== Andaliman Storage ===");

  if (!sensorBegin()) Serial.println("[SENSOR] SHT40 tidak ditemukan (cek kabel SDA/SCL)");

  control.begin(millis(), muatThreshold());

#if USE_LCD
  displayBegin();
#endif

  wifiMuat();   // Wi-Fi terakhir yang dipilih dari dashboard (atau yang di config.h)
  wifiMulai();
  Serial.println("[WiFi] koneksi berjalan di latar belakang");

  MqttHandlers h = {onMode, onActuator, onThreshold, wifiPermintaan};
  mqttBegin(h);
}

void loop() {
  uint32_t now = millis();

  wifiJaga(now);
  mqttEnsureConnected(now);
  mqttLoop();
  wifiProses(now);    // scan dan ganti Wi-Fi atas perintah dashboard
  wifiLaporkan(now);  // status Wi-Fi untuk dashboard

  // --- Mulai sinkronisasi jam (NTP) begitu Wi-Fi terhubung ---
  static bool ntpDimulai = false;
  if (!ntpDimulai && WiFi.status() == WL_CONNECTED) {
    waktuBegin();
    ntpDimulai = true;
    Serial.println("[NTP] sinkronisasi jam dimulai");
  }

  // --- Baca sensor dan jalankan kontrol ---
  static uint32_t terakhirBaca = 0;
  static bool sudahBaca = false;
  if (bacaSekarang || !sudahBaca || (uint32_t)(now - terakhirBaca) >= SENSOR_INTERVAL_MS) {
    terakhirBaca = now;
    bacaSekarang = false;
    sudahBaca = true;

    float t, h;
    if (sensorRead(t, h)) {
      suhu = t;
      lembap = h;
      sensorOk = true;
      gagalBaca = 0;
    } else {
      sensorOk = false;
      if (gagalBaca < 255) gagalBaca++;
      if (gagalBaca >= 3 && gagalBaca % 5 == 3) {
        Serial.println("[SENSOR] gagal membaca, mencoba inisialisasi ulang");
        sensorBegin();
      }
    }

    control.update(now, sensorOk, suhu, lembap);
    actuatorApply(control);
  }

#if USE_LCD
  // --- Perbarui LCD tiap detik (jam bertambah) ---
  static uint32_t terakhirLcd = 0;
  static bool lcdPertama = true;
  if (lcdPertama || (uint32_t)(now - terakhirLcd) >= LCD_INTERVAL_MS) {
    lcdPertama = false;
    terakhirLcd = now;
    struct tm waktu;
    bool waktuOk = waktuSekarang(waktu);
    displayUpdate(sensorOk, suhu, lembap, control.mode(), WiFi.status() == WL_CONNECTED, waktuOk, waktu,
                  control.kondisiAbnormal());
  }
#endif

  // --- Kirim data sensor (hanya jika pembacaan terakhir valid) ---
  static uint32_t terakhirData = 0;
  if (sensorOk && (uint32_t)(now - terakhirData) >= DATA_INTERVAL_MS) {
    if (mqttPublishData(suhu, lembap)) terakhirData = now;
  }

  // --- Kirim status aktuator: saat berubah, saat baru terhubung, dan berkala ---
  static uint32_t terakhirState = 0;
  static int ttdTerakhir = -1;  // tanda tangan keadaan terakhir yang terkirim
  static bool terhubungSebelumnya = false;
  int ttd = (control.out(ACT_KOMPRESOR) ? 1 : 0) | (control.out(ACT_BUZZER) ? 2 : 0) |
            (control.out(ACT_FAN) ? 4 : 0) | (control.out(ACT_MIST) ? 8 : 0) | ((int)control.mode() << 4);
  bool terhubung = mqtt.connected();
  bool kirim = terhubung &&
               (!terhubungSebelumnya || statusDiminta || ttd != ttdTerakhir ||
                (uint32_t)(now - terakhirState) >= STATE_INTERVAL_MS);
  if (kirim && mqttPublishState(control.mode(), control.autoSafe(), control.out(ACT_KOMPRESOR),
                               control.out(ACT_BUZZER), control.out(ACT_FAN), control.out(ACT_MIST))) {
    terakhirState = now;
    ttdTerakhir = ttd;
    statusDiminta = false;
  }
  terhubungSebelumnya = terhubung;

  delay(10);
}
