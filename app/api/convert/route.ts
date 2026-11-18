import { ConvertError, ERROR_STATUS, convertUrl } from "@/lib/convert";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_url" }, { status: ERROR_STATUS.invalid_url });
  }

  try {
    const url = typeof body === "object" && body !== null ? (body as { url?: unknown }).url : undefined;
    return Response.json(await convertUrl(url));
  } catch (error) {
    if (error instanceof ConvertError) {
      return Response.json({ error: error.code }, { status: ERROR_STATUS[error.code] });
    }
    throw error;
  }
}
