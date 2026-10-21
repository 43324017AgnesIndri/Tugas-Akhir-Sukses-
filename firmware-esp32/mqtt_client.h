// mqtt_client.h
// Koneksi MQTT: mengirim data sensor dan status, menerima perintah dari dashboard.
//
// Library (Library Manager): "PubSubClient" (Nick O'Leary) dan "ArduinoJson" (Benoit Blanchon, versi 7).
//
// Topik (DEVICE_ID = andaliman01):
//   andaliman/andaliman01/data         ESP32 -> broker  {"suhu":21.3,"kelembapan":73.4}
//   andaliman/andaliman01/state        ESP32 -> broker  {"kompresor":1,"buzzer":0,"fan":0,"mist":0,"mode":"AUTO"}
//   andaliman/andaliman01/status       ESP32 -> broker  "online" / "offline" (retained; "offline" dikirim broker saat koneksi putus)
//   andaliman/andaliman01/cmd/mode     dashboard -> ESP32  {"mode":"AUTO|MANUAL|SAFE"}
//   andaliman/andaliman01/cmd/actuator dashboard -> ESP32  {"target":"kompresor|buzzer|fan|mist","state":true}
//   andaliman/andaliman01/cmd/threshold dashboard -> ESP32 {"tmin":18,"tmax":24,"hmin":70,"hmax":85} (retained)
//   andaliman/andaliman01/cmd/wifi     dashboard -> ESP32  {"action":"scan","id":"ab12"}
//                                                          {"action":"connect","ssid":"..","password":"..","id":"ab12"}
//                                                          (TIDAK pernah retained: berisi password Wi-Fi)
//   andaliman/andaliman01/wifi         ESP32 -> broker  {"connected":1,"ssid":"..","rssi":-55,"ip":"..","hasil":"ok","target":"..","id":"ab12"}
//   andaliman/andaliman01/wifi/scan    ESP32 -> broker  {"id":"ab12","networks":[{"s":"nama","r":-55,"x":1}]}

#pragma once
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "control_logic.h"
#include "wifi_logic.h"

#if MQTT_USE_TLS
  #include <WiFiClientSecure.h>
  static WiFiClientSecure netClient;
#else
  static WiFiClient netClient;
#endif

static PubSubClient mqtt(netClient);

// Fungsi yang dipanggil saat perintah diterima (diisi oleh program utama)
struct MqttHandlers {
  void (*onMode)(ControlMode mode);
  void (*onActuator)(ActuatorId id, bool on);
  void (*onThreshold)(const Thresholds &th);
  // aksi = "scan" atau "connect". Dipanggil dari dalam mqtt.loop(): jangan memblokir di sini.
  void (*onWifi)(const char *aksi, const char *ssid, const char *pass, const char *id);
};
static MqttHandlers mqttHandlers = {nullptr, nullptr, nullptr, nullptr};

static char tData[64], tState[64], tStatus[64], tCmdMode[64], tCmdAct[64], tCmdThr[64];
static char tCmdWifi[64], tWifi[64], tWifiScan[64];

static void mqttBuatTopik() {
  snprintf(tData, sizeof(tData), "andaliman/%s/data", DEVICE_ID);
  snprintf(tState, sizeof(tState), "andaliman/%s/state", DEVICE_ID);
  snprintf(tStatus, sizeof(tStatus), "andaliman/%s/status", DEVICE_ID);
  snprintf(tCmdMode, sizeof(tCmdMode), "andaliman/%s/cmd/mode", DEVICE_ID);
  snprintf(tCmdAct, sizeof(tCmdAct), "andaliman/%s/cmd/actuator", DEVICE_ID);
  snprintf(tCmdThr, sizeof(tCmdThr), "andaliman/%s/cmd/threshold", DEVICE_ID);
  snprintf(tCmdWifi, sizeof(tCmdWifi), "andaliman/%s/cmd/wifi", DEVICE_ID);
  snprintf(tWifi, sizeof(tWifi), "andaliman/%s/wifi", DEVICE_ID);
  snprintf(tWifiScan, sizeof(tWifiScan), "andaliman/%s/wifi/scan", DEVICE_ID);
}

