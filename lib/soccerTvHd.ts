const HOME_URL = "https://www.soccertvhd.com/";
const SITE_ORIGIN = "https://www.soccertvhd.com";
const WIDGET_ID_PATTERN =
  /elfsight-app-([a-f0-9-]{36}|[a-z0-9-]+)/i;
const MEDIA_URL_PATTERN =
  /https?:\/\/[^\s"'<>\\]+?\.(?:m3u8|mpd|mp4)(?:\?[^\s"'<>\\]*)?/gi;
const EMBED_PATTERN =
  /<(?:iframe|source|video-js|video|embed)\b[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;

type EventDateTime = {
  type: "datetime";
  date: string;
  time: string;
};

type EventImage = {
  url: string;
  name?: string;
  size?: number;
  type?: string;
  extension?: string;
  width?: number;
  height?: number;
};

type EventLink = {
  type: string;
  target: string;
  rawValue: string;
  value: string;
};

type ElfsightEvent = {
  id: string;
  name: string;
  start: EventDateTime;
  end: EventDateTime;
  timeZone: string;
  repeatPeriod?: string;
  description?: string;
  image?: EventImage;
  eventType?: unknown[];
  location?: unknown[];
  host?: unknown[];
  tags?: unknown[];
  color?: string;
  buttonVisible?: boolean;
  buttonLink?: EventLink;
  buttonText?: string;
  buttonCaption?: string;
  video?: unknown;
  chosen?: boolean;
  selected?: boolean;
  repeatFrequency?: string;
  "$$key"?: [string, number];
  file?: unknown;
  exceptions?: unknown[];
  visible?: boolean;
};

type ElfsightWidgetSettings = {
  events: ElfsightEvent[];
  widgetTitle?: string;
  layout?: string;
  groupBy?: string;
  showPastEvents?: boolean;
  numberOfEventsInList?: number;
  numberOfEventsOnMobileInList?: number;
  eventClickAction?: string;
  enableEventLinking?: boolean;
  displayDateFormat?: string;
  displayTimeFormat?: string;
  inLocalTimeZone?: boolean;
  widgetId?: string;
};

type ElfsightBootResponse = {
  status: number;
  data?: {
    widgets?: Record<
      string,
      {
        status: number;
        data?: {
          app?: string;
          settings?: ElfsightWidgetSettings;
          meta?: {
            widget_name?: string;
            app_name?: string;
            app_version?: string;
          };
        };
      }
    >;
  };
};

export type ScrapedMatch = {
  id: string;
  slug: string | null;
  name: string;
  sourceTimeZone: string;
  start: EventDateTime;
  end: EventDateTime;
  startIso: string;
  endIso: string;
  localStart: string;
  localEnd: string;
  isLiveOrUpcoming: boolean;
  button: {
    visible: boolean;
    text: string | null;
    link: string | null;
    target: string | null;
  };
  image: EventImage | null;
  raw: ElfsightEvent;
};

export type SoccerTvHdScrapeResult = {
  sourceUrl: string;
  widgetId: string;
  bootUrl: string;
  scrapedAt: string;
  widgetTitle: string;
  settings: {
    layout: string | null;
    groupBy: string | null;
    showPastEvents: boolean;
    numberOfEventsInList: number | null;
    eventClickAction: string | null;
    enableEventLinking: boolean | null;
    displayDateFormat: string | null;
    displayTimeFormat: string | null;
    inLocalTimeZone: boolean | null;
  };
  matches: ScrapedMatch[];
};

export type StreamResource = {
  type: "hls" | "dash" | "mp4" | "embed" | "unknown";
  url: string;
  source: "html" | "playlist";
  contentType: string | null;
};

export type SoccerTvHdStreamResult = {
  sourceUrl: string;
  slug: string;
  scrapedAt: string;
  streams: StreamResource[];
  primary: StreamResource | null;
  requestHeaders: {
    referer: string;
    userAgent: string;
  };
};

export async function scrapeSoccerTvHdHomeMatches(): Promise<SoccerTvHdScrapeResult> {
  const widgetId = await getHomepageWidgetId();
  const bootUrl = getBootUrl(widgetId);
  const boot = await fetchJson<ElfsightBootResponse>(bootUrl);
  const widget = boot.data?.widgets?.[widgetId];
  const settings = widget?.data?.settings;

  if (!settings?.events) {
    throw new Error("Could not find Elfsight event calendar settings.");
  }

  const now = new Date();
  const limit = settings.numberOfEventsInList ?? 10;
  const matches = settings.events
    .map(normalizeEvent)
    .filter((event) => event.raw.visible !== false)
    .filter((event) => settings.showPastEvents || event.endIso > now.toISOString())
    .sort((a, b) => a.startIso.localeCompare(b.startIso))
    .slice(0, limit);

  return {
    sourceUrl: HOME_URL,
    widgetId,
    bootUrl,
    scrapedAt: now.toISOString(),
    widgetTitle: settings.widgetTitle ?? "Upcoming Top Matches",
    settings: {
      layout: settings.layout ?? null,
      groupBy: settings.groupBy ?? null,
      showPastEvents: Boolean(settings.showPastEvents),
      numberOfEventsInList: settings.numberOfEventsInList ?? null,
      eventClickAction: settings.eventClickAction ?? null,
      enableEventLinking: settings.enableEventLinking ?? null,
      displayDateFormat: settings.displayDateFormat ?? null,
      displayTimeFormat: settings.displayTimeFormat ?? null,
      inLocalTimeZone: settings.inLocalTimeZone ?? null,
    },
    matches,
  };
}

export async function scrapeSoccerTvHdStream(
  input: string,
): Promise<SoccerTvHdStreamResult> {
  const sourceUrl = toSoccerTvHdPostUrl(input);
  const html = await fetchText(sourceUrl);
  const htmlStreams = extractMediaResources(html, sourceUrl);
  const playlistStreams = await Promise.all(
    htmlStreams
      .filter((stream) => stream.type === "hls" || stream.type === "dash")
      .map((stream) => discoverPlaylistChildren(stream, sourceUrl)),
  );
  const streams = dedupeStreams([...htmlStreams, ...playlistStreams.flat()]);

  return {
    sourceUrl,
    slug: getSlug(sourceUrl) ?? "",
    scrapedAt: new Date().toISOString(),
    streams,
    primary:
      streams.find((stream) => stream.type === "hls") ??
      streams.find((stream) => stream.type === "dash") ??
      streams[0] ??
      null,
    requestHeaders: {
      referer: sourceUrl,
      userAgent: "Mozilla/5.0 soccer-scrapper",
    },
  };
}

async function getHomepageWidgetId() {
  const html = await fetchText(HOME_URL);
  const widgetId = html.match(WIDGET_ID_PATTERN)?.[1];

  if (!widgetId) {
    throw new Error("Could not find the Elfsight widget id on the homepage.");
  }

  return widgetId;
}

function getBootUrl(widgetId: string) {
  const url = new URL("https://core.service.elfsight.com/p/boot/");
  url.searchParams.set("page", HOME_URL);
  url.searchParams.set("w", widgetId);
  return url.toString();
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "Mozilla/5.0 soccer-scrapper",
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: ${response.status}`);
  }

  return response.text();
}

async function fetchStreamText(url: string, referer: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept:
        "application/vnd.apple.mpegurl,application/x-mpegURL,application/dash+xml,text/plain,*/*",
      referer,
      "user-agent": "Mozilla/5.0 soccer-scrapper",
    },
  });

  if (!response.ok) {
    return null;
  }

  return {
    body: await response.text(),
    contentType: response.headers.get("content-type"),
  };
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      referer: HOME_URL,
      "user-agent": "Mozilla/5.0 soccer-scrapper",
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: ${response.status}`);
  }

  return (await response.json()) as T;
}

