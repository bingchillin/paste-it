import { NextRequest, NextResponse } from 'next/server';
import ogs from 'open-graph-scraper';

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const { result } = await ogs({ url, timeout: 5000 });

    const image =
      result.ogImage?.[0]?.url ??
      result.twitterImage?.[0]?.url ??
      null;

    return NextResponse.json({
      image: image ?? null,
      title: result.ogTitle ?? result.twitterTitle ?? null,
      description: result.ogDescription ?? result.twitterDescription ?? null,
      favicon: result.favicon
        ? result.favicon.startsWith('http')
          ? result.favicon
          : new URL(url).origin + result.favicon
        : null,
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch preview' }, { status: 200 });
  }
}
