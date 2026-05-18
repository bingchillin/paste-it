import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CardsService } from './cards.service';

@Controller('cards')
@UseGuards(AuthGuard)
export class CardsController {
  constructor(private readonly service: CardsService) {}

  @Get()
  findAll(@Req() req: any, @Query('collectionId') collectionId?: string) {
    if (collectionId) return this.service.findByCollection(req.user.id, collectionId);
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
  reorder(@Req() req: any, @Body() body: { collectionId: string; ids: string[] }) {
    return this.service.reorder(req.user.id, body.collectionId, body.ids);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.update(req.user.id, id, body);
  }

  @Delete('collection/:collectionId')
  deleteByCollection(@Req() req: any, @Param('collectionId') collectionId: string) {
    return this.service.deleteByCollection(req.user.id, collectionId);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.service.delete(req.user.id, id);
  }
}
