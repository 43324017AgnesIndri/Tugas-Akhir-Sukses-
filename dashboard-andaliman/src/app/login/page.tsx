"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toEmail } from "@/lib/recovery-shared";

// Foto latar: public/images/andaliman-bg.png
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

const UserIcon = () => (
  <svg {...sv}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
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

/* ---------- logo kecil (daun + buah andaliman) ---------- */
function Logo() {
  return (
    <svg width="54" height="54" viewBox="0 0 46 46" aria-hidden="true">
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

/* ---------- garis hiasan di bawah judul ---------- */
function Ornament() {
  return (
    <svg
      className="lg-orn"
      width="150"
      height="14"
      viewBox="0 0 150 14"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lgL" x1="0" x2="1">
          <stop offset="0" stopColor="#c4a76a" stopOpacity="0" />
          <stop offset="1" stopColor="#c4a76a" />
        </linearGradient>
        <linearGradient id="lgR" x1="0" x2="1">
          <stop offset="0" stopColor="#c4a76a" />
          <stop offset="1" stopColor="#c4a76a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="6.5" width="52" height="1" fill="url(#lgL)" />
      <rect x="98" y="6.5" width="52" height="1" fill="url(#lgR)" />
      <circle cx="62" cy="7" r="2.6" fill="#8a1c2b" />
      <circle cx="88" cy="7" r="2.6" fill="#8a1c2b" />
      <path className="lg-gem" d="M75 2l5 5-5 5-5-5z" fill="#c4a76a" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setBusy(true);

    const { error } = await createClient().auth.signInWithPassword({
      email: toEmail(username),
      password,
    });

    if (error) {
      setMessage(
        error.message === "Invalid login credentials"
          ? "Username atau password salah."
          : `Gagal masuk: ${error.message}`
      );
      setBusy(false);
      return;
    }

    // Bila pertanyaan pemulihan belum diatur, arahkan ke halaman pengisiannya
    let target = "/";
    try {
      const r = await fetch("/api/recovery/status");
      if (r.ok) {
        const j = (await r.json()) as { configured?: boolean };
        if (!j.configured) target = "/lengkapi-pemulihan";
      }
    } catch {
      /* abaikan, lanjut ke dashboard */
    }

    router.replace(target);
    router.refresh();
  };

  return (
    <div
      className="lg-wrap"
      style={{ "--lg-photo": `url(${BG})` } as CSSProperties}
    >
      <div className="lg-panel">
        <div className="lg-hero">
          <Logo />
          <h1>
            <span className="lg-t1">Andaliman</span>
            <span className="lg-t2">Storage</span>
          </h1>
          <Ornament />
        </div>

        <form className="lg-card" onSubmit={submit}>
          <h2>Selamat Datang</h2>
          <p className="lg-sub">Masuk untuk membuka dashboard Andaliman Storage.</p>

          <div className="lg-field">
            <label htmlFor="username">Username</label>
            <div className="lg-input">
              <UserIcon />
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
            <span />
            <Link href="/lupa-password" className="lg-link" style={{ textDecoration: "none" }}>
              Lupa password?
            </Link>
          </div>

          {message && <div className="lg-error">{message}</div>}

          <button type="submit" className="lg-btn" disabled={busy}>
            {busy ? "Memproses..." : "Masuk"} <ArrowIcon />
          </button>
        </form>
      </div>
    </div>
  );
}