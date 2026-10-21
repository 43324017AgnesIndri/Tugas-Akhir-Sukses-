// wifi_manager.h
// Wi-Fi: terhubung, menjaga koneksi, scan jaringan, dan ganti Wi-Fi atas perintah dashboard.
//
// Wi-Fi yang dipilih dari dashboard disimpan di memori ESP32 (NVS) dan dipakai lebih dulu saat menyala.
// Jika Wi-Fi tersimpan tidak terjangkau, ESP32 bergantian mencoba Wi-Fi awal di config.h.
//
// Jika ESP32 kehilangan Wi-Fi atau broker, portal setup lokal menyediakan jalur pemulihan
// tanpa dashboard. Portal hanya aktif sementara selama koneksi belum pulih.

#pragma once
#include <WiFi.h>
#include <Preferences.h>
#include <WebServer.h>
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

static WebServer wifiSetupServer(80);
static bool wifiPortalAktif = false;
static char wifiPortalSsid[32] = "";
static char wifiPortalPassword[9] = "";

static void salin(char *tujuan, size_t ukuran, const char *sumber) { snprintf(tujuan, ukuran, "%s", sumber ? sumber : ""); }
inline void wifiPermintaan(const char *aksi, const char *ssid, const char *pass, const char *id);

// ---------- Portal lokal untuk pemulihan saat ESP32 tidak terhubung ke Wi-Fi ----------
inline void wifiPortalMulai() {
  if (wifiPortalAktif) return;
  static uint32_t percobaanTerakhir = 0;
  static bool pernahMencoba = false;
  const uint32_t now = millis();
  if (pernahMencoba && (uint32_t)(now - percobaanTerakhir) < 10000) return;
  pernahMencoba = true;
  percobaanTerakhir = now;

  const uint64_t mac = ESP.getEfuseMac();
  snprintf(wifiPortalSsid, sizeof(wifiPortalSsid), "ANDALIMAN-SETUP-%04X", (unsigned)(mac & 0xFFFF));
  snprintf(wifiPortalPassword, sizeof(wifiPortalPassword), "%08X", (unsigned)(mac >> 16));

  WiFi.mode(WIFI_AP_STA);
  if (!WiFi.softAP(wifiPortalSsid, wifiPortalPassword)) {
    Serial.println("[WiFi] gagal menyalakan portal setup");
    return;
  }

  wifiSetupServer.on("/", HTTP_GET, []() {
    static const char halaman[] = R"HTML(
<!doctype html><html lang="id"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta charset="utf-8"><title>Setup Wi-Fi Andaliman</title>
<style>body{font:16px system-ui;max-width:520px;margin:32px auto;padding:0 16px;color:#18202a}input,select,button{box-sizing:border-box;width:100%;padding:12px;margin:8px 0}button{cursor:pointer}#status{padding:12px;background:#eef3f7;border-radius:8px}</style>
<h1>Setup Wi-Fi Andaliman</h1><p>Pilih jaringan 2,4 GHz yang dapat menjangkau broker MQTT.</p>
<button id="scan" type="button">Cari jaringan</button><form method="post" action="/connect">
<label>Nama Wi-Fi (SSID)<select id="networks" name="ssid" required><option value="">Pilih jaringan...</option></select></label>
<label>Password Wi-Fi<input name="password" type="password" maxlength="63" autocomplete="current-password"></label>
<button type="submit">Hubungkan dan simpan</button></form><p id="status">Perangkat menunggu pengaturan.</p>
<script>
const list=document.querySelector("#networks"),status=document.querySelector("#status");
document.querySelector("#scan").onclick=async()=>{status.textContent="Memindai jaringan...";try{const r=await fetch("/scan"),d=await r.json();list.replaceChildren(new Option("Pilih jaringan...",""));for(const n of d.networks){const o=new Option(`${n.ssid} (${n.rssi} dBm)${n.secure?" 🔒":""}`,n.ssid);list.add(o)}status.textContent=d.networks.length?`${d.networks.length} jaringan ditemukan.`:"Tidak ada jaringan ditemukan."}catch{status.textContent="Gagal memindai jaringan."}};
async function check(){try{const r=await fetch("/status"),s=await r.json();if(s.result==="ok"){status.textContent="Berhasil terhubung ke Wi-Fi dan broker. Perangkat menyimpan jaringan ini.";return}if(s.result==="gagal_wifi")status.textContent="Gagal terhubung ke Wi-Fi. Periksa password dan sinyal.";else if(s.result==="gagal_broker")status.textContent="Wi-Fi terhubung tetapi broker MQTT tidak dapat dijangkau. Periksa jaringan dan alamat broker.";else if(s.connecting)status.textContent=`Sedang menguji koneksi ke ${s.target}...`;else if(s.mqtt)status.textContent=`Online melalui ${s.ssid}; siap menerima pengaturan.`}catch{}setTimeout(check,2000)}check();
</script></html>)HTML";
    wifiSetupServer.send(200, "text/html; charset=utf-8", halaman);
  });

  wifiSetupServer.on("/scan", HTTP_GET, []() {
    const int count = WiFi.scanNetworks(false, false);
    JsonDocument doc;
    JsonArray networks = doc["networks"].to<JsonArray>();
    for (int i = 0; i < count; i++) {
      const String ssid = WiFi.SSID(i);
      if (ssid.isEmpty()) continue;
      JsonObject network = networks.add<JsonObject>();
      network["ssid"] = ssid;
      network["rssi"] = WiFi.RSSI(i);
      network["secure"] = WiFi.encryptionType(i) != WIFI_AUTH_OPEN;
    }
    String response;
    serializeJson(doc, response);
    WiFi.scanDelete();
    wifiSetupServer.send(200, "application/json", response);
  });

  wifiSetupServer.on("/connect", HTTP_POST, []() {
    const String ssid = wifiSetupServer.arg("ssid");
    const String password = wifiSetupServer.arg("password");
    if (!wifiSsidValid(ssid.c_str()) || !wifiPassValid(password.c_str())) {
      wifiSetupServer.send(400, "text/plain; charset=utf-8", "Nama atau password Wi-Fi tidak valid. Kembali dan periksa isian.");
      return;
    }
    if (wifiSwitch.sibuk()) {
      wifiSetupServer.send(409, "text/plain; charset=utf-8", "Perangkat sedang mencoba jaringan lain. Tunggu percobaan selesai.");
      return;
    }
    wifiPermintaan("connect", ssid.c_str(), password.c_str(), "portal");
    wifiSetupServer.send(200, "text/html; charset=utf-8",
      "<meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
      "<p>Pengaturan diterima. Biarkan halaman ini terbuka; perangkat sedang menguji Wi-Fi dan koneksi broker MQTT.</p>"
      "<p><a href='/'>Kembali ke status</a></p>");
  });

  wifiSetupServer.on("/status", HTTP_GET, []() {
    JsonDocument doc;
    doc["mqtt"] = mqtt.connected();
    doc["connecting"] = wifiSwitch.sibuk();
    doc["ssid"] = WiFi.SSID();
    doc["target"] = targetTerakhir;
    const WifiHasil result = wifiSwitch.sibuk() ? WFH_BELUM : hasilTerakhir;
    doc["result"] = wifiHasilNama(result);
    String response;
    serializeJson(doc, response);
    wifiSetupServer.send(200, "application/json", response);
  });

  wifiSetupServer.onNotFound([]() {
    wifiSetupServer.sendHeader("Location", "/", true);
    wifiSetupServer.send(302, "text/plain", "");
  });
  wifiSetupServer.begin();
  wifiPortalAktif = true;
  Serial.printf("[WiFi] portal setup aktif\n  SSID: %s\n  Password: %s\n  Buka: http://192.168.4.1\n",
                wifiPortalSsid, wifiPortalPassword);
}

