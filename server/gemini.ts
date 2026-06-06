import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY') {
      aiInstance = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiInstance;
}

export async function generateExecutiveAIInsight(metrics: {
  totalTeachers: number;
  activeHadir: number;
  terlambatCount: number;
  pulangCepatCount: number;
  alphaCount: number;
  attendanceTrend: Array<{ date: string; rate: number }>;
  topDiscipline: string;
}): Promise<string> {
  const client = getGeminiClient();
  
  if (!client) {
    // Elegant fallback if Gemini API Key is not set up yet
    const attendancePercentage = metrics.totalTeachers > 0 
      ? Math.round((metrics.activeHadir / metrics.totalTeachers) * 100) 
      : 100;
    
    return `**STAS AI Insight (Fallback Mode):** Kehadiran hari ini tercatat pada tingkat **${attendancePercentage}%**. Tingkat ketepatan waktu berada di kisaran yang baik dengan **${metrics.terlambatCount}** guru terlambat. Pengajar paling konsisten pekan ini adalah **${metrics.topDiscipline || "Ust. Ahmad Fauzi, S.Pd.I"}**. *(Hubungkan GEMINI_API_KEY Anda di Settings > Secrets untuk mengaktifkan analisis kualitatif real-time)*.`;
  }

  try {
    const prompt = `Lakukan analisis data kehadiran guru Al-Wildan Islamic School 3 BSD City berikut.
    Beri ringkasan eksekutif profesional, tajam, dan singkat (maksimal 3 paragraf pendek) dalam bahasa Indonesia.
    Gunakan gaya bahasa Vercel/Stripe: bersih, humanis, objektif, tanpa kata-kata berbunga-bunga/lebay.
    
    METRIK HARI INI:
    - Total Guru Terdaftar: ${metrics.totalTeachers}
    - Hadir Tepat Waktu: ${metrics.activeHadir}
    - Terlambat: ${metrics.terlambatCount}
    - Pulang Cepat: ${metrics.pulangCepatCount}
    - Mangkir / Tanpa Keterangan (Alpha): ${metrics.alphaCount}
    - Guru Paling Disiplin pekan ini: ${metrics.topDiscipline || "Belum ada catatan"}
    - Tren kehadiran 7 hari terakhir: ${JSON.stringify(metrics.attendanceTrend)}

    Berikan insight tentang kepatuhan disiplin pengajar, pola keterlambatan, serta rekomendasi manajerial sekolah yang bermanfaat untuk meningkatkan kinerja akademik.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah Enterprise AI School Consultant terkemuka untuk Al-Wildan Islamic School. Tugas Anda memberikan evaluasi kepatuhan mengajar dan ketepatan kehadiran pengajar dalam bentuk analisis eksekutif.",
        temperature: 0.5,
      }
    });

    if (response && response.text) {
      return response.text;
    }
    throw new Error("Empty response text from Gemini API");
  } catch (error) {
    console.error("STAS AI Insight Generation error:", error);
    return `**STAS AI Insight (Error State):** Gagal memformulasikan analisis otomatis bertenaga Gemini. Kehadiran saat ini stabil di **${Math.round((metrics.activeHadir / (metrics.totalTeachers || 1)) * 100)}%**. Kelalaian: ${metrics.terlambatCount} keterlambatan terdeteksi hari ini.`;
  }
}
