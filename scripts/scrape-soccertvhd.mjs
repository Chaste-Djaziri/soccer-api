const HOME_URL = "https://www.soccertvhd.com/";
const WIDGET_ID_PATTERN = /elfsight-app-([a-f0-9-]{36}|[a-z0-9-]+)/i;

const html = await fetchText(HOME_URL);
const widgetId = html.match(WIDGET_ID_PATTERN)?.[1];

if (!widgetId) {
  throw new Error("Could not find the Elfsight widget id on the homepage.");
}

const bootUrl = new URL("https://core.service.elfsight.com/p/boot/");
bootUrl.searchParams.set("page", HOME_URL);
bootUrl.searchParams.set("w", widgetId);

const boot = await fetchJson(bootUrl);
const settings = boot.data?.widgets?.[widgetId]?.data?.settings;

if (!settings?.events) {
  throw new Error("Could not find Elfsight event calendar settings.");
}

const now = new Date();
const matches = settings.events
  .map(normalizeEvent)
  .filter((event) => event.raw.visible !== false)
  .filter((event) => settings.showPastEvents || event.endIso > now.toISOString())
  .sort((a, b) => a.startIso.localeCompare(b.startIso))
  .slice(0, settings.numberOfEventsInList ?? 10);

console.log(
  JSON.stringify(
    {
      sourceUrl: HOME_URL,
      widgetId,
      bootUrl: bootUrl.toString(),
      scrapedAt: now.toISOString(),
      widgetTitle: settings.widgetTitle ?? "Upcoming Top Matches",
      matches,
    },
    null,
    2,
  ),
);

async function fetchText(url) {
  const response = await fetch(url, {
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

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      referer: HOME_URL,
      "user-agent": "Mozilla/5.0 soccer-scrapper",
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: ${response.status}`);
  }

  return response.json();
}

function normalizeEvent(event) {
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
    localStart: new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(start),
    localEnd: new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(end),
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

function zonedDateTimeToDate(value, timeZone) {
  const offset = timeZone === "Asia/Karachi" ? "+05:00" : "Z";
  return new Date(`${value.date}T${value.time}:00${offset}`);
}

function getSlug(link) {
  try {
    const url = new URL(link);
    return url.pathname.split("/").filter(Boolean).at(-1) ?? null;
  } catch {
    return null;
  }
}
