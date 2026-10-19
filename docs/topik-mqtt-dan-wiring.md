# Topik MQTT, skema InfluxDB, dan wiring

## Aliran data

```
SHT40 -> ESP32 --MQTT--> Broker --> Node-RED --HTTP--> InfluxDB --> Dashboard (Next.js) -> Browser
                   ^                                                    |
                   +------ perintah (mode, aktuator, threshold) <-------+  /api/control, /api/threshold
```

## Topik MQTT  (DEVICE_ID = andaliman01)

| Topik | Arah | Isi | Retained |
|---|---|---|---|
| `andaliman/andaliman01/data` | ESP32 -> broker | `{"suhu":21.3,"kelembapan":73.4}` tiap 5 detik | tidak |
| `andaliman/andaliman01/state` | ESP32 -> broker | `{"kompresor":1,"fan":0,"mist":0,"mode":"AUTO"}` saat berubah dan tiap 10 detik | tidak |
| `andaliman/andaliman01/status` | ESP32 / broker | `online` atau `offline` (Last Will) | ya |
| `andaliman/andaliman01/cmd/mode` | dashboard -> ESP32 | `{"mode":"AUTO"}` / `MANUAL` / `SAFE` | tidak |
| `andaliman/andaliman01/cmd/actuator` | dashboard -> ESP32 | `{"target":"kompresor","state":true}` (`fan`, `mist`) | tidak |
| `andaliman/andaliman01/cmd/threshold` | dashboard -> ESP32 | `{"tmin":18,"tmax":24,"hmin":70,"hmax":85}` | ya |

Perintah mode dan aktuator sengaja tidak retained: setelah ESP32 restart ia kembali ke AUTO, bukan terjebak di MANUAL dengan relay menyala.
Threshold retained: ESP32 yang baru menyala langsung menerima nilai terakhir, dan juga menyimpannya di memorinya sendiri.

## Skema InfluxDB (dibaca dashboard, ditulis Node-RED)

| Measurement | Tag | Field |
|---|---|---|
| `environment` | `device_id` | `suhu` (float), `kelembapan` (float) |
| `actuator_state` | `device_id` | `kompresor`, `fan`, `mist` (integer 0/1), `mode` (string) |

Jika bucket sebelumnya diisi `seed-influx.mjs`, tipe field-nya sudah sama dengan skema di atas, jadi tidak bentrok.
Data contoh itu tetap tercampur dengan data asli; hapus bucket atau buat bucket baru sebelum pengujian resmi.

## Pin ESP32 (usulan, ubah di `config.h` bila rangkaian berbeda)

| Fungsi | GPIO |
|---|---|
| SDA (SHT40, LCD) | 21 |
| SCL (SHT40, LCD) | 22 |
| Relay kompresor | 25 |
| Relay fan | 26 |
| Relay mist maker | 27 |

- SHT40 diberi daya 3,3 V.
- Modul relay umumnya aktif LOW (`RELAY_ACTIVE_LOW 1`). Uji dulu tanpa beban: jika relay menyala saat seharusnya mati, ubah ke 0.
- Beban AC kompresor dan mist maker dipasang lewat kontak relay dengan kabel dan pengaman yang sesuai arus beban.

## LCD I2C 5 V

Backpack LCD dengan VCC 5 V membuat pull-up SDA/SCL ikut ke 5 V, sedangkan GPIO ESP32 hanya 3,3 V.
Lewatkan SDA dan SCL LCD melalui level shifter I2C dua arah (sisi rendah 3,3 V ke ESP32 dan SHT40, sisi tinggi 5 V ke LCD).
Aktifkan LCD di firmware dengan `USE_LCD 1` setelah rangkaian ini terpasang.

## Pengujian logika kontrol (tanpa ESP32)

```
cd firmware-esp32
g++ -std=c++17 -I. test/test_control.cpp -o test_control && ./test_control
```
Hasil yang diharapkan: `Lulus: 38, Gagal: 0`. Skenario: histeresis, jeda kompresor, mist, SAFE otomatis saat sensor gagal, MANUAL, dan luapan `millis()`.
