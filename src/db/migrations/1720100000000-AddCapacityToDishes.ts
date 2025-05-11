import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCapacityToDishes1720100000000 implements MigrationInterface {
  name = 'AddCapacityToDishes1720100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 检查capacity列是否已存在
    const hasCapacityColumn = await queryRunner.hasColumn('dishes', 'capacity');
    if (!hasCapacityColumn) {
      // 添加capacity列
      await queryRunner.query(`
        ALTER TABLE dishes
        ADD COLUMN capacity TEXT
      `);

      // 对于饮料类型的菜品，设置默认值
      await queryRunner.query(`
        UPDATE dishes
        SET capacity = '标准'
        WHERE food_type = 'drink'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚时删除capacity列
    const hasCapacityColumn = await queryRunner.hasColumn('dishes', 'capacity');
    if (hasCapacityColumn) {
      await queryRunner.query(`
        ALTER TABLE dishes
        DROP COLUMN capacity
      `);
    }
  }
} 