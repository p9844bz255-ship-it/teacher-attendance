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

interface CachedInsight {
  response: string;
  timestamp: number;
  metricsHash: string;
}

let lastSuccessfulInsight: string | null = null;
let globalCache: CachedInsight | null = null;

// Cache lifetime: 30 minutes (1800000 ms) for identical metrics
const CACHE_TTL = 30 * 60 * 1000;
// Minimum cooldown between actual live API calls: 10 minutes (600000 ms) to aggressively protect the 20-daily-calls free tier limit
const API_COOLDOWN = 10 * 60 * 1000;

let lastApiCallTimestamp = 0;

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
  
  const attendancePercentage = metrics.totalTeachers > 0 
    ? Math.round((metrics.activeHadir / metrics.totalTeachers) * 100) 
    : 100;

  // Standardize the metrics to generate a hash key
  const metricsHash = JSON.stringify({
    total: metrics.totalTeachers,
    hadir: metrics.activeHadir,
    terlambat: metrics.terlambatCount,
    pulangCepat: metrics.pulangCepatCount,
    alpha: metrics.alphaCount,
    top: metrics.topDiscipline
  });

  const now = Date.now();

  // 1. Check if we have an active, unexpired cache for identical metrics
  if (globalCache && globalCache.metricsHash === metricsHash && (now - globalCache.timestamp) < CACHE_TTL) {
    console.log("STAS AI Insight: Serving cache (metrics match and TTL active)");
    return globalCache.response;
  }

  // 2. Check if we are within the API cooldown rate-limiting window
  // If called too recently, we serve the last known insight (prioritizing the matching cache, then any successful run)
  if (now - lastApiCallTimestamp < API_COOLDOWN) {
    if (globalCache) {
      console.log("STAS AI Insight: Throttled to prevent quota exhaustion, returning matching cache");
      return globalCache.response;
    }
    if (lastSuccessfulInsight) {
      console.log("STAS AI Insight: Throttled to prevent quota exhaustion, returning last successful insight");
      return lastSuccessfulInsight;
    }
    // If absolutely no previous run exists, we fall through to try creating the initial one
  }

  if (!client) {
    // Elegant fallback if Gemini API Key is not set up
    return `**STAS AI Insight (Simulasi):** Kehadiran hari ini tercatat pada tingkat **${attendancePercentage}%**. Tingkat ketepatan waktu berada di kisaran yang baik dengan **${metrics.terlambatCount}** guru terlambat. Pengajar paling konsisten pekan ini adalah **${metrics.topDiscipline || "Ust. Ahmad Fauzi, S.Pd.I"}**. *(Hubungkan GEMINI_API_KEY Anda di Settings > Secrets untuk mengaktifkan analisis kualitatif real-time)*.`;
  }

  try {
    console.log("STAS AI Insight: Requesting live executive report from Gemini API...");
    lastApiCallTimestamp = now;

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
      const textOutput = response.text;
      
      // Update cache registers
      lastSuccessfulInsight = textOutput;
      globalCache = {
        response: textOutput,
        timestamp: now,
        metricsHash: metricsHash
      };

      return textOutput;
    }
    throw new Error("Empty response text from Gemini API");
  } catch (error: any) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
      console.log("STAS AI Insight: Gemini API quota exceeded or rate-limited. Serving fallback/cached insight gracefully.");
    } else {
      console.log(`STAS AI Insight: API error (${errMsg}). Serving fallback/cached insight.`);
    }
    
    // In case of actual rate limits or error from the upstream model, keep serving the last known qualitative insight if available!
    if (globalCache) {
      console.log("STAS AI Insight: Upstream API failed, serving matching cache.");
      return globalCache.response;
    }
    if (lastSuccessfulInsight) {
      console.log("STAS AI Insight: Upstream API failed, serving last successful qualitative report.");
      return lastSuccessfulInsight;
    }

    return `**STAS AI Insight (Saran Kehadiran):** Tingkat kehadiran hari ini stabil pada **${attendancePercentage}%** dengan tingkat keterlambatan terkendali (**${metrics.terlambatCount}** pengajar). Pengajar dengan tingkat kemutakhiran absensi tertinggi pekan ini adalah **${metrics.topDiscipline || "Ust. Ahmad Fauzi, S.Pd.I"}**. Kami menyarankan peninjauan ulang pola kedatangan bagi yang terhitung terlambat.`;
  }
}
