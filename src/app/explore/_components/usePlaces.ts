"use client";

import { useEffect, useState } from "react";
import type { Place } from "./types";

export function usePlaces(query: string) {
  const [attempt, setAttempt] = useState(0);
  const key = `${query}:${attempt}`;
  const [result, setResult] = useState<{ key: string; items: Place[]; error: boolean } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/places?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("places");
        return response.json() as Promise<{ items: Place[] }>;
      })
      .then(({ items }) => {
        if (!controller.signal.aborted) setResult({ key, items, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key, items: [], error: true });
      });
    return () => controller.abort();
  }, [query, key]);

  const current = result?.key === key ? result : null;
  return { items: current?.items ?? EMPTY_PLACES, loading: !current, error: current?.error ?? false, retry: () => setAttempt((value) => value + 1) };
}

const EMPTY_PLACES: Place[] = [];
