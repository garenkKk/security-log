# security-log — Digital Security Shift & Monthly Report

Aplikasi web mobile-first berbasis **Next.js (App Router, TypeScript)**, **Tailwind CSS**, **Lucide React**, **Supabase (Real-Time Cloud Database)**, dan **SheetJS (`xlsx`)** untuk pencatatan laporan shift keamanan hotel secara digital, serah terima tugas (overhandle) dengan bukti foto terkompresi, ekspor format WhatsApp, cetak PDF/DOC shift, serta rekap laporan bulanan format Microsoft Excel (`.xlsx`).

## Fitur Utama

1. **1. Input Shift Aktif**
   - **Kop & Identitas Hotel**: Nama dan alamat hotel tersinkron ke tabel `hotel_settings` di Supabase (atau `localStorage` bila mode lokal).
   - **Metadata Shift**: Hari & tanggal (tampilan lokal Indonesia + nilai ISO `YYYY-MM-DD`), pilihan Shift 1 Pagi (`08:00 - 16:00`), Shift 2 Siang (`16:00 - 00:00`), Shift 3 Malam (`00:00 - 08:00`), jam shift otomatis (dapat diedit), dan nama petugas.
   - **Log Kegiatan Shift**: Nomor urut otomatis mulai dari 1 yang bertambah sesuai urutan saat klik tombol `+` serta input uraian kegiatan, lengkap dengan daftar bernomor dan tombol hapus.
   - **Rekap Kendaraan Parkir**: Kontrol `-`, input angka langsung, dan `+` berukuran besar untuk Sepeda Motor dan Mobil dengan kalkulasi total otomatis.
   - **Serah Terima Tugas (Overhandle)**: Kolom komentar kustom dari shift sebelumnya (maks. 1000 huruf), upload/kamera foto bukti serah terima yang otomatis dikompres melalui HTML5 `<canvas>` (lebar maks. 600px, JPEG 0.7), checklist tanda tangan digital 2 pihak dengan perekaman waktu otomatis, dan status otomatis (`OVERHANDLE LENGKAP` / `BELUM OVERHANDLE`).
   - **Aksi Akhir Shift**: Salin laporan terformat ke clipboard untuk WhatsApp, **Cetak / Simpan PDF** laporan shift (`window.print()`), **Download DOC (Word)** (`.doc`) lengkap dengan kolom tanda tangan **Diserahkan**, **Diketahui**, dan **Diterima**, serta simpan ke tabel `shift_logs` Supabase (terkumpul real-time lintas perangkat) dan reset form untuk shift berikutnya.

2. **2. Rekap Laporan Bulanan**
   - **Filter Bulan & Tahun**: Dropdown bulan dan tahun (default bulan berjalan) dengan pembaruan real-time dari Supabase.
   - **Kartu Ringkasan Eksekutif**: Total shift tercatat, total Sepeda Motor, total Mobil, dan Grand Total kendaraan.
   - **Tabel Rekap & Detail Kegiatan**: Daftar seluruh shift pada bulan terpilih dengan badge status overhandle, tombol lihat detail, dan hapus arsip.
   - **Export Laporan**: **Download Rekap Bulanan (.xlsx)** berisi 2 sheet (`Rekap Harian & Shift` dengan total bulanan + `Ringkasan Eksekutif` dengan persentase kelengkapan overhandle) serta mode **Cetak / Simpan PDF** (`window.print()`) dengan kop surat hotel, judul resmi, tabel lengkap, dan kolom tanda tangan.

## Konfigurasi Supabase

1. Pastikan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (atau `NEXT_PUBLIC_SUPABASE_ANON_KEY`) sudah terisi pada file `.env.local`.
2. Buat tabel `hotel_settings` dan `shift_logs` di Supabase SQL Editor.
3. Jalankan aplikasi:

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.
