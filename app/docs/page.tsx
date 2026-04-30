import Link from "next/link";

const baseUrl = "http://localhost:3000";

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 text-[#171717] sm:px-8 sm:py-10">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="border-b border-[#d7dce4] pb-6">
          <Link
            className="text-sm font-semibold text-[#cb1628] underline-offset-4 hover:underline"
            href="/"
          >
            Back to matches
          </Link>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">
            API documentation
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#4d5968]">
            Endpoints for scraping SoccerTVHD homepage matches and resolving a
            match page into HLS, DASH, MP4, or embed stream URLs.
          </p>
        </header>

        <Endpoint
          description="Returns the homepage upcoming matches from the live Elfsight calendar widget."
          example={`${baseUrl}/api/matches`}
          method="GET"
          path="/api/matches"
          response={`{
  "sourceUrl": "https://www.soccertvhd.com/",
  "widgetId": "feba0ba4-3d63-4db8-8a0a-5e37b58b3fcc",
  "scrapedAt": "2026-04-30T19:49:49.143Z",
  "matches": [
    {
      "id": "0d432fe6-9185-4b9a-ab91-f3ab4179e38e",
      "name": "Nottingham Forest vs Aston Villa",
      "slug": "hesgoal-hes-goal-live-streaming",
      "button": {
        "link": "https://www.soccertvhd.com/hesgoal-hes-goal-live-streaming/"
      }
    }
  ]
}`}
        />

        <Endpoint
          description="Scrapes a SoccerTVHD match/source page and returns discovered video streams."
          example={`${baseUrl}/api/stream?slug=hesgoal-hes-goal-live-streaming`}
          method="GET"
          path="/api/stream"
          query={[
            "slug|page slug, for example hesgoal-hes-goal-live-streaming",
            "url|full SoccerTVHD page URL; use this instead of slug when you already have the button link",
          ]}
          response={`{
  "sourceUrl": "https://www.soccertvhd.com/hesgoal-hes-goal-live-streaming/",
  "slug": "hesgoal-hes-goal-live-streaming",
  "primary": {
    "type": "hls",
    "url": "https://remleg.cachefly.net/prehes/index.m3u8",
    "contentType": "application/vnd.apple.mpegurl"
  },
  "streams": [
    {
      "type": "hls",
      "url": "https://remleg.cachefly.net/prehes/index.m3u8"
    }
  ],
  "requestHeaders": {
    "referer": "https://www.soccertvhd.com/hesgoal-hes-goal-live-streaming/",
    "userAgent": "Mozilla/5.0 soccer-scrapper"
  }
}`}
        />

        <section className="rounded-lg border border-[#d7dce4] bg-white p-5">
          <h2 className="text-xl font-bold">Playback note</h2>
          <p className="mt-3 leading-7 text-[#4d5968]">
            Some HLS playlists reject direct requests unless the match page URL
            is sent as the `Referer` header. The `/api/stream` response includes
            the headers to use when probing or playing the returned stream.
          </p>
        </section>
      </section>
    </main>
  );
}

function Endpoint({
  method,
  path,
  description,
  example,
  query,
  response,
}: {
  method: string;
  path: string;
  description: string;
  example: string;
  query?: string[];
  response: string;
}) {
  return (
    <section className="rounded-lg border border-[#d7dce4] bg-white p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded bg-[#171717] px-2 py-1 font-mono text-xs font-semibold text-white">
          {method}
        </span>
        <h2 className="font-mono text-xl font-bold">{path}</h2>
      </div>
      <p className="mt-3 leading-7 text-[#4d5968]">{description}</p>

      {query ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#697386]">
            Query parameters
          </h3>
          <ul className="mt-2 grid gap-2 text-sm text-[#313946]">
            {query.map((item) => (
              <QueryParam key={item} value={item} />
            ))}
          </ul>
        </div>
      ) : null}

      <CodeBlock label="Example" value={example} />
      <CodeBlock label="Response shape" value={response} />
    </section>
  );
}

function QueryParam({ value }: { value: string }) {
  const [name, description] = value.split("|");

  return (
    <li>
      <code className="rounded bg-[#eef1f5] px-1.5 py-0.5 font-mono text-xs">
        {name}
      </code>
      : {description}
    </li>
  );
}

function CodeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#697386]">
        {label}
      </h3>
      <pre className="mt-2 overflow-auto rounded-md bg-[#111318] p-4 text-xs leading-5 text-[#d8dee9]">
        {value}
      </pre>
    </div>
  );
}
