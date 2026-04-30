import { scrapeSoccerTvHdStream } from "@/lib/soccerTvHd";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("url") ?? searchParams.get("slug");

  if (!input) {
    return Response.json(
      {
        error:
          "Missing stream target. Use /api/stream?slug=hesgoal-hes-goal-live-streaming or /api/stream?url=https://www.soccertvhd.com/hesgoal-hes-goal-live-streaming/",
      },
      { status: 400 },
    );
  }

  try {
    const data = await scrapeSoccerTvHdStream(input);
    return Response.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to scrape stream.";

    return Response.json({ error: message }, { status: 502 });
  }
}
