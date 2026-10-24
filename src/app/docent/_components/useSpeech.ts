"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type Part = { key: string; label: string; text: string };

function koreanVoice() {
  return window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("ko")) ?? null;
}
function subscribeVoices(callback: () => void) {
  if (!("speechSynthesis" in window)) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", callback);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", callback);
}
/** "checking" = 목소리 목록을 아직 못 받음, "unsupported" = 이 기기에 한국어 목소리 없음 */
function voiceState(): "checking" | "ready" | "unsupported" {
  if (!("speechSynthesis" in window)) return "unsupported";
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return "checking";
  return koreanVoice() ? "ready" : "unsupported";
}

/** 브라우저 내장 음성으로 부분별 읽기. 끝나면 다음 부분으로 넘어간다 */
export function useSpeech(parts: Part[]) {
  const support = useSyncExternalStore(subscribeVoices, voiceState, () => "checking" as const);
  const [current, setCurrent] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const token = useRef(0);

  const stop = useCallback(() => {
    token.current += 1;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setPlaying(false);
  }, []);

  const play = useCallback((start: number) => {
    const mine = ++token.current;
    window.speechSynthesis.cancel();
    const speak = (index: number) => {
      if (token.current !== mine) return;
      if (index < 0 || index >= parts.length) { setPlaying(false); setCurrent(null); return; }
      const utterance = new SpeechSynthesisUtterance(parts[index].text);
      utterance.lang = "ko-KR";
      utterance.voice = koreanVoice();
      utterance.onend = () => speak(index + 1);
      utterance.onerror = () => { if (token.current === mine) setPlaying(false); };
      setCurrent(index);
      setPlaying(true);
      window.speechSynthesis.speak(utterance);
    };
    speak(start);
  }, [parts]);

  useEffect(() => () => { token.current += 1; if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);

  return { support, current, playing, play, stop };
}
