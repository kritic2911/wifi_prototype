import React, { useState, useEffect } from 'react'

export function AdminPage() {
  const [target, setTarget] = useState('All Free Users')
  const [hours, setHours] = useState(4)
  const [bandwidth, setBandwidth] = useState(2)
  const [toast, setToast] = useState('')
  const [highUsage, setHighUsage] = useState([])
  const [actionLog, setActionLog] = useState([])
  const [aps, setAps] = useState([])
  const [devices, setDevices] = useState([])
  const [simToast, setSimToast] = useState('')
  const [heatmapImage, setHeatmapImage] = useState(null)
  const [forecast, setForecast] = useState(null)

  // Poll Network Status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'
        const res = await fetch(`${API_URL}/api/network-status`)
        const data = await res.json()
        setAps(data.aps)
        setDevices(data.devices)

        // Derive High Usage from devices
        const highRisk = data.devices
          .filter(d => d.is_anomaly || d.classification === 'DENY' || d.classification === 'THROTTLE')
          .map(d => ({
            user: d.user,
            tier: d.priority === 'High' ? 'Faculty' : 'Student',
            cap: 10, // Mock
            peak: d.jitter, // Using jitter as proxy for peak load for now
            devices: '1/1',
            breaches: d.is_anomaly ? 1 : 0,
            status: d.is_anomaly ? 'High Risk' : 'Review'
          }))
        setHighUsage(highRisk)

      } catch (e) {
        console.error("Failed to fetch network status", e)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 2000)
    return () => clearInterval(interval)
  }, [])

  // Poll Heatmap & Forecast
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'
        const heatRes = await fetch(`${API_URL}/api/heatmap`)
        const heatData = await heatRes.json()
        setHeatmapImage(heatData.image)

        const forecastRes = await fetch(`${API_URL}/api/forecast`)
        const forecastData = await forecastRes.json()
        setForecast(forecastData)
      } catch (e) {
        console.error("Failed to fetch analytics", e)
      }
    }

    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 5000) // Poll less frequently
    return () => clearInterval(interval)
  }, [])

  function pushLog(msg) {
    const time = new Date().toLocaleTimeString()
    setActionLog(prev => [{ time, msg }, ...prev].slice(0, 100))
  }

  function applyPolicy() {
    pushLog(`Applied policy: ${target}, ${hours}h, ${bandwidth} Mbps`)
    setToast(`Applied policy to ${target}`)
    setTimeout(() => setToast(''), 2200)
  }

  function resetSim() {
    // In a real app this might reset the backend state
    setActionLog([])
    setSimToast('Simulation reset')
    setTimeout(() => setSimToast(''), 1600)
  }

  function generateReport() {
    const lines = [];
    const timestamp = new Date().toISOString();

    // 1. NETWORK OVERVIEW
    const totalAps = aps.length;
    const totalDevices = devices.length;
    const avgLoad = aps.length ? aps.reduce((a, b) => a + b.load, 0) / aps.length : 0;
    const congestedAps = aps.filter(a => a.load > 80);

    const mostOverloaded = aps.length ? aps.reduce((max, ap) =>
      ap.load > max.load ? ap : max, aps[0]) : null;

    lines.push("=== NETWORK HEALTH OVERVIEW ===");
    lines.push(`Generated: ${timestamp}`);
    lines.push("");
    lines.push(`Total Access Points: ${totalAps}`);
    lines.push(`Total Connected Devices: ${totalDevices}`);
    lines.push(`Average AP Load: ${avgLoad.toFixed(1)}%`);
    lines.push(
      `Congested APs (${congestedAps.length}): ${congestedAps.length ? congestedAps.map(a => a.id).join(", ") : "None"
      }`
    );
    if (mostOverloaded) {
      lines.push(
        `Most Overloaded AP: ${mostOverloaded.id} (${mostOverloaded.load}%)`
      );
    }
    lines.push("");

    // 2. HIGH-RISK USERS TABLE
    const flagged = devices.filter(d => d.is_anomaly || d.classification === 'DENY');

    lines.push("=== HIGH-RISK USERS (CSV) ===");
    lines.push("user,ap,jitter,pattern,suspected_activity,reason");

    if (flagged.length === 0) {
      lines.push("none");
    } else {
      flagged.forEach(d => {
        const ap = aps.find(a => a.id === d.ap);

        // inference engine
        const reasonParts = [];
        if (d.jitter > 45) reasonParts.push("High jitter");
        if (d.pattern === "large_download") reasonParts.push("Large downloads");
        if (ap && ap.load > 80) reasonParts.push(`AP congestion (${ap.load}%)`);
        if (d.is_anomaly) reasonParts.push("AI Anomaly Detected");

        const suspected =
          d.pattern === "large_download"
            ? "File Transfer / Streaming"
            : d.jitter > 45
              ? "Unstable Link / Load Spike"
              : "Normal";

        lines.push(
          `${d.user},${d.ap},${d.jitter},${d.pattern},${suspected},"${reasonParts.join(
            "; "
          )}"`
        );
      });
    }
    lines.push("");

    // 3. ACCESS POINT BREAKDOWN
    lines.push("=== ACCESS POINT BREAKDOWN ===");
    aps.forEach(ap => {
      const state =
        ap.load > 80 ? "Critical"
          : ap.load > 60 ? "High"
            : "Normal";

      lines.push(`${ap.id}`);
      lines.push(`  Band: ${ap.band}`);
      lines.push(`  Load: ${ap.load}%`);
      lines.push(`  Health: ${state}`);
      lines.push(`  Neighbours: ${ap.neighbours.join(", ")}`);
      lines.push("");
    });

    // 4. DEVICE HEALTH SUMMARY
    lines.push("=== DEVICE HEALTH ANALYSIS ===");

    devices.forEach(d => {
      const ap = aps.find(a => a.id === d.ap);

      const healthScore =
        100 -
        (d.jitter * 0.8 + (ap ? ap.load * 0.2 : 0));

      const bottleneck =
        d.jitter > 40 ? "Device link quality" :
          (ap && ap.load > 80) ? "AP congestion" :
            "None";

      const behavior =
        d.pattern === "large_download"
          ? "Heavy download behaviour"
          : d.pattern === "burst"
            ? "Short bursts / interactive"
            : "Stable";

      lines.push(`${d.user}`);
      lines.push(`  AP: ${d.ap}`);
      lines.push(`  Jitter: ${d.jitter}ms`);
      lines.push(`  Pattern: ${d.pattern}`);
      lines.push(`  Behavior: ${behavior}`);
      lines.push(
        `  Device Health Score: ${healthScore.toFixed(1)} / 100`
      );
      lines.push(`  Bottleneck Cause: ${bottleneck}`);
      lines.push("");
    });

    // 5. ACTION LOG
    lines.push("=== ADMIN ACTION LOG (New → Old) ===");
    if (actionLog.length === 0) {
      lines.push("No logged actions.");
    } else {
      actionLog.slice(0, 100).forEach(entry => {
        lines.push(`[${entry.time}] ${entry.msg}`);
      });
    }

    // DOWNLOAD FILE
    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = timestamp.replace(/[:.]/g, "-");

    a.href = url;
    a.download = `wifi-admin-report-${ts}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 2000);

    pushLog(`Report generated (${flagged.length} users flagged)`);
    setSimToast("Report generated");
    setTimeout(() => setSimToast(""), 2200);
  }

  return (
    <div>
      <section className="section">
        <div className="container">
          <h1>Admin Panel</h1>
          <p className="section__lead">Control bandwidth and session hours per user or per tier.</p>

          <div className="admin">
            <div className="admin__controls">
              <label>
                User/Tier
                <select value={target} onChange={e => setTarget(e.target.value)}>
                  <option>All Free Users</option>
                  <option>All Paid Users</option>
                  <option>Guest Users</option>
                  <option>University Users</option>
                </select>
              </label>
              <label>
                Session Length (hours)
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={hours}
                  onChange={e => setHours(Number(e.target.value) || 0)}
                />
              </label>
              <label>
                Bandwidth (Mbps)
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={bandwidth}
                  onChange={e => setBandwidth(Number(e.target.value) || 0)}
                />
              </label>
              <button onClick={applyPolicy} className="btn">Apply Policy</button>
              {toast && (
                <div className="toast" style={{ display: 'block' }} role="status" aria-live="polite">
                  {toast}
                </div>
              )}
            </div>
            <div className="admin__preview">
              <div className="card">
                <div className="card__title">Effective Policy</div>
                <div className="card__row"><span>Target</span><span>{target}</span></div>
                <div className="card__row"><span>Hours</span><span>{hours}</span></div>
                <div className="card__row"><span>Bandwidth</span><span>{bandwidth} Mbps</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <h2>High Usage Monitor</h2>
          <p className="section__lead">Users exceeding configured bandwidth caps</p>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Tier</th>
                  <th>Cap</th>
                  <th>Peak</th>
                  <th>Devices</th>
                  <th>Breaches (24h)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {highUsage.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center' }}>No high usage alerts</td></tr>
                ) : (
                  highUsage.map(row => (
                    <tr key={row.user}>
                      <td>{row.user}</td>
                      <td>{row.tier}</td>
                      <td>{row.cap} Mbps</td>
                      <td>{row.peak.toFixed(1)} Mbps</td>
                      <td>{row.devices}</td>
                      <td>{row.breaches}</td>
                      <td>
                        <span className={`tag ${row.status === 'High Risk' ? 'tag--danger' : row.status === 'Review' ? 'tag--warn' : ''}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Network Intelligence</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            {/* Heatmap Card */}
            <div className="card">
              <h3>Spatial Analytics (Heatmap)</h3>
              {heatmapImage ? (
                <img src={heatmapImage} alt="Network Heatmap" style={{ width: '100%', borderRadius: '4px' }} />
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', background: '#f5f5f5' }}>Loading Heatmap...</div>
              )}
            </div>

            {/* Forecast Card */}
            <div className="card">
              <h3>Traffic Forecast (ARIMA)</h3>
              {forecast ? (
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2e7d32' }}>
                    {forecast.predicted_load.toFixed(1)} Users
                  </div>
                  <p>Predicted load for next interval</p>
                  <div style={{ marginTop: '1rem', height: '100px', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
                    {forecast.history.slice(-20).map((val, idx) => (
                      <div key={idx} style={{
                        width: '100%',
                        height: `${(val / Math.max(...forecast.history)) * 100}%`,
                        background: '#1976d2',
                        opacity: 0.6
                      }}></div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', background: '#f5f5f5' }}>Loading Forecast...</div>
              )}
            </div>
          </div>

          <h2>Traffic Management</h2>
          <p className="section__lead">
            Privacy-safe traffic classification and AP management rules (uses flow metadata only).
          </p>

          <div className="card" id="simulator">
            <div style={{ marginBottom: '1rem' }}>
              <h3>Access Points</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>AP</th>
                    <th>Band</th>
                    <th>Load</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody>
                  {aps.map(a => {
                    const state = a.load > 80 ? 'Congested' : a.load > 60 ? 'High' : 'Normal'
                    return (
                      <tr key={a.id}>
                        <td>{a.id}</td>
                        <td>{a.band}</td>
                        <td>{a.load}%</td>
                        <td>{state}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <h3>Devices / Flows</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>AP</th>
                    <th>5GHz?</th>
                    <th>Jitter(ms)</th>
                    <th>Pattern</th>
                    <th>Class</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d, idx) => (
                    <tr key={idx}>
                      <td>{d.user}</td>
                      <td>{d.ap}</td>
                      <td>{d.supports5g ? 'Yes' : 'No'}</td>
                      <td>{d.jitter}</td>
                      <td>{d.pattern}</td>
                      <td>
                        <span className={d.is_anomaly ? 'tag tag--danger' : ''}>
                          {d.classification}
                        </span>
                      </td>
                      <td>{d.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '.5rem', alignItems: 'center' }}>
              <button onClick={resetSim} className="btn">Reset</button>
              <button
                onClick={generateReport}
                className="btn"
                style={{ background: '#2e7d32', color: '#fff', marginLeft: '6px' }}
              >
                Generate Report
              </button>
              {simToast && (
                <div className="toast" style={{ display: 'block', marginLeft: '1rem' }} role="status" aria-live="polite">
                  {simToast}
                </div>
              )}
            </div>

            <h4 style={{ marginTop: '1rem' }}>Action Log</h4>
            <div
              style={{
                height: '160px',
                overflow: 'auto',
                background: '#fff',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #eee',
                color: '#111',
                fontFamily: "'Courier New', monospace"
              }}
            >
              {actionLog.length === 0 ? (
                <div style={{ color: '#999' }}>Log will appear here when actions occur.</div>
              ) : (
                actionLog.map((entry, idx) => (
                  <div key={idx}>[{entry.time}] {entry.msg}</div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
