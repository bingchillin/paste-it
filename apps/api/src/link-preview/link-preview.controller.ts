import { Body, Controller, Post } from '@nestjs/common';
import { LinkPreviewService } from './link-preview.service';

@Controller('link-preview')
export class LinkPreviewController {
  constructor(private readonly service: LinkPreviewService) {}

  @Post()
  fetch(@Body() body: { url: string }) {
    return this.service.fetch(body.url);
  }
}
