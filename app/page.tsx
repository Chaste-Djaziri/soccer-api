import Link from "next/link";
import { scrapeSoccerTvHdHomeMatches, type ScrapedMatch } from "@/lib/soccerTvHd";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await scrapeSoccerTvHdHomeMatches();

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 text-[#171717] sm:px-8 sm:py-10">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-6 border-b border-[#d7dce4] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#cb1628]">
              Live SoccerTVHD scrape
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">
              Upcoming matches
            </h1>
            <p className="mt-3 text-base leading-7 text-[#4d5968]">
              Fresh match cards from the homepage widget, with stream slugs and
              IDs ready for the API.
            </p>
          </div>

          <nav className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md bg-[#171717] px-4 text-sm font-semibold text-white"
              href="/docs"
            >
              API docs
            </Link>
            <a
              className="inline-flex h-11 items-center justify-center rounded-md border border-[#c5ccd7] bg-white px-4 text-sm font-semibold text-[#20242c]"
              href="/api/matches"
            >
              Matches JSON
            </a>
          </nav>
        </header>

        <dl className="grid gap-3 sm:grid-cols-3">
          <Summary label="Visible matches" value={String(data.matches.length)} />
          <Summary label="Widget title" value={data.widgetTitle} />
          <Summary
            label="Scraped"
            value={new Date(data.scrapedAt).toLocaleString()}
          />
        </dl>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {data.matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </section>
      </section>
    </main>
  );
}

function MatchCard({ match }: { match: ScrapedMatch }) {
  const teams = splitMatchName(match.name);
  const watchHref = match.slug
    ? `/watch/${encodeURIComponent(match.slug)}`
    : `/api/stream?url=${encodeURIComponent(match.button.link ?? "")}`;
  const streamHref = match.slug
    ? `/api/stream?slug=${encodeURIComponent(match.slug)}`
    : `/api/stream?url=${encodeURIComponent(match.button.link ?? "")}`;

  return (
    <article className="flex min-h-[420px] flex-col overflow-hidden rounded-lg border border-[#d7dce4] bg-white shadow-sm">
      <div className="relative flex aspect-[16/10] items-center justify-center bg-[#20242c]">
        {match.image?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="h-full w-full object-cover"
            src={match.image.url}
          />
        ) : (
          <div className="px-6 text-center text-sm font-semibold text-white">
            SoccerTVHD
          </div>
        )}
        <span className="absolute left-3 top-3 rounded bg-[#cb1628] px-2 py-1 text-xs font-semibold uppercase text-white">
          Upcoming
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#697386]">
            Match
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-tight">
            <span className="block">{teams.home}</span>
            {teams.away ? (
              <>
                <span className="my-1 block text-sm font-semibold uppercase text-[#cb1628]">
                  vs
                </span>
                <span className="block">{teams.away}</span>
              </>
            ) : null}
          </h2>
        </div>

        <dl className="grid gap-3 text-sm">
          <Info label="Kickoff" value={match.localStart} />
          <Info label="Ends" value={match.localEnd} />
          <Info label="Slug" value={match.slug ?? "n/a"} mono />
          <Info label="ID" value={match.id} mono />
        </dl>

        <div className="mt-auto grid gap-2">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-md bg-[#171717] px-4 text-sm font-semibold text-white"
            href={watchHref}
          >
            Watch
          </Link>
          <a
            className="inline-flex h-11 items-center justify-center rounded-md border border-[#c5ccd7] px-4 text-sm font-semibold text-[#20242c]"
            href={streamHref}
          >
            Stream JSON
          </a>
          {match.button.link ? (
            <a
              className="inline-flex h-11 items-center justify-center rounded-md border border-[#c5ccd7] px-4 text-sm font-semibold text-[#20242c]"
              href={match.button.link}
            >
              Source page
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#d7dce4] bg-white p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[#697386]">
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm font-semibold">{value}</dd>
    </div>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[#697386]">
        {label}
      </dt>
      <dd className={`mt-1 break-words ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function splitMatchName(name: string) {
  const [home, away] = name.split(/\s+vs\s+/i);
  return {
    home: home.trim(),
    away: away?.trim() ?? "",
  };
}
