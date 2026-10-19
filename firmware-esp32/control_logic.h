// control_logic.h
// Logika kontrol: mode AUTO / MANUAL / SAFE, histeresis, jeda pengaman kompresor, dan alarm buzzer.
//
// File ini sengaja TIDAK memakai fungsi Arduino (tidak ada digitalWrite, millis, dll),
// supaya logikanya bisa diuji di komputer biasa. Waktu (milidetik) dikirim dari luar lewat
// parameter "now". Pengaturan relay yang sebenarnya ada di actuator.h.
//
// Urutan aktuator = urutan channel pada modul relay 4 channel:
//   channel 1 = kompresor, channel 2 = buzzer, channel 3 = fan, channel 4 = mist maker

#pragma once
#include <stdint.h>
#include <math.h>

enum ControlMode : uint8_t { MODE_AUTO = 0, MODE_MANUAL = 1, MODE_SAFE = 2 };
enum ActuatorId : uint8_t { ACT_KOMPRESOR = 0, ACT_BUZZER = 1, ACT_FAN = 2, ACT_MIST = 3, ACT_COUNT = 4 };

struct Thresholds {
  float tmin;  // suhu bawah (°C)
  float tmax;  // suhu atas (°C)
  float hmin;  // kelembapan bawah (%)
  float hmax;  // kelembapan atas (%)
};

struct ControlSettings {
  float histSuhu;                  // histeresis suhu (°C): kompresor mati saat suhu <= tmax - histSuhu
  float histLembap;                // histeresis kelembapan (%): mist mati saat kelembapan >= hmin + histLembap
  uint32_t kompresorMinOffMs;      // jeda minimum sebelum kompresor boleh menyala lagi (juga setelah ESP32 baru menyala)
  uint8_t sensorGagalBatas;        // jumlah gagal baca berturut-turut sebelum masuk SAFE otomatis
  uint32_t buzzerTundaMs;          // kondisi di luar threshold harus bertahan selama ini sebelum buzzer bunyi
  uint32_t buzzerMaksMs;           // buzzer otomatis diam setelah selama ini (bunyi lagi jika kondisi sempat normal dulu)
};

inline const char* modeName(ControlMode m) {
  switch (m) {
    case MODE_AUTO: return "AUTO";
    case MODE_MANUAL: return "MANUAL";
    default: return "SAFE";
  }
}

class ControlLogic {
 public:
  explicit ControlLogic(const ControlSettings& s) : cfg_(s) {}

  // Dipanggil sekali saat start. Kompresor dianggap "baru mati" sehingga harus menunggu
  // kompresorMinOffMs sebelum boleh menyala (melindungi kompresor dari nyala-mati cepat).
  void begin(uint32_t now, const Thresholds& th) {
    th_ = th;
    lastKompresorOff_ = now;
    for (int i = 0; i < ACT_COUNT; i++) out_[i] = want_[i] = false;
    userMode_ = MODE_AUTO;
    autoSafe_ = false;
    gagalBeruntun_ = 0;
    fanLembap_ = false;
    abnormal_ = false;
    alarmReset();
  }

  void setThresholds(const Thresholds& th) { th_ = th; }
  const Thresholds& thresholds() const { return th_; }

  // Mode yang berlaku. SAFE otomatis (sensor gagal) mengalahkan pilihan pengguna.
  ControlMode mode() const { return autoSafe_ ? MODE_SAFE : userMode_; }
  bool autoSafe() const { return autoSafe_; }

  void setMode(ControlMode m) {
    if (m == MODE_MANUAL && mode() != MODE_MANUAL) {
      // Masuk MANUAL: pertahankan keadaan aktuator saat ini, jangan berubah tiba-tiba.
      for (int i = 0; i < ACT_COUNT; i++) want_[i] = out_[i];
    }
    userMode_ = m;
  }

  // Hanya berpengaruh pada mode MANUAL.
  void setManual(ActuatorId id, bool on) {
    if (id < ACT_COUNT) want_[id] = on;
  }

  bool out(ActuatorId id) const { return out_[id]; }

  // True jika kompresor ingin menyala tetapi masih menunggu jeda pengaman.
  bool kompresorMenunggu() const { return kompresorDitahan_; }

  // True jika suhu/kelembapan sedang di luar threshold (atau sensor gagal), walau buzzer belum/sudah diam.
  bool kondisiAbnormal() const { return abnormal_; }