static void wifiPortalBerhenti() {
  if (!wifiPortalAktif) return;
  wifiSetupServer.stop();
  WiFi.softAPdisconnect(true);
  WiFi.mode(WIFI_STA);
  wifiPortalAktif = false;
  Serial.println("[WiFi] portal setup dimatikan; Wi-Fi tersimpan dan broker terhubung");
}

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
  static uint32_t mulaiOffline = 0;
  static bool pernahOnline = false;
  static bool pakaiCadangan = false;
  if (wifiSwitch.sibuk()) { terakhirCoba = now; return; }
  if (WiFi.status() == WL_CONNECTED && mqtt.connected()) {
    pernahOnline = true;
    mulaiOffline = 0;
    terakhirCoba = now;
    wifiPortalBerhenti();
    return;
  }
  if (mulaiOffline == 0) mulaiOffline = now;
  const bool gagalWiFiSaatBoot = !pernahOnline && WiFi.status() != WL_CONNECTED && now >= 10000;
  const bool offlineLama = (uint32_t)(now - mulaiOffline) >= 60000;
  if (!wifiPortalAktif && (gagalWiFiSaatBoot || offlineLama)) {
    wifiPortalMulai();
  }
  if (WiFi.status() == WL_CONNECTED) { terakhirCoba = now; return; }
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
  if (wifiPortalAktif) wifiSetupServer.handleClient();

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
      wifiPortalBerhenti();
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
