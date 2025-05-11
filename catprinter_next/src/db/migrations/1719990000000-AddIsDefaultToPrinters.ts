import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsDefaultToPrinters1719990000000 implements MigrationInterface {
  name = 'AddIsDefaultToPrinters1719990000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 检查isDefault列是否已存在
    const hasIsDefaultColumn = await queryRunner.hasColumn('printers', 'isDefault');
    if (!hasIsDefaultColumn) {
      // 添加isDefault列
      await queryRunner.query(`
        ALTER TABLE printers
        ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false
      `);
    }

    // 检查是否存在旧的is_default列
    const hasIsDefaultOldColumn = await queryRunner.hasColumn('printers', 'is_default');
    if (hasIsDefaultOldColumn) {
      // 将旧列值复制到新列
      await queryRunner.query(`
        UPDATE printers
        SET "isDefault" = is_default
        WHERE is_default IS NOT NULL
      `);
    }

    // 确保至少有一个默认打印机
    const result = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM printers
      WHERE "isDefault" = true
    `);

    if (result[0].count === 0) {
      // 设置第一个打印机为默认
      await queryRunner.query(`
        UPDATE printers
        SET "isDefault" = true
        WHERE id = (SELECT id FROM printers LIMIT 1)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 如果需要回滚，可以保留isDefault列，仅将值清空
    await queryRunner.query(`
      UPDATE printers
      SET "isDefault" = false
    `);
  }
} 