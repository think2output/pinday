"use client";

import { useEffect, useState } from "react";
import { weatherRequest, type WeatherResponse, type WeatherState } from "./scheduleModel";

/** 부산 대표 격자의 날짜별 예보. 실패해도 일정 편집에는 영향을 주지 않는다 */
export function useScheduleWeather(startDate: string, endDate: string, today: string, enabled: boolean) {
  const request = enabled ? weatherRequest(startDate, endDate, today) : null;
  const key = request ? `${request.startDate}:${request.days}` : null;
  const [result, setResult] = useState<{ key: string; state: WeatherState } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!key) return;
    const [start, days] = key.split(":");
    const controller = new AbortController();
    const done = (state: WeatherState) => setResult({ key: `${key}#${attempt}`, state });
    fetch(`/api/weather?startDate=${start}&days=${days}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.days) {
          done({ kind: "error", message: body?.error?.message ?? "날씨를 불러오지 못했어요." });
          return;
        }
        done({ kind: "ready", data: body as WeatherResponse });
      })
      .catch(() => {
        if (!controller.signal.aborted) done({ kind: "error", message: "날씨를 불러오지 못했어요." });
      });
    return () => controller.abort();
  }, [key, attempt]);

  const state: WeatherState = !key ? { kind: "none" } : result?.key === `${key}#${attempt}` ? result.state : { kind: "loading" };
  return { state, retry: () => setAttempt((value) => value + 1) };
}
