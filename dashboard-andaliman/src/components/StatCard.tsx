import type { Severity } from "@/lib/types";

interface Props {
  label: string;
  value: string;
  badge: string;
  severity: Severity;
  hint?: string;
}

export default function StatCard({ label, value, badge, severity, hint }: Props) {
  return (
    <div className="c">
      <div className="lbl">{label}</div>
      <div className="big">{value}</div>
      <span className={`b tone-${severity}`}>{badge}</span>
      {hint && <div className="rng">{hint}</div>}
    </div>
  );
}
