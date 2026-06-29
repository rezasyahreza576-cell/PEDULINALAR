/* ============================================================
   PeduliNalar — logic bersama untuk welcome page & core page
   Versi proxy: semua panggilan AI lewat backend /api/*.
   Tidak ada API key yang disimpan atau dikirim dari browser.
   ============================================================ */

async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

/* ---------- Cek status server (badge kecil di sidebar) ---------- */
async function checkServerStatus(el) {
  if (!el) return;
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    if (data.ok && data.configured) {
      el.textContent = "Server siap";
      el.classList.remove("offline");
    } else {
      el.textContent = "API key server belum diset (.env)";
      el.classList.add("offline");
    }
  } catch {
    el.textContent = "Tidak bisa terhubung ke server";
    el.classList.add("offline");
  }
}

/* ============================================================
   WELCOME PAGE — Widget "Tanya AI" (FAQ)
   ============================================================ */
function initFaqWidget() {
  const askBtn = document.getElementById("faqAskBtn");
  if (!askBtn) return;

  const questionInput = document.getElementById("faqQuestion");
  const answerBox = document.getElementById("faqAnswer");
  const errorBox = document.getElementById("faqError");
  const statusEl = document.getElementById("serverStatusFaq");

  checkServerStatus(statusEl);

  askBtn.addEventListener("click", async () => {
    const question = questionInput.value.trim();

    errorBox.classList.remove("show");
    answerBox.classList.remove("show");

    if (!question) {
      errorBox.textContent = "Tulis pertanyaan Anda terlebih dahulu.";
      errorBox.classList.add("show");
      return;
    }

    askBtn.disabled = true;
    askBtn.textContent = "Memikirkan...";

    try {
      const { text } = await postJSON("/api/faq", { question });
      answerBox.textContent = text;
      answerBox.classList.add("show");
    } catch (err) {
      errorBox.textContent = "Terjadi kesalahan: " + err.message;
      errorBox.classList.add("show");
    } finally {
      askBtn.disabled = false;
      askBtn.textContent = "Tanya Sekarang";
    }
  });
}

/* ============================================================
   CORE PAGE — Form Pemeriksaan (Scan)
   ============================================================ */
function initScanPage() {
  const scanBtn = document.getElementById("scanBtn");
  if (!scanBtn) return;

  const modeButtons = document.querySelectorAll(".mode-toggle button");
  const textWrapper = document.getElementById("inputTeks");
  const linkWrapper = document.getElementById("inputLink");
  const textField = document.getElementById("textArea");
  const linkField = document.getElementById("linkArea");
  const loadingLine = document.getElementById("loadingLine");
  const resultBox = document.getElementById("scanResult");
  const resultBody = document.getElementById("scanResultBody");
  const resultMeta = document.getElementById("scanResultMeta");
  const errorBox = document.getElementById("scanError");
  const statusEl = document.getElementById("serverStatusScan");

  checkServerStatus(statusEl);

  let mode = "teks";
  let caseCounter = 1;

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode;
      modeButtons.forEach((b) => b.classList.toggle("active", b === btn));
      textWrapper.style.display = mode === "teks" ? "block" : "none";
      linkWrapper.style.display = mode === "link" ? "block" : "none";
    });
  });

  function parseVerdict(rawText) {
    const match = rawText.match(/VERDICT:\s*(AMAN|PERLU_KONFIRMASI|BERPOTENSI_HOAKS)/i);
    const cleanText = rawText.replace(/VERDICT:\s*(AMAN|PERLU_KONFIRMASI|BERPOTENSI_HOAKS)/i, "").trim();
    let label = "ANALISIS SELESAI";
    let cls = "amber";
    if (match) {
      const v = match[1].toUpperCase();
      if (v === "AMAN") { label = "TERVERIFIKASI AMAN"; cls = "teal"; }
      else if (v === "BERPOTENSI_HOAKS") { label = "BERPOTENSI HOAKS"; cls = "red"; }
      else { label = "PERLU KONFIRMASI"; cls = "amber"; }
    }
    return { label, cls, cleanText };
  }

  scanBtn.addEventListener("click", async () => {
    const content = mode === "teks" ? textField.value.trim() : linkField.value.trim();

    errorBox.classList.remove("show");
    resultBox.classList.remove("show");
    resultBox.querySelector(".verdict-stamp")?.remove();

    if (!content) {
      errorBox.textContent = "Mohon masukkan input terlebih dahulu.";
      errorBox.classList.add("show");
      return;
    }

    scanBtn.disabled = true;
    loadingLine.style.display = "flex";

    try {
      const { text: rawText } = await postJSON("/api/scan", { content, mode });
      const { label, cls, cleanText } = parseVerdict(rawText);

      resultBody.textContent = cleanText;
      resultMeta.textContent = `BERKAS #${String(caseCounter).padStart(3, "0")} · ${new Date().toLocaleString("id-ID")}`;
      caseCounter += 1;

      const stamp = document.createElement("div");
      stamp.className = `verdict-stamp ${cls === "red" ? "" : cls}`;
      stamp.textContent = label;
      resultBox.appendChild(stamp);

      resultBox.classList.add("show");
    } catch (err) {
      errorBox.textContent = "Terjadi kesalahan teknis: " + err.message;
      errorBox.classList.add("show");
    } finally {
      scanBtn.disabled = false;
      loadingLine.style.display = "none";
    }
  });
}

/* ============================================================
   WATERMARK BACKGROUND — "SPENSA CORE" berulang
   ============================================================ */
function initWatermark() {
  const el = document.querySelector(".watermark");
  if (!el) return;
  const wordCount = 140; // cukup banyak untuk menutupi layar lebar & tinggi
  const frag = document.createDocumentFragment();
  for (let i = 0; i < wordCount; i++) {
    const span = document.createElement("span");
    span.textContent = "SPENSA CORE";
    frag.appendChild(span);
  }
  el.appendChild(frag);
}

/* ============================================================
   1. SMOOTH ANIMATION — reveal elemen saat masuk viewport
   ============================================================ */
function initRevealAnimations() {
  const targets = document.querySelectorAll(".reveal, .reveal-stagger");
  if (!targets.length) return;

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
}

/* ============================================================
   2. PARALLAX EFFECT — layer hero bergerak beda kecepatan
   ============================================================ */
function initParallax() {
  const layers = document.querySelectorAll(".parallax-layer");
  if (!layers.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let ticking = false;
  function update() {
    const y = window.scrollY;
    layers.forEach((el) => {
      const speed = parseFloat(el.dataset.speed || "0.2");
      el.style.transform = `translateY(${y * speed}px)`;
    });
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  });
  update();
}

document.addEventListener("DOMContentLoaded", () => {
  initWatermark();
  initFaqWidget();
  initScanPage();
  initRevealAnimations();
  initParallax();
});
