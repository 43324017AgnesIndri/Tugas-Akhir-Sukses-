// Uji logika control_logic.h di komputer biasa (tanpa ESP32).
// Dari folder firmware-esp32:  g++ -std=c++17 -I. test/test_control.cpp -o test_control && ./test_control
#include <cstdio>
#include <cmath>
#include "control_logic.h"

static int gagal = 0, lulus = 0;
#define CEK(kondisi, pesan)                                          \
  do {                                                               \
    if (kondisi) { lulus++; }                                        \
    else { gagal++; std::printf("GAGAL: %s (baris %d)\n", pesan, __LINE__); } \
  } while (0)

static const ControlSettings CFG = {1.0f, 3.0f, 30000, 5, 60000, 120000};
static const Thresholds TH = {18, 24, 70, 85};

static ControlLogic baru(uint32_t t0) {
  ControlLogic c(CFG);
  c.begin(t0, TH);
  return c;
}

int main() {
  // 1) Kompresor menunggu jeda setelah ESP32 baru menyala
  {
    ControlLogic c = baru(0);
    c.update(1000, true, 26.0f, 78.0f);
    CEK(!c.out(ACT_KOMPRESOR), "kompresor belum boleh nyala 1 detik setelah boot");
    CEK(c.kompresorMenunggu(), "kompresor ditandai menunggu");
    c.update(29000, true, 26.0f, 78.0f);
    CEK(!c.out(ACT_KOMPRESOR), "kompresor masih menunggu di detik 29");
    c.update(30000, true, 26.0f, 78.0f);
    CEK(c.out(ACT_KOMPRESOR), "kompresor nyala setelah 30 detik");
    CEK(c.out(ACT_FAN), "fan ikut nyala bersama kompresor");
  }

  // 2) Histeresis suhu + jeda sebelum nyala lagi
  {
    ControlLogic c = baru(0);
    c.update(40000, true, 25.0f, 78.0f);
    CEK(c.out(ACT_KOMPRESOR), "kompresor nyala saat suhu 25 > 24");
    c.update(41000, true, 23.5f, 78.0f);
    CEK(c.out(ACT_KOMPRESOR), "kompresor tetap nyala di 23,5 (histeresis)");
    c.update(42000, true, 23.0f, 78.0f);
    CEK(!c.out(ACT_KOMPRESOR), "kompresor mati di 23,0 (<= tmax - 1)");
    c.update(43000, true, 25.0f, 78.0f);
    CEK(!c.out(ACT_KOMPRESOR), "kompresor tidak langsung nyala lagi");
    c.update(71999, true, 25.0f, 78.0f);
    CEK(!c.out(ACT_KOMPRESOR), "masih menunggu 29,9 detik setelah mati");
    c.update(72000, true, 25.0f, 78.0f);
    CEK(c.out(ACT_KOMPRESOR), "nyala lagi tepat 30 detik setelah mati");
  }

  // 3) Mist maker + histeresis kelembapan, fan ikut
  {
    ControlLogic c = baru(0);
    c.update(1000, true, 21.0f, 69.0f);
    CEK(c.out(ACT_MIST), "mist nyala saat kelembapan 69 < 70");
    CEK(c.out(ACT_FAN), "fan ikut nyala bersama mist");
    c.update(2000, true, 21.0f, 71.0f);
    CEK(c.out(ACT_MIST), "mist tetap nyala di 71 (histeresis 3: mati di >= 73)");
    c.update(3000, true, 21.0f, 73.0f);
    CEK(!c.out(ACT_MIST), "mist mati di 73");
    CEK(!c.out(ACT_FAN), "fan mati karena tidak ada alasan lagi");
  }

  // 4) Kelembapan terlalu tinggi: fan nyala (dengan histeresis), mist tidak
  {
    ControlLogic c = baru(0);
    c.update(1000, true, 21.0f, 86.0f);
    CEK(c.out(ACT_FAN) && !c.out(ACT_MIST), "fan nyala saat kelembapan 86 > 85");
    c.update(2000, true, 21.0f, 83.0f);
    CEK(c.out(ACT_FAN), "fan tetap nyala di 83 (histeresis)");
    c.update(3000, true, 21.0f, 82.0f);
    CEK(!c.out(ACT_FAN), "fan mati di 82");
  }

  // 5) Kondisi normal: semua mati
  {
    ControlLogic c = baru(0);
    c.update(50000, true, 21.0f, 78.0f);
    CEK(!c.out(ACT_KOMPRESOR) && !c.out(ACT_FAN) && !c.out(ACT_MIST), "semua mati saat normal");
  }

  // 6) Sensor gagal: tahan keadaan, lalu SAFE otomatis, lalu pulih
  {
    ControlLogic c = baru(0);
    c.update(40000, true, 25.0f, 78.0f);
    CEK(c.out(ACT_KOMPRESOR), "persiapan: kompresor nyala");
    for (int i = 1; i <= 4; i++) c.update(40000 + i * 1000, false, NAN, NAN);
    CEK(c.mode() == MODE_AUTO && c.out(ACT_KOMPRESOR), "4 kali gagal: masih AUTO dan keadaan ditahan");
    c.update(45000, false, NAN, NAN);
    CEK(c.mode() == MODE_SAFE && c.autoSafe(), "5 kali gagal: masuk SAFE otomatis");
    CEK(!c.out(ACT_KOMPRESOR) && !c.out(ACT_FAN) && !c.out(ACT_MIST), "SAFE mematikan semua");
    c.update(46000, true, 21.0f, 78.0f);
    CEK(c.mode() == MODE_AUTO && !c.autoSafe(), "sensor pulih: kembali AUTO");
  }

  // 7) SAFE pilihan pengguna mematikan semua walau kondisi buruk
  {
    ControlLogic c = baru(0);
    c.update(40000, true, 25.0f, 60.0f);
    CEK(c.out(ACT_KOMPRESOR) && c.out(ACT_MIST), "persiapan: kompresor dan mist nyala");
    c.setMode(MODE_SAFE);
    c.update(41000, true, 25.0f, 60.0f);
    CEK(!c.out(ACT_KOMPRESOR) && !c.out(ACT_FAN) && !c.out(ACT_MIST), "SAFE: semua mati");
    c.update(100000, true, 25.0f, 60.0f);
    CEK(!c.out(ACT_KOMPRESOR), "SAFE: tetap mati walau suhu tinggi");
  }

  // 8) MANUAL: keadaan dipertahankan saat masuk, lalu menurut perintah
  {
    ControlLogic c = baru(0);
    c.update(40000, true, 25.0f, 78.0f);
    c.setMode(MODE_MANUAL);
    c.update(41000, true, 21.0f, 78.0f);
    CEK(c.out(ACT_KOMPRESOR) && c.out(ACT_FAN), "MANUAL: keadaan sebelumnya dipertahankan");
    c.setManual(ACT_KOMPRESOR, false);
    c.update(42000, true, 21.0f, 78.0f);
    CEK(!c.out(ACT_KOMPRESOR) && c.out(ACT_FAN), "MANUAL: kompresor dimatikan, fan tetap");
    c.setManual(ACT_KOMPRESOR, true);
    c.update(43000, true, 21.0f, 78.0f);
    CEK(!c.out(ACT_KOMPRESOR), "MANUAL: kompresor tetap menunggu jeda pengaman");
    c.update(72000, true, 21.0f, 78.0f);
    CEK(c.out(ACT_KOMPRESOR), "MANUAL: kompresor nyala setelah jeda");
    c.setManual(ACT_MIST, true);
    c.update(73000, true, 21.0f, 95.0f);
    CEK(c.out(ACT_MIST), "MANUAL: mist nyala walau kelembapan tinggi (tanpa histeresis)");
  }

  // 9) MANUAL dari SAFE dimulai dengan semua mati
  {
    ControlLogic c = baru(0);
    c.update(40000, true, 25.0f, 78.0f);
    c.setMode(MODE_SAFE);
    c.update(41000, true, 25.0f, 78.0f);
    c.setMode(MODE_MANUAL);
    c.update(42000, true, 25.0f, 78.0f);
    CEK(!c.out(ACT_KOMPRESOR) && !c.out(ACT_FAN) && !c.out(ACT_MIST), "SAFE -> MANUAL: mulai dari semua mati");
  }

  // 10) millis() melewati batas 32-bit
  {
    uint32_t t0 = 0xFFFFFF00u;  // 256 ms sebelum luapan
    ControlLogic c = baru(t0);
    c.update(t0 + 1000, true, 26.0f, 78.0f);
    CEK(!c.out(ACT_KOMPRESOR), "luapan: belum 30 detik");
    c.update(t0 + 30000u, true, 26.0f, 78.0f);  // melewati 2^32
    CEK(c.out(ACT_KOMPRESOR), "luapan: nyala setelah 30 detik walau millis() berputar");
  }

  // 11) Perubahan threshold langsung berlaku
  {
    ControlLogic c = baru(0);
    c.update(50000, true, 25.0f, 78.0f);
    CEK(c.out(ACT_KOMPRESOR), "persiapan: nyala di 25 dengan tmax 24");
    c.setThresholds({18, 30, 70, 85});
    c.update(51000, true, 25.0f, 78.0f);
    CEK(!c.out(ACT_KOMPRESOR), "tmax dinaikkan ke 30: kompresor mati");
  }


  // 12) Buzzer: bunyi hanya jika kondisi abnormal bertahan, lalu diam otomatis
  {
    ControlLogic c = baru(0);
    c.update(40000, true, 25.0f, 78.0f);   // suhu di atas tmax mulai di detik 40
    CEK(c.kondisiAbnormal(), "kondisi abnormal terdeteksi");
    CEK(!c.out(ACT_BUZZER), "buzzer belum bunyi saat kondisi baru muncul");
    c.update(99000, true, 25.0f, 78.0f);
    CEK(!c.out(ACT_BUZZER), "buzzer belum bunyi di detik 59 (tunda 60 detik)");
    c.update(100000, true, 25.0f, 78.0f);
    CEK(c.out(ACT_BUZZER), "buzzer bunyi setelah abnormal 60 detik");
    c.update(219000, true, 25.0f, 78.0f);
    CEK(c.out(ACT_BUZZER), "buzzer masih bunyi di detik 119 sejak mulai");
    c.update(220000, true, 25.0f, 78.0f);
    CEK(!c.out(ACT_BUZZER), "buzzer diam otomatis setelah 120 detik");
    c.update(400000, true, 25.0f, 78.0f);
    CEK(!c.out(ACT_BUZZER) && c.kondisiAbnormal(), "tetap diam selama kondisi belum normal");
    c.update(401000, true, 21.0f, 78.0f);
    CEK(!c.kondisiAbnormal(), "kondisi normal: tanda abnormal hilang");
    c.update(402000, true, 25.0f, 78.0f);
    c.update(461999, true, 25.0f, 78.0f);
    CEK(!c.out(ACT_BUZZER), "abnormal lagi: menunggu tunda 60 detik dari awal");
    c.update(462000, true, 25.0f, 78.0f);
    CEK(c.out(ACT_BUZZER), "abnormal lagi: bunyi lagi setelah 60 detik");
  }

  // 13) Buzzer mati lebih awal jika kondisi kembali normal; semua jenis pelanggaran dihitung
  {
    ControlLogic c = baru(0);
    c.update(40000, true, 21.0f, 60.0f);   // kelembapan di bawah hmin
    c.update(100000, true, 21.0f, 60.0f);
    CEK(c.out(ACT_BUZZER), "buzzer bunyi untuk kelembapan rendah");
    c.update(101000, true, 21.0f, 78.0f);
    CEK(!c.out(ACT_BUZZER), "buzzer mati saat kelembapan kembali normal");

    ControlLogic d = baru(0);
    d.update(40000, true, 15.0f, 78.0f);   // suhu di bawah tmin (tidak ada pemanas)
    d.update(100000, true, 15.0f, 78.0f);
    CEK(d.out(ACT_BUZZER), "buzzer bunyi untuk suhu di bawah tmin");

    ControlLogic e = baru(0);
    e.update(40000, true, 21.0f, 90.0f);   // kelembapan di atas hmax
    e.update(100000, true, 21.0f, 90.0f);
    CEK(e.out(ACT_BUZZER) && e.out(ACT_FAN), "buzzer dan fan untuk kelembapan di atas hmax");
  }

  // 14) Sensor rusak: SAFE otomatis, buzzer langsung bunyi, lalu diam saat sensor pulih
  {
    ControlLogic c = baru(0);
    c.update(40000, true, 21.0f, 78.0f);
    for (int i = 1; i <= 4; i++) c.update(40000 + i * 1000, false, NAN, NAN);
    CEK(!c.out(ACT_BUZZER), "4 kali gagal: buzzer belum bunyi");
    c.update(45000, false, NAN, NAN);
    CEK(c.mode() == MODE_SAFE && c.out(ACT_BUZZER), "SAFE otomatis: buzzer langsung bunyi");
    CEK(!c.out(ACT_KOMPRESOR) && !c.out(ACT_FAN) && !c.out(ACT_MIST), "SAFE otomatis: aktuator lain mati");
    c.update(46000, true, 21.0f, 78.0f);
    CEK(c.mode() == MODE_AUTO && !c.out(ACT_BUZZER), "sensor pulih: buzzer mati");
  }

  // 15) SAFE pilihan pengguna membungkam buzzer; MANUAL mengendalikan buzzer langsung
  {
    ControlLogic c = baru(0);
    c.update(40000, true, 25.0f, 78.0f);
    c.update(100000, true, 25.0f, 78.0f);
    CEK(c.out(ACT_BUZZER), "persiapan: buzzer bunyi");
    c.setMode(MODE_SAFE);
    c.update(101000, true, 25.0f, 78.0f);
    CEK(!c.out(ACT_BUZZER), "SAFE pilihan pengguna: buzzer mati");

    ControlLogic m = baru(0);
    m.update(40000, true, 21.0f, 78.0f);
    m.setMode(MODE_MANUAL);
    m.setManual(ACT_BUZZER, true);
    m.update(41000, true, 21.0f, 78.0f);
    CEK(m.out(ACT_BUZZER), "MANUAL: buzzer menyala sesuai perintah");
    m.setManual(ACT_BUZZER, false);
    m.update(42000, true, 21.0f, 78.0f);
    CEK(!m.out(ACT_BUZZER), "MANUAL: buzzer mati sesuai perintah");
    m.update(43000, true, 30.0f, 78.0f);
    m.update(200000, true, 30.0f, 78.0f);
    CEK(!m.out(ACT_BUZZER), "MANUAL: tidak ada alarm otomatis");
  }

  // 16) Urutan channel relay
  CEK(ACT_KOMPRESOR == 0 && ACT_BUZZER == 1 && ACT_FAN == 2 && ACT_MIST == 3,
      "urutan aktuator = channel 1 kompresor, 2 buzzer, 3 fan, 4 mist");

  std::printf("\nLulus: %d, Gagal: %d\n", lulus, gagal);
  return gagal == 0 ? 0 : 1;
}
