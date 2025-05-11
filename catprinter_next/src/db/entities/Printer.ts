import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { PrintLog } from './PrintLog';

@Entity('printers')
export class Printer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sn: string;

  @Column()
  name: string;

  @Column()
  type: string;

  @Column({ nullable: true })
  address: string;

  @Column({ default: 'offline' })
  status: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ name: 'last_active_time', type: 'datetime', nullable: true })
  lastActiveTime: Date | null;

  @OneToMany(() => PrintLog, log => log.printer)
  logs: PrintLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 