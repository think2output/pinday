import { getRoute, RouteError } from "../../../lib/server/route";

export async function GET(request: Request) {
  try {
    return Response.json(await getRoute(new URL(request.url).searchParams), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (!(error instanceof RouteError)) {
      return Response.json({ error: { code: "ROUTE_UNAVAILABLE", message: "경로를 불러오지 못했어요. 잠시 후 다시 시도해주세요." } }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  }
}
