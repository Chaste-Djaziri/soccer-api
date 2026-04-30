const APPROVED_ORIGIN = "https://www.soccertvhd.com";
const STREAM_SOURCES = {
  bustrr: "bustrr.cachefly.net",
  laliscorr: "laliscorr.cachefly.net",
  remleg: "remleg.cachefly.net",
  serspurgg: "serspurgg.cachefly.net",
} as const;
const STREAM_REFERERS = {
  bustrr: "https://www.soccertvhd.com/streameast-stream-east-live-streaming/",
  laliscorr: "https://www.soccertvhd.com/score808-score808-live/",
  remleg: "https://www.soccertvhd.com/hesgoal-hes-goal-live-streaming/",
  serspurgg: "https://www.soccertvhd.com/sportsurge-sport-surge-live-streaming/",
} satisfies Record<StreamSource, string>;

export type StreamSource = keyof typeof STREAM_SOURCES;

const STREAM_SOURCE_BY_HOST = new Map<string, StreamSource>(
  (Object.keys(STREAM_SOURCES) as StreamSource[]).map((source) => [
    STREAM_SOURCES[source],
    source,
  ]),
);
const ALLOWED_REQUEST_ORIGINS = new Set([
  "https://www.soccertvhd.com",
  "https://soccer-api.anime-proxy.workers.dev",
]);

export function getProxiedHlsUrl(target: string, requestUrl = "http://localhost") {
  const streamUrl = new URL(target);
  const source = getStreamSource(streamUrl);

  if (!source) {
    return target;
  }

  const url = new URL(`/api/hls/${source}${streamUrl.pathname}`, requestUrl);
  url.search = streamUrl.search;
  return url.pathname + url.search;
}

export function getStreamTargetUrl(source: string, path: string[], search: string) {
  if (!isStreamSource(source) || path.length === 0) {
    return null;
  }

  const target = new URL(
    `/${path.map(encodeURIComponent).join("/")}`,
    `https://${STREAM_SOURCES[source]}`,
  );
  target.search = search;
  return target;
}

export async function proxyHlsRequest(request: Request, target: string) {
  let streamUrl: URL;
  try {
    streamUrl = new URL(target);
  } catch {
    return Response.json(
      { error: "Invalid HLS target URL." },
      { status: 400, headers: corsHeaders(request) },
    );
  }

  if (!isAllowedStreamUrl(streamUrl)) {
    return Response.json(
      { error: "This stream host is not approved for proxying." },
      { status: 403, headers: corsHeaders(request) },
    );
  }

  const upstream = await fetchUpstream(request, streamUrl);

  const contentType = upstream.headers.get("content-type") ?? "";
  const playlist = isPlaylist(streamUrl, contentType);
  const responseHeaders = proxyResponseHeaders(request, upstream.headers, {
    includeContentLength: !playlist,
  });

  if (!upstream.ok) {
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  }

  if (playlist) {
    const playlistBody = await upstream.text();
    return new Response(rewritePlaylist(playlistBody, streamUrl, request.url), {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export function corsHeaders(request?: Request) {
  const origin = request?.headers.get("origin");
  const allowedOrigin =
    origin && ALLOWED_REQUEST_ORIGINS.has(origin) ? origin : APPROVED_ORIGIN;

  return new Headers({
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "Range,Accept,Content-Type",
    "access-control-expose-headers":
      "Content-Length,Content-Range,Accept-Ranges,Content-Type",
    vary: "Origin",
  });
}

function isAllowedStreamUrl(url: URL) {
  return url.protocol === "https:" && Boolean(getStreamSource(url));
}

function getStreamSource(url: URL) {
  return STREAM_SOURCE_BY_HOST.get(url.hostname) ?? null;
}

function isStreamSource(source: string): source is StreamSource {
  return source in STREAM_SOURCES;
}

async function fetchUpstream(request: Request, streamUrl: URL) {
  const attempts: Array<"origin-and-referer" | "referer-only" | "minimal"> = [
    "origin-and-referer",
    "referer-only",
    "minimal",
  ];
  const urls = getUpstreamUrlCandidates(streamUrl);

  let response: Response | undefined;

  for (const url of urls) {
    for (const mode of attempts) {
      response = await fetch(url, {
        cache: "no-store",
        headers: upstreamHeaders(request, streamUrl, mode),
      });

      if (await isUsableUpstreamResponse(response)) {
        return response;
      }
    }
  }

  if (!response) {
    throw new Error("Unable to fetch upstream stream.");
  }

  return response;
}

function getUpstreamUrlCandidates(streamUrl: URL) {
  const urls = [streamUrl];

  if (streamUrl.protocol === "https:") {
    const httpUrl = new URL(streamUrl);
    httpUrl.protocol = "http:";
    urls.push(httpUrl);
  }

  return urls;
}

async function isUsableUpstreamResponse(response: Response) {
  if (response.ok) {
    return true;
  }

  return response.status !== 403;
}

function upstreamHeaders(
  request: Request,
  streamUrl: URL,
  mode: "origin-and-referer" | "referer-only" | "minimal",
) {
  const source = getStreamSource(streamUrl);
  const headers = new Headers({
    accept:
      request.headers.get("accept") ??
      "application/vnd.apple.mpegurl,application/x-mpegURL,video/mp2t,*/*",
    "accept-language": "en-US,en;q=0.9",
    priority: "u=1, i",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "x-no-redirect": "1",
  });

  if (mode === "origin-and-referer") {
    headers.set("origin", APPROVED_ORIGIN);
  }

  if (mode !== "minimal") {
    headers.set("referer", source ? STREAM_REFERERS[source] : APPROVED_ORIGIN);
  }

  const range = request.headers.get("range");
  if (range) {
    headers.set("range", range);
  }

  return headers;
}

function proxyResponseHeaders(
  request: Request,
  upstreamHeaders: Headers,
  options: { includeContentLength: boolean },
) {
  const headers = corsHeaders(request);
  const contentType = upstreamHeaders.get("content-type");
  const contentLength = upstreamHeaders.get("content-length");
  const acceptRanges = upstreamHeaders.get("accept-ranges");
  const contentRange = upstreamHeaders.get("content-range");
  const cacheControl = upstreamHeaders.get("cache-control");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (contentLength && options.includeContentLength) {
    headers.set("content-length", contentLength);
  }

  if (acceptRanges) {
    headers.set("accept-ranges", acceptRanges);
  }

  if (contentRange) {
    headers.set("content-range", contentRange);
  }

  if (cacheControl) {
    headers.set("cache-control", cacheControl);
  } else {
    headers.set("cache-control", "no-store");
  }

  return headers;
}

function isPlaylist(url: URL, contentType: string) {
  return (
    /\.m3u8(?:\?|$)/i.test(url.toString()) ||
    contentType.includes("mpegurl") ||
    contentType.includes("vnd.apple.mpegurl")
  );
}

function rewritePlaylist(playlist: string, playlistUrl: URL, requestUrl: string) {
  return playlist
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        return line;
      }

      const mediaUrl = new URL(trimmed, playlistUrl);

      if (!isAllowedStreamUrl(mediaUrl)) {
        return line;
      }

      return getProxiedHlsUrl(mediaUrl.toString(), requestUrl);
    })
    .join("\n");
}
