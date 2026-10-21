# Rencana Pengembangan Digital Twin Fasad Kantor

**Teknologi Utama:** Three.js, Gaussian Splatting, CSS2DRenderer, REST API (Cuaca)

## 📌 Ringkasan Proyek

Mengembangkan _scene_ Gaussian Splatting (tampak fasad dan lingkungan luar kantor) menjadi _digital twin_ interaktif. Karena tidak ada area interior, fokus utama adalah simulasi sensor IoT eksterior, pemantauan energi, dan sinkronisasi kondisi lingkungan (cuaca/waktu) secara real-time.

---

## 🚀 Fase 1: Integrasi Data Cuaca Real-Time (Prioritas Utama)

Mengambil data cuaca nyata berdasarkan lokasi kantor (Blitar) untuk ditampilkan di dalam _scene_.

- **Sumber Data:** OpenWeatherMap API atau WeatherAPI (Gratis).
- **Data yang Diambil:**
  - Kondisi Cuaca (Cerah, Berawan, Hujan, dll.)
  - Suhu Area (°C)
  - Kelembapan & Kecepatan Angin
- **Cara Tampil:** Ditampilkan di _Sidebar Dashboard_ (HTML/UI standar) dan sebagai panel UI _floating_ di atas bangunan 3D.

## ⚡ Fase 2: Simulasi Sensor IoT (Penggunaan Listrik)

Karena sensor perangkat keras (IoT) fisik belum tersedia, data akan disimulasikan menggunakan fungsi _mocking_ di JavaScript.

- **Logika Simulasi Listrik:** Membuat _script_ yang meng-generate angka acak dalam rentang logis (misal: `1200W` hingga `7200W`) yang diperbarui setiap 3-5 detik.
- **Logika Simulasi CCTV:** menampilkan icon cctv , yang jika di klik menampilkan popup fetc cctv. sementara popup bisa di beri simulasi "maintenance".
- **Penempatan:** Menggunakan `CSS2DRenderer` dari Three.js untuk menempelkan label metrik (teks melayang) tepat di area meteran listrik dan cctv di sisi kanan depan bagunan dan di sisi kiri bangunan. untuk koordinat `CSS2DRenderer` nanti disesuaikan

## 💻 Fase 3: Pengembangan Antarmuka (UI)

Menggabungkan elemen web 2D ke dalam dunia 3D.

1.  **Sidebar Dashboard:** Panel di sisi kanan layar yang . menampilkan data API, juga menamapilkan tentang aplikasi kantor kami. panel ini dibagi dua atas bawah.
    - panel atas menampilkan rangkuman data dengan icon simple (Suhu area, status koneksi API, grafik dummy penggunaan listrik)
    - Panel bawah adalah deskripsi singkat aplikasi dan tentang arunika saha vikasa.
2.  **3D Floating Labels (CSS2DRenderer):**
    - icon dan label Pemakaian Daya Listrik.
    - icon cctv yang jika di klik open popup cctv, sementara bisa pakai link cctv public

## 🌧️ Fase 4: Sinkronisasi Visual (Waktu & Cuaca)

Menyesuaikan tampilan Splat dengan data API Cuaca dan waktu sistem komputer.

- **Tantangan Utama:** Cahaya/bayangan pada Gaussian Splat bersifat permanen (_baked lighting_). Splat tidak merespon lampu dinamis Three.js secara alami.
- **Solusi Visual:**
  1.  **Perubahan Langit (Skybox):** Mengganti _background_ / _HDRI_ sesuai waktu (Pagi/Siang/Malam) atau cuaca (Cerah/Mendung).
  2.  **Sistem Partikel (Rain):** Menggunakan `THREE.Points` untuk memunculkan efek rintik hujan animasi ketika API cuaca mengembalikan status "Rain".
  3.  **Post-Processing:** Menggunakan `EffectComposer` (Color Correction/Filter) untuk menggelapkan seluruh _scene_ saat malam hari dan menambahkan efek kebiruan.

---

## 🛠️ Langkah Pengerjaan Berikutnya

1.  [ ] Setup dasar Three.js + Gaussian Splat loader.
2.  [ ] Memasukkan `CSS2DRenderer` ke dalam scene untuk membuat label `<div>` pertama di titik kordinat tertentu.
3.  [ ] Membuat script _fetch_ ke OpenWeatherMap.
4.  [ ] Mengirim data cuaca ke label CSS2D.

## agent progress until now,

task 3 done - create the folder and structure code
