import { getPlace } from "../../../../lib/server/places";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const place = getPlace(id);
  if (!place) {
    return Response.json({ error: { code: "PLACE_NOT_FOUND", message: "장소를 찾을 수 없어요." } }, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return Response.json({ place }, {
    headers: { "Cache-Control": "public, max-age=0, must-revalidate" },
  });
}
