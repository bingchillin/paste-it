import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CollectionsService } from './collections.service';

@Controller('collections')
@UseGuards(AuthGuard)
export class CollectionsController {
  constructor(private readonly service: CollectionsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.service.create(req.user.id, body);
  }

  @Post('bulk')
  async bulkCreate(@Req() req: any, @Body() body: any[]): Promise<any> {
    return this.service.bulkCreate(req.user.id, body);
  }

  @Post('reorder')
  reorder(@Req() req: any, @Body() body: { ids: string[] }) {
    return this.service.reorder(req.user.id, body.ids);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.update(req.user.id, id, body);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.service.delete(req.user.id, id);
  }
}
