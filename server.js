// ============================================================
// PeduliNalar — Backend Proxy
// Menyimpan Gemini API Key di server (.env), tidak pernah
// dikirim ke browser. Frontend hanya memanggil /api/scan dan /api/faq.
// ============================================================

require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

if (!GEMINI_API_KEY) {
  console.warn(
    "⚠️  GEMINI_API_KEY belum diset. Salin .env.example ke .env dan isi API key Anda."
  );
}

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ---------- Rate limit sederhana (in-memory, per IP) ----------
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 menit
const RATE_LIMIT_MAX = 12; // maksimal 12 request / menit / IP
const hits = new Map();

function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (hits.get(ip) || []).filter((t) => t > windowStart);

  if (timestamps.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: "Terlalu banyak permintaan. Coba lagi sebentar lagi.",
    });
  }
  timestamps.push(now);
  hits.set(ip, timestamps);
  next();
}

// ---------- System instructions (sama seperti versi sebelumnya) ----------
const SYSTEM_INSTRUCTION_ANALYST = `Anda adalah Senior Epistemic Analyst dan Pakar Forensik Informasi Digital.
Tugas Anda adalah membedah konten (teks atau link video) untuk mendeteksi disinformasi,
manipulasi AI/deepfake, dan jebakan ekonomi atensi.
Jika menerima link video, analisislah konten yang dirujuk oleh link tersebut dengan saksama.
Akhiri jawaban Anda dengan satu baris berformat persis:
VERDICT: AMAN  atau  VERDICT: PERLU_KONFIRMASI  atau  VERDICT: BERPOTENSI_HOAKS`;

const SYSTEM_INSTRUCTION_FAQ =
  "Kamu adalah asisten FAQ yang ramah untuk website PeduliNalar. Jawablah pertanyaan pengguna secara singkat, jelas, dan dalam Bahasa Indonesia.";

// ---------- Helper: panggil Gemini API dari server ----------
async function callGemini(systemInstruction, userPrompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("Server belum dikonfigurasi: GEMINI_API_KEY kosong.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    const message = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || "")
    .join("\n");

  if (!text) {
    throw new Error("Gemini tidak mengembalikan jawaban. Coba ulangi beberapa saat lagi.");
  }
  return text;
}

// ---------- Endpoint: pemeriksaan teks / link (core page) ----------
app.post("/api/scan", rateLimit, async (req, res) => {
  try {
    const { content, mode } = req.body || {};

    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Mohon masukkan input terlebih dahulu." });
    }
    if (content.length > 8000) {
      return res.status(400).json({ error: "Input terlalu panjang (maks 8000 karakter)." });
    }

    const label = mode === "link" ? "link video" : "teks";
    const prompt = `Tolong analisis kebenaran dari ${label} berikut: ${content}`;

    const text = await callGemini(SYSTEM_INSTRUCTION_ANALYST, prompt);
    res.json({ text });
  } catch (err) {
    console.error("[/api/scan]", err.message);
    res.status(500).json({ error: err.message || "Terjadi kesalahan teknis." });
  }
});

// ---------- Endpoint: tanya AI (welcome page FAQ) ----------
app.post("/api/faq", rateLimit, async (req, res) => {
  try {
    const { question } = req.body || {};

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "Tulis pertanyaan Anda terlebih dahulu." });
    }
    if (question.length > 2000) {
      return res.status(400).json({ error: "Pertanyaan terlalu panjang (maks 2000 karakter)." });
    }

    const text = await callGemini(SYSTEM_INSTRUCTION_FAQ, question);
    res.json({ text });
  } catch (err) {
    console.error("[/api/faq]", err.message);
    res.status(500).json({ error: err.message || "Terjadi kesalahan teknis." });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, configured: Boolean(GEMINI_API_KEY) });
});

app.listen(PORT, () => {
  console.log(`✅ PeduliNalar berjalan di http://localhost:${PORT}`);
});
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'PUBLIC')));
