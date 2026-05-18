import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const INCLUDE_COLLECTIONS = {
  collections: { select: { collectionId: true } },
} as const;

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(card: any) {
    const { userId, collections, user, ...rest } = card;
    return {
      ...rest,
      collectionIds: (collections ?? []).map((c: any) => c.collectionId),
    };
  }

  async findAll(userId: string) {
    const cards = await this.prisma.card.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
      include: INCLUDE_COLLECTIONS,
    });
    return cards.map(this.toDto.bind(this));
  }

  async findByCollection(userId: string, collectionId: string) {
    const cards = await this.prisma.card.findMany({
      where: { userId, collections: { some: { collectionId } } },
      orderBy: { position: 'asc' },
      include: INCLUDE_COLLECTIONS,
    });
    return cards.map(this.toDto.bind(this));
  }

  async create(userId: string, dto: any) {
    const { _id, collectionIds = [], ...rest } = dto;
    const collectionId = collectionIds[0];
    const count = collectionId
      ? await this.prisma.cardCollection.count({ where: { collectionId } })
      : 0;

    const card = await this.prisma.card.create({
      data: {
        id: _id ?? undefined,
        userId,
        title: rest.title,
        url: rest.url ?? null,
        notes: rest.notes ?? null,
        position: rest.position ?? count,
        linkPreview: rest.linkPreview ?? null,
        collections: collectionIds.length
          ? { create: collectionIds.map((cid: string) => ({ collectionId: cid })) }
          : undefined,
      },
      include: INCLUDE_COLLECTIONS,
    });
    return this.toDto(card);
  }

  async update(userId: string, id: string, dto: any) {
    const { _id, collectionIds, ...data } = dto;
    const existing = await this.prisma.card.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException();

    const card = await this.prisma.card.update({
      where: { id },
      data: {
        ...data,
        ...(collectionIds !== undefined
          ? {
              collections: {
                deleteMany: {},
                create: collectionIds.map((cid: string) => ({ collectionId: cid })),
              },
            }
          : {}),
      },
      include: INCLUDE_COLLECTIONS,
    });
    return this.toDto(card);
  }

  async delete(userId: string, id: string) {
    const existing = await this.prisma.card.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException();
    await this.prisma.card.delete({ where: { id } });
    return { id };
  }

  async deleteByCollection(userId: string, collectionId: string) {
    const links = await this.prisma.cardCollection.findMany({
      where: { collectionId, card: { userId } },
      select: { cardId: true },
    });
    if (!links.length) return;
    await this.prisma.card.deleteMany({
      where: { userId, id: { in: links.map((l) => l.cardId) } },
    });
  }

  async reorder(userId: string, collectionId: string, orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, position) =>
        this.prisma.card.updateMany({ where: { id, userId }, data: { position } }),
      ),
    );
  }

  async bulkCreate(userId: string, cards: any[]): Promise<any[]> {
    return Promise.all(
      cards.map((c, i) => this.create(userId, { ...c, position: c.position ?? i })),
    );
  }
}
