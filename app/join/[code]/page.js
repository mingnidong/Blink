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
    setStatus(`Sent: ${control.label}`);
  }

  if (!sessionInfo) {
    return (
      <div className="blink-root">
        <div className="blink-card">
          <h1 className="blink-join-title">Join session {code}</h1>
          <p className="blink-join-subtitle">
            Loading session info…
          </p>
          {status && <p className="blink-status">{status}</p>}
        </div>
      </div>
    );
  }

  const mainControl =
    sessionInfo.controls && sessionInfo.controls.length > 0
      ? sessionInfo.controls[0]
      : null;

  return (
    <div className="blink-root">
      <div className="blink-card">
        <h1 className="blink-join-title">{sessionInfo.title}</h1>
        <p className="blink-join-subtitle">
          Code: <strong>{code}</strong>
        </p>
        {user ? (
          <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>
            You are: <strong>{user.display_name || user.email}</strong>
          </p>
        ) : (
          <p style={{ fontSize: '0.9rem', color: '#b91c1c', marginBottom: 12 }}>
            No local account. Go back to the home page and register your email.
          </p>
        )}

        {mainControl ? (
          <>
            <p style={{ fontSize: '0.9rem', marginBottom: 10 }}>
              Tap whenever this applies:
            </p>
            <button
              type="button"
              className="blink-btn blink-btn-primary blink-big-button"
              onClick={() => handlePress(mainControl)}
            >
              {mainControl.label}
            </button>
          </>
        ) : (
          <p>No controls configured for this session.</p>
        )}

        {status && <p className="blink-status">{status}</p>}
      </div>
    </div>
  );
}