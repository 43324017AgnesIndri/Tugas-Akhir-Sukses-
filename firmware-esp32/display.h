// display.h
// LCD 16x2 I2C. Aktifkan dengan USE_LCD 1 di config.h.
// Library (Library Manager): "LiquidCrystal I2C" (Frank de Brabander).
//
// Tampilan (16 kolom x 2 baris):
//   21.3°C 73.4%   [ikon Wi-Fi]     baris 1: suhu, kelembapan, ikon Wi-Fi di kolom paling kanan
//   12:34:56 AUTO   !               baris 2: jam, mode, tanda "!" jika suhu/kelembapan di luar threshold
//
// Ikon Wi-Fi: busur sinyal jika terhubung, busur bergaris miring jika terputus.
//
// PENTING (tegangan): backpack LCD biasanya diberi 5 V, dan pull-up SDA/SCL-nya ikut tersambung ke 5 V.
// Jalur SDA/SCL harus lewat level shifter I2C 3,3 V <-> 5 V agar GPIO ESP32 tidak menerima 5 V.

#pragma once
#include <LiquidCrystal_I2C.h>
#include <time.h>
#include "config.h"
#include "control_logic.h"

static LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);

// Karakter kustom 5x8 piksel
static uint8_t IKON_WIFI_ON[8] = {
  0b00000,
  0b01110,
  0b10001,
  0b00100,
  0b01010,
  0b00000,
  0b00100,
  0b00000,
};
static uint8_t IKON_WIFI_OFF[8] = {   // busur yang sama + garis miring dari kiri-bawah ke kanan-atas
  0b00001,
  0b01110,
  0b10011,
  0b00100,
  0b01110,
  0b01000,
  0b01100,
  0b10000,
};
#define LCD_KODE_WIFI_ON  0
#define LCD_KODE_WIFI_OFF 1

inline void displayBegin() {
  lcd.init();
  lcd.backlight();
  lcd.createChar(LCD_KODE_WIFI_ON, IKON_WIFI_ON);
  lcd.createChar(LCD_KODE_WIFI_OFF, IKON_WIFI_OFF);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Andaliman");
  lcd.setCursor(0, 1);
  lcd.print("Storage");
}

// waktuOk = false menampilkan "--:--:--" (jam belum tersinkron). abnormal = tampilkan tanda "!".
inline void displayUpdate(bool sensorOk, float suhu, float lembap, ControlMode mode,
                          bool wifiOk, bool waktuOk, const struct tm &waktu, bool abnormal) {
  char baris0[17], baris1[17], jam[9];

  if (sensorOk) {
    // \xDF = simbol derajat pada ROM LCD HD44780
    snprintf(baris0, sizeof(baris0), "%4.1f\xDF" "C %4.1f%%", suhu, lembap);
  } else {
    snprintf(baris0, sizeof(baris0), "SENSOR ERROR");
  }

  if (waktuOk) snprintf(jam, sizeof(jam), "%02d:%02d:%02d", waktu.tm_hour, waktu.tm_min, waktu.tm_sec);
  else snprintf(jam, sizeof(jam), "--:--:--");
  snprintf(baris1, sizeof(baris1), "%s %-6s", jam, modeName(mode));

  // Baris dicetak dengan lebar tetap 15 kolom; kolom ke-16 untuk ikon / tanda
  char rata0[16], rata1[16];
  snprintf(rata0, sizeof(rata0), "%-15s", baris0);
  snprintf(rata1, sizeof(rata1), "%-15s", baris1);

  lcd.setCursor(0, 0);
  lcd.print(rata0);
  lcd.setCursor(15, 0);
  lcd.write((uint8_t)(wifiOk ? LCD_KODE_WIFI_ON : LCD_KODE_WIFI_OFF));

  lcd.setCursor(0, 1);
  lcd.print(rata1);
  lcd.setCursor(15, 1);
  lcd.print(abnormal ? "!" : " ");
}
