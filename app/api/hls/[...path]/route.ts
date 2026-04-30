import {
  corsHeaders,
  getStreamTargetUrl,
  proxyHlsRequest,
} from "@/lib/hlsProxy";

export const dynamic = "force-dynamic";

type HlsPathContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function GET(request: Request, { params }: HlsPathContext) {
  const { path } = await params;
  const [source, ...streamPath] = path;
  const requestUrl = new URL(request.url);
  const target = getStreamTargetUrl(source, streamPath, requestUrl.search);

  if (!target) {
    return Response.json(
      { error: "Unknown HLS stream source." },
      { status: 404, headers: corsHeaders(request) },
    );
  }

  return proxyHlsRequest(request, target.toString());
}
