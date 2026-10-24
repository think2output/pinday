import "server-only";

// 서버 전용 키 읽기. 이 파일을 화면(클라이언트) 코드에서 불러오면 빌드가 실패해서 키 유출을 막는다.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경 변수 ${name}이(가) 없어요. .env.example을 보고 .env에 추가하세요.`);
  }
  return value;
}
