import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { dailyForecast, dateKst, isDate, latestIssue, previousIssue, toGrid, type ForecastRow } from "./weather-model";

const NOW = new Date("2026-10-24T11:15:00Z"); // KST 20:15
const row = (category: string, value: string | number, date = "20261025", time = "0900"): ForecastRow => ({ baseDate: "20261024", baseTime: "2000", category, fcstValue: value, fcstDate: date, fcstTime: time, nx: 98, ny: 76 });
const clear = [row("TMP", "20"), row("SKY", "1"), row("PTY", "0"), row("POP", "0")];

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubEnv("KMA_APIHUB_AUTH_KEY", "mock-weather-auth-not-a-real-key");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("기상청 날짜·격자·날씨 요약", () => {
  it("발표 10분 전후와 자정 경계를 KST로 계산한다", () => {
    expect(latestIssue(new Date("2026-10-24T11:09:59Z"))).toEqual({ date: "20261024", time: "1700" });
    expect(latestIssue(new Date("2026-10-24T11:10:00Z"))).toEqual({ date: "20261024", time: "2000" });
    expect(latestIssue(new Date("2026-10-24T16:00:00Z"))).toEqual({ date: "20261024", time: "2300" });
    expect(previousIssue({date:"20261025",time:"0200"})).toEqual({date:"20261024",time:"2300"});
    expect(dateKst(new Date("2026-10-24T15:00:00Z"))).toBe("2026-10-25");
    expect(isDate("2026-02-30")).toBe(false);
  });
  it("공식 수식의 기준점과 부산 시청 위치를 올바른 격자로 변환한다", () => {
    expect(toGrid(38,126)).toEqual({nx:43,ny:136});
    expect(toGrid(35.1796,129.0756)).toEqual({nx:98,ny:76});
  });
  it("비·눈과 구름을 구분하고 발표 범위 밖은 예보 전으로 남긴다", () => {
    const rows = [...clear, row("SKY", "4", "20261025", "1200"), row("PTY", "4", "20261025", "1200"), row("POP", "80", "20261025", "1200"), row("TMN", "12"), row("TMX", "21")];
    const days = dailyForecast(rows,"2026-10-25",3);
    expect(days[0]).toMatchObject({status:"forecast",condition:"rain",precipitationExpected:true,maxPrecipitationProbability:80,minTemperature:12,maxTemperature:21});
    expect(days[1]).toMatchObject({status:"not-forecast",condition:"unknown",precipitationExpected:null});
    expect(dailyForecast([row("PTY","3"),row("SKY","4")],"2026-10-25",1)[0].condition).toBe("snow");
    expect(dailyForecast([row("PTY","2"),row("SKY","4")],"2026-10-25",1)[0].condition).toBe("rain-snow");
    expect(dailyForecast([row("PTY","0"),row("SKY","3")],"2026-10-25",1)[0].condition).toBe("cloudy");
    expect(dailyForecast([row("PTY","0"),row("SKY","4")],"2026-10-25",1)[0].condition).toBe("overcast");
  });
  it("결측을 맑음·0도·강수 없음으로 바꾸지 않고 공식 최저/최고를 임의 계산하지 않는다", () => {
    const missing = dailyForecast([row("TMP","-999"),row("SKY","-999"),row("PTY","900"),row("POP","")],"2026-10-25",1)[0];
    expect(missing).toMatchObject({status:"unavailable",condition:"unknown",precipitationExpected:null,minTemperature:null,maxTemperature:null,maxPrecipitationProbability:null});
    const partial = dailyForecast([...clear,row("TMP","22","20261025","1200")],"2026-10-25",1)[0];
    expect(partial.condition).toBe("unknown");
    expect(partial.precipitationExpected).toBeNull();
    expect(partial.minTemperature).toBeNull();
    expect(partial.maxTemperature).toBeNull();
    const gap = dailyForecast([...clear,...clear.map(r=>({...r,fcstDate:"20261027"}))],"2026-10-25",3);
    expect(gap[1].status).toBe("unavailable");
  });
});

function response(rows: ForecastRow[], page = 1, total = rows.length) {
  return Response.json({response:{header:{resultCode:"00",resultMsg:"NORMAL_SERVICE"},body:{pageNo:page,totalCount:total,items:{item:rows}}}});
}

