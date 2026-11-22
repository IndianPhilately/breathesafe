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
            <span className="cigarette-smoke">☁️</span>
            <span className="cigarette-body">🚬</span>
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
      </div>
    </section>
  )
}
