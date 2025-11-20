// app/host/[id]/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

export default function HostPage() {
  const params = useParams();
  const id = params.id;

  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!id) return;

    async function load() {
      const res = await fetch(`/api/sessions/${id}/summary?bucket=5`);
      if (!res.ok) return;
      const data = await res.json();
      setSummary(data);
    }
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [id]);

  // Group by bucket and also compute total confusion per bucket
  const { groupedBuckets, heatBuckets, maxCount } = useMemo(() => {
    if (!summary) {
      return { groupedBuckets: [], heatBuckets: [], maxCount: 0 };
    }

    const byBucket = new Map();
    for (const row of summary.buttonSeries || []) {
      const key = row.bucket;
      if (!byBucket.has(key)) byBucket.set(key, []);
      byBucket.get(key).push(row);
    }

    const grouped = [];
    const heat = [];
    let max = 0;

    for (const [bucket, rows] of byBucket.entries()) {
      grouped.push({ bucket, rows });

      const totalCount = rows.reduce((acc, r) => acc + (r.count || 0), 0);
      heat.push({ bucket, totalCount });
      if (totalCount > max) max = totalCount;
    }

    grouped.sort((a, b) => a.bucket - b.bucket);
    heat.sort((a, b) => a.bucket - b.bucket);

    return { groupedBuckets: grouped, heatBuckets: heat, maxCount: max };
  }, [summary]);

  // compute tick positions and formatting for x-axis (minutes)
  const { ticks } = useMemo(() => {
    if (!summary || !heatBuckets || heatBuckets.length === 0) return { ticks: [] };

    const totalBuckets = heatBuckets.length;
    const totalSeconds = totalBuckets * summary.bucketSize;

    // Try to show up to ~6 ticks; prefer 1 tick per minute when possible
    const approxMinutes = Math.max(1, Math.round(totalSeconds / 60));
    const desiredTicks = Math.min(6, approxMinutes || 1);

    let tickInterval = Math.max(1, Math.floor(totalBuckets / desiredTicks));
    // avoid too dense ticks
    if (tickInterval < 1) tickInterval = 1;

    const t = [];
    for (let b = 0; b < totalBuckets; b += tickInterval) {
      const seconds = b * summary.bucketSize;
      const minutes = Math.round(seconds / 60);
      const label = minutes >= 1 ? `${minutes}m` : `${seconds}s`;
      t.push({ bucket: b, label, seconds });
    }

    // ensure last tick is included
    const lastBucket = totalBuckets - 1;
    const lastSeconds = (lastBucket + 1) * summary.bucketSize;
    const lastMinutes = Math.round(lastSeconds / 60);
    const lastLabel = lastMinutes >= 1 ? `${lastMinutes}m` : `${lastSeconds}s`;
    if (!t.length || t[t.length - 1].bucket !== lastBucket) {
      t.push({ bucket: lastBucket, label: lastLabel, seconds: lastSeconds });
    }

    return { ticks: t };
  }, [summary, heatBuckets]);

  return (
    <div className="blink-root">
      <div className="blink-card">
        <h1>Host view</h1>
        <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
          Session ID: <code>{id}</code>
          <br />
          Data refreshes every 3 seconds. Bucket size: 5 seconds.
        </p>
      </div>

      {!summary && (
        <div className="blink-card">
          <p>Loading summary…</p>
        </div>
      )}

      {summary && (
        <section className="blink-card blink-summary-section">
          <h2>Confusion timeline</h2>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: 4 }}>
            Each cell is a 5-second window. Darker = more “Confused” presses.
          </p>

          {heatBuckets.length === 0 || maxCount === 0 ? (
            <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: 8 }}>
              No button presses yet.
            </p>
          ) : (
            <>
              {/* Histogram (gradient bars) with axes */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginTop: 12 }}>
                {/* Y axis labels (simple) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 40, color: '#6b7280', fontSize: '0.8rem' }}>
                  <div style={{ marginBottom: 6 }}>{maxCount}</div>
                  <div style={{ marginTop: 'auto', marginBottom: 6 }}>{Math.ceil(maxCount / 2)}</div>
                  <div>0</div>
                </div>

                {/* Bars + x-axis */}
                <div style={{ flex: 1 }}>
                  {/* SVG histogram: viewBox width = buckets, height = maxCount (scaled) */}
                  <div style={{ height: 160 }}>
                    <svg viewBox={`0 0 ${Math.max(heatBuckets.length, 1)} ${Math.max(maxCount, 1)}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                      <defs>
                        <linearGradient id="histGrad" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.95" />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.6" />
                        </linearGradient>
                        <linearGradient id="emptyGrad" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#f3f4f6" />
                          <stop offset="100%" stopColor="#e5e7eb" />
                        </linearGradient>
                      </defs>

                      {heatBuckets.map((bucket, i) => {
                        const count = bucket.totalCount || 0;
                        const x = i + 0.1; // small padding
                        const w = 0.8; // width in viewBox units
                        const h = Math.max(0.01, count); // avoid zero height in viewBox
                        const y = Math.max(0, (Math.max(maxCount, 1) - h));
                        const fill = count === 0 ? 'url(#emptyGrad)' : 'url(#histGrad)';
                        return (
                          <rect
                            key={bucket.bucket}
                            x={x}
                            y={y}
                            width={w}
                            height={h}
                            fill={fill}
                            rx={0.12}
                            title={`t=${bucket.bucket * summary.bucketSize}–${(bucket.bucket + 1) * summary.bucketSize}s, count=${count}`}
                          />
                        );
                      })}
                    </svg>

                    {/* histogram rendered above; debug/info removed */}
                  </div>

                  {/* X-axis ticks */}
                  <div style={{ display: 'flex', marginTop: 8, alignItems: 'center', gap: 4 }}>
                    {/* tick labels laid out across the same width as bars */}
                    <div style={{ width: 40 }} />
                    <div style={{ flex: 1, position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6b7280' }}>
                        {ticks.map((t, idx) => (
                          <div key={t.bucket} style={{ textAlign: idx === ticks.length - 1 ? 'right' : 'left' }}>{t.label}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Raw counts removed; histogram provides the aggregated view. */}

          {summary.sliderSeries && summary.sliderSeries.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ marginTop: 0 }}>Slider averages (raw)</h3>
              <pre
                style={{
                  background: '#111',
                  color: '#eee',
                  padding: 10,
                  borderRadius: 8,
                  maxHeight: 260,
                  overflow: 'auto',
                  fontSize: '0.8rem'
                }}
              >
                {JSON.stringify(summary.sliderSeries, null, 2)}
              </pre>
            </div>
          )}

          {/* Participants: show who joined and how many button presses they made */}
          {summary.participants && summary.participants.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ marginTop: 0 }}>Participants</h3>
              <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: 4 }}>
                Who joined the session and how many times they pressed the main button.
              </p>
              <div style={{ marginTop: 8 }}>
                {/* Header row */}
                <div style={{ display: 'flex', padding: '6px 0', borderBottom: '2px solid #e5e7eb', fontWeight: 600 }}>
                  <div style={{ flex: 1 }}>Name</div>
                  <div style={{ flex: 1 }}>Email</div>
                  <div style={{ width: 90, textAlign: 'right' }}>Presses</div>
                </div>
                {summary.participants.map(p => (
                  <div
                    key={p.userId}
                    style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee', alignItems: 'center' }}
                  >
                    <div style={{ flex: 1, fontSize: '0.95rem' }}>
                      {p.displayName || p.email || p.userId}
                    </div>
                    <div style={{ flex: 1, color: '#374151', wordBreak: 'break-word' }}>
                      {p.email || '—'}
                    </div>
                    <div style={{ width: 90, textAlign: 'right', color: '#6b7280' }}>{p.count} presses</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}