  // Dipanggil setiap putaran kontrol (misalnya tiap 2 detik).
  void update(uint32_t now, bool sensorOk, float t, float h) {
    // 1) Pantau kesehatan sensor
    if (sensorOk && !isnan(t) && !isnan(h)) {
      gagalBeruntun_ = 0;
      autoSafe_ = false;  // sensor pulih: kembali ke mode pilihan pengguna
    } else {
      sensorOk = false;
      if (gagalBeruntun_ < 255) gagalBeruntun_++;
      if (gagalBeruntun_ >= cfg_.sensorGagalBatas) autoSafe_ = true;
    }

    // 2) Tentukan keadaan aktuator yang diinginkan
    bool want[ACT_COUNT] = {false, false, false, false};

    switch (mode()) {
      case MODE_SAFE:
        if (autoSafe_) {
          // SAFE karena sensor rusak: semua mati, tetapi buzzer berbunyi supaya terdengar ada masalah
          abnormal_ = true;
          want[ACT_BUZZER] = alarmBuzzer(now, true, true);
        } else {
          // SAFE pilihan pengguna: semua mati, termasuk buzzer
          abnormal_ = false;
          alarmReset();
        }
        break;
      case MODE_MANUAL:
        for (int i = 0; i < ACT_COUNT; i++) want[i] = want_[i];
        abnormal_ = sensorOk && diLuarThreshold(t, h);
        alarmReset();
        break;
      case MODE_AUTO:
        if (sensorOk) {
          autoDesired(t, h, want);
          abnormal_ = diLuarThreshold(t, h);
          want[ACT_BUZZER] = alarmBuzzer(now, abnormal_, false);
        } else {
          // Gagal baca sesaat (belum sampai batas): tahan keadaan terakhir
          for (int i = 0; i < ACT_COUNT; i++) want[i] = out_[i];
        }
        break;
    }

    // 3) Terapkan, dengan pengaman kompresor
    kompresorDitahan_ = false;
    if (want[ACT_KOMPRESOR] && !out_[ACT_KOMPRESOR]) {
      if ((uint32_t)(now - lastKompresorOff_) >= cfg_.kompresorMinOffMs) {
        out_[ACT_KOMPRESOR] = true;
      } else {
        kompresorDitahan_ = true;  // masih menunggu
      }
    } else if (!want[ACT_KOMPRESOR] && out_[ACT_KOMPRESOR]) {
      out_[ACT_KOMPRESOR] = false;
      lastKompresorOff_ = now;
    }
    out_[ACT_BUZZER] = want[ACT_BUZZER];
    out_[ACT_FAN] = want[ACT_FAN];
    out_[ACT_MIST] = want[ACT_MIST];
  }

 private:
  bool diLuarThreshold(float t, float h) const {
    return t > th_.tmax || t < th_.tmin || h > th_.hmax || h < th_.hmin;
  }

  void autoDesired(float t, float h, bool want[ACT_COUNT]) {
    // Kompresor (pendingin): nyala jika suhu > tmax, mati jika suhu <= tmax - histeresis
    want[ACT_KOMPRESOR] = out_[ACT_KOMPRESOR] ? (t > th_.tmax - cfg_.histSuhu) : (t > th_.tmax);

    // Mist maker (penambah kelembapan): nyala jika kelembapan < hmin, mati jika >= hmin + histeresis
    want[ACT_MIST] = out_[ACT_MIST] ? (h < th_.hmin + cfg_.histLembap) : (h < th_.hmin);

    // Fan: menyala bersama kompresor atau mist (sirkulasi udara), atau saat kelembapan terlalu tinggi
    fanLembap_ = fanLembap_ ? (h > th_.hmax - cfg_.histLembap) : (h > th_.hmax);
    want[ACT_FAN] = want[ACT_KOMPRESOR] || want[ACT_MIST] || fanLembap_;
  }

  void alarmReset() {
    alarmBerjalan_ = false;
    buzzerBunyi_ = false;
    buzzerDiam_ = false;
  }

  // Mengembalikan true jika buzzer harus berbunyi.
  // kondisi = ada masalah saat ini; segera = bunyi tanpa menunggu buzzerTundaMs (sensor rusak).
  bool alarmBuzzer(uint32_t now, bool kondisi, bool segera) {
    if (!kondisi) {
      alarmReset();
      return false;
    }
    if (!alarmBerjalan_) {
      alarmBerjalan_ = true;
      alarmSejak_ = now;
    }
    if (buzzerDiam_) return false;  // sudah diam otomatis; menunggu kondisi normal dulu

    if (!buzzerBunyi_) {
      if (segera || (uint32_t)(now - alarmSejak_) >= cfg_.buzzerTundaMs) {
        buzzerBunyi_ = true;
        buzzerMulai_ = now;
      } else {
        return false;
      }
    }
    if ((uint32_t)(now - buzzerMulai_) >= cfg_.buzzerMaksMs) {
      buzzerBunyi_ = false;
      buzzerDiam_ = true;
      return false;
    }
    return true;
  }

  ControlSettings cfg_;
  Thresholds th_{18, 24, 70, 85};
  ControlMode userMode_ = MODE_AUTO;
  bool autoSafe_ = false;
  uint8_t gagalBeruntun_ = 0;
  bool out_[ACT_COUNT] = {false, false, false, false};
  bool want_[ACT_COUNT] = {false, false, false, false};
  uint32_t lastKompresorOff_ = 0;
  bool kompresorDitahan_ = false;
  bool fanLembap_ = false;

  bool abnormal_ = false;
  bool alarmBerjalan_ = false;
  uint32_t alarmSejak_ = 0;
  bool buzzerBunyi_ = false;
  uint32_t buzzerMulai_ = 0;
  bool buzzerDiam_ = false;
};
