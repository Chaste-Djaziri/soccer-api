import { corsHeaders, proxyHlsRequest } from "@/lib/hlsProxy";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
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
      { status: 400, headers: corsHeaders(request) },
    );
  }

  return proxyHlsRequest(request, target);
}
