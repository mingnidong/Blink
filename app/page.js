// app/page.js
'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

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

  function handleLogout() {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setStatus('Logged out');
  }

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
    setStatus('Account created');
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
    setStatus(`Session created`);

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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f9ff 0%, #f3e8ff 100%)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ fontSize: '2.5rem' }}>👁️</div>
            <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 700, background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Blink
            </h1>
          </div>
          <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '1rem' }}>
            Let your audience tap once when they are lost. You get a timeline of confusion.
          </p>
        </div>

        {!user && (
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 28,
            marginBottom: 24,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
            border: '1px solid #e2e8f0'
          }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>
              👤 Create your account
            </h2>
            <p style={{ margin: '4px 0 16px 0', color: '#64748b', fontSize: '0.95rem' }}>
              Your email and name are stored locally and in our database for session participation.
            </p>
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>Email</label>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  type="email"
                  placeholder="you@example.com"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    padding: '10px 12px',
                    fontSize: '0.95rem',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>Name (optional)</label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    padding: '10px 12px',
                    fontSize: '0.95rem',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                Create account
              </button>
            </form>
          </div>
        )}

        {user && (
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 28,
            marginBottom: 24,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>
                  👋 Welcome, {user.display_name || user.email}
                </h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>You're logged in and ready to go</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: '8px 16px',
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#e2e8f0'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#f1f5f9'}
              >
                Logout
              </button>
            </div>
          </div>
        )}

        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 28,
          marginBottom: 24,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
          border: '1px solid #e2e8f0'
        }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>
            🔗 Join a session
          </h2>
          <p style={{ margin: '4px 0 16px 0', color: '#64748b', fontSize: '0.95rem' }}>
            Enter a join code to participate in a live session
          </p>
          <form onSubmit={handleGoJoin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>Join code</label>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                required
                placeholder="ABC123"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  fontSize: '0.95rem',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              Join as participant
            </button>
          </form>
        </div>

        {user && (
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 28,
            marginBottom: 24,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
            border: '1px solid #e2e8f0'
          }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>
              🎬 Host a new session
            </h2>
            <p style={{ margin: '4px 0 16px 0', color: '#64748b', fontSize: '0.95rem' }}>
              Create a session with a "Confused" button for your students to use
            </p>
            <form onSubmit={handleCreateSession}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>Session title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  placeholder="CIS 550 – Indexing Lecture"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    padding: '10px 12px',
                    fontSize: '0.95rem',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                Create session
              </button>
            </form>

            {createdSession && (
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#64748b' }}>Join code:</p>
                  <div style={{
                    background: '#f8fafc',
                    border: '2px dashed #cbd5e1',
                    borderRadius: 8,
                    padding: '12px',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    color: '#1e293b',
                    fontFamily: 'monospace'
                  }}>
                    {createdSession.joinCode}
                  </div>
                </div>

                <div style={{ marginBottom: 16, textAlign: 'center' }}>
                  <div style={{ display: 'inline-block', background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <QRCodeSVG value={createdSession.joinCode} size={160} level="H" />
                  </div>
                  <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>Scan to join</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleGoHost(createdSession.sessionId)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  → Open host view
                </button>
              </div>
            )}
          </div>
        )}

        {user && (
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 28,
            marginBottom: 24,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
            border: '1px solid #e2e8f0'
          }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>
              📋 Your sessions
            </h2>

            {loadingSessions && (
              <p style={{ color: '#64748b', fontSize: '0.95rem' }}>⏳ Loading sessions…</p>
            )}

            {!loadingSessions && activeSessions.length === 0 && pastSessions.length === 0 && (
              <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>No sessions yet. Create your first Blink above.</p>
            )}

            {!loadingSessions && activeSessions.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700, color: '#10b981' }}>🟢 Active</h3>
                {activeSessions.map((s, idx) => (
                  <div
                    key={s.id}
                    style={{
                      padding: 16,
                      background: '#f8fafc',
                      borderRadius: 8,
                      marginBottom: idx < activeSessions.length - 1 ? 12 : 0,
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{s.title}</h4>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748b' }}>
                          Code: <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{s.join_code}</code>
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', minWidth: 200 }}>
                        <button
                          type="button"
                          onClick={() => handleGoHost(s.id)}
                          style={{
                            padding: '8px 14px',
                            background: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #7dd3fc',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#cffafe'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#e0f2fe'}
                        >
                          👁️ View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEndSession(s.id)}
                          style={{
                            padding: '8px 14px',
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fca5a5',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#fecaca'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#fee2e2'}
                        >
                          ⏹️ End
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingSessions && pastSessions.length > 0 && (
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700, color: '#64748b' }}>🕐 Past</h3>
                {pastSessions.map((s, idx) => (
                  <div
                    key={s.id}
                    style={{
                      padding: 16,
                      background: '#f1f5f9',
                      borderRadius: 8,
                      marginBottom: idx < pastSessions.length - 1 ? 12 : 0,
                      border: '1px solid #e2e8f0',
                      opacity: 0.7
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{s.title}</h4>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748b' }}>
                          Code: <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{s.join_code}</code>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGoHost(s.id)}
                        style={{
                          padding: '8px 14px',
                          background: '#fff',
                          color: '#64748b',
                          border: '1px solid #cbd5e1',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#fff'}
                      >
                        📊 View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {status && (
          <div style={{
            background: '#dbeafe',
            border: '1px solid #7dd3fc',
            borderRadius: 8,
            padding: 12,
            color: '#0c4a6e',
            fontSize: '0.9rem',
            marginTop: 16
          }}>
            ℹ️ {status}
          </div>
        )}
      </div>
    </div>
  );
}
