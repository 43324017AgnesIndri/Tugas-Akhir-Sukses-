"use client";

import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type FormEvent } from "react";
import { QUESTIONS } from "@/lib/recovery-shared";

/* Gaya halaman ini ditaruh di sini, jadi tidak perlu mengubah globals.css */
const RC_CSS = `
.rc-wrap {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #0f2b1d var(--rc-photo) center / cover no-repeat;
}

.rc-wrap::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(8, 26, 17, 0.35);
}

.rc-card {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 480px;
  padding: 36px 34px;
  border-radius: 24px;
  background: rgba(251, 250, 244, 0.96);
  border: 1px solid rgba(217, 191, 134, 0.5);
  box-shadow: 0 24px 60px rgba(4, 16, 10, 0.35);
  color: #1c201d;
}

.rc-card h1 {
  font-family: var(--font-serif, Georgia), Georgia, serif;
  font-size: 32px;
  line-height: 1.1;
  font-weight: 600;
  color: #14402a;
  margin: 0;
}

.rc-sub {
  margin: 8px 0 22px;
  color: #5d675f;
  font-size: 14px;
}

.rc-field {
  margin-bottom: 16px;
}

.rc-field label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #5d675f;
}

.rc-field input,
.rc-field select {
  width: 100%;
  height: 50px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid #cfe0d8;
  background: #eef4f1;
  color: #1c201d;
  font-size: 15px;
}

.rc-field input:focus,
.rc-field select:focus {
  outline: none;
  border-color: #1f7a52;
  box-shadow: 0 0 0 3px rgba(31, 122, 82, 0.15);
}

.rc-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 52px;
  margin-top: 8px;
  border: 0;
  border-radius: 14px;
  background: #0f3d26;
  color: #f6f4ea;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.45s ease;
}

.rc-btn:hover:not(:disabled) {
  background: #1f7a52;
}

.rc-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.rc-error,
.rc-ok {
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
}

.rc-error {
  background: #f4dcd6;
  color: #a8261f;
}

.rc-ok {
  background: #dcefe5;
  color: #1f6b4a;
}

.rc-back {
  display: block;
  margin-top: 16px;
  text-align: center;
  color: #1f7a52;
  font-size: 14px;
  text-decoration: none;
}

.rc-back:hover {
  text-decoration: underline;
}
`;

export default function LengkapiPemulihanPage() {
  const router = useRouter();
  const [as, setAs] = useState<string[]>(QUESTIONS.map(() => ""));
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (as.some((a) => a.trim().length < 3)) {
      setMsg("Setiap jawaban minimal 3 karakter.");
      return;
    }

    setBusy(true);
    try {
      const r = await fetch("/api/recovery/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: QUESTIONS.map((question, i) => ({ question, answer: as[i] })),
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setMsg(j.error ?? "Gagal menyimpan.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setMsg("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="rc-wrap"
      style={{ "--rc-photo": "url(/images/andaliman-bg.png)" } as CSSProperties}
    >
      <style>{RC_CSS}</style>
      <div className="rc-card">
        <h1>Pemulihan Akun</h1>
        <p className="rc-sub">
          Jawab dua pertanyaan ini. Jawabannya dipakai untuk memulihkan akun bila Anda lupa
          password, jadi pilih jawaban yang hanya Anda yang tahu.
        </p>
        <form onSubmit={submit}>
          {QUESTIONS.map((q, i) => (
            <div className="rc-field" key={q}>
              <label htmlFor={`a${i}`}>{q}</label>
              <input
                id={`a${i}`}
                type="text"
                autoComplete="off"
                placeholder="Jawaban Anda"
                value={as[i]}
                onChange={(e) => {
                  const n = [...as];
                  n[i] = e.target.value;
                  setAs(n);
                }}
              />
            </div>
          ))}

          {msg && <div className="rc-error">{msg}</div>}
          <button type="submit" className="rc-btn" disabled={busy}>
            {busy ? "Menyimpan..." : "Simpan"}
          </button>
        </form>
      </div>
    </div>
  );
}