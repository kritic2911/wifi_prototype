import React, { useState, useEffect, useRef } from 'react'
import { startSpeedMonitoring } from '../utils/speedTest'

function formatDuration(totalSeconds) {
  if (totalSeconds < 0) totalSeconds = 0
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function SessionDemoPage({ mode }) {
  const isPublic = mode === 'public'
  const isUni = mode === 'uni'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loggedInEmail, setLoggedInEmail] = useState('Guest')
  const [allocatedSeconds, setAllocatedSeconds] = useState(0)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [bandwidthLabel, setBandwidthLabel] = useState('—')
  const [simSpeed, setSimSpeed] = useState(3600)
  const [role, setRole] = useState(isUni ? 'student' : null)
  const [tier, setTier] = useState(isPublic ? 'public-free' : null)
  const [showModal, setShowModal] = useState(false)
  const [usage, setUsage] = useState(0)
  const [devices, setDevices] = useState([])
  const [maxDevices, setMaxDevices] = useState(isUni ? 5 : 3)
  const [connectedDevices, setConnectedDevices] = useState(1)
  const [showDeviceModal, setShowDeviceModal] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [deviceMac, setDeviceMac] = useState('')
  const [deviceType, setDeviceType] = useState('phone')
  const [useRealSpeed, setUseRealSpeed] = useState(false)

  const timerRef = useRef(null)
  const usageCanvasRef = useRef(null)
  const usageSeriesRef = useRef([])
  const dynamicMaxRef = useRef(null)

  function getModeConfig() {
    if (isUni) {
      if (role === 'staff') return { hours: 5, bandwidth: '6 Mbps', maxMbps: 6 }
      return { hours: 4, bandwidth: '4 Mbps', maxMbps: 4 }
    }
    if (loggedInEmail === 'Guest') return { hours: 2, bandwidth: '1.5 Mbps (Guest)', maxMbps: 1.5 }
    if (tier === 'public-paid') return { hours: 6, bandwidth: '6 Mbps', maxMbps: 6 }
    return { hours: 4, bandwidth: '1.5 Mbps', maxMbps: 1.5 }
  }

  useEffect(() => {
    const canvas = usageCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.clientWidth || 300
    const cssH = canvas.clientHeight || 150
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }, [])

  useEffect(() => {
    const cfg = getModeConfig()
    const maxMbps = cfg.maxMbps || 4
    
    if (useRealSpeed) {
      const cleanup = startSpeedMonitoring((speed) => {
        setUsage(Number(speed.toFixed(1)))
        usageSeriesRef.current.push(speed)
        if (usageSeriesRef.current.length > 60) usageSeriesRef.current.shift()
        drawUsageSeries(maxMbps)
      }, 2000)
      return cleanup
    } else {
      const id = setInterval(() => {
        const spike = Math.random() < 0.15 ? 1.3 : 1.0
        const val = Math.min(maxMbps * 1.3, (Math.random() * 0.8 + 0.1) * maxMbps * spike)
        setUsage(Number(val.toFixed(1)))
        usageSeriesRef.current.push(val)
        if (usageSeriesRef.current.length > 60) usageSeriesRef.current.shift()
        drawUsageSeries(maxMbps)
      }, 800)
      return () => clearInterval(id)
    }
  }, [isUni, role, loggedInEmail, tier, useRealSpeed])

  function drawUsageSeries(maxMbps) {
    const canvas = usageCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.clientWidth || canvas.width
    const height = canvas.clientHeight || canvas.height
    ctx.clearRect(0, 0, width, height)

    const padLeft = 44
    const padTopBottom = 14
    const padRight = 8
    const chartW = width - padLeft - padRight
    const chartH = height - padTopBottom * 2

    let displayMax = maxMbps
    if (useRealSpeed && usageSeriesRef.current.length > 0) {
      const currentMax = Math.max(...usageSeriesRef.current)
      const targetMax = currentMax * 1.2
      if (!dynamicMaxRef.current) {
        dynamicMaxRef.current = Math.max(maxMbps, targetMax)
      } else {
        dynamicMaxRef.current = dynamicMaxRef.current * 0.9 + targetMax * 0.1
      }
      displayMax = Math.max(maxMbps, dynamicMaxRef.current)
    } else {
      dynamicMaxRef.current = null
    }
    const ratios = [0, 0.25, 0.5, 0.75, 1.0, 1.3]
    ctx.strokeStyle = '#273159'
    ctx.fillStyle = '#b9bfd3'
    ctx.lineWidth = 1
    ctx.font = '12px Inter, system-ui'
    ratios.forEach(r => {
      const norm = Math.min(1.3, r) / 1.3
      const y = padTopBottom + (1 - norm) * chartH + 0.5
      ctx.beginPath()
      ctx.moveTo(padLeft, y)
      ctx.lineTo(width, y)
      ctx.stroke()
      const label = `${(displayMax * r).toFixed(1)} Mbps`
      ctx.fillText(label, 4, y + 4)
    })
    if (displayMax > maxMbps) {
      const limitRatio = (maxMbps / displayMax) / 1.3
      const limitY = padTopBottom + (1 - limitRatio) * chartH + 0.5
      ctx.strokeStyle = '#ff5252'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(padLeft, limitY)
      ctx.lineTo(width, limitY)
      ctx.stroke()
      ctx.setLineDash([])
      
      // Label for limit line
      ctx.fillStyle = '#ff5252'
      ctx.fillText(`${maxMbps.toFixed(1)} Mbps (limit)`, padLeft + 5, limitY - 5)
      ctx.fillStyle = '#b9bfd3'
    } else {
      // Draw red limit line at 100% when display max equals config max
      const limitY = padTopBottom + (1 - (1.0 / 1.3)) * chartH + 0.5
      ctx.strokeStyle = '#ff5252'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(padLeft, limitY)
      ctx.lineTo(width, limitY)
      ctx.stroke()
    }
    if (usageSeriesRef.current.length === 0) return
    const step = chartW / Math.max(1, usageSeriesRef.current.length - 1)
    ctx.strokeStyle = '#6c7cff'
    ctx.lineWidth = 2
    ctx.beginPath()
    usageSeriesRef.current.forEach((v, i) => {
      const x = padLeft + i * step
      const ratio = Math.min(1.3, v / displayMax) / 1.3
      const y = padTopBottom + (1 - ratio) * chartH
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }

  function updateAllocationPreview() {
    const cfg = getModeConfig()
    setAllocatedSeconds(cfg.hours * 3600)
    setBandwidthLabel(cfg.bandwidth)
  }

  useEffect(() => {
    updateAllocationPreview()
  }, [role, loggedInEmail, tier])

  useEffect(() => {
    if (isUni) {
      setMaxDevices(5)
    } else {
      setMaxDevices(tier === 'public-paid' ? 3 : 2)
    }
  }, [isUni, tier])

  function startSession() {
    const cfg = getModeConfig()
    const seconds = cfg.hours * 3600
    setAllocatedSeconds(seconds)
    setRemainingSeconds(seconds)
    setBandwidthLabel(cfg.bandwidth)
    setShowModal(false)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        const next = prev - simSpeed
        if (next <= 0) {
          clearInterval(timerRef.current)
          timerRef.current = null
          return 0
        }
        if (next <= 15 * 60 && !showModal) {
          setShowModal(true)
        }
        return next
      })
    }, 1000)
  }

  function endSession() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setRemainingSeconds(0)
    setShowModal(false)
  }

  function extendSession() {
    setAllocatedSeconds(prev => prev + 3600)
    setRemainingSeconds(prev => prev + 3600)
    setShowModal(false)
  }

  function handleLogin() {
    if (!email || password.length < 4) return
    setLoggedInEmail(email)
    setEmail('')
    setPassword('')
    usageSeriesRef.current = []
  }

  function handleRegister() {
    if (!email || password.length < 4) return
    alert('Registered (mock). You are now logged in.')
    setLoggedInEmail(email)
    setEmail('')
    setPassword('')
    usageSeriesRef.current = []
  }

  function handleGuest() {
    setLoggedInEmail('GUEST')
    usageSeriesRef.current = []
  }

  function handleChooseTier(selectedTier) {
    if (selectedTier === 'public-paid') {
      // In the original, this redirects to payment page
      alert('This would redirect to payment page')
    } else {
      setTier(selectedTier)
    }
  }

  function addDevice() {
    if (!deviceName) return
    setDevices(prev => {
      if (prev.length >= maxDevices) return prev
      return [...prev, { 
        id: Date.now(), 
        name: deviceName,
        mac: deviceMac,
        type: deviceType,
        dateAdded: new Date()
      }]
    })
    setShowDeviceModal(false)
    setDeviceName('')
    setDeviceMac('')
    setDeviceType('phone')
  }

  function removeDevice(id) {
    setDevices(prev => prev.filter(d => d.id !== id))
  }

  const cfg = getModeConfig()

  return (
    <div>
      <section className="section">
        <div className="container">
          <div className="hero__cta" style={{ margin: '0 0 12px' }}>
            <a href="#demo" className="btn">Live Demo</a>
          </div>
          <h1>{isUni ? 'University Access' : 'Public Access'}</h1>
          <p className="section__lead">
            {isUni
              ? 'Free tier: up to 4h/day, limited bandwidth. Paid tier: 6h/session, higher bandwidth.'
              : 'Student and staff Wi‑Fi with controlled hours and bandwidth.'}
          </p>

          {isPublic && (
            <div className="grid cards">
              <div className="pricecard">
                <div className="pricecard__header">
                  <h3>Free Tier</h3>
                  <div className="price">₹0</div>
                </div>
                <ul>
                  <li>4h per day</li>
                  <li>Limited bandwidth</li>
                  <li>Upgrade anytime</li>
                </ul>
                <button className="btn btn--block" onClick={() => handleChooseTier('public-free')}>
                  Use Free
                </button>
              </div>
              <div className="pricecard pricecard--pro">
                <div className="pricecard__header">
                  <h3>Paid Tier</h3>
                  <div className="price">₹99</div>
                </div>
                <ul>
                  <li>6h per session</li>
                  <li>Higher bandwidth</li>
                  <li>Priority access</li>
                </ul>
                <button className="btn btn--block" onClick={() => handleChooseTier('public-paid')}>
                  Upgrade
                </button>
              </div>
            </div>
          )}

          {isUni && (
            <div className="split">
              <div className="card">
                <div className="card__title">Student</div>
                <div className="card__row"><span>Allocated per login</span><span>4h</span></div>
                <div className="card__row"><span>Pre-expiry notice</span><span>15m before</span></div>
                <div className="card__row"><span>Bandwidth</span><span>4 Mbps</span></div>
                <div className="card__footer" style={{ marginTop: '10px', textAlign: 'center' }}>
                  <button className="btn btn--block" onClick={() => setRole('student')}>
                    Choose Student
                  </button>
                </div>
              </div>
              <div className="card">
                <div className="card__title">Staff</div>
                <div className="card__row"><span>Allocated per login</span><span>5h</span></div>
                <div className="card__row"><span>Pre-expiry notice</span><span>15m before</span></div>
                <div className="card__row"><span>Bandwidth</span><span>6 Mbps</span></div>
                <div className="card__footer" style={{ marginTop: '10px', textAlign: 'center' }}>
                  <button className="btn btn--block" onClick={() => setRole('staff')}>
                    Choose Staff
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="demo" className="section section--alt">
        <div className="container">
          <h2>Live Demo</h2>
          <div className="demo">
            <div className="demo__controls">
              <div className="device-stats">
                <div className="stat">
                  <div className="stat__label">Connected Devices</div>
                  <div className="stat__value">{connectedDevices}/{maxDevices}</div>
                </div>
              </div>
              <div className="demo__graph">
                <canvas ref={usageCanvasRef} style={{ width: '100%', height: '180px' }}></canvas>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={useRealSpeed} 
                    onChange={(e) => setUseRealSpeed(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Use Real Network Speed</span>
                </label>
                {useRealSpeed && (
                  <span style={{ color: 'var(--accent)', fontSize: '0.9em', fontWeight: '500' }}>
                    ⚡ Live Testing
                  </span>
                )}
              </div>
              <label>
                Simulation Speed
                <select value={simSpeed} onChange={e => setSimSpeed(Number(e.target.value))}>
                  <option value={1}>1×</option>
                  <option value={60}>60×</option>
                  <option value={3600}>3600×</option>
                </select>
              </label>
              <button onClick={startSession} className="btn">Start Session</button>
              <button onClick={endSession} className="btn btn--ghost">End</button>
            </div>
            
            <div className="demo__panel">
              <div className="stats">
                <div className="stat">
                  <div className="stat__label">Allocated</div>
                  <div className="stat__value">{cfg.hours}h</div>
                </div>
                <div className="stat">
                  <div className="stat__label">Remaining</div>
                  <div className="stat__value">{remainingSeconds ? formatDuration(remainingSeconds) : '—'}</div>
                </div>
                <div className="stat">
                  <div className="stat__label">Bandwidth</div>
                  <div className="stat__value">{bandwidthLabel}</div>
                </div>
              </div>
              
              <div className="auth">
                <label>
                  {isUni ? 'Email / ID' : 'Email'}
                  <input
                    type="email"
                    placeholder={isUni ? 'student@uni.edu' : 'you@example.com'}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </label>
                <button onClick={handleLogin} className="btn">Login</button>
                <button onClick={handleRegister} className="btn btn--ghost">Register</button>
                <button onClick={handleGuest} className="btn btn--ghost">Continue as Guest</button>
                <div className="auth__status">
                  Signed in as: <span className="auth__user">{loggedInEmail || 'Guest'}</span>
                </div>

                <div className="device-manager">
                  <h4>Registered Devices</h4>
                  <div className="device-list">
                    {devices.length === 0 ? (
                      <div style={{ color: 'var(--muted)', fontSize: '12px' }}>
                        No devices registered yet.
                      </div>
                    ) : (
                      devices.map(d => (
                        <div key={d.id} className="device-item">
                          <div className="device-item__info">
                            <div className="device-item__name">{d.name}</div>
                            <div className="device-item__type">
                              {d.type} {d.mac ? '• ' + d.mac : ''}
                            </div>
                          </div>
                          <button onClick={() => removeDevice(d.id)} className="device-item__remove" aria-label="Remove device">
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <button onClick={() => setShowDeviceModal(true)} className="btn btn--ghost">
                    Add Device
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Session ending modal */}
      {showModal && (
        <div className="modal">
          <div className="modal__dialog">
            <div className="modal__header">
              <h3>Session Ending Soon</h3>
              <button onClick={() => setShowModal(false)} className="iconbtn" aria-label="Close">
                ✕
              </button>
            </div>
            <div className="modal__body">
              You have <span>{formatDuration(remainingSeconds)}</span> remaining. Would you like to extend your session by 1 hour?
            </div>
            <div className="modal__actions">
              <button onClick={extendSession} className="btn">Extend Session</button>
              <button onClick={endSession} className="btn btn--ghost">End Now</button>
            </div>
          </div>
        </div>
      )}

      {/* Add device modal */}
      {showDeviceModal && (
        <div className="modal">
          <div className="modal__dialog">
            <div className="modal__header">
              <h3>Add New Device</h3>
              <button onClick={() => setShowDeviceModal(false)} className="iconbtn" aria-label="Close">
                ✕
              </button>
            </div>
            <div className="modal__body">
              <form onSubmit={(e) => { e.preventDefault(); addDevice(); }}>
                <label>
                  Device Name
                  <input
                    type="text"
                    placeholder="e.g. iPhone 13"
                    value={deviceName}
                    onChange={e => setDeviceName(e.target.value)}
                    required
                  />
                </label>
                <label>
                  MAC Address (optional)
                  <input
                    type="text"
                    placeholder="XX:XX:XX:XX:XX:XX"
                    value={deviceMac}
                    onChange={e => setDeviceMac(e.target.value)}
                  />
                </label>
                <label>
                  Device Type
                  <select value={deviceType} onChange={e => setDeviceType(e.target.value)}>
                    <option value="phone">Phone</option>
                    <option value="laptop">Laptop</option>
                    <option value="tablet">Tablet</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </form>
            </div>
            <div className="modal__actions">
              <button onClick={addDevice} className="btn">Add Device</button>
              <button onClick={() => setShowDeviceModal(false)} className="btn btn--ghost">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
