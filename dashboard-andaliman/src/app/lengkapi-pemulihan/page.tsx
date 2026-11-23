"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { QUESTIONS } from "@/lib/recovery-shared";

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
    <div className="rc-wrap">
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