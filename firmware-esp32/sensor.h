// sensor.h
// Membaca suhu dan kelembapan dari SHT40 (I2C, alamat 0x44).
// Library (Library Manager): "Adafruit SHT4x Library" (otomatis meminta Adafruit BusIO dan Adafruit Unified Sensor).

#pragma once
#include <Wire.h>
#include <Adafruit_SHT4x.h>
#include <math.h>
#include "config.h"

static Adafruit_SHT4x sht4;

// Mengembalikan true jika sensor ditemukan.
inline bool sensorBegin() {
  Wire.begin(PIN_SDA, PIN_SCL);
  if (!sht4.begin(&Wire)) return false;
  sht4.setPrecision(SHT4X_HIGH_PRECISION);
  sht4.setHeater(SHT4X_NO_HEATER);
  return true;
}

// Membaca sensor. Mengembalikan false jika gagal atau nilainya tidak masuk akal.
inline bool sensorRead(float &suhu, float &lembap) {
  sensors_event_t hum, temp;
  if (!sht4.getEvent(&hum, &temp)) return false;

  float t = temp.temperature;
  float h = hum.relative_humidity;
  if (isnan(t) || isnan(h)) return false;
  if (t < -40.0f || t > 125.0f) return false;

  // SHT40 kadang melaporkan sedikit di atas 100 % atau di bawah 0 %
  if (h < 0.0f) h = 0.0f;
  if (h > 100.0f) h = 100.0f;

  suhu = t;
  lembap = h;
  return true;
}
