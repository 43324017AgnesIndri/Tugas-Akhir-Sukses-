import { BellOff } from "lucide-react";
import type { AlarmRow } from "@/lib/types";

export default function AlarmTable({ rows }: { rows: AlarmRow[] }) {
  return (
    <div className="c alarm-card">
      <h2>Recent Alarms and Events</h2>
      {rows.length === 0 ? (
        <div className="alarm-empty-state">
          <span className="alarm-empty-icon" aria-hidden="true">
            <BellOff size={36} strokeWidth={1.6} />
          </span>
          <p>No alarms yet.</p>
        </div>
      ) : (
        <>
          <div className="tw alarm-desktop">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Parameter</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.waktu}</td>
                    <td>{row.parameter}</td>
                    <td>{row.nilai}</td>
                    <td>
                      <span className={`b tone-${row.severity} alarm-status`}>
                        {row.status}
                      </span>
                    </td>
                    <td>{row.keterangan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="alarm-mobile">
            {rows.map((row) => (
              <div className="alarm-item" key={row.id}>
                <div className="alarm-row">
                  <span>Time</span>
                  <strong>{row.waktu}</strong>
                </div>
                <div className="alarm-row">
                  <span>Parameter</span>
                  <strong>{row.parameter}</strong>
                </div>
                <div className="alarm-row">
                  <span>Value</span>
                  <strong>{row.nilai}</strong>
                </div>
                <div className="alarm-row">
                  <span>Status</span>
                  <span><span className={`b tone-${row.severity} alarm-status`}>{row.status}</span></span>
                </div>
                <div className="alarm-row alarm-description">
                  <span>Notes</span>
                  <strong>{row.keterangan}</strong>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
