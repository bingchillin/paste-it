import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
class LinkPreview {
  @Prop() image: string;
  @Prop() title: string;
  @Prop() description: string;
  @Prop() favicon: string;
  @Prop() fetchedAt: string;
}

@Schema({ timestamps: true })
export class Card {
  @Prop({ type: String, required: true }) _id: string;
  @Prop({ required: true }) userId: string;
  @Prop({ type: [String], required: true }) collectionIds: string[];
  @Prop({ required: true }) title: string;
  @Prop() url: string;
  @Prop({ type: LinkPreview }) linkPreview: LinkPreview;
  @Prop() notes: string;
  @Prop({ default: 0 }) position: number;
}

export type CardDocument = Card & Document;
export const CardSchema = SchemaFactory.createForClass(Card);
CardSchema.index({ userId: 1, collectionIds: 1, position: 1 });
