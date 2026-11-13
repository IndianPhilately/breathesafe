import './App.css'

function App() {
  return (
    <main className="app">
      <section className="welcome" aria-labelledby="welcome-title">
        <div className="brand" aria-label="BreatheSafe">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path
                d="M25.2 6.8C14.3 7.4 7 12.7 7 20.1c0 3.2 2.2 5.3 5.5 5.3 7.7 0 11.6-9.2 12.7-18.6Z"
                fill="currentColor"
              />
              <path
                d="M7.8 25c3.1-5.8 7.1-9.3 13.1-12.4"
                stroke="white"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          </span>
          <span>BreatheSafe</span>
        </div>

        <div className="welcome-content">
          <p className="eyebrow">A little more clarity, coming soon</p>
          <h1 id="welcome-title">
            Welcome to
            <br />
            <span>BreatheSafe.</span>
          </h1>
          <p className="welcome-copy">
            We’re creating a calmer way to understand the air around you, with
            air quality and weather information for India.
          </p>
          <p className="welcome-note">Your clearer view is taking shape.</p>
        </div>

        <div className="welcome-footer">
          <span aria-hidden="true" />
          Made for a breath of clarity
        </div>
      </section>
    </main>
  )
}

export default App
