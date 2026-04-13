import { useEffect, useState } from 'react'
import {
  SUPPORT_MESSAGES,
  WEATHER_DEFAULT_LOCATION,
} from '../utils/constants'

type WeatherPanelProps = {
  onClose: () => void
}

type WeatherState =
  | { status: 'loading' }
  | {
      status: 'success'
      data: {
        current: {
          temperature: number
          weatherLabel: string
          windSpeed: number
        }
        daily: Array<{
          date: string
          high: number
          low: number
          precipitationChance: number
          weatherLabel: string
        }>
        locationLabel: string
        sourceLabel: string
      }
    }
  | {
      status: 'error'
      message: string
    }

type WeatherApiResponse = {
  current?: {
    temperature_2m?: number
    weather_code?: number
    wind_speed_10m?: number
  }
  daily?: {
    time?: string[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    precipitation_probability_max?: number[]
    weather_code?: number[]
  }
}

function getWeatherLabel(code: number | undefined) {
  if (code === 0) return 'Clear'
  if (code === 1 || code === 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45 || code === 48) return 'Fog'
  if (code === 51 || code === 53 || code === 55) return 'Drizzle'
  if (code === 61 || code === 63 || code === 65) return 'Rain'
  if (code === 71 || code === 73 || code === 75) return 'Snow'
  if (code === 80 || code === 81 || code === 82) return 'Rain showers'
  if (code === 95 || code === 96 || code === 99) return 'Thunderstorm'
  return 'Unspecified'
}

async function resolveCoordinates() {
  if (!navigator.geolocation) {
    return {
      latitude: WEATHER_DEFAULT_LOCATION.latitude,
      longitude: WEATHER_DEFAULT_LOCATION.longitude,
      locationLabel: WEATHER_DEFAULT_LOCATION.label,
      sourceLabel: 'fallback',
    }
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 4000,
        maximumAge: 300000,
      })
    })

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      locationLabel: 'Current location',
      sourceLabel: 'geolocation',
    }
  } catch {
    return {
      latitude: WEATHER_DEFAULT_LOCATION.latitude,
      longitude: WEATHER_DEFAULT_LOCATION.longitude,
      locationLabel: WEATHER_DEFAULT_LOCATION.label,
      sourceLabel: 'fallback',
    }
  }
}

async function fetchWeather() {
  const location = await resolveCoordinates()
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(location.latitude))
  url.searchParams.set('longitude', String(location.longitude))
  url.searchParams.set(
    'current',
    'temperature_2m,weather_code,wind_speed_10m',
  )
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
  )
  url.searchParams.set('forecast_days', '3')
  url.searchParams.set('timezone', 'auto')

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(SUPPORT_MESSAGES.weatherUnavailable)
  }

  const payload = (await response.json()) as WeatherApiResponse

  if (!payload.current || !payload.daily?.time) {
    throw new Error(SUPPORT_MESSAGES.weatherUnavailable)
  }

  return {
    current: {
      temperature: Math.round(payload.current.temperature_2m ?? 0),
      weatherLabel: getWeatherLabel(payload.current.weather_code),
      windSpeed: Math.round(payload.current.wind_speed_10m ?? 0),
    },
    daily: payload.daily.time.map((date, index) => ({
      date,
      high: Math.round(payload.daily?.temperature_2m_max?.[index] ?? 0),
      low: Math.round(payload.daily?.temperature_2m_min?.[index] ?? 0),
      precipitationChance:
        Math.round(payload.daily?.precipitation_probability_max?.[index] ?? 0),
      weatherLabel: getWeatherLabel(payload.daily?.weather_code?.[index]),
    })),
    locationLabel: location.locationLabel,
    sourceLabel: location.sourceLabel,
  }
}

export function WeatherPanel({ onClose }: WeatherPanelProps) {
  const [state, setState] = useState<WeatherState>({ status: 'loading' })
  const [requestNonce, setRequestNonce] = useState(0)

  useEffect(() => {
    let cancelled = false

    void fetchWeather()
      .then((data) => {
        if (!cancelled) {
          setState({ status: 'success', data })
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message:
              error instanceof Error ? error.message : SUPPORT_MESSAGES.weatherUnavailable,
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [requestNonce])

  return (
    <section aria-modal="true" className="activation-modal weather-panel" role="dialog">
      <div className="modal-eyebrow">WEATHER PANEL</div>
      <h2 className="modal-title">Operations Weather</h2>

      {state.status === 'loading' && (
        <p className="modal-body">
          Acquiring forecast telemetry and local conditions.
        </p>
      )}

      {state.status === 'error' && (
        <>
          <p className="modal-body">{state.message}</p>
          <div className="modal-chips">
            <span className="modal-chip">STATE: ERROR</span>
          </div>
        </>
      )}

      {state.status === 'success' && (
        <>
          <p className="modal-body">
            {state.data.locationLabel} forecast via Open-Meteo. Source: {state.data.sourceLabel}.
          </p>
          <div className="weather-panel-grid">
            <article className="weather-card weather-card-primary">
              <span className="weather-card-label">CURRENT</span>
              <strong className="weather-card-temp">{state.data.current.temperature}°C</strong>
              <span className="weather-card-value">{state.data.current.weatherLabel}</span>
              <span className="weather-card-meta">
                Wind {state.data.current.windSpeed} km/h
              </span>
            </article>

            {state.data.daily.map((day) => (
              <article className="weather-card" key={day.date}>
                <span className="weather-card-label">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <strong className="weather-card-value">{day.weatherLabel}</strong>
                <span className="weather-card-meta">
                  High {day.high}°C / Low {day.low}°C
                </span>
                <span className="weather-card-meta">
                  Rain {day.precipitationChance}%
                </span>
              </article>
            ))}
          </div>
        </>
      )}

      <div className="modal-actions">
        <button
          className="hud-btn"
          onClick={() => {
            setState({ status: 'loading' })
            setRequestNonce((value) => value + 1)
          }}
        >
          RETRY
        </button>
        <button className="hud-btn ghost" onClick={onClose}>
          CLOSE
        </button>
      </div>
    </section>
  )
}
