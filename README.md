📑 LAPORAN PROYEK: GoAbsen (Field HRIS System)

GoAbsen adalah aplikasi manajemen kehadiran karyawan lapangan berbasis web
(SaaS) yang menggunakan teknologi Geofencing dan Selfie Evidence untuk
memastikan keakuratan data presensi tanpa manipulasi.

1. Struktur Teknologi (The Tech Stack)

Aplikasi ini dibangun menggunakan teknologi modern yang menjadi standar industri
saat ini:

  - Framework: Next.js 14+ (App Router) — Dipilih karena mendukung SSR (Server
    Side Rendering), optimasi performa tinggi, dan routing yang intuitif.
  - Language: TypeScript — Menjamin keamanan kode (type-safety) dan
    meminimalisir error saat runtime.
  - Styling: Tailwind CSS — Digunakan untuk membangun UI yang responsif dan
    modern dengan cepat.
  - Backend & Database: Supabase (PostgreSQL) — Menyediakan infrastruktur
    database relasional yang kuat, sistem autentikasi, serta Row Level Security
    (RLS).
  - Storage: Supabase Storage — Digunakan untuk menyimpan file gambar (selfie)
    hasil presensi secara aman.
  - API Browser: Geolocation API (Pelacakan GPS) & MediaDevices API (Akses
    Kamera).

2. Struktur Folder (The Architecture)

Kita menggunakan struktur folder Next.js tanpa folder src (langsung di root)
agar lebih ramping namun tetap terorganisir secara profesional:

PRO-HR/
├── app/                  # Routing & Halaman (App Router)
│   ├── admin/            # Dashboard HR (Manajemen Data)
│   ├── attendance/       # Halaman Presensi Karyawan
│   ├── login/            # Autentikasi Masuk
│   ├── register/         # Pendaftaran Karyawan Baru
│   └── page.tsx          # Landing Page Utama
├── utils/                # Fungsi Helper & Logika Bisnis
│   ├── supabase/         # Konfigurasi Supabase Client
│   └── distance.ts       # Logika Perhitungan Jarak (Haversine)
├── public/               # Asset Statis (Gambar/Ikon)
├── middleware.ts         # Proteksi Rute (Route Guarding)
├── .env.local            # Variabel Lingkungan (API Keys)
└── tailwind.config.ts    # Konfigurasi Tema UI

3. Fungsi Utama & Logika Bisnis (The Functions)

a. Logika Haversine (getDistance)

Digunakan untuk menghitung jarak antara dua titik koordinat di permukaan bumi
dalam satuan meter.

  - Cara Kerja: Menghitung perbedaan Lat/Long menggunakan jari-jari bumi.
  - Kegunaan: Menentukan apakah karyawan berada di dalam radius kantor (500
    meter) atau tidak.

b. Real-time GPS Tracking (watchPosition)

Alih-alih mengambil lokasi satu kali, kita menggunakan
navigator.geolocation.watchPosition.

  - Keunggulan: Lokasi di layar terus diperbarui secara otomatis saat user
    bergerak, memberikan presisi yang lebih tinggi.

c. Satu Hari Satu Siklus (maybeSingle)

Logika yang memastikan karyawan hanya bisa melakukan satu kali "Masuk" dan satu
kali "Pulang" dalam 24 jam.

  - Filter: Menggunakan rentang waktu 00:00:00 s/d 23:59:59 jam lokal.

d. Selfie Evidence & Blob Upload

  - Capture: Mengambil frame dari tag <video> dan memindahkannya ke <canvas>.
  - Upload: Mengonversi canvas menjadi Blob (Binary Large Object), mengompres
    kualitasnya (60%) untuk hemat storage, lalu mengirimnya ke Supabase Storage.

4. Alur Kerja Aplikasi (The Flow)

1.  Pendaftaran: User mendaftar melalui /register. Data masuk ke auth.users
    (Supabase) dan profilnya masuk ke tabel profiles.
2.  Setup Lokasi: Saat pertama kali login, karyawan wajib menekan tombol "Kunci
    Lokasi". Koordinat GPS mereka saat itu akan disimpan sebagai titik "Kantor"
    mereka di database.
3.  Presensi Masuk: Karyawan harus melakukan Selfie. Sistem akan mengecek GPS.
    Jika jarak ke titik kantor <= 500m, status = Hadir. Jika lebih, status =
    Luar Kantor.
4.  Presensi Pulang: Karyawan menekan tombol pulang. Sistem mengupdate baris
    data yang sama dengan menambahkan jam check_out.
5.  Dashboard HR (Admin): Admin dapat melihat rekap semua karyawan secara
    real-time, melihat foto selfie mereka, serta mendownload laporan dalam
    format CSV/Excel.

5. Keamanan & Optimasi (Professional Standard)

  - Middleware: Menjamin halaman /attendance dan /admin tidak bisa diakses tanpa
    login lewat browser (Sisi Server).
  - RLS (Row Level Security): Karyawan hanya bisa melihat data absen milik
    mereka sendiri. Admin adalah satu-satunya yang punya izin SELECT semua data.
  - Responsive Design: Tampilan dioptimasi untuk Mobile (HP Karyawan) dan
    Desktop (Layar Monitor Admin).
  - Cleanup Effect: Menggunakan clearWatch pada GPS dan mematikan MediaStream
    kamera saat komponen unmount untuk menghemat baterai perangkat.


