// Dipakai di browser DAN server. Jangan impor modul Node di sini.

// Supabase Auth wajib memakai format email. Pengguna cukup mengetik username,
// lalu domain ini ditambahkan otomatis di belakang layar.
export const USERNAME_DOMAIN = "andaliman.app";

export const PASSWORD_MIN = 8;

export function toEmail(input: string): string {
  const v = input.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@${USERNAME_DOMAIN}`;
}

export function toUsername(email: string): string {
  const suffix = `@${USERNAME_DOMAIN}`;
  return email.toLowerCase().endsWith(suffix)
    ? email.slice(0, -suffix.length)
    : email;
}

// Pertanyaan pemulihan: tetap dan sama untuk semua pengguna.
export const QUESTIONS: string[] = [
  "Di mana sekolah dasar Anda?",
  "Apa warna favorit Anda?",
];

export const QUESTION_COUNT = QUESTIONS.length;