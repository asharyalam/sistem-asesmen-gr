export interface Kelas {
  id: string;
  nama_kelas: string;
  tahun_semester: string;
}

export interface Siswa {
  id: string;
  nama_siswa: string;
  nis_nisn: string;
}

export interface Penilaian {
  id: string;
  nama_penilaian: string;
  tanggal: string;
  jenis_penilaian: string;
  bentuk_penilaian: string;
  id_kelas: string;
}

export interface AspekPenilaian {
  id: string;
  deskripsi: string;
  skor_maksimal: number;
  urutan: number;
  id_penilaian: string;
}

export interface NilaiAspekSiswa {
  id_siswa: string;
  id_aspek: string;
  skor_diperoleh: number;
  aspek_penilaian: AspekPenilaian;
  penilaian: Penilaian;
}

export interface KehadiranRecord {
  id_siswa: string;
  tanggal_pertemuan: string;
  status_kehadiran: 'Hadir' | 'Sakit' | 'Izin' | 'Alpha';
}