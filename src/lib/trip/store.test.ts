import { beforeEach, describe, expect, it, vi } from "vitest";

// 저장소는 모듈 안에 상태를 들고 있어서 테스트마다 새로 불러온다
async function loadStore() {
  vi.resetModules();
  return import("./store");
}

// node 환경에는 localStorage가 없으므로 간단한 가짜를 붙인다
function fakeWindow() {
  const data = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => data.set(k, v),
      removeItem: (k: string) => data.delete(k),
    },
    addEventListener() {},
    removeEventListener() {},
  });
  return data;
}

describe("저장소", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("처음 장소를 담는 순간 자동 여행과 함께 저장된다", async () => {
    const data = fakeWindow();
    const { tripActions } = await loadStore();
    expect(data.size).toBe(0);
    tripActions.addCandidate("a");
    const saved = JSON.parse(data.get("pinday:trip")!);
    expect(saved.candidates).toEqual(["a"]);
    expect(saved.periodSource).toBe("auto");
    expect(saved.days).toHaveLength(3);
  });

  it("바뀐 게 없는 동작은 저장하지 않는다", async () => {
    const data = fakeWindow();
    const { tripActions } = await loadStore();
    tripActions.removeCandidate("없는장소");
    expect(data.size).toBe(0);
  });

  it("초기화 후 되돌리기를 누르면 모든 정보가 복구된다", async () => {
    const data = fakeWindow();
    const { tripActions } = await loadStore();
    tripActions.addToDay("a", 1);
    tripActions.setTaste("history");
    const before = data.get("pinday:trip");
    tripActions.reset();
    expect(data.has("pinday:trip")).toBe(false);
    tripActions.undoReset();
    expect(data.get("pinday:trip")).toBe(before);
  });

  it("초기화 뒤 다른 변경을 하면 되돌리기는 동작하지 않는다", async () => {
    const data = fakeWindow();
    const { tripActions } = await loadStore();
    tripActions.addCandidate("a");
    tripActions.reset();
    tripActions.addCandidate("b");
    tripActions.undoReset();
    expect(JSON.parse(data.get("pinday:trip")!).candidates).toEqual(["b"]);
  });

  it("깨진 저장 값은 없는 것으로 보고 새로 시작한다", async () => {
    const data = fakeWindow();
    data.set("pinday:trip", "{망가짐");
    const { tripActions } = await loadStore();
    tripActions.addCandidate("a");
    expect(JSON.parse(data.get("pinday:trip")!).candidates).toEqual(["a"]);
  });

  it("브라우저 저장소를 못 써도 동작한다", async () => {
    const { tripActions } = await loadStore();
    expect(() => tripActions.addCandidate("a")).not.toThrow();
  });
});
