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
              {/* Heat strip */}
              <div className="blink-heatstrip">
                {heatBuckets.map(bucket => {
                  const intensity = bucket.totalCount / maxCount; // 0..1
                  const alpha = 0.15 + 0.85 * intensity; // avoid pure white
                  const bg = `rgba(37, 99, 235, ${alpha.toFixed(2)})`;
                  return (
                    <div
                      key={bucket.bucket}
                      className="blink-heatcell"
                      title={`t=${bucket.bucket * summary.bucketSize}–${
                        (bucket.bucket + 1) * summary.bucketSize
                      }s, count=${bucket.totalCount}`}
                      style={{ backgroundColor: bg }}
                    />
                  );
                })}
              </div>

              {/* Labels: start and end times */}
              <div className="blink-heatcell-labels">
                <span>
                  t = {heatBuckets[0].bucket * summary.bucketSize}s
                </span>
                <span>
                  t ={' '}
                  {(heatBuckets[heatBuckets.length - 1].bucket + 1) *
                    summary.bucketSize}
                  s
                </span>
              </div>
            </>
          )}

          {/* Compact table for exact values */}
          {groupedBuckets.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ marginTop: 0 }}>Raw counts</h3>
              <div className="blink-summary-grid">
                <div className="blink-summary-header">
                  <div>Time window (s)</div>
                  <div>Control ID</div>
                  <div>Count</div>
                </div>
                {groupedBuckets.map(bucket => {
                  const start = bucket.bucket * summary.bucketSize;
                  const end = start + summary.bucketSize;
                  return bucket.rows.map(row => (
                    <div
                      key={`${bucket.bucket}-${row.controlId}`}
                      className="blink-summary-row"
                    >
                      <div>
                        {start} – {end}
                      </div>
                      <div>{row.controlId}</div>
                      <div>{row.count}</div>
                    </div>
                  ));
                })}
              </div>
            </div>
          )}

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
        </section>
      )}
    </div>
  );
}