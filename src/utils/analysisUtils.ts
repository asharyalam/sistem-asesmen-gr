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
    if (!acc[score.id_siswa][score.penilaian.id]) {
      acc[score.id_siswa][score.penilaian.id] = { studentScore: 0, maxScore: 0 };
    }
    acc[score.id_siswa][score.penilaian.id].studentScore += score.skor_diperoleh;
    acc[score.id_siswa][score.penilaian.id].maxScore += score.aspek_penilaian.skor_maksimal;
    return acc;
  }, {} as { [studentId: string]: { [assessmentId: string]: { studentScore: number; maxScore: number } } });

  for (const studentId in scoresGroupedByStudentAndAssessment) {
    const student = studentsInClass.find(s => s.id === studentId);
    if (student) { // Only process if student exists in the current class context
      for (const assessmentId in scoresGroupedByStudentAndAssessment[studentId]) {
        const data = scoresGroupedByStudentAndAssessment[studentId][assessmentId];
        if (data.maxScore > 0) {
          studentOverallPercentages[studentId].push((data.studentScore / data.maxScore) * 100);
        }
      }
    }
  }

  let totalClassAverage = 0;
  let studentsWithScoresCount = 0;

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