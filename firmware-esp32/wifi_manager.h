// wifi_manager.h
// Wi-Fi: terhubung, menjaga koneksi, scan jaringan, dan ganti Wi-Fi atas perintah dashboard.
//
// Wi-Fi yang dipilih dari dashboard disimpan di memori ESP32 (NVS) dan dipakai lebih dulu saat menyala.
// Jika Wi-Fi tersimpan tidak terjangkau, ESP32 bergantian mencoba Wi-Fi awal di config.h.
//
// Catatan: perintah dari dashboard lewat MQTT, jadi ESP32 harus sedang terhubung ke broker.
// Jika Wi-Fi hilang total, ESP32 tidak bisa menerima perintah apa pun dari dashboard.

#pragma once
#include <WiFi.h>
#include <Preferences.h>
#include "config.h"
#include "wifi_logic.h"
#include "mqtt_client.h"

// Wi-Fi aktif (yang dipakai sekarang / terakhir berhasil)
static char wifiSsid[33] = WIFI_SSID;
static char wifiPass[65] = WIFI_PASSWORD;
// Wi-Fi yang sedang dicoba
static char cobaSsid[33] = "";
static char cobaPass[65] = "";

static WifiSwitcher wifiSwitch(WifiSwitchSettings{WIFI_COBA_MS, WIFI_VERIFIKASI_MS});

// Permintaan dari dashboard (diisi di callback MQTT, dikerjakan di wifiProses)
static bool reqScan = false, reqConnect = false;
static char reqSsid[33] = "", reqPass[65] = "", reqConnectId[16] = "", reqScanId[16] = "";

// Hasil percobaan ganti Wi-Fi terakhir, dikirim ke dashboard
static char idTerakhir[16] = "", targetTerakhir[33] = "";
static WifiHasil hasilTerakhir = WFH_BELUM;
static bool statusSegera = false;

static bool scanBerjalan = false;
static uint32_t scanMulai = 0;
static char scanId[16] = "";

static void salin(char *tujuan, size_t ukuran, const char *sumber) { snprintf(tujuan, ukuran, "%s", sumber ? sumber : ""); }

// ---------- Penyimpanan Wi-Fi di memori ESP32 ----------
inline void wifiMuat() {
  Preferences p;
  p.begin("wifi", false);
  if (p.isKey("ssid")) {
    String s = p.getString("ssid", "");
    String w = p.getString("pass", "");
    if (wifiSsidValid(s.c_str()) && wifiPassValid(w.c_str())) {
      salin(wifiSsid, sizeof(wifiSsid), s.c_str());
      salin(wifiPass, sizeof(wifiPass), w.c_str());
    }
  }
  p.end();
  Serial.printf("[WiFi] jaringan awal: %s\n", wifiSsid);
}

static void wifiSimpan() {
  Preferences p;
  p.begin("wifi", false);
  p.putString("ssid", wifiSsid);
  p.putString("pass", wifiPass);
  p.end();
}

// ---------- Sambungan ----------
inline void wifiMulai() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(wifiSsid, wifiPass);
}

// Wi-Fi tersimpan berbeda dari Wi-Fi awal di config.h?
static bool adaCadangan() { return strcmp(wifiSsid, WIFI_SSID) != 0 || strcmp(wifiPass, WIFI_PASSWORD) != 0; }

inline void wifiJaga(uint32_t now) {
  static uint32_t terakhirCoba = 0;
  static bool pakaiCadangan = false;
  if (wifiSwitch.sibuk() || WiFi.status() == WL_CONNECTED) { terakhirCoba = now; return; }
  if ((uint32_t)(now - terakhirCoba) >= 30000) {  // 30 detik tanpa Wi-Fi: coba lagi
    terakhirCoba = now;
    WiFi.disconnect();
    if (pakaiCadangan && adaCadangan()) {
      Serial.println("[WiFi] terputus, mencoba Wi-Fi awal (config.h)");
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    } else {
      Serial.println("[WiFi] terputus, mencoba lagi");
      WiFi.begin(wifiSsid, wifiPass);
    }
    pakaiCadangan = !pakaiCadangan;
  }
}

// ---------- Perintah dari dashboard (dipanggil dari callback MQTT) ----------
inline void wifiPermintaan(const char *aksi, const char *ssid, const char *pass, const char *id) {
  if (strcmp(aksi, "scan") == 0) {
    salin(reqScanId, sizeof(reqScanId), id);
    reqScan = true;
  } else if (strcmp(aksi, "connect") == 0) {
    if (wifiSwitch.sibuk()) { Serial.println("[WiFi] masih mencoba Wi-Fi lain, perintah diabaikan"); return; }
    salin(reqSsid, sizeof(reqSsid), ssid);
    salin(reqPass, sizeof(reqPass), pass);
    salin(reqConnectId, sizeof(reqConnectId), id);
    reqConnect = true;
  }
}

static void kembaliKeWifiLama() {
  mqtt.disconnect();
  WiFi.disconnect();
  WiFi.begin(wifiSsid, wifiPass);
}

