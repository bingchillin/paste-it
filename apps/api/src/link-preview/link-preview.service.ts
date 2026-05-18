import { Injectable } from '@nestjs/common';
import ogs from 'open-graph-scraper';

@Injectable()
export class LinkPreviewService {
  async fetch(url: string) {
    try {
      const { result } = await ogs({ url, timeout: 5000 });
      const image = result.ogImage?.[0]?.url ?? result.twitterImage?.[0]?.url ?? null;
      return {
        image: image ?? null,
        title: result.ogTitle ?? result.twitterTitle ?? null,
        description: result.ogDescription ?? null,
        favicon: result.favicon
          ? result.favicon.startsWith('http')
            ? result.favicon
            : new URL(url).origin + result.favicon
          : null,
        fetchedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }
}
