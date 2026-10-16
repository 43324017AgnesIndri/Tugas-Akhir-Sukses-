import type { AlarmRow } from "@/lib/types";

export default function AlarmTable({ rows }: { rows: AlarmRow[] }) {
  return (
    <div className="c">
      <h2>Alarm dan kejadian terbaru</h2>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Parameter</th>
              <th>Nilai</th>
              <th>Status</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--mu)", textAlign: "center", padding: 20 }}>
                  Belum ada alarm.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.waktu}</td>
                <td>{r.parameter}</td>
                <td>{r.nilai}</td>
                <td>
                  <span className={`b tone-${r.severity}`} style={{ margin: 0 }}>
                    {r.status}
                  </span>
                </td>
                <td>{r.keterangan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
