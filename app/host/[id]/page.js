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

  // Export session data as JSON file
  const handleExportData = () => {
    if (!summary) {
      alert('No data to export yet.');
      return;
    }

    const exportData = {
      sessionId: id,
      exportedAt: new Date().toISOString(),
      bucketSize: summary.bucketSize,
      buttonSeries: summary.buttonSeries || [],
      sliderSeries: summary.sliderSeries || [],
      participants: summary.participants || []
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-${id}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f9ff 0%, #f3e8ff 100%)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ fontSize: '2rem' }}>👁️</div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Blink Host View
            </h1>
          </div>
          <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Session ID: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{id}</code>
            <span style={{ marginLeft: 12, color: '#94a3b8' }}>• Auto-refresh every 3 seconds</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
          <button
            onClick={handleExportData}
            style={{
              padding: '10px 16px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            ⬇️ Export data as JSON
          </button>
        </div>

        {!summary && (
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⏳</div>
            <p style={{ fontSize: '1.1rem', color: '#64748b', margin: 0 }}>Loading session data…</p>
          </div>
        )}

        {summary && (
          <>
            <div style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>
                  📊 Confusion Timeline
                </h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                  Real-time visualization of student confusion levels (5-second buckets)
                </p>
              </div>

              {heatBuckets.length === 0 || maxCount === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: '2rem', marginBottom: 12 }}>👂</div>
                  <p style={{ color: '#64748b', margin: 0 }}>Waiting for student responses…</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginTop: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 50, color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                      <div style={{ marginBottom: 6 }}>{maxCount}</div>
                      <div style={{ marginTop: 'auto', marginBottom: 6 }}>{Math.ceil(maxCount / 2)}</div>
                      <div>0</div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ height: 200, marginBottom: 12 }}>
                        <svg viewBox={`0 0 ${Math.max(heatBuckets.length, 1)} ${Math.max(maxCount, 1)}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                          <defs>
                            <linearGradient id="histGrad" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.95" />
                              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
                            </linearGradient>
                            <linearGradient id="emptyGrad" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="#f0f4f8" />
                              <stop offset="100%" stopColor="#e2e8f0" />
                            </linearGradient>
                          </defs>

                          {heatBuckets.map((bucket, i) => {
                            const count = bucket.totalCount || 0;
                            const x = i + 0.1;
                            const w = 0.8;
                            const h = Math.max(0.01, count);
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
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 50 }} />
                        <div style={{ flex: 1, position: 'relative' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
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
            </div>

            {summary.participants && summary.participants.length > 0 && (
              <div style={{
                background: '#fff',
                borderRadius: 12,
                padding: 24,
                marginBottom: 24,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>
                    👥 Participants ({summary.participants.length})
                  </h2>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                    Students in this session and their engagement
                  </p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
                        <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Presses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.participants.map((p, idx) => (
                        <tr key={p.userId} style={{ borderBottom: idx < summary.participants.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <td style={{ padding: '12px 0', fontSize: '0.95rem', color: '#1e293b', fontWeight: 500 }}>
                            {p.displayName || p.email || p.userId}
                          </td>
                          <td style={{ padding: '12px 0', fontSize: '0.9rem', color: '#64748b' }}>
                            {p.email || '—'}
                          </td>
                          <td style={{ padding: '12px 0', textAlign: 'right' }}>
                            <span style={{
                              display: 'inline-block',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                              color: '#fff',
                              padding: '4px 12px',
                              borderRadius: 20,
                              fontSize: '0.85rem',
                              fontWeight: 700
                            }}>
                              {p.count}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {summary.sliderSeries && summary.sliderSeries.length > 0 && (
              <div style={{
                background: '#fff',
                borderRadius: 12,
                padding: 24,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
                border: '1px solid #e2e8f0'
              }}>
                <h2 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>
                  📈 Raw Slider Data
                </h2>
                <pre
                  style={{
                    background: '#1e293b',
                    color: '#e2e8f0',
                    padding: 16,
                    borderRadius: 8,
                    maxHeight: 320,
                    overflow: 'auto',
                    fontSize: '0.8rem',
                    lineHeight: '1.5',
                    margin: 0
                  }}
                >
                  {JSON.stringify(summary.sliderSeries, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