describe("날씨 서버 API", () => {
  it("1000건 이후 페이지도 받으며 날짜 범위가 달라도 격자·발표 캐시를 재사용한다", async () => {
    const first = Array.from({length:1000},(_,index)=>row(`EXTRA_${index}`,"0"));
    const fetcher=vi.fn().mockResolvedValueOnce(response(first,1,1004)).mockResolvedValueOnce(response(clear,2,1004));
    vi.stubGlobal("fetch",fetcher);
    const {getWeather}=await import("./weather");
    const result=await getWeather(new URLSearchParams({startDate:"2026-10-25",days:"14"}));
    expect(result.days).toHaveLength(14);
    expect(result.days[0].status).toBe("forecast");
    expect(result.days[13].status).toBe("not-forecast");
    expect(result.issuedAt).toBe("2026-10-24T20:00:00+09:00");
    expect(new URL(fetcher.mock.calls[1][0]).searchParams.get("pageNo")).toBe("2");
    await getWeather(new URLSearchParams({startDate:"2026-10-26"}));
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(result)).not.toContain("mock-weather-auth");
  });
  it("동시 요청을 합치고 5분이 지난 응답은 다시 받는다", async () => {
    const fetcher=vi.fn().mockImplementation(async()=>response(clear));
    vi.stubGlobal("fetch",fetcher);
    const {getWeather}=await import("./weather");
    await Promise.all([getWeather(new URLSearchParams()),getWeather(new URLSearchParams())]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date(NOW.getTime()+300001));
    await getWeather(new URLSearchParams());
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("다음 발표로 넘어가거나 장소 격자가 다르면 이전 캐시와 섞지 않는다", async () => {
    const fetcher=vi.fn().mockImplementation(async(input:URL)=>{
      const p=new URL(input).searchParams;
      return response(clear.map(r=>({...r,baseDate:p.get("base_date")!,baseTime:p.get("base_time")!,nx:Number(p.get("nx")),ny:Number(p.get("ny"))})));
    });
    vi.stubGlobal("fetch",fetcher);
    const {getWeather}=await import("./weather");
    await getWeather(new URLSearchParams());
    const place=await getWeather(new URLSearchParams({placeId:"126081"}));
    expect(place.location.placeId).toBe("126081");
    expect(fetcher).toHaveBeenCalledTimes(2);
    vi.setSystemTime(new Date("2026-10-24T14:10:00Z"));
    const latest=await getWeather(new URLSearchParams());
    expect(latest.issuedAt).toBe("2026-10-24T23:00:00+09:00");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("NO_DATA일 때만 직전 발표를 한 번 쓰며 실제 발표시각을 표시한다", async () => {
    const fetcher=vi.fn().mockResolvedValueOnce(Response.json({response:{header:{resultCode:"03"}}})).mockResolvedValueOnce(response(clear.map(r=>({...r,baseTime:"1700"}))));
    vi.stubGlobal("fetch",fetcher);
    const {getWeather}=await import("./weather");
    const result=await getWeather(new URLSearchParams());
    expect(result.issuedAt).toBe("2026-10-24T17:00:00+09:00");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("오류 응답은 저장하지 않으며 원래 오류 URL과 키를 반환하지 않는다", async () => {
    const fetcher=vi.fn().mockRejectedValueOnce(new Error("https://example.test/?authKey=mock-weather-auth-not-a-real-key")).mockImplementation(async()=>response(clear));
    vi.stubGlobal("fetch",fetcher);
    const {GET}=await import("../../app/api/weather/route");
    const bad=await GET(new Request("http://localhost/api/weather"));
    expect(bad.status).toBe(502);
    expect(bad.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(await bad.json())).not.toContain("authKey");
    const good=await GET(new Request("http://localhost/api/weather"));
    expect(good.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each([
    ()=>Response.json({response:{header:{resultCode:"30"}}}),
    ()=>Response.json({response:{header:{resultCode:"00"},body:{pageNo:1,totalCount:5,items:{item:clear}}}}),
    ()=>response([...clear,clear[0]]),
    ()=>response(clear.map(r=>({...r,nx:99}))),
    ()=>response(clear.map(r=>({...r,fcstDate:"20261023"}))),
    ()=>Response.json({response:{header:{resultCode:"00"},body:{pageNo:1,totalCount:4,items:{item:clear.map(r=>({...r,fcstTime:900}))}}}}),
    ()=>new Response("<error>upstream error</error>"),
  ])("인증 오류·불완전·중복·격자 불일치·비JSON 응답을 성공으로 보지 않는다", async (makeResponse) => {
    vi.stubGlobal("fetch",vi.fn().mockImplementation(async()=>makeResponse()));
    const {getWeather}=await import("./weather");
    await expect(getWeather(new URLSearchParams())).rejects.toMatchObject({code:"WEATHER_UNAVAILABLE",status:502});
  });
  it("키가 없으면 503, 입력 오류는 외부 호출 전 400/404로 구분한다", async () => {
    const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    vi.stubEnv("KMA_APIHUB_AUTH_KEY","");
    const {GET}=await import("../../app/api/weather/route");
    expect((await GET(new Request("http://localhost/api/weather"))).status).toBe(503);
    expect((await GET(new Request("http://localhost/api/weather?placeId=missing"))).status).toBe(404);
    for(const q of ["startDate=2026-02-30","startDate=2026-10-23","days=15","days=0","days=1.5","days=1&days=2","nx=98"]) {
      expect((await GET(new Request(`http://localhost/api/weather?${q}`))).status).toBe(400);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
});
