import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrintRetries1719042271162 implements MigrationInterface {
  name = 'AddPrintRetries1719042271162';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN print_retries integer NOT NULL DEFAULT 0,
      ADD COLUMN last_print_error text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders
      DROP COLUMN print_retries,
      DROP COLUMN last_print_error
    `);
  }
}