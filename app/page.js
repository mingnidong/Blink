// app/page.js
'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'blink_user';

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [title, setTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [createdSession, setCreatedSession] = useState(null);
  const [status, setStatus] = useState('');

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Load stored user from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch sessions for this user
  useEffect(() => {
    if (!user) return;

    async function fetchSessions() {
      setLoadingSessions(true);
      setStatus('');
      const res = await fetch(`/api/sessions?hostUserId=${user.id}`);
      if (!res.ok) {
        setStatus('Error loading sessions');
        setLoadingSessions(false);
        return;
      }
      const data = await res.json();
      setSessions(data);
      setLoadingSessions(false);
    }

    fetchSessions();
  }, [user]);

  async function handleRegister(e) {
    e.preventDefault();
    setStatus('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, displayName })
    });
    if (!res.ok) {
      setStatus('Error registering user');
      return;
    }
    const data = await res.json();
    setUser(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
    setStatus('Account saved locally');
  }

  async function handleCreateSession(e) {
    e.preventDefault();
    setStatus('');
    if (!user) {
      setStatus('Register an account first.');
      return;
    }
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostUserId: user.id,
        title,
        description: '',
        controls: [
          { controlType: 'button', label: 'Confused', slug: 'confused' }
        ]
      })
    });
    if (!res.ok) {
      setStatus('Error creating session');
      return;
    }
    const data = await res.json();
    setCreatedSession(data);
    setStatus(`Session created with code ${data.joinCode}`);

    // Refresh list of sessions
    try {
      const listRes = await fetch(`/api/sessions?hostUserId=${user.id}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        setSessions(listData);
      }
    } catch {
      // ignore
    }
  }

  function handleGoHost(idToOpen) {
    window.location.href = `/host/${idToOpen}`;
  }

  function handleGoJoin(e) {
    e.preventDefault();
    if (!joinCode) return;
    window.location.href = `/join/${joinCode.toUpperCase()}`;
  }

  async function handleEndSession(sessionId) {
    setStatus('');
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH'
    });
    if (!res.ok) {
      setStatus('Error ending session');
      return;
    }
    // Refresh sessions list
    if (!user) return;
    const listRes = await fetch(`/api/sessions?hostUserId=${user.id}`);
    if (listRes.ok) {
      const listData = await listRes.json();
      setSessions(listData);
    }
  }

  const activeSessions = sessions.filter(s => !s.ended_at);
  const pastSessions = sessions.filter(s => !!s.ended_at);

  return (
    <div className="blink-root">
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ marginBottom: 4 }}>Blink</h1>
        <p style={{ margin: 0, color: '#4b5563', fontSize: '0.95rem' }}>
          Let your audience tap once when they are lost. You get a timeline of confusion.
        </p>
      </header>

      {!user && (
        <section className="blink-card">
          <h2>Step 1 · Set up your account</h2>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: 4 }}>
            This just stores your email and name locally and in the profiles table.
          </p>
          <form onSubmit={handleRegister} style={{ marginTop: 10 }}>
            <div className="blink-field">
              <label className="blink-label">Email</label>
              <input
                className="blink-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                type="email"
              />
            </div>
            <div className="blink-field">
              <label className="blink-label">Name (optional)</label>
              <input
                className="blink-input"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
            </div>
            <button className="blink-btn blink-btn-primary" type="submit">
              Save account
            </button>
          </form>
        </section>
      )}

      {user && (
        <section className="blink-card">
          <h2>Account</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem' }}>
            Logged in as{' '}
            <strong>{user.display_name || user.email}</strong>
          </p>
        </section>
      )}

      {user && (
        <section className="blink-card">
          <h2>Step 2 · Host a Blink session</h2>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: 4 }}>
            Creates a session with a single “Confused” button for now.
          </p>
          <form onSubmit={handleCreateSession} style={{ marginTop: 10 }}>
            <div className="blink-field">
              <label className="blink-label">Session title</label>
              <input
                className="blink-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="CIS 550 – Indexing lecture"
              />
            </div>
            <button className="blink-btn blink-btn-primary" type="submit">
              Create session
            </button>
          </form>

          {createdSession && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: '0.9rem', marginBottom: 6 }}>
                Join code:{' '}
                <strong>{createdSession.joinCode}</strong>
              </div>
              <div className="blink-row">
                <button
                  className="blink-btn blink-btn-secondary"
                  type="button"
                  onClick={() => handleGoHost(createdSession.sessionId)}
                >
                  Open host view
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {user && (
        <section className="blink-card">
          <h2>Your sessions</h2>
          {loadingSessions && (
            <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>Loading…</p>
          )}

          {!loadingSessions && activeSessions.length === 0 && pastSessions.length === 0 && (
            <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
              No sessions yet. Create your first Blink above.
            </p>
          )}

          {!loadingSessions && activeSessions.length > 0 && (
            <>
              <h3 style={{ margin: '8px 0 4px 0', fontSize: '0.95rem' }}>Active</h3>
              {activeSessions.map(s => (
                <div
                  key={s.id}
                  style={{
                    padding: '6px 0',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.95rem' }}>{s.title}</div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#6b7280',
                        marginTop: 2
                      }}
                    >
                      Code: <strong>{s.join_code}</strong>
                    </div>
                  </div>
                  <div className="blink-row">
                    <button
                      className="blink-btn blink-btn-secondary"
                      type="button"
                      onClick={() => handleGoHost(s.id)}
                    >
                      Host view
                    </button>
                    <button
                      className="blink-btn blink-btn-primary"
                      type="button"
                      onClick={() => handleEndSession(s.id)}
                    >
                      End
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {!loadingSessions && pastSessions.length > 0 && (
            <>
              <h3 style={{ margin: '10px 0 4px 0', fontSize: '0.95rem' }}>Past</h3>
              {pastSessions.map(s => (
                <div
                  key={s.id}
                  style={{
                    padding: '6px 0',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.95rem' }}>{s.title}</div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#6b7280',
                        marginTop: 2
                      }}
                    >
                      Code: <strong>{s.join_code}</strong>
                    </div>
                  </div>
                  <div>
                    <button
                      className="blink-btn blink-btn-secondary"
                      type="button"
                      onClick={() => handleGoHost(s.id)}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </section>
      )}

      <section className="blink-card">
        <h2>Step 3 · Share the code</h2>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: 4 }}>
          Students go to the join page and enter the code.
        </p>
        <form onSubmit={handleGoJoin} style={{ marginTop: 10 }}>
          <div className="blink-field">
            <label className="blink-label">Join code</label>
            <input
              className="blink-input"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              required
              placeholder="ABC123"
            />
          </div>
          <button className="blink-btn blink-btn-primary" type="submit">
            Join as participant
          </button>
        </form>
      </section>

      {status && <p className="blink-status">{status}</p>}
    </div>
  );
}