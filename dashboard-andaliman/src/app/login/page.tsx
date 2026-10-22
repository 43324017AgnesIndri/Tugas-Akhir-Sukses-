"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const BG = "/images/andaliman-bg.png";

/* ---------- ikon kecil ---------- */
const sv = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const MailIcon = () => (
  <svg {...sv}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);

const LockIcon = () => (
  <svg {...sv}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

const EyeIcon = ({ off }: { off: boolean }) => (
  <svg {...sv}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

const ArrowIcon = () => (
  <svg {...sv} width={18} height={18}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/* ---------- logo sederhana (daun + buah andaliman) ---------- */
function Logo() {
  return (
    <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">
      <path d="M22 20C20 9 28 3 40 3c1 11-7 18-18 17z" fill="#3f7d3a" />
      <path d="M8 22c-5 6-3 14 3 17 2-8 1-13-3-17z" fill="#2f6a35" />
      {[
        [24, 26],
        [31, 27],
        [20, 32],
        [27, 33],
        [34, 33],
        [23, 39],
        [30, 40],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4.6" fill="#8a1c2b" />
      ))}
    </svg>
  );
}

/* ---------- hiasan pemisah (garis emas + buah andaliman) ---------- */
function Ornament() {
  return (
    <svg
      className="lg-orn"
      width="240"
      height="14"
      viewBox="0 0 240 14"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="orn-l" x1="0" x2="1">
          <stop offset="0" stopColor="#b8975a" stopOpacity="0" />
          <stop offset="1" stopColor="#b8975a" />
        </linearGradient>
        <linearGradient id="orn-r" x1="0" x2="1">
          <stop offset="0" stopColor="#b8975a" />
          <stop offset="1" stopColor="#b8975a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1="7" x2="96" y2="7" stroke="url(#orn-l)" strokeWidth="1.2" />
      <circle cx="106" cy="7" r="3" fill="#8a1c2b" />
      <path className="lg-gem" d="M120 1.5l5.5 5.5-5.5 5.5L114.5 7z" fill="#b8975a" />
      <circle cx="134" cy="7" r="3" fill="#8a1c2b" />
      <line x1="144" y1="7" x2="240" y2="7" stroke="url(#orn-r)" strokeWidth="1.2" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Hanya untuk tampilan
  const [show, setShow] = useState(false);
  const [hint, setHint] = useState(false);

  /* ===== Logika masuk: sama persis dengan versi lama ===== */
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setBusy(true);

    const { error } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(
        error.message === "Invalid login credentials"
          ? "Email atau password salah."
          : `Gagal masuk: ${error.message}`
      );
      setBusy(false);
      return;
    }

    router.replace("/");
    router.refresh();
  };
  /* ======================================================= */

  return (
    <div
      className="lg-wrap"
      style={{ "--lg-photo": `url(${BG})` } as CSSProperties}
    >
      <div className="lg-panel">
        <header className="lg-hero">
          <Logo />
          <h1>
            <span className="lg-t1">Andaliman</span>
            <span className="lg-t2">Storage</span>
          </h1>
          <Ornament />
        </header>

        <form className="lg-card" onSubmit={submit}>
          <h2>Selamat Datang</h2>
          <p className="lg-sub">Masuk untuk membuka dashboard Andaliman Storage.</p>

          <div className="lg-field">
            <label htmlFor="email">Email</label>
            <div className="lg-input">
              <MailIcon />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="lg-field">
            <label htmlFor="password">Password</label>
            <div className="lg-input">
              <LockIcon />
              <input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="lg-eye"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
              >
                <EyeIcon off={!show} />
              </button>
            </div>
          </div>

          <div className="lg-row">
            <label>
              <input type="checkbox" /> Ingat saya
            </label>
            <button type="button" className="lg-link" onClick={() => setHint(true)}>
              Lupa password?
            </button>
          </div>

          {hint && (
            <div className="lg-hint">
              Hubungi admin untuk mengatur ulang password Anda.
            </div>
          )}
          {message && <div className="lg-error">{message}</div>}

          <button type="submit" className="lg-btn" disabled={busy}>
            {busy ? "Memproses..." : "Masuk"} <ArrowIcon />
          </button>
        </form>
      </div>
    </div>
  );
}