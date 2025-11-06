"use client";

import { NilaiAspekSiswa, Siswa, AspekPenilaian, Penilaian } from '@/types/analysis';

// Helper function to calculate class average
export const calculateClassAverage = (scores: NilaiAspekSiswa[], studentsInClass: Siswa[]) => {
  if (!scores || scores.length === 0 || !studentsInClass || studentsInClass.length === 0) return 0;

  const studentOverallPercentages: { [studentId: string]: number[] } = {};

  // Initialize for all students in class, even if they have no scores
  studentsInClass.forEach(student => {
    studentOverallPercentages[student.id] = [];
  });

  // Group scores by student and then by assessment
  const scoresGroupedByStudentAndAssessment = scores.reduce((acc, score) => {
    if (!acc[score.id_siswa]) {
      acc[score.id_siswa] = {};
    }
    // Mengakses penilaian melalui aspek_penilaian, tambahkan pemeriksaan null dan akses elemen pertama
    if (!score.aspek_penilaian || score.aspek_penilaian.length === 0 || !score.aspek_penilaian[0]?.penilaian || score.aspek_penilaian[0].penilaian.length === 0) {
      return acc; // Lewati skor ini jika aspek_penilaian atau penilaian bersarangnya null/kosong
    }
    const assessmentId = score.aspek_penilaian[0].penilaian[0].id;
    if (!acc[score.id_siswa][assessmentId]) {
      acc[score.id_siswa][assessmentId] = { studentScore: 0, maxScore: 0 };
    }
    acc[score.id_siswa][assessmentId].studentScore += score.skor_diperoleh;
    acc[score.id_siswa][assessmentId].maxScore += score.aspek_penilaian[0].skor_maksimal;
    return acc;
  }, {} as { [studentId: string]: { [assessmentId: string]: { studentScore: number; maxScore: number } } });

  let totalClassAverage = 0;
  let studentsWithScoresCount = 0;

  for (const studentId in scoresGroupedByStudentAndAssessment) {
    const assessmentsForStudent = scoresGroupedByStudentAndAssessment[studentId];
    let totalStudentAssessmentPercentage = 0;
    let assessmentCount = 0;

    for (const assessmentId in assessmentsForStudent) {
      const { studentScore, maxScore } = assessmentsForStudent[assessmentId];
      if (maxScore > 0) {
        totalStudentAssessmentPercentage += (studentScore / maxScore) * 100;
        assessmentCount++;
      }
    }
    if (assessmentCount > 0) {
      studentOverallPercentages[studentId].push(totalStudentAssessmentPercentage / assessmentCount);
    }
  }

  for (const studentId in studentOverallPercentages) {
    const percentages = studentOverallPercentages[studentId];
    if (percentages.length > 0) {
      const studentAverage = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
      totalClassAverage += studentAverage;
      studentsWithScoresCount++;
    }
  }

  return studentsWithScoresCount > 0 ? totalClassAverage / studentsWithScoresCount : 0;
};