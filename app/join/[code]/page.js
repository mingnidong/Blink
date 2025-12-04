// app/join/[code]/page.js
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const STORAGE_KEY = 'blink_user';

export default function JoinPage() {
  const params = useParams();
  const code = params.code;

  const [user, setUser] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [status, setStatus] = useState('');
  const [pressCount, setPressCount] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!code) return;
    async function load() {
      const res = await fetch(`/api/sessions/by-code/${code}`);
      if (!res.ok) {
        setStatus('Session not found');
        return;
      }
      const data = await res.json();
      setSessionInfo(data);
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const localUser = stored ? JSON.parse(stored) : null;
        if (localUser && localUser.id) {
          fetch(`/api/sessions/${data.sessionId}/participants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: localUser.id })
          }).catch(() => {});
        }
      } catch {
        // ignore
      }
    }
    load();
  }, [code]);

  async function handlePress(control) {
    if (!user) {
      alert('Go back to the home page and register your email first.');
      return;
    }
    const res = await fetch(`/api/sessions/${sessionInfo.sessionId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        controlId: control.id,
        value:
          control.control_type === 'button'
            ? 1
            : control.default_value ?? control.min_value ?? 1,
        userId: user.id
      })
    });
    if (!res.ok) {
      alert('Error sending event');
      return;
    }
    setPressCount(pressCount + 1);
    setStatus(`✓ Sent: ${control.label}`);
    setTimeout(() => setStatus(''), 2000);
  }

  if (!sessionInfo) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fef3c7 0%, #fecaca 100%)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⏳</div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Loading session…</h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>Code: <code style={{ fontFamily: 'monospace', fontWeight: 600 }}>{code}</code></p>
            {status && <p style={{ marginTop: 12, color: '#dc2626', fontSize: '0.9rem' }}>⚠️ {status}</p>}
          </div>
        </div>
      </div>
    );
  }

  const mainControl =
    sessionInfo.controls && sessionInfo.controls.length > 0
      ? sessionInfo.controls[0]
      : null;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fef3c7 0%, #fecaca 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 40,
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>👁️</div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>
            {sessionInfo.title}
          </h1>
          <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Code: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontWeight: 600 }}>{code}</code>
          </p>
        </div>

        {user ? (
          <>
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 8,
              padding: 12,
              marginBottom: 24,
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#166534' }}>
                ✓ Logged in as <strong>{user.display_name || user.email}</strong>
              </p>
            </div>

            {mainControl ? (
              <>
                <p style={{ fontSize: '1rem', textAlign: 'center', color: '#475569', marginBottom: 24, fontWeight: 500 }}>
                  Tap the button whenever you feel:
                </p>
                <button
                  type="button"
                  onClick={() => handlePress(mainControl)}
                  style={{
                    width: '100%',
                    padding: '32px 24px',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 16,
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    boxShadow: '0 8px 20px rgba(249, 115, 22, 0.4)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    marginBottom: 16
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.02) translateY(-2px)';
                    e.target.style.boxShadow = '0 12px 28px rgba(249, 115, 22, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '0 8px 20px rgba(249, 115, 22, 0.4)';
                  }}
                >
                  {mainControl.label}
                </button>

                {pressCount > 0 && (
                  <div style={{
                    background: '#dbeafe',
                    border: '1px solid #7dd3fc',
                    borderRadius: 8,
                    padding: 12,
                    textAlign: 'center',
                    color: '#0c4a6e',
                    fontSize: '0.9rem'
                  }}>
                    📊 You've sent <strong>{pressCount}</strong> signal{pressCount !== 1 ? 's' : ''} this session
                  </div>
                )}

                {status && (
                  <div style={{
                    background: '#dcfce7',
                    border: '1px solid #86efac',
                    borderRadius: 8,
                    padding: 12,
                    marginTop: 12,
                    color: '#166534',
                    fontSize: '0.9rem',
                    textAlign: 'center'
                  }}>
                    {status}
                  </div>
                )}
              </>
            ) : (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: 16,
                textAlign: 'center',
                color: '#991b1b'
              }}>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>⚠️ No controls configured</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>This session doesn't have any controls set up yet.</p>
              </div>
            )}
          </>
        ) : (
          <div style={{
            background: '#fef2f2',
            border: '2px solid #fca5a5',
            borderRadius: 8,
            padding: 20,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔐</div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700, color: '#991b1b' }}>Account required</h2>
            <p style={{ margin: '8px 0 16px 0', color: '#7c2d12', fontSize: '0.95rem' }}>
              You need to create an account before you can participate in this session.
            </p>
            <a
              href="/"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: '0.95rem',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.style.transform = 'translateY(0)'}
            >
              → Go to home page
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