function normalizeEvent(event: ElfsightEvent): ScrapedMatch {
  const start = zonedDateTimeToDate(event.start, event.timeZone);
  const end = zonedDateTimeToDate(event.end, event.timeZone);
  const link = event.buttonLink?.value ?? event.buttonLink?.rawValue ?? null;

  return {
    id: event.id,
    slug: link ? getSlug(link) : null,
    name: event.name,
    sourceTimeZone: event.timeZone,
    start: event.start,
    end: event.end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    localStart: formatLocalDateTime(start),
    localEnd: formatLocalDateTime(end),
    isLiveOrUpcoming: end > new Date(),
    button: {
      visible: event.buttonVisible ?? false,
      text: event.buttonText ?? null,
      link,
      target: event.buttonLink?.target ?? null,
    },
    image: event.image ?? null,
    raw: event,
  };
}

function zonedDateTimeToDate(value: EventDateTime, timeZone: string) {
  const offset = timeZone === "Asia/Karachi" ? "+05:00" : "Z";
  return new Date(`${value.date}T${value.time}:00${offset}`);
}

function formatLocalDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getSlug(link: string) {
  try {
    const url = new URL(link);
    const slug = url.pathname.split("/").filter(Boolean).at(-1);
    return slug ?? null;
  } catch {
    return null;
  }
}

function toSoccerTvHdPostUrl(input: string) {
  const value = input.trim();
  const url = value.startsWith("http")
    ? new URL(value)
    : new URL(`/${value.replace(/^\/+|\/+$/g, "")}/`, SITE_ORIGIN);

  if (url.origin !== SITE_ORIGIN) {
    throw new Error("Only soccertvhd.com match page URLs are supported.");
  }

  url.search = "";
  url.hash = "";
  return url.toString();
}

function extractMediaResources(html: string, pageUrl: string): StreamResource[] {
  const urls = new Set<string>();

  for (const match of html.matchAll(MEDIA_URL_PATTERN)) {
    urls.add(decodeHtml(match[0]));
  }

  for (const match of html.matchAll(EMBED_PATTERN)) {
    urls.add(new URL(decodeHtml(match[1]), pageUrl).toString());
  }

  return [...urls].map((url) => ({
    type: getStreamType(url),
    url,
    source: "html",
    contentType: null,
  }));
}

async function discoverPlaylistChildren(
  stream: StreamResource,
  referer: string,
): Promise<StreamResource[]> {
  const playlist = await fetchStreamText(stream.url, referer);

  if (!playlist?.body.startsWith("#EXTM3U") && !playlist?.body.includes("<MPD")) {
    stream.contentType = playlist?.contentType ?? stream.contentType;
    return [];
  }

  stream.contentType = playlist.contentType;

  return playlist.body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .filter((line) => /\.(?:m3u8|mpd|mp4)(?:\?|$)/i.test(line))
    .map((line) => {
      const url = new URL(line, stream.url).toString();
      return {
        type: getStreamType(url),
        url,
        source: "playlist" as const,
        contentType: null,
      };
    });
}

function dedupeStreams(streams: StreamResource[]) {
  const seen = new Set<string>();
  return streams.filter((stream) => {
    if (seen.has(stream.url)) {
      return false;
    }

    seen.add(stream.url);
    return true;
  });
}

function getStreamType(url: string): StreamResource["type"] {
  if (/\.m3u8(?:\?|$)/i.test(url)) {
    return "hls";
  }

  if (/\.mpd(?:\?|$)/i.test(url)) {
    return "dash";
  }

  if (/\.mp4(?:\?|$)/i.test(url)) {
    return "mp4";
  }

  if (/^https?:\/\//i.test(url)) {
    return "embed";
  }

  return "unknown";
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#038;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}
