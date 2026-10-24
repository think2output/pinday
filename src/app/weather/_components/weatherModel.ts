// 날씨 대안 화면의 순수 계산. 저장 규칙은 src/lib/trip/rules.ts의 replaceInDay를 그대로 쓰고 여기서는 표시만 계산한다.
import { canMapPlace } from "../../explore/_components/mapCoordinates";
import { dayWeather, distanceKm, NEARBY_KM, type SchedulePlace, type WeatherDay, type WeatherState } from "../../schedule/_components/scheduleModel";

export type WeatherPlace = SchedulePlace & { indoor: boolean };
type ForecastDay = WeatherDay & { minTemperature?: number | null; maxTemperature?: number | null };

// 기호 뒤의 \uFE0E는 컬러 이모지 대신 글자 모양으로 그리게 한다(노란 조명 하나 규칙)
const TEXT = "\uFE0E";
const UMBRELLA = `☂${TEXT}`;
const SNOW = `❄${TEXT}`;
const CONDITIONS: Record<WeatherDay["condition"], { icon: string; label: string }> = {
  clear: { icon: `☀${TEXT}`, label: "맑음" },
  cloudy: { icon: `☁${TEXT}`, label: "구름많음" },
  overcast: { icon: `☁${TEXT}`, label: "흐림" },
  rain: { icon: UMBRELLA, label: "비" },
  snow: { icon: SNOW, label: "눈" },
  "rain-snow": { icon: UMBRELLA, label: "비·눈" },
  unknown: { icon: "?", label: "하늘 확인 어려움" },
};

export type DayCard = {
  icon: string;
  label: string;
  detail: string | null;
  /** 비·눈 예보가 있어 실내 대안을 보여줄 날 */
  rain: boolean;
  /** 그날 일정 위에 보여줄 안내 */
  note: string;
};

/** 날짜 카드. 예보 전·자료 없음·실패를 맑음이나 '비 없음'으로 바꾸지 않는다 */
export function dayCard(date: string, today: string, state: WeatherState): DayCard {
  const mark = dayWeather(date, today, state);
  if (date < today) return { icon: "–", label: "지난 날짜", detail: null, rain: false, note: "이미 지난 날짜라 예보가 없어요." };
  if (state.kind === "loading") return { icon: "…", label: "확인 중", detail: null, rain: false, note: "날씨를 확인하고 있어요." };
  if (state.kind === "error") return { icon: "!", label: "확인 실패", detail: null, rain: false, note: "날씨를 확인하지 못해 실내 대안을 보여드릴 수 없어요." };
  const day = state.kind === "ready" ? (state.data.days.find((entry) => entry.date === date) as ForecastDay | undefined) : undefined;
  if (!day || day.status === "not-forecast") {
    return { icon: "…", label: "예보 전", detail: null, rain: false, note: "아직 예보가 나오지 않았어요. 예보는 며칠 앞까지만 나와서, 여행이 가까워지면 다시 확인해 주세요." };
  }
  if (day.status === "unavailable") return { icon: "?", label: "자료 없음", detail: null, rain: false, note: "이 날 예보 자료가 비어 있어요. 비가 안 온다는 뜻은 아니에요." };

  const temps = day.minTemperature != null && day.maxTemperature != null ? `${day.minTemperature}° / ${day.maxTemperature}°` : null;
  const pop = day.maxPrecipitationProbability != null ? `강수확률 최대 ${day.maxPrecipitationProbability}%` : null;
  if (mark.rain) {
    const kind = day.condition === "snow" ? "눈" : day.condition === "rain-snow" ? "비·눈" : "비";
    return { icon: kind === "눈" ? SNOW : UMBRELLA, label: kind, detail: pop ?? temps, rain: true, note: `${kind} 예보가 있어요. 야외 장소마다 가까운 실내 장소를 골라뒀어요.` };
  }
  const condition = CONDITIONS[day.condition];
  if (day.precipitationExpected === false) {
    return { icon: condition.icon, label: condition.label, detail: temps ?? pop, rain: false, note: "받은 예보에는 비·눈 소식이 없어요. 일정 그대로 다녀오세요." };
  }
  return { icon: "?", label: "강수 확인 어려움", detail: temps, rain: false, note: "예보 자료 일부가 비어 비가 올지 판단하기 어려워요." };
}

export type Alternative = { place: WeatherPlace; km: number; story: boolean };

/** 요가·스파 같은 웰니스는 관광 대안으로 덜 어울려 뒤로 미룬다(사용자 결정) */
const isWellness = (place: WeatherPlace) => place.category.startsWith("웰니스관광");

/**
 * 야외 장소 대신 갈 실내 장소. 거리 제한 없이 가까운 순으로 고르되,
 * 직선 NEARBY_KM 안에 이야기 있는 곳을 맨 앞, 웰니스는 맨 뒤에 둔다. 이미 일정에 있는 곳은 뺀다.
 * 기준 장소의 좌표를 믿을 수 없으면 null.
 */
export function indoorAlternatives(
  target: WeatherPlace | undefined,
  places: Record<string, WeatherPlace>,
  scheduled: Set<string>,
  stories: Set<string>,
  limit = 3,
): Alternative[] | null {
  if (!target || !canMapPlace(target)) return null;
  const rank = (entry: Alternative) => (entry.story && entry.km <= NEARBY_KM ? 0 : isWellness(entry.place) ? 2 : 1);
  return Object.values(places)
    .filter((place) => place.indoor && place.id !== target.id && !scheduled.has(place.id) && canMapPlace(place))
    .map((place) => ({ place, km: distanceKm(target, place), story: stories.has(place.id) }))
    .sort((a, b) => rank(a) - rank(b) || a.km - b.km)
    .slice(0, limit);
}

export type Swap = { day: number; fromId: string; toId: string; addedCandidate: boolean };

/** 기억해 둔 교체 중 지금 일정에도 그대로 남아 있는 것만 */
export function activeSwaps(swaps: Swap[], days: string[][]): Swap[] {
  return swaps.filter((swap) => days[swap.day - 1]?.includes(swap.toId));
}
