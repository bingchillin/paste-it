import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Collection {
  @Prop({ type: String, required: true }) _id: string;
  @Prop({ required: true }) userId: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) color: string;
  @Prop({ default: 0 }) position: number;
  @Prop({ default: 0 }) x: number;
  @Prop({ default: 0 }) y: number;
  @Prop({ default: false }) collapsed: boolean;
  @Prop({ default: false }) archived: boolean;
}

export type CollectionDocument = Collection & Document;
export const CollectionSchema = SchemaFactory.createForClass(Collection);
CollectionSchema.index({ userId: 1, position: 1 });
