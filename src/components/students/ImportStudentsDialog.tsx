"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Import useQueryClient
import { logActivity } from '@/utils/activityLogger'; // Import logActivity

interface ImportStudentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentsImported: () => void;
}

interface ParsedStudent {
  nama_siswa: string;
  nis_nisn: string;
  nama_kelas: string; // Temporary field for class name
}

const ImportStudentsDialog: React.FC<ImportStudentsDialogProps> = ({ isOpen, onClose, onStudentsImported }) => {
  const { user } = useSession();
  const queryClient = useQueryClient(); // Get queryClient here
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const { data: classes, isLoading: isLoadingClasses, isError: isErrorClasses, error: classesError } = useQuery<{ id: string; nama_kelas: string }[], Error>({
    queryKey: ['classesForImport', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('kelas')
        .select('id, nama_kelas')
        .eq('id_guru', user.id)
        .order('nama_kelas', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      console.log("Available classes for import:", data); // DEBUG: Log available classes
      return data || [];
    },
    enabled: !!user && isOpen,
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseExcel(selectedFile);
    } else {
      setFile(null);
      setParsedData([]);
    }
  };

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet);

      console.log("Raw JSON from Excel:", json); // DEBUG: Log raw JSON

      // Assuming the Excel columns are 'Nama Siswa', 'NIS/NISN', 'Nama Kelas'
      const students: ParsedStudent[] = json.map((row) => ({
        nama_siswa: row['Nama Siswa'] || '',
        nis_nisn: row['NIS/NISN'] || '',
        nama_kelas: row['Nama Kelas'] || '',
      })).filter(s => s.nama_siswa && s.nis_nisn && s.nama_kelas); // Filter out rows with missing essential data

      if (students.length === 0) {
        showError("Tidak ada data siswa yang valid ditemukan di file Excel. Pastikan kolom 'Nama Siswa', 'NIS/NISN', dan 'Nama Kelas' terisi.");
        setParsedData([]);
      } else {
        setParsedData(students);
      }
    };
    reader.onerror = () => {
      showError("Gagal membaca file Excel.");
      setParsedData([]);
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (!user) {
      showError("Anda harus login untuk mengimpor siswa.");
      return;
    }
    if (parsedData.length === 0) {
      showError("Tidak ada data siswa untuk diimpor.");
      return;
    }
    if (!classes || classes.length === 0) {
      showError("Tidak ada kelas yang tersedia untuk siswa ini.");
      return;
    }

    setIsImporting(true);
    const studentsToInsert = parsedData.map(student => {
      console.log(`Attempting to match Excel class name "${student.nama_kelas}"`); // DEBUG: Log class name from Excel
      const classId = classes.find(c => c.nama_kelas.toLowerCase() === student.nama_kelas.toLowerCase())?.id;
      if (!classId) {
        showError(`Kelas "${student.nama_kelas}" untuk siswa "${student.nama_siswa}" tidak ditemukan. Siswa ini akan dilewati.`);
        return null;
      }
      return {
        nama_siswa: student.nama_siswa,
        nis_nisn: student.nis_nisn,
        id_kelas: classId,
      };
    }).filter(Boolean); // Remove null entries (students with unfound classes)

    if (studentsToInsert.length === 0) {
      showError("Tidak ada siswa yang valid untuk diimpor setelah memverifikasi kelas.");
      setIsImporting(false);
      return;
    }

    // Call Supabase Edge Function for bulk insert
    try {
      const { data, error } = await supabase.functions.invoke('bulk-insert-students', {
        body: JSON.stringify({ students: studentsToInsert }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        showError("Gagal mengimpor siswa: " + data.error);
      } else {
        showSuccess(`Berhasil mengimpor ${data.insertedCount} siswa!`);
        onStudentsImported();
        handleClose();
        // Log activity, passing queryClient
        await logActivity(user, 'STUDENTS_IMPORTED', `Mengimpor ${data.insertedCount} siswa dari file Excel.`, queryClient);
      }
    } catch (error: any) {
      showError("Terjadi kesalahan saat mengimpor siswa: " + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setIsImporting(false);
    onClose();
  };

  if (isErrorClasses) {
    showError("Gagal memuat daftar kelas: " + classesError?.message);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] rounded-xl shadow-mac-lg">
        <DialogHeader>
          <DialogTitle>Impor Siswa dari Excel</DialogTitle>
          <DialogDescription>
            Unggah file Excel (.xlsx) yang berisi daftar siswa. Pastikan file memiliki kolom 'Nama Siswa', 'NIS/NISN', dan 'Nama Kelas'.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="excel-file">Pilih File Excel</Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="rounded-lg file:text-primary file:font-medium"
            />
            {file && (
              <p className="text-sm text-muted-foreground flex items-center">
                <span className="mr-2">{file.name}</span>
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setParsedData([]); }} className="h-auto p-1">
                  <XCircle className="h-4 w-4 text-destructive" />
                </Button>
              </p>
            )}
          </div>

          {parsedData.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Pratinjau Data Siswa ({parsedData.length} baris)</h3>
              <ScrollArea className="h-[200px] w-full rounded-md border shadow-mac-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Siswa</TableHead>
                      <TableHead>NIS/NISN</TableHead>
                      <TableHead>Nama Kelas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((student, index) => (
                      <TableRow key={index}>
                        <TableCell>{student.nama_siswa}</TableCell>
                        <TableCell>{student.nis_nisn}</TableCell>
                        <TableCell>{student.nama_kelas}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <p className="text-sm text-muted-foreground mt-2">
                Siswa akan diimpor ke kelas yang sesuai berdasarkan 'Nama Kelas' yang cocok.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={handleImport}
            disabled={parsedData.length === 0 || isImporting || isLoadingClasses || isErrorClasses}
            className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm"
          >
            {isImporting ? "Mengimpor..." : <><Upload className="mr-2 h-4 w-4" /> Impor Siswa</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportStudentsDialog;