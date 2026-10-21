import type { AlarmRow } from "@/lib/types";

export default function AlarmTable({ rows }: { rows: AlarmRow[] }) {
  return (
    <div className="c alarm-card">
      <h2>Alarm dan kejadian terbaru</h2>

      {/* Desktop: tetap tabel */}
      <div className="tw alarm-desktop">
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
                <td
                  colSpan={5}
                  style={{
                    color: "var(--mu)",
                    textAlign: "center",
                    padding: 20,
                  }}
                >
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
                  <span
                    className={`b tone-${r.severity}`}
                    style={{ margin: 0 }}
                  >
                    {r.status}
                  </span>
                </td>
                <td>{r.keterangan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* HP: tampil sebagai kartu vertikal */}
      <div className="alarm-mobile">
        {rows.length === 0 ? (
          <div className="alarm-empty">
            Belum ada alarm.
          </div>
        ) : (
          rows.map((r) => (
            <div className="alarm-item" key={r.id}>
              <div className="alarm-row">
                <span>Waktu</span>
                <strong>{r.waktu}</strong>
              </div>

              <div className="alarm-row">
                <span>Parameter</span>
                <strong>{r.parameter}</strong>
              </div>

              <div className="alarm-row">
                <span>Nilai</span>
                <strong>{r.nilai}</strong>
              </div>

              <div className="alarm-row">
                <span>Status</span>
                <span>
                  <span className={`b tone-${r.severity}`}>
                    {r.status}
                  </span>
                </span>
              </div>

              <div className="alarm-row alarm-description">
                <span>Keterangan</span>
                <strong>{r.keterangan}</strong>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}