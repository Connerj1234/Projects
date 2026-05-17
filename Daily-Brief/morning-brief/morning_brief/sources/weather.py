from __future__ import annotations

from typing import Any
from urllib.parse import quote

from morning_brief.http_client import safe_get_json


def collect_weather(locations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for location in locations:
        name = location["name"]
        lat = location["latitude"]
        lon = location["longitude"]
        point_url = f"https://api.weather.gov/points/{lat},{lon}"
        point, point_error = safe_get_json(point_url)
        if point_error or not isinstance(point, dict):
            results.append({"location": name, "error": point_error or "Invalid point response"})
            continue

        properties = point.get("properties", {})
        forecast_url = properties.get("forecast")
        hourly_url = properties.get("forecastHourly")
        alerts_url = f"https://api.weather.gov/alerts/active?point={quote(str(lat))},{quote(str(lon))}"

        forecast_periods = []
        hourly_periods = []
        alerts = []

        if forecast_url:
            forecast, error = safe_get_json(forecast_url)
            if isinstance(forecast, dict):
                forecast_periods = forecast.get("properties", {}).get("periods", [])[:4]
            elif error:
                forecast_periods = [{"error": error}]

        if hourly_url:
            hourly, error = safe_get_json(hourly_url)
            if isinstance(hourly, dict):
                hourly_periods = hourly.get("properties", {}).get("periods", [])[:8]
            elif error:
                hourly_periods = [{"error": error}]

        alerts_data, error = safe_get_json(alerts_url)
        if isinstance(alerts_data, dict):
            for feature in alerts_data.get("features", [])[:5]:
                props = feature.get("properties", {})
                alerts.append(
                    {
                        "event": props.get("event"),
                        "headline": props.get("headline"),
                        "severity": props.get("severity"),
                        "effective": props.get("effective"),
                        "expires": props.get("expires"),
                    }
                )
        elif error:
            alerts.append({"error": error})

        results.append(
            {
                "location": name,
                "latitude": lat,
                "longitude": lon,
                "forecast_periods": simplify_periods(forecast_periods),
                "hourly_next_periods": simplify_periods(hourly_periods),
                "alerts": alerts,
                "source": "weather.gov",
            }
        )
    return results


def simplify_periods(periods: list[dict[str, Any]]) -> list[dict[str, Any]]:
    simplified = []
    for period in periods:
        if "error" in period:
            simplified.append(period)
            continue
        simplified.append(
            {
                "name": period.get("name"),
                "start_time": period.get("startTime"),
                "temperature": period.get("temperature"),
                "temperature_unit": period.get("temperatureUnit"),
                "wind": " ".join(
                    part for part in [period.get("windSpeed"), period.get("windDirection")] if part
                ),
                "short_forecast": period.get("shortForecast"),
                "detailed_forecast": period.get("detailedForecast"),
            }
        )
    return simplified

