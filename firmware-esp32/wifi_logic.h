// wifi_logic.h
// Logika ganti Wi-Fi dari dashboard. Murni C++ (tanpa Arduino) supaya bisa diuji di komputer biasa.
//
// Aturan keselamatan: Wi-Fi baru HANYA disimpan jika ESP32 benar-benar terhubung ke Wi-Fi itu
// DAN masih bisa menjangkau broker MQTT lewat jaringan itu. Jika tidak, ESP32 kembali ke Wi-Fi lama,
// jadi salah password atau jaringan tanpa akses ke broker tidak membuat perangkat hilang dari dashboard.

#pragma once
#include <stdint.h>
#include <string.h>

// ---------- Ganti Wi-Fi ----------
enum WifiTahap : uint8_t {
  WF_DIAM = 0,      // tidak sedang ganti Wi-Fi
  WF_COBA,          // menunggu terhubung ke Wi-Fi baru
  WF_VERIFIKASI     // sudah terhubung ke Wi-Fi baru, menunggu broker MQTT terjangkau
};

enum WifiAksi : uint8_t {
  WFA_TIDAK_ADA = 0,
  WFA_SIMPAN_BARU,    // berhasil: jadikan Wi-Fi baru sebagai Wi-Fi aktif dan simpan
  WFA_KEMBALI_LAMA    // gagal: sambungkan lagi ke Wi-Fi lama
};

enum WifiHasil : uint8_t {
  WFH_BELUM = 0,
  WFH_OK,
  WFH_GAGAL_WIFI,     // tidak bisa terhubung (password salah, sinyal lemah, jaringan tidak ada)
  WFH_GAGAL_BROKER    // terhubung ke Wi-Fi, tetapi broker MQTT tidak terjangkau dari jaringan itu
};

inline const char *wifiHasilNama(WifiHasil h) {
  switch (h) {
    case WFH_OK: return "ok";
    case WFH_GAGAL_WIFI: return "gagal_wifi";
    case WFH_GAGAL_BROKER: return "gagal_broker";
    default: return "";
  }
}

struct WifiSwitchSettings {
  uint32_t cobaMs;         // batas waktu terhubung ke Wi-Fi baru
  uint32_t verifikasiMs;   // batas waktu menunggu broker setelah Wi-Fi baru terhubung
};

class WifiSwitcher {
 public:
  explicit WifiSwitcher(WifiSwitchSettings s) : s_(s) {}

  // Mulai percobaan. Mengembalikan false jika masih ada percobaan lain yang berjalan.
  bool mulai(uint32_t now) {
    if (tahap_ != WF_DIAM) return false;
    tahap_ = WF_COBA;
    t0_ = now;
    hasil_ = WFH_BELUM;
    return true;
  }

  bool sibuk() const { return tahap_ != WF_DIAM; }
  WifiTahap tahap() const { return tahap_; }
  WifiHasil hasil() const { return hasil_; }

  // wifiOk  : ESP32 terhubung ke Wi-Fi BARU (SSID-nya dicocokkan oleh pemanggil, bukan sekadar "terhubung")
  // mqttOk  : sudah terhubung ke broker lewat Wi-Fi baru itu
  WifiAksi update(uint32_t now, bool wifiOk, bool mqttOk) {
    if (tahap_ == WF_COBA) {
      if (wifiOk) {
        tahap_ = WF_VERIFIKASI;
        t0_ = now;
      } else if ((uint32_t)(now - t0_) >= s_.cobaMs) {
        return gagal(WFH_GAGAL_WIFI);
      }
    } else if (tahap_ == WF_VERIFIKASI) {
      if (!wifiOk) return gagal(WFH_GAGAL_WIFI);
      if (mqttOk) {
        tahap_ = WF_DIAM;
        hasil_ = WFH_OK;
        return WFA_SIMPAN_BARU;
      }
      if ((uint32_t)(now - t0_) >= s_.verifikasiMs) return gagal(WFH_GAGAL_BROKER);
    }
    return WFA_TIDAK_ADA;
  }

 private:
  WifiAksi gagal(WifiHasil h) {
    tahap_ = WF_DIAM;
    hasil_ = h;
    return WFA_KEMBALI_LAMA;
  }

  WifiSwitchSettings s_;
  WifiTahap tahap_ = WF_DIAM;
  WifiHasil hasil_ = WFH_BELUM;
  uint32_t t0_ = 0;
};

// ---------- Validasi isian dari dashboard ----------
// SSID: 1-32 byte. Password WPA2: 8-63 karakter, atau kosong untuk jaringan terbuka.
inline bool wifiSsidValid(const char *ssid) {
  if (!ssid) return false;
  size_t n = strlen(ssid);
  return n >= 1 && n <= 32;
}

inline bool wifiPassValid(const char *pass) {
  if (!pass) return false;
  size_t n = strlen(pass);
  return n == 0 || (n >= 8 && n <= 63);
}

// ---------- Daftar hasil scan untuk dashboard ----------
struct Jaringan {
  char ssid[33];
  int rssi;
  bool aman;   // true jika memakai password
};

// true jika SSID berupa UTF-8 yang valid tanpa karakter kontrol. SSID lain dilewati karena akan merusak JSON
// dan tidak bisa diketik dari dashboard.
inline bool wifiSsidAmanJson(const char *s) {
  const unsigned char *p = (const unsigned char *)s;
  while (*p) {
    if (*p < 0x20 || *p == 0x7F) return false;
    if (*p < 0x80) { p++; continue; }
    int extra;
    if ((*p & 0xE0) == 0xC0 && *p >= 0xC2) extra = 1;
    else if ((*p & 0xF0) == 0xE0) extra = 2;
    else if ((*p & 0xF8) == 0xF0 && *p <= 0xF4) extra = 3;
    else return false;
    p++;
    for (int i = 0; i < extra; i++, p++) if ((*p & 0xC0) != 0x80) return false;
  }
  return true;
}

// Menyaring hasil scan: buang SSID kosong (jaringan tersembunyi), gabungkan SSID kembar
// (satu Wi-Fi sering punya beberapa access point; ambil sinyal terkuat), urutkan dari sinyal terkuat,
// lalu ambil maksimal `maks` jaringan. Mengembalikan jumlah jaringan di `keluar`.
inline int wifiPilihJaringan(const Jaringan *masuk, int n, Jaringan *keluar, int maks) {
  int jml = 0;
  for (int i = 0; i < n; i++) {
    if (masuk[i].ssid[0] == '\0' || !wifiSsidAmanJson(masuk[i].ssid)) continue;
    int sama = -1;
    for (int j = 0; j < jml; j++) {
      if (strcmp(keluar[j].ssid, masuk[i].ssid) == 0) { sama = j; break; }
    }
    if (sama >= 0) {
      if (masuk[i].rssi > keluar[sama].rssi) keluar[sama] = masuk[i];
      continue;
    }
    if (jml < n) keluar[jml++] = masuk[i];  // keluar harus punya tempat minimal n
  }
  // urut menurun berdasarkan rssi (jumlah kecil, cukup insertion sort)
  for (int i = 1; i < jml; i++) {
    Jaringan x = keluar[i];
    int j = i - 1;
    while (j >= 0 && keluar[j].rssi < x.rssi) { keluar[j + 1] = keluar[j]; j--; }
    keluar[j + 1] = x;
  }
  return jml < maks ? jml : maks;
}
