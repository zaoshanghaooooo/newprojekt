import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('dishes')
export class Dish {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true, nullable: true })
  code: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'food_type' })
  foodType: string;

  @Column()
  category: string;

  @Column({ nullable: true })
  volume: string;

  @Column({ name: 'has_sub_items', default: false })
  hasSubItems: boolean;

  @Column({ name: 'sub_items', type: 'simple-json', nullable: true })
  subItems: any;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'drink_items', type: 'simple-json', nullable: true })
  drinkItems: Array<{ id: string, dishId: string, name: string }>;

  @Column({ name: 'food_default_items', type: 'simple-json', nullable: true })
  foodDefaultItems: Array<{ id: string, dishId: string, name: string, code: string, description?: string, isDefault: boolean }>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}