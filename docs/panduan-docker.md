# Menjalankan Mosquitto dan Node-RED dengan Docker

Compose menjalankan Mosquitto dan Node-RED. InfluxDB tetap menggunakan container
yang sudah ada dan diakses Node-RED melalui `host.docker.internal:8086`.

## Persiapan pertama kali

1. Buat `mosquitto/runtime/passwd` (password akan diminta secara interaktif):

   ```powershell
   docker run --rm -it -v "${PWD}\mosquitto\runtime:/mosquitto/data" eclipse-mosquitto:2 mosquitto_passwd -c /mosquitto/data/passwd dashboard
   docker run --rm -it -v "${PWD}\mosquitto\runtime:/mosquitto/data" eclipse-mosquitto:2 mosquitto_passwd /mosquitto/data/passwd esp32
   ```

   Password akun `dashboard` harus sama dengan `MQTT_PASSWORD` di
   `dashboard-andaliman/.env.local`; password akun `esp32` harus sama dengan
   `MQTT_PASSWORD` di `firmware-esp32/config.h`. File password lokal ini tidak
   disimpan di Git.
2. Salin `nodered/.env.example` menjadi `nodered/.env`, lalu isi `INFLUX_ORG`,
   `INFLUX_BUCKET`, dan `INFLUX_TOKEN` dengan nilai yang sama seperti di
   `dashboard-andaliman/.env.local`. Jangan isi `INFLUX_URL`; Compose mengaturnya
   ke alamat InfluxDB dari dalam container.
3. Dari folder utama repositori, jalankan:

   ```powershell
   docker compose up -d
   ```

4. Buka Node-RED di <http://localhost:1880>. Flow dari `nodered/flows.json`
   disalin ke volume data saat pertama kali dijalankan; perubahan berikutnya
   disimpan oleh Node-RED di volume itu. Buka konfigurasi **Broker Mosquitto** → **Security**, isi
   `MQTT_USERNAME` dan `MQTT_PASSWORD` dari `dashboard-andaliman/.env.local`,
   tekan **Update**, lalu **Deploy**. Kredensial broker memang tidak disimpan
   dalam file flow.

## Memeriksa layanan

```powershell
docker compose ps
docker compose logs --tail 50 mosquitto nodered
```

Mosquitto adalah broker MQTT, bukan halaman web. Port `1883` hanya menerima
koneksi dari klien MQTT; membuka `http://localhost:1883` di browser akan
menghasilkan galat protokol dan tidak menunjukkan bahwa broker rusak. Untuk
membuka antarmuka web Node-RED, gunakan <http://localhost:1880>.

ESP32 dan dashboard di host menggunakan broker `localhost`/IP LAN pada port
`1883`. Untuk ESP32, `MQTT_HOST` harus berupa IP LAN komputer yang menjalankan
Docker, dan firewall komputer harus mengizinkan koneksi masuk pada port `1883`.
Node-RED menghubungi broker melalui nama layanan `mosquitto` pada port `1883`.

Node-RED hanya dibuka pada komputer lokal (`localhost:1880`). Data dan pengaturan
Node-RED disimpan di volume Docker `nodered_data`; data runtime Mosquitto dan
password lokalnya berada di `mosquitto/runtime` (diabaikan Git).