static void kerjakanScan(uint32_t now) {
  if (reqScan && wifiSwitch.sibuk()) reqScan = false;  // sedang ganti Wi-Fi: scan diabaikan
  if (reqScan && !scanBerjalan) {
    reqScan = false;
    salin(scanId, sizeof(scanId), reqScanId);
    WiFi.scanNetworks(true, false);  // asinkron, tanpa jaringan tersembunyi
    scanBerjalan = true;
    scanMulai = now;
    Serial.println("[WiFi] scan jaringan dimulai");
  }
  if (!scanBerjalan) return;

  int n = WiFi.scanComplete();
  if (n == WIFI_SCAN_RUNNING) {
    if ((uint32_t)(now - scanMulai) >= WIFI_SCAN_TIMEOUT_MS) {
      scanBerjalan = false;
      WiFi.scanDelete();
      Serial.println("[WiFi] scan terlalu lama, dibatalkan");
    }
    return;
  }

  scanBerjalan = false;
  static Jaringan mentah[20], pilih[20];
  int jml = 0;
  if (n > 0) {
    for (int i = 0; i < n && jml < 20; i++) {
      snprintf(mentah[jml].ssid, sizeof(mentah[jml].ssid), "%s", WiFi.SSID(i).c_str());
      mentah[jml].rssi = WiFi.RSSI(i);
      mentah[jml].aman = WiFi.encryptionType(i) != WIFI_AUTH_OPEN;
      jml++;
    }
  }
  WiFi.scanDelete();
  int k = wifiPilihJaringan(mentah, jml, pilih, WIFI_SCAN_MAKS);
  Serial.printf("[WiFi] scan selesai, %d jaringan\n", k);
  mqttPublishScan(pilih, k, scanId);
}

// Dipanggil tiap putaran loop()
inline void wifiProses(uint32_t now) {
  // 1. Mulai mencoba Wi-Fi baru
  if (reqConnect) {
    reqConnect = false;
    if (!wifiSwitch.sibuk() && !scanBerjalan && wifiSwitch.mulai(now)) {
      salin(cobaSsid, sizeof(cobaSsid), reqSsid);
      salin(cobaPass, sizeof(cobaPass), reqPass);
      salin(idTerakhir, sizeof(idTerakhir), reqConnectId);
      salin(targetTerakhir, sizeof(targetTerakhir), cobaSsid);
      hasilTerakhir = WFH_BELUM;
      Serial.printf("[WiFi] mencoba Wi-Fi \"%s\"\n", cobaSsid);

      if (mqtt.connected()) mqtt.publish(tStatus, "offline", true);
      mqtt.disconnect();  // tutup sambungan lama supaya tidak dikira masih terhubung
      WiFi.disconnect();
      WiFi.begin(cobaSsid, cobaPass);
    }
  }

  // 2. Pantau percobaan
  if (wifiSwitch.sibuk()) {
    bool wifiBaru = WiFi.status() == WL_CONNECTED && WiFi.SSID().equals(cobaSsid);
    WifiAksi a = wifiSwitch.update(now, wifiBaru, mqtt.connected());
    if (a == WFA_SIMPAN_BARU) {
      salin(wifiSsid, sizeof(wifiSsid), cobaSsid);
      salin(wifiPass, sizeof(wifiPass), cobaPass);
      wifiSimpan();
      hasilTerakhir = WFH_OK;
      statusSegera = true;
      Serial.printf("[WiFi] berhasil pindah ke \"%s\" dan disimpan\n", wifiSsid);
    } else if (a == WFA_KEMBALI_LAMA) {
      hasilTerakhir = wifiSwitch.hasil();
      Serial.printf("[WiFi] gagal pindah ke \"%s\" (%s), kembali ke \"%s\"\n", cobaSsid, wifiHasilNama(hasilTerakhir), wifiSsid);
      kembaliKeWifiLama();
    }
    if (!wifiSwitch.sibuk()) {  // percobaan selesai: hapus salinan password dari RAM
      memset(cobaPass, 0, sizeof(cobaPass));
      memset(reqPass, 0, sizeof(reqPass));
    }
  }

  // 3. Scan jaringan
  kerjakanScan(now);
}

// Kirim status Wi-Fi ke dashboard: saat baru terhubung ke broker, saat ada hasil, dan berkala
inline void wifiLaporkan(uint32_t now) {
  static uint32_t terakhir = 0;
  static bool terhubungSebelumnya = false;
  bool terhubung = mqtt.connected();
  bool kirim = terhubung && (!terhubungSebelumnya || statusSegera || (uint32_t)(now - terakhir) >= WIFI_STATUS_INTERVAL_MS);
  if (kirim) {
    IPAddress ip = WiFi.localIP();
    char ipTeks[16];
    snprintf(ipTeks, sizeof(ipTeks), "%u.%u.%u.%u", ip[0], ip[1], ip[2], ip[3]);
    if (mqttPublishWifi(WiFi.SSID().c_str(), WiFi.RSSI(), ipTeks, wifiHasilNama(hasilTerakhir), targetTerakhir, idTerakhir)) {
      terakhir = now;
      statusSegera = false;
    }
  }
  terhubungSebelumnya = terhubung;
}
