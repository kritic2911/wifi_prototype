import React from 'react'

export const PAGES = {
  HOME: 'home',
  ADMIN: 'admin',
  PUBLIC: 'public',
  UNI: 'uni',
  PAYMENT: 'payment',
}

export function HomePage({ goTo }) {
  return (
    <section className="hero">
      <div className="hero__inner">
        <div className="hero__copy">
          <h1>Smart Wi‑Fi Management</h1>
          <div className="hero__cta hub-cta">
            <button onClick={() => goTo(PAGES.ADMIN)} className="btn btn--ghost">
              Admin Login
            </button>
            <button onClick={() => goTo(PAGES.UNI)} className="btn btn--ghost">
              University Login
            </button>
            <button onClick={() => goTo(PAGES.PUBLIC)} className="btn btn--ghost">
              Public Login
            </button>
          </div>
        </div>
        <div className="hero__visual" aria-hidden="true"></div>
      </div>
      <div className="hero__bg" aria-hidden="true"></div>
    </section>
  )
}