static void mqttOnMessage(char *topic, byte *payload, unsigned int length) {
  JsonDocument doc;
  if (deserializeJson(doc, payload, length)) {
    Serial.printf("[MQTT] JSON tidak valid di %s\n", topic);
    return;
  }

  if (strcmp(topic, tCmdMode) == 0) {
    const char *m = doc["mode"] | "";
    ControlMode mode;
    if (strcmp(m, "AUTO") == 0) mode = MODE_AUTO;
    else if (strcmp(m, "MANUAL") == 0) mode = MODE_MANUAL;
    else if (strcmp(m, "SAFE") == 0) mode = MODE_SAFE;
    else { Serial.printf("[MQTT] mode tidak dikenal: %s\n", m); return; }
    if (mqttHandlers.onMode) mqttHandlers.onMode(mode);

  } else if (strcmp(topic, tCmdAct) == 0) {
    const char *tg = doc["target"] | "";
    if (!doc["state"].is<bool>()) { Serial.println("[MQTT] state aktuator harus true/false"); return; }
    bool on = doc["state"].as<bool>();
    ActuatorId id;
    if (strcmp(tg, "kompresor") == 0) id = ACT_KOMPRESOR;
    else if (strcmp(tg, "buzzer") == 0) id = ACT_BUZZER;
    else if (strcmp(tg, "fan") == 0) id = ACT_FAN;
    else if (strcmp(tg, "mist") == 0) id = ACT_MIST;
    else { Serial.printf("[MQTT] aktuator tidak dikenal: %s\n", tg); return; }
    if (mqttHandlers.onActuator) mqttHandlers.onActuator(id, on);

  } else if (strcmp(topic, tCmdThr) == 0) {
    Thresholds th;
    th.tmin = doc["tmin"] | NAN;
    th.tmax = doc["tmax"] | NAN;
    th.hmin = doc["hmin"] | NAN;
    th.hmax = doc["hmax"] | NAN;
    bool valid = isfinite(th.tmin) && isfinite(th.tmax) && isfinite(th.hmin) && isfinite(th.hmax) &&
                 th.tmin < th.tmax && th.hmin < th.hmax &&
                 th.tmin > -40 && th.tmax < 85 && th.hmin >= 0 && th.hmax <= 100;
    if (!valid) { Serial.println("[MQTT] threshold ditolak (tidak valid)"); return; }
    if (mqttHandlers.onThreshold) mqttHandlers.onThreshold(th);

  } else if (strcmp(topic, tCmdWifi) == 0) {
    const char *aksi = doc["action"] | "";
    const char *id = doc["id"] | "";
    if (strcmp(aksi, "scan") == 0) {
      if (mqttHandlers.onWifi) mqttHandlers.onWifi("scan", "", "", id);
    } else if (strcmp(aksi, "connect") == 0) {
      const char *ssid = doc["ssid"] | "";
      const char *pass = doc["password"] | "";
      if (!wifiSsidValid(ssid) || !wifiPassValid(pass)) { Serial.println("[MQTT] perintah Wi-Fi ditolak (SSID/password tidak valid)"); return; }
      if (mqttHandlers.onWifi) mqttHandlers.onWifi("connect", ssid, pass, id);  // password tidak dicetak ke Serial
    } else {
      Serial.printf("[MQTT] aksi Wi-Fi tidak dikenal: %s\n", aksi);
    }
  }
}

inline void mqttBegin(const MqttHandlers &h) {
  mqttHandlers = h;
  mqttBuatTopik();
#if MQTT_USE_TLS
  #ifdef MQTT_CA_CERT
    netClient.setCACert(MQTT_CA_CERT);   // isi MQTT_CA_CERT di config.h dengan sertifikat CA broker
  #else
    netClient.setInsecure();             // TIDAK memverifikasi server; ganti dengan setCACert untuk penggunaan sungguhan
  #endif
#endif
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttOnMessage);
  mqtt.setBufferSize(1024);  // hasil scan Wi-Fi bisa mendekati 800 byte
  mqtt.setKeepAlive(30);
  mqtt.setSocketTimeout(4);  // detik; supaya percobaan koneksi tidak menahan program lama
}

