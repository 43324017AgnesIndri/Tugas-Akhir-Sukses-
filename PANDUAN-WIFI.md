# Fitur Wi-Fi di dashboard: penempatan file

Fitur ini menyentuh tiga bagian. Ketiganya harus diperbarui, kalau tidak, tombol Wi-Fi akan tampil
tetapi daftar jaringan tidak pernah muncul.

## 1. ESP32 (upload ulang sekali)

Ganti seluruh folder `firmware-esp32/` dengan yang baru. File baru: `wifi_logic.h`, `wifi_manager.h`.
File berubah: `firmware-esp32.ino`, `mqtt_client.h`, `config.h`.

`config.h` yang baru akan menimpa isianmu. Setelah disalin, isi lagi `WIFI_SSID`, `WIFI_PASSWORD`,
`MQTT_HOST`, dan `MQTT_PASSWORD`. Tidak ada library tambahan yang perlu dipasang.

## 2. Node-RED (import ulang)

1. Menu kanan atas, **Import**, pilih `nodered/flows.json`.
2. Jika ditanya, pilih **replace** (ganti), bukan copy.
3. Buka node **Broker Mosquitto**, isi lagi username dan password MQTT (login tidak ikut tersimpan di file), lalu **Deploy**.

Ada 4 node baru: dua `mqtt in` (`Status Wi-Fi`, `Hasil scan Wi-Fi`) dan dua `function`.

## 3. Dashboard (Next.js)

Semua path di bawah ini relatif terhadap folder `dashboard-andaliman/`.

| File | Tindakan | Lokasi |
|---|---|---|
| `src/app/api/wifi/route.ts` | **Baru** | buat folder `src/app/api/wifi/`, taruh file di dalamnya |
| `src/hooks/useWifi.ts` | **Baru** | `src/hooks/` |
| `src/components/WifiButton.tsx` | **Baru** | `src/components/` |
| `src/components/AppShell.tsx` | Ubah 2 baris (atau timpa) | lihat A |
| `src/lib/mqtt.ts` | Ubah 1 baris (atau timpa) | lihat B |
| `src/lib/types.ts` | Tambah blok di bagian bawah (atau timpa) | lihat C |
| `src/app/globals.css` | Tambah blok di bagian bawah (atau timpa) | lihat D |

Jika kamu belum mengubah apa pun sendiri di empat file terakhir, boleh langsung menimpa dengan file di folder ini.

**A. `AppShell.tsx`**: tambah import di bagian atas, dan satu baris di dalam `<div className="pills">`:

```tsx
import WifiButton from "./WifiButton";
...
<div className="pills">
  <WifiButton isAdmin={profile?.role === "admin"} />
  <div className="pill"> ...
```

**B. `mqtt.ts`**: tambahkan `"wifi"` pada tipe `cmdTopic`:

```ts
export const cmdTopic = (kind: "mode" | "actuator" | "threshold" | "wifi") =>
```

**C. `types.ts`**: salin seluruh blok `// ===== Wi-Fi perangkat =====` di bagian bawah file `src/lib/types.ts` dari folder ini ke bagian bawah file kamu.

**D. `globals.css`**: salin seluruh blok `/* ===== Wi-Fi perangkat ... */` di bagian bawah file `src/app/globals.css` dari folder ini ke bagian bawah file kamu.

Setelah itu `npm run dev` dijalankan ulang.

## Cara mencoba

1. Pastikan Mosquitto, InfluxDB, dan Node-RED menyala, lalu ESP32 online (muncul "Perangkat online").
2. Login sebagai **admin**, klik ikon Wi-Fi di kanan atas. Harus tertulis **Connect**.
3. Klik **Cari jaringan Wi-Fi**. Dalam 3-8 detik daftar muncul.
4. Pilih jaringan lain (misalnya hotspot HP), isi password, **Hubungkan**. ESP32 terputus sekitar 5-30 detik, lalu panel menampilkan hasilnya.
5. Uji juga password yang sengaja salah: ESP32 harus kembali ke Wi-Fi lama dan panel menampilkan pesan gagal.

Penting: ganti Wi-Fi hanya ke jaringan yang bisa menjangkau broker MQTT. Jika broker ada di laptop
(`192.168.x.x`), jaringan lain (hotspot HP) tidak bisa menjangkaunya, dan ESP32 akan kembali ke Wi-Fi lama.
Fitur ini baru berguna penuh setelah broker dipindah online (VPS atau layanan MQTT cloud).
