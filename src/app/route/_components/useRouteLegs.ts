"use client";

import { useEffect, useState } from "react";
import type { RouteLeg } from "../../../lib/server/route-model";

export type LegState =
  | { kind: "loading" }
  | { kind: "ready"; leg: RouteLeg }
  | { kind: "error"; message: string; retry: boolean };

// 같은 구간은 이 탭이 열려 있는 동안 다시 묻지 않는다. 실패는 기억하지 않는다.
const memo = new Map<string, Promise<LegState>>();

function request(from: string, to: string): Promise<LegState> {
  const key = `${from}>${to}`;
  const existing = memo.get(key);
  if (existing) return existing;
  const task = fetch(`/api/route?${new URLSearchParams({ from, to })}`)
    .then(async (response) => {
      const body = await response.json().catch(() => null);
      if (response.ok && body?.leg) return { kind: "ready", leg: body.leg as RouteLeg } as const;
      const code = body?.error?.code;
      return {
        kind: "error",
        message: body?.error?.message ?? "경로를 불러오지 못했어요.",
        retry: !["ROUTE_NOT_FOUND", "INVALID_LOCATION", "PLACE_NOT_FOUND", "ROUTE_QUOTA"].includes(code),
      } as const;
    })
    .catch(() => ({ kind: "error", message: "경로를 불러오지 못했어요. 인터넷 연결을 확인해주세요.", retry: true }) as const)
    .then((state: LegState) => {
      if (state.kind === "error") memo.delete(key);
      return state;
    });
  memo.set(key, task);
  return task;
}

/** 그날 이웃한 장소 쌍마다 경로 상태. pairs가 바뀌면 다시 불러온다 */
export function useRouteLegs(pairs: [string, string][]) {
  const signature = pairs.map(([from, to]) => `${from}>${to}`).join(",");
  const [states, setStates] = useState<Record<string, LegState>>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    for (const key of signature ? signature.split(",") : []) {
      const [from, to] = key.split(">");
      request(from, to).then((state) => {
        if (!cancelled) setStates((value) => ({ ...value, [key]: state }));
      });
    }
    return () => { cancelled = true; };
  }, [signature, attempt]);

  const stateOf = (from: string, to: string): LegState => states[`${from}>${to}`] ?? { kind: "loading" };
  const retry = (from: string, to: string) => {
    setStates((value) => ({ ...value, [`${from}>${to}`]: { kind: "loading" } }));
    setAttempt((value) => value + 1);
  };
  return { stateOf, retry };
}
