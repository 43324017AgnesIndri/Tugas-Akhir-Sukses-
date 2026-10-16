"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        error.message === "Invalid login credentials" ? "Email atau password salah." : `Gagal masuk: ${error.message}`
      );
      setBusy(false);
      return;
    }

    router.replace("/");
    router.refresh();
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Andaliman Storage</h1>
        <p>Masuk untuk membuka dashboard.</p>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {message && <div className="note tone-bd">{message}</div>}
          <button type="submit" className="apply" style={{ marginTop: 14 }} disabled={busy}>
            {busy ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
