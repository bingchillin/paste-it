import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Card, CardDocument } from './card.schema';

@Injectable()
export class CardsService {
  constructor(@InjectModel(Card.name) private model: Model<CardDocument>) {}

  private toDto(doc: any) {
    if (!doc) return null;
    const { _id, __v, userId, ...rest } = doc;
    return { ...rest, id: String(_id) };
  }

  async findAll(userId: string) {
    const docs = await this.model.find({ userId }).sort({ position: 1 }).lean();
    return docs.map((d) => this.toDto(d));
  }

  async findByCollection(userId: string, collectionId: string) {
    const docs = await this.model
      .find({ userId, collectionIds: collectionId })
      .sort({ position: 1 })
      .lean();
    return docs.map((d) => this.toDto(d));
  }

  async create(userId: string, dto: any) {
    const collectionId = dto.collectionIds?.[0];
    const count = collectionId
      ? await this.model.countDocuments({ userId, collectionIds: collectionId })
      : 0;
    const doc = await this.model.create({
      ...dto,
      userId,
      position: dto.position ?? count,
    });
    return this.toDto(doc.toObject());
  }

  async update(userId: string, id: string, dto: any) {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, userId },
      { $set: dto },
      { new: true },
    );
    if (!doc) throw new NotFoundException();
    return this.toDto(doc.toObject());
  }

  async delete(userId: string, id: string) {
    const doc = await this.model.findOneAndDelete({ _id: id, userId });
    if (!doc) throw new NotFoundException();
    return { id };
  }

  async deleteByCollection(userId: string, collectionId: string) {
    await this.model.deleteMany({ userId, collectionIds: collectionId });
  }

  async reorder(userId: string, collectionId: string, orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, position) =>
        this.model.updateOne({ _id: id, userId }, { $set: { position } }),
      ),
    );
  }

  async bulkCreate(userId: string, cards: any[]): Promise<any[]> {
    const docs = await this.model.insertMany(
      cards.map((c, i) => ({ ...c, userId, position: c.position ?? i })),
    );
    return docs.map((d) => this.toDto(d.toObject()));
  }
}
