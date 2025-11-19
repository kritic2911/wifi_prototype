import { useState } from 'react'
import { HomePage, PAGES } from './pages/HomePage.jsx'
import { AdminPage } from './pages/AdminPage.jsx'
import { SessionDemoPage } from './pages/SessionDemoPage.jsx'
import { PaymentPage } from './pages/PaymentPage.jsx'

function App() {
  const [page, setPage] = useState(PAGES.HOME)

  return (
    <div>
      <header className="nav">
        <div className="container nav__inner">
          <div className="brand">
            <button
              type="button"
              onClick={() => setPage(PAGES.HOME)}
              className="logo"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
            >
              WiFi<span>Smart</span>
            </button>
          </div>
          <nav className="nav__links">
            <a href="#admin" onClick={(e) => { e.preventDefault(); setPage(PAGES.ADMIN); }} className={page === PAGES.ADMIN ? 'btn btn--sm' : ''}>
              Admin
            </a>
            <a href="#uni" onClick={(e) => { e.preventDefault(); setPage(PAGES.UNI); }} className={page === PAGES.UNI ? 'btn btn--sm' : ''}>
              University
            </a>
            <a href="#public" onClick={(e) => { e.preventDefault(); setPage(PAGES.PUBLIC); }} className={page === PAGES.PUBLIC ? 'btn btn--sm' : ''}>
              Public
            </a>
          </nav>
        </div>
      </header>

      <main className="container" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
        {page === PAGES.HOME && <HomePage goTo={setPage} />}
        {page === PAGES.ADMIN && <AdminPage />}
        {page === PAGES.PUBLIC && <SessionDemoPage mode="public" />}
        {page === PAGES.UNI && <SessionDemoPage mode="uni" />}
        {page === PAGES.PAYMENT && <PaymentPage />}
      </main>

      {page !== PAGES.HOME && (
        <footer className="footer">
          <div className="container footer__inner">
            <div className="footer__links">
              <a href="#home" onClick={(e) => { e.preventDefault(); setPage(PAGES.HOME); }}>Home</a>
              <a href="#uni" onClick={(e) => { e.preventDefault(); setPage(PAGES.UNI); }}>University</a>
              <a href="#public" onClick={(e) => { e.preventDefault(); setPage(PAGES.PUBLIC); }}>Public</a>
              <a href="#admin" onClick={(e) => { e.preventDefault(); setPage(PAGES.ADMIN); }}>Admin</a>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}

export default App

