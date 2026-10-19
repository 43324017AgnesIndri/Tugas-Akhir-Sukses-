// waktu.h
// Jam real-time dari NTP (internet), zona waktu WIB. ESP32 tidak punya baterai jam,
// jadi jam baru tersedia setelah Wi-Fi terhubung dan sinkronisasi pertama berhasil.

#pragma once
#include <Arduino.h>
#include <time.h>
#include "config.h"

// Memulai sinkronisasi NTP. Aman dipanggil berulang.
inline void waktuBegin() {
  configTime(TZ_OFFSET_SEC, 0, NTP_SERVER1, NTP_SERVER2);
}

// Mengisi "hasil" dengan waktu lokal. Mengembalikan false jika jam belum tersinkron.
// Tidak memblokir.
inline bool waktuSekarang(struct tm &hasil) {
  time_t now = time(nullptr);
  if (now < 1609459200) return false;  // sebelum 1 Jan 2021 = jam belum diset
  localtime_r(&now, &hasil);
  return true;
}
