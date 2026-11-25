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
    <div className="rc-wrap">
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