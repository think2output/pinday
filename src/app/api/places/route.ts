import { listPlaces, PlaceQueryError } from "../../../lib/server/places";

export function GET(request: Request) {
  try {
    return Response.json(listPlaces(new URL(request.url).searchParams), {
      headers: { "Cache-Control": "public, max-age=0, must-revalidate" },
    });
  } catch (error) {
    if (!(error instanceof PlaceQueryError)) throw error;
    return Response.json({ error: { code: "INVALID_QUERY", field: error.field, message: error.message } }, {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
