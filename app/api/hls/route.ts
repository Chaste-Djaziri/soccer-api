import { corsHeaders, proxyHlsRequest } from "@/lib/hlsProxy";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");

  if (!target) {
    return Response.json(
      {
        error:
          "Missing HLS target. Use /api/hls/remleg/prehes/index.m3u8 instead.",
      },
      { status: 400, headers: corsHeaders() },
    );
  }

  return proxyHlsRequest(request, target);
}
