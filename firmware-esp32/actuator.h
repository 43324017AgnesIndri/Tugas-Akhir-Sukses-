// actuator.h
// Mengatur relay (modul 4 channel):
//   channel 1 = kompresor, channel 2 = buzzer, channel 3 = fan, channel 4 = mist maker

#pragma once
#include <Arduino.h>
#include "config.h"
#include "control_logic.h"

#if RELAY_ACTIVE_LOW
  #define RELAY_ON_LEVEL  LOW
  #define RELAY_OFF_LEVEL HIGH
#else
  #define RELAY_ON_LEVEL  HIGH
  #define RELAY_OFF_LEVEL LOW
#endif

// Urutan harus sama dengan enum ActuatorId di control_logic.h
static const uint8_t RELAY_PIN[ACT_COUNT] = {PIN_RELAY_KOMPRESOR, PIN_RELAY_BUZZER, PIN_RELAY_FAN, PIN_RELAY_MIST};

// Dipanggil paling awal di setup(). Level OFF ditulis SEBELUM pin dijadikan output
// supaya relay tidak sempat berdenting saat ESP32 menyala.
inline void actuatorBegin() {
  for (int i = 0; i < ACT_COUNT; i++) {
    digitalWrite(RELAY_PIN[i], RELAY_OFF_LEVEL);
    pinMode(RELAY_PIN[i], OUTPUT);
    digitalWrite(RELAY_PIN[i], RELAY_OFF_LEVEL);
  }
}

inline void actuatorWrite(ActuatorId id, bool on) {
  digitalWrite(RELAY_PIN[id], on ? RELAY_ON_LEVEL : RELAY_OFF_LEVEL);
}

inline void actuatorApply(const ControlLogic &c) {
  for (int i = 0; i < ACT_COUNT; i++) actuatorWrite((ActuatorId)i, c.out((ActuatorId)i));
}
