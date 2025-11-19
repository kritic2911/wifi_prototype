import React, { useState } from 'react'

export function PaymentPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [showGuestExtend, setShowGuestExtend] = useState(false)

  function showMsg(msg) {
    setMessage(msg)
    setTimeout(() => setMessage(''), 2400)
  }

  function payUpgrade() {
    showMsg('Processing payment for upgrade...')
    setTimeout(() => {
      showMsg('Payment successful — returning...')
      // In the original, this would redirect back to public.html with paid=1
    }, 900)
  }

  function payExtend() {
    showMsg('Processing guest extension...')
    setTimeout(() => {
      showMsg('Payment successful — returning...')
    }, 900)
  }

  function convertToPaid() {
    if (!email) {
      showMsg('Please fill the form to convert to a paid account')
      return
    }
    showMsg('Fill the form to convert to a paid account')
  }

  function payRegister() {
    if (!email || password.length < 6) {
      showMsg('Provide a valid email and a password (min 6 chars)')
      return
    }
    showMsg('Registering and processing payment...')
    setTimeout(() => {
      showMsg('Payment successful — returning...')
    }, 900)
  }

  function clearForm() {
    setEmail('')
    setPassword('')
  }

  return (
    <main className="payment-card container" role="main">
      <h1>Payment / Upgrade</h1>
      <p className="section__lead">Manage upgrades, extensions and register as a paid user.</p>

      <div className="note muted">
        Choose an action: upgrade to a paid tier or register as a paid user.
      </div>

      <div className="plans-row" style={{ marginTop: '12px' }}>
        <div className="plan-col">
          <div className="plan-box">
            <strong>Upgrade plan</strong>
            <div className="price">Public Paid — 6 Mbps / 2 extra hours</div>
            <div className="muted">
              One-time payment to upgrade from a free tier or to extend non-extendable sessions.
            </div>
            <div className="actions">
              <button onClick={payUpgrade} className="btn primary">
                Pay &amp; Upgrade — ₹99
              </button>
              <button className="btn ghost" type="button" onClick={() => window.history.back()}>
                Back
              </button>
            </div>
          </div>

          {showGuestExtend && (
            <div style={{ marginTop: '12px' }} className="plan-box">
              <strong>Guest extension</strong>
              <div className="price">Extend session by 1 hour</div>
              <div className="muted">
                If you're currently a guest, convert to a paid user or buy a temporary extension.
              </div>
              <div className="actions">
                <button onClick={payExtend} className="btn primary">
                  Pay to Extend — ₹39
                </button>
                <button className="btn ghost" type="button" onClick={convertToPaid}>
                  Convert to Paid (register)
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="plan-col">
          <div className="plan-box">
            <strong>Register as paid user</strong>
            <div className="muted">
              Create a paid account and get access to paid tiers and extensions.
            </div>

            <form noValidate style={{ marginTop: '12px' }}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />

              <label htmlFor="password" style={{ marginTop: '8px' }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="min 6 chars"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />

              <div className="actions">
                <button className="btn primary" type="button" onClick={payRegister}>
                  Register &amp; Pay — ₹99
                </button>
                <button className="btn ghost" type="button" onClick={clearForm}>
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {message && (
        <div className="msg" style={{ display: 'block' }} role="status" aria-live="polite">
          {message}
        </div>
      )}
    </main>
  )
}
