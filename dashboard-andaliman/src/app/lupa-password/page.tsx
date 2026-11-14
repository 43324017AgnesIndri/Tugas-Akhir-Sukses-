"use client";

import Link from "next/link";
import { useState, type CSSProperties, type FormEvent } from "react";
import { PASSWORD_MIN, QUESTIONS } from "@/lib/recovery-shared";

type Step = "username" | "answer" | "done";

async function post(url: string, body: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await r.json().catch(() => ({}))) as { error?: string; questions?: string[] };
  return { ok: r.ok, ...j };
}

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

export default function LupaPasswordPage() {
  const [step, setStep] = useState<Step>("username");
  const [username, setUsername] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>(QUESTIONS.map(() => ""));
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const next = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const r = await post("/api/recovery/questions", { username });
      if (!r.ok || !r.questions) {
        setMsg(r.error ?? "Gagal memuat pertanyaan.");
        return;
      }
      setQuestions(r.questions);
      setAnswers(r.questions.map(() => ""));
      setStep("answer");
    } catch {
      setMsg("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (pw.length < PASSWORD_MIN) {
      setMsg(`Password baru minimal ${PASSWORD_MIN} karakter.`);
      return;
    }
    if (pw !== pw2) {
      setMsg("Konfirmasi password tidak sama.");
      return;
    }
    setBusy(true);
    try {
      const r = await post("/api/recovery/reset", { username, answers, newPassword: pw });
      if (!r.ok) {
        setMsg(r.error ?? "Gagal.");
        return;
      }
      setStep("done");
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
        <h1>Lupa Password</h1>

        {step === "username" && (
          <>
            <p className="rc-sub">Masukkan username Anda untuk memulihkan akun.</p>
            <form onSubmit={next}>
              <div className="rc-field">
                <label htmlFor="u">Username</label>
                <input
                  id="u"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              {msg && <div className="rc-error">{msg}</div>}
              <button type="submit" className="rc-btn" disabled={busy}>
                {busy ? "Memproses..." : "Lanjut"}
              </button>
            </form>
            <Link href="/login" className="rc-back">Kembali ke halaman masuk</Link>
          </>
        )}

        {step === "answer" && (
          <>
            <p className="rc-sub">Jawab pertanyaan yang Anda pilih saat mengatur pemulihan akun.</p>
            <form onSubmit={reset}>
              {questions.map((q, i) => (
                <div className="rc-field" key={i}>
                  <label htmlFor={`a${i}`}>{i + 1}. {q}</label>
                  <input
                    id={`a${i}`}
                    type="text"
                    autoComplete="off"
                    required
                    value={answers[i]}
                    onChange={(e) => {
                      const a = [...answers];
                      a[i] = e.target.value;
                      setAnswers(a);
                    }}
                  />
                </div>
              ))}

              <div className="rc-field">
                <label htmlFor="p1">Password baru</label>
                <input id="p1" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} />
              </div>
              <div className="rc-field">
                <label htmlFor="p2">Ulangi password baru</label>
                <input id="p2" type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </div>

              {msg && <div className="rc-error">{msg}</div>}
              <button type="submit" className="rc-btn" disabled={busy}>
                {busy ? "Memproses..." : "Ganti password"}
              </button>
            </form>
            <Link href="/login" className="rc-back">Kembali ke halaman masuk</Link>
          </>
        )}

        {step === "done" && (
          <>
            <div className="rc-ok">
              Password berhasil diganti. Silakan masuk dengan password baru.
            </div>
            <Link href="/login" className="rc-btn">Ke halaman masuk</Link>
          </>
        )}
      </div>
    </div>
  );
}