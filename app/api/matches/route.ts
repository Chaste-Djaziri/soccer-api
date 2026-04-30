import { scrapeSoccerTvHdHomeMatches } from "@/lib/soccerTvHd";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await scrapeSoccerTvHdHomeMatches();
    return Response.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to scrape matches.";

    return Response.json({ error: message }, { status: 502 });
  }
}
