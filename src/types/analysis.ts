export interface Kelas {
  id: string;
  nama_kelas: string;
  tahun_semester: string;
}

export interface Siswa {
  id: string;
  nama_siswa: string;
  nis_nisn: string;
  id_kelas: string; // Added for direct reference
  kelas: {
    nama_kelas: string;
  } | null; // Changed to object or null
}

export interface Penilaian {
  id: string;
  nama_penilaian: string;
  tanggal: string;
  jenis_penilaian: string;
  bentuk_penilaian: string;
  id_kelas: string;
  kode_tp: string | null; // Added for direct reference
  id_kategori_bobot_akhir: string | null; // Added for direct reference
  kelas: {
    nama_kelas: string;
  } | null; // Changed to object or null
  kategori_bobot?: { // Made optional as it might not always be selected
    nama_kategori: string;
  } | null; // Changed to object or null
}

export interface AspekPenilaian {
  id: string;
  deskripsi: string;
  skor_maksimal: number;
  urutan: number;
  id_penilaian: string;
}

// New interface to represent the fetched aspect with nested assessment
export interface FetchedAspekPenilaian extends AspekPenilaian {
  penilaian: Penilaian | null; // Changed to object or null
}

export interface NilaiAspekSiswa {
  id_siswa: string;
  id_aspek: string;
  skor_diperoleh: number;
  aspek_penilaian: FetchedAspekPenilaian | null; // Changed to object or null
}

export interface KehadiranRecord {
  id_siswa: string;
  tanggal_pertemuan: string;
  status_kehadiran: 'Hadir' | 'Sakit' | 'Izin' | 'Alpha';
}