// Memastikan terhubung ke broker. Tidak memblokir lama; mencoba ulang tiap 5 detik.
inline bool mqttEnsureConnected(uint32_t now) {
  static uint32_t lastTry = 0;
  static bool pernahCoba = false;

  if (mqtt.connected()) return true;
  if (WiFi.status() != WL_CONNECTED) return false;
  if (pernahCoba && (uint32_t)(now - lastTry) < 5000) return false;
  pernahCoba = true;
  lastTry = now;

  char clientId[48];
  snprintf(clientId, sizeof(clientId), "esp32-%s-%04X", DEVICE_ID, (unsigned)(ESP.getEfuseMac() & 0xFFFF));

  const char *user = strlen(MQTT_USER) ? MQTT_USER : nullptr;
  const char *pass = strlen(MQTT_USER) ? MQTT_PASSWORD : nullptr;

  // Last Will: jika koneksi putus mendadak, broker mengumumkan "offline"
  if (!mqtt.connect(clientId, user, pass, tStatus, 1, true, "offline")) {
    Serial.printf("[MQTT] gagal terhubung, kode %d\n", mqtt.state());
    return false;
  }

  Serial.println("[MQTT] terhubung");
  mqtt.publish(tStatus, "online", true);
  mqtt.subscribe(tCmdMode, 1);
  mqtt.subscribe(tCmdAct, 1);
  mqtt.subscribe(tCmdThr, 1);
  mqtt.subscribe(tCmdWifi, 1);
  return true;
}

inline void mqttLoop() { mqtt.loop(); }

inline bool mqttPublishData(float suhu, float lembap) {
  if (!mqtt.connected()) return false;
  char buf[64];
  snprintf(buf, sizeof(buf), "{\"suhu\":%.1f,\"kelembapan\":%.1f}", suhu, lembap);
  return mqtt.publish(tData, buf);
}

inline bool mqttPublishState(ControlMode mode, bool autoSafe, bool kompresor, bool buzzer, bool fan, bool mist) {
  if (!mqtt.connected()) return false;

  const char *safeReason = "";
  if (mode == MODE_SAFE) {
    safeReason = autoSafe ? "sensor_gagal" : "dipilih_pengguna";
  }

  char buf[192];
  snprintf(
    buf,
    sizeof(buf),
    "{\"kompresor\":%d,\"buzzer\":%d,\"fan\":%d,\"mist\":%d,\"mode\":\"%s\",\"safe_reason\":\"%s\"}",
    kompresor ? 1 : 0,
    buzzer ? 1 : 0,
    fan ? 1 : 0,
    mist ? 1 : 0,
    modeName(mode),
    safeReason
  );

  return mqtt.publish(tState, buf);
}

// Status Wi-Fi untuk dashboard. `hasil`, `target`, `id` menyimpan hasil percobaan ganti Wi-Fi terakhir
// (kosong jika belum pernah), supaya dashboard tetap bisa membacanya walau sempat terlewat.
inline bool mqttPublishWifi(const char *ssid, int rssi, const char *ip, const char *hasil, const char *target, const char *id) {
  if (!mqtt.connected()) return false;
  JsonDocument doc;
  doc["connected"] = (WiFi.status() == WL_CONNECTED) ? 1 : 0;
  doc["ssid"] = ssid;
  doc["rssi"] = rssi;
  doc["ip"] = ip;
  doc["hasil"] = hasil;
  doc["target"] = target;
  doc["id"] = id;
  char buf[512];
  if (measureJson(doc) >= sizeof(buf)) return false;
  serializeJson(doc, buf, sizeof(buf));
  return mqtt.publish(tWifi, buf);
}

// Daftar jaringan hasil scan. Jumlah dikurangi otomatis jika JSON terlalu besar untuk buffer MQTT.
inline bool mqttPublishScan(const Jaringan *daftar, int n, const char *id) {
  if (!mqtt.connected()) return false;
  static char buf[960];
  while (true) {
    JsonDocument doc;
    doc["id"] = id;
    JsonArray arr = doc["networks"].to<JsonArray>();
    for (int i = 0; i < n; i++) {
      JsonObject o = arr.add<JsonObject>();
      o["s"] = daftar[i].ssid;
      o["r"] = daftar[i].rssi;
      o["x"] = daftar[i].aman ? 1 : 0;
    }
    if (measureJson(doc) < sizeof(buf)) {
      serializeJson(doc, buf, sizeof(buf));
      return mqtt.publish(tWifiScan, buf);
    }
    if (n == 0) return false;
    n--;
  }
}
