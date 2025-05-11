import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Printer } from './Printer';

@Entity('print_logs')
export class PrintLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'print_time', type: 'datetime' })
  printTime: Date;

  @Column({ name: 'printer_id' })
  printerId: string;

  @Column({ name: 'order_id', nullable: true })
  orderId: string;

  @Column({ name: 'response_code' })
  responseCode: string;

  @Column({ name: 'response_msg' })
  responseMsg: string;

  @Column({ name: 'content', type: 'text', nullable: true })
  content: string;

  @ManyToOne(() => Printer, printer => printer.logs)
  @JoinColumn({ name: 'printer_id' })
  printer: Printer;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
} 