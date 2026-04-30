import Link from "next/link";
import { getProxiedHlsUrl } from "@/lib/hlsProxy";
import { scrapeSoccerTvHdStream } from "@/lib/soccerTvHd";
import { VideoJsPlayer } from "./VideoJsPlayer";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function WatchPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await scrapeSoccerTvHdStream(slug);
  const primary = data.primary;
  const playerSrc =
    primary?.type === "hls"
      ? getProxiedHlsUrl(primary.url)
      : primary?.url;

  return (
    <main className="min-h-screen bg-[#0f1116] px-4 py-6 text-white sm:px-8 sm:py-10">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-white/15 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              className="text-sm font-semibold text-[#ff5364] underline-offset-4 hover:underline"
              href="/"
            >
              Back to matches
            </Link>
            <h1 className="mt-4 break-words text-3xl font-bold leading-tight sm:text-5xl">
              {slug}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#b9c0cc]">
              Video.js playback using the same player setup found on the
              SoccerTVHD source page.
            </p>
          </div>
          <a
            className="inline-flex h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-[#111318]"
            href={`/api/stream?slug=${encodeURIComponent(slug)}`}
          >
            Stream JSON
          </a>
        </header>

        <section className="overflow-hidden rounded-lg border border-white/15 bg-black">
          {primary ? (
            <div className="aspect-video w-full">
              <VideoJsPlayer
                playerId={`my-video-${slug.replace(/[^a-z0-9_-]/gi, "-")}`}
                src={playerSrc ?? primary.url}
              />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center px-6 text-center text-[#b9c0cc]">
              No playable stream was found on this page.
            </div>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-white/15 bg-white/[0.04] p-5">
            <h2 className="text-xl font-bold">Playback details</h2>
            <p className="mt-3 leading-7 text-[#b9c0cc]">
              The source page uses Video.js 8.10.0 with a `video-js` element and
              an HLS source typed as `application/x-mpegURL`. This page mirrors
              that player initialization without embedding the full source page.
            </p>
          </div>

          <div className="rounded-lg border border-white/15 bg-white/[0.04] p-5">
            <h2 className="text-xl font-bold">Source page</h2>
            <a
              className="mt-3 block break-words text-sm font-semibold text-[#ff5364] underline-offset-4 hover:underline"
              href={data.sourceUrl}
            >
              {data.sourceUrl}
            </a>
          </div>
        </section>

        <section className="rounded-lg border border-white/15 bg-white/[0.04] p-5">
          <h2 className="text-xl font-bold">Discovered streams</h2>
          <div className="mt-4 grid gap-3">
            {data.streams.map((stream) => (
              <div
                className="rounded-md border border-white/10 bg-black/25 p-4"
                key={`${stream.type}-${stream.url}`}
              >
                <div className="flex flex-wrap gap-2">
                  <span className="rounded bg-[#ff5364] px-2 py-1 text-xs font-semibold uppercase text-white">
                    {stream.type}
                  </span>
                  <span className="rounded bg-white/10 px-2 py-1 text-xs font-semibold uppercase text-[#d8dee9]">
                    {stream.source}
                  </span>
                </div>
                <a
                  className="mt-3 block break-words font-mono text-xs text-[#d8dee9] underline-offset-4 hover:underline"
                  href={stream.url}
                >
                  {stream.url}
                </a>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
