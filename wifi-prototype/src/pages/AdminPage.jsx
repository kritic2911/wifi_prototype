import React, { useState, useEffect } from 'react'

const INITIAL_APS = [
  { id: 'AP-1', band: '2.4GHz', load: 45, neighbours: ['AP-2'] },
  { id: 'AP-2', band: '5GHz', load: 20, neighbours: ['AP-1', 'AP-3'] },
  { id: 'AP-3', band: '2.4GHz', load: 85, neighbours: ['AP-2'] },
]

const INITIAL_DEVICES = [
  { user: 'alice@uni.com', ap: 'AP-1', supports5g: true, jitter: 12, pattern: 'stable', classification: '-', priority: 'normal' },
  { user: 'bob@corp.com', ap: 'AP-3', supports5g: true, jitter: 42, pattern: 'stable', classification: '-', priority: 'normal' },
  { user: 'carol@guest.com', ap: 'AP-3', supports5g: false, jitter: 18, pattern: 'large_download', classification: '-', priority: 'normal' },
  { user: 'dave@public.com', ap: 'AP-2', supports5g: true, jitter: 8, pattern: 'burst', classification: '-', priority: 'normal' },
]

const INITIAL_HIGH_USAGE = [
  { user: 'small@things.com', tier: 'University', cap: 4, peak: 6.2, devices: '4/5', breaches: 5, status: 'Review' },
  { user: 'alister@crowley.com', tier: 'Guest', cap: 1.5, peak: 3.1, devices: '2/3', breaches: 11, status: 'High Risk' },
  { user: 'tedhughes@ovenHeaven.com', tier: 'Public Paid', cap: 4, peak: 4.9, devices: '3/3', breaches: 3, status: 'Caution' },
]

export function AdminPage() {
  const [target, setTarget] = useState('All Free Users')
  const [hours, setHours] = useState(4)
  const [bandwidth, setBandwidth] = useState(2)
  const [toast, setToast] = useState('')
  const [highUsage, setHighUsage] = useState(INITIAL_HIGH_USAGE)
  const [actionLog, setActionLog] = useState([])
  const [aps, setAps] = useState(INITIAL_APS)
  const [devices, setDevices] = useState(INITIAL_DEVICES)
  const [simToast, setSimToast] = useState('')

  useEffect(() => {
    const id = setInterval(() => {
      setHighUsage(prev =>
        prev.map(row => {
          const jitter = (Math.random() * 1.4 - 0.7)
          const peak = Math.max(row.cap + 0.1, +(row.peak + jitter).toFixed(1))
          return { ...row, peak }
        }),
      )
      pushLog('High Usage Monitor refreshed')
    }, 120000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const liveInterval = setInterval(() => {
      setAps(prev => prev.map(a => ({
        ...a,
        load: Math.max(0, Math.min(100, a.load + Math.floor((Math.random() - 0.4) * 10)))
      })))
      setDevices(prev => prev.map(d => ({
        ...d,
        jitter: Math.max(1, d.jitter + Math.floor((Math.random() - 0.5) * 8))
      })))
      pushLog('Tick: metrics randomized')
    }, 10000)
    return () => clearInterval(liveInterval)
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
    setAps(INITIAL_APS)
    setDevices(INITIAL_DEVICES)
    setActionLog([])
    setSimToast('Simulator reset')
    setTimeout(() => setSimToast(''), 1600)
  }

  // function generateReport() {
  //   const lines = []
  //   lines.push('=== Users exceeding bandwidth (simulated) ===')
  //   lines.push('user,tier,cap_mbps,peak_mbps,devices,breaches,status')
    
  //   const exceeding = devices.filter(d => {
  //     const ap = aps.find(a => a.id === d.ap)
  //     return d.pattern === 'large_download' || d.jitter > 50 || (ap && ap.load > 80)
  //   })
    
  //   if (exceeding.length === 0) {
  //     lines.push('none')
  //   } else {
  //     exceeding.forEach(u => {
  //       lines.push(`"${u.user}",${u.ap},${u.supports5g ? 'yes' : 'no'},${u.jitter},${u.pattern},no`)
  //     })
  //   }

  //   lines.push('')
  //   lines.push('=== Top 100 Access Log (newest first) ===')
  //   lines.push('timestamp | message')
  //   if (actionLog.length === 0) {
  //     lines.push('no log entries')
  //   } else {
  //     actionLog.slice(0, 100).forEach(entry => {
  //       lines.push(`"[${entry.time}] ${entry.msg}"`)
  //     })
  //   }

  //   const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  //   const url = URL.createObjectURL(blob)
  //   const a = document.createElement('a')
  //   const ts = new Date().toISOString().replace(/[:.]/g, '-')
  //   a.href = url
  //   a.download = `wifi-admin-report-${ts}.txt`
  //   document.body.appendChild(a)
  //   a.click()
  //   a.remove()
  //   setTimeout(() => URL.revokeObjectURL(url), 2000)
  //   pushLog(`Report generated (${exceeding.length} users flagged)`)
  //   setSimToast('Report generated and downloaded')
  //   setTimeout(() => setSimToast(''), 2200)
  // }

  function generateReport() {
    const lines = [];
    const timestamp = new Date().toISOString();

    // 1. NETWORK OVERVIEW
    const totalAps = aps.length;
    const totalDevices = devices.length;
    const avgLoad = aps.reduce((a, b) => a + b.load, 0) / aps.length;
    const congestedAps = aps.filter(a => a.load > 80);

    const mostOverloaded = aps.reduce((max, ap) =>
      ap.load > max.load ? ap : max, aps[0]);

    lines.push("=== NETWORK HEALTH OVERVIEW ===");
    lines.push(`Generated: ${timestamp}`);
    lines.push("");
    lines.push(`Total Access Points: ${totalAps}`);
    lines.push(`Total Connected Devices: ${totalDevices}`);
    lines.push(`Average AP Load: ${avgLoad.toFixed(1)}%`);
    lines.push(
      `Congested APs (${congestedAps.length}): ${
        congestedAps.length ? congestedAps.map(a => a.id).join(", ") : "None"
      }`
    );
    lines.push(
      `Most Overloaded AP: ${mostOverloaded.id} (${mostOverloaded.load}%)`
    );
    lines.push("");

    // 2. HIGH-RISK USERS TABLE
    const flagged = devices.filter(d => {
      const ap = aps.find(a => a.id === d.ap);
      return (
        d.jitter > 45 ||
        d.pattern === "large_download" ||
        (ap && ap.load > 80)
      );
    });

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
                {highUsage.map(row => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
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
                      <td>{d.classification}</td>
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
