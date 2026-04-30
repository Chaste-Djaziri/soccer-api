import { corsHeaders, proxyHlsRequest } from "@/lib/hlsProxy";

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

  if (source !== "remleg" || streamPath.length === 0) {
    return Response.json(
      { error: "Unknown HLS stream source." },
      { status: 404, headers: corsHeaders(request) },
    );
  }

  const requestUrl = new URL(request.url);
  const target = new URL(
    `/${streamPath.map(encodeURIComponent).join("/")}`,
    "https://remleg.cachefly.net",
  );
  target.search = requestUrl.search;

  return proxyHlsRequest(request, target.toString());
}
