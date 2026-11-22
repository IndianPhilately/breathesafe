import { useState } from 'react'
import {
  getHealthSolutions,
  type SolutionItem,
} from '../services/healthAdvice'

type HealthAdviceSectionProps = {
  cityName: string
  usAqi: number
  pm25: number
}

function statusBadgeClass(status: SolutionItem['status']): string {
  switch (status) {
    case 'Must':
      return 'health-badge must'
    case 'Recommended':
      return 'health-badge recommended'
    case 'Optional':
      return 'health-badge optional'
    default:
      return 'health-badge neutral'
  }
}

export function HealthAdviceSection({
  cityName,
  usAqi,
  pm25,
}: HealthAdviceSectionProps) {
  const healthData = getHealthSolutions(usAqi, pm25)
  const [activeSolutionId, setActiveSolutionId] = useState<string>(
    healthData.solutions[0]?.id ?? '',
  )

  const activeSolution =
    healthData.solutions.find((s) => s.id === activeSolutionId) ??
    healthData.solutions[0]

  return (
    <section className="health-advice-card" aria-labelledby="health-advice-heading">
      <div className="health-advice-header">
        <div>
          <p className="panel-kicker">Health impact & advice</p>
          <h2 id="health-advice-heading">
            Health advice for people in {cityName}
          </h2>
        </div>
        <span className="health-source-attribution">
          Source: Berkeley Earth
        </span>
      </div>

      <div className="cigarette-equivalency-panel">
        <div className="cigarette-metric-hero">
          <div className="cigarette-hero-left">
            <span className="cigarette-count-number">
              {healthData.dailyCigarettes.toFixed(1)}
            </span>
            <div className="cigarette-count-caption">
              <span>Cigarettes</span>
              <small>per day</small>
            </div>
          </div>
          <div className="cigarette-graphic" aria-hidden="true">
            <svg className="cigarette-svg" viewBox="0 0 80 24" fill="none">
              <path
                d="M8 14c-3-2-2-5 1-7M12 12c-2-2-1-4 1-6"
                stroke="#8ba495"
                strokeWidth="1.6"
                strokeLinecap="round"
                className="cigarette-smoke-wisp"
              />
              <rect x="18" y="7" width="5" height="10" rx="1.5" fill="#f97316" className="cigarette-ember" />
              <circle cx="20.5" cy="12" r="3.5" fill="#fb923c" opacity="0.6" className="cigarette-glow" />
              <rect x="23" y="7" width="38" height="10" rx="0" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
              <rect x="61" y="7" width="16" height="10" rx="2" fill="#d97706" />
              <line x1="64" y1="7" x2="64" y2="17" stroke="#b45309" strokeWidth="0.7" opacity="0.4" />
              <line x1="68" y1="7" x2="68" y2="17" stroke="#b45309" strokeWidth="0.7" opacity="0.4" />
            </svg>
          </div>
        </div>

        <div className="cigarette-period-breakdown">
          <div className="period-item">
            <span className="period-label">Weekly equivalent</span>
            <strong className="period-value">
              {healthData.weeklyCigarettes.toFixed(1)}
              <small> cigs</small>
            </strong>
          </div>
          <div className="period-item">
            <span className="period-label">Monthly equivalent</span>
            <strong className="period-value">
              {healthData.monthlyCigarettes}
              <small> cigs</small>
            </strong>
          </div>
        </div>
      </div>

      <p className="cigarette-statement">
        Breathing the outdoor air in {cityName} today is roughly equivalent to{' '}
        <strong>smoking {healthData.dailyCigarettes.toFixed(1)} cigarettes</strong> a day.
      </p>

      <p className="health-disclaimer">
        Disclaimer: Cigarette-equivalent estimate based on Berkeley Earth's peer-reviewed rule of thumb
        (1 cigarette/day ≈ 22 µg/m³ PM2.5), assuming continuous 24-hour outdoor exposure.
      </p>

      <hr className="health-divider" />

      <div className="health-solutions-section">
        <h3 className="health-solutions-title">
          Recommended actions for current air quality
        </h3>

        <div className="health-solutions-grid" role="tablist" aria-label="Actionable health advice">
          {healthData.solutions.map((item) => {
            const isSelected = item.id === activeSolution?.id
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`health-solution-tab ${isSelected ? 'active' : ''}`}
                onClick={() => setActiveSolutionId(item.id)}
              >
                <span className="solution-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="solution-title">{item.title}</span>
                <span className={statusBadgeClass(item.status)}>{item.status}</span>
              </button>
            )
          })}
        </div>

        {activeSolution && (
          <div className="health-solution-callout" role="tabpanel">
            <p className="solution-callout-text">
              <strong>{activeSolution.title}: </strong>
              {activeSolution.detail}
            </p>
          </div>
        )}

        <div className="health-outlook-card">
          <div className="health-outlook-header">
            <h4 className="health-outlook-title">
              <span aria-hidden="true">⏱️</span> 24-Hour Activity & Exposure Outlook
            </h4>
            <span className="health-outlook-badge">Diurnal Pattern</span>
          </div>
          <p className="solution-callout-text">
            {healthData.outlook.activitySummary}
          </p>
          <div className="health-outlook-details">
            <div className="outlook-slot">
              <span className="outlook-slot-label">Safest outdoor window</span>
              <span className="outlook-slot-time">🟢 {healthData.outlook.bestTimeWindow}</span>
              <span className="outlook-slot-tip">{healthData.outlook.bestTimeTip}</span>
            </div>
            <div className="outlook-slot">
              <span className="outlook-slot-label">Peak pollution window</span>
              <span className="outlook-slot-time">⚠️ {healthData.outlook.cautionWindow}</span>
              <span className="outlook-slot-tip">{healthData.outlook.cautionTip}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
