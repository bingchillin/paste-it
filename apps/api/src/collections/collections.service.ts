import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const COLLECTION_SELECT = {
  id: true,
  name: true,
  color: true,
  position: true,
  x: true,
  y: true,
  collapsed: true,
  archived: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.collection.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
      select: COLLECTION_SELECT,
    });
  }

  async create(userId: string, dto: any) {
    const count = await this.prisma.collection.count({ where: { userId } });
    return this.prisma.collection.create({
      data: {
        id: dto._id ?? undefined,
        userId,
        name: dto.name,
        color: dto.color,
        position: dto.position ?? count,
        x: dto.x ?? 0,
        y: dto.y ?? 0,
        collapsed: dto.collapsed ?? false,
        archived: dto.archived ?? false,
      },
      select: COLLECTION_SELECT,
    });
  }

  async update(userId: string, id: string, dto: any) {
    const { _id, ...data } = dto;
    const existing = await this.prisma.collection.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException();
    return this.prisma.collection.update({
      where: { id },
      data,
      select: COLLECTION_SELECT,
    });
  }

  async delete(userId: string, id: string) {
    const existing = await this.prisma.collection.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException();
    await this.prisma.collection.delete({ where: { id } });
    return { id };
  }

  async reorder(userId: string, orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, position) =>
        this.prisma.collection.updateMany({ where: { id, userId }, data: { position } }),
      ),
    );
  }

  async bulkCreate(userId: string, collections: any[]): Promise<any[]> {
    return Promise.all(
      collections.map((c, i) =>
        this.create(userId, { ...c, position: c.position ?? i }),
      ),
    );
  }
}
