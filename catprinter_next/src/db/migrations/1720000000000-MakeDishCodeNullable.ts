import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeDishCodeNullable1720000000000 implements MigrationInterface {
  name = 'MakeDishCodeNullable1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 移除唯一约束
    await queryRunner.query(`
      ALTER TABLE dishes
      DROP CONSTRAINT IF EXISTS dishes_code_key
    `);
    
    // 2. 修改列为可空
    await queryRunner.query(`
      ALTER TABLE dishes
      ALTER COLUMN code DROP NOT NULL
    `);
    
    // 3. 为非空值重新添加唯一约束
    await queryRunner.query(`
      CREATE UNIQUE INDEX dishes_code_unique_idx ON dishes (code)
      WHERE code IS NOT NULL AND code != ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. 移除唯一索引
    await queryRunner.query(`
      DROP INDEX IF EXISTS dishes_code_unique_idx
    `);
    
    // 2. 将现有的空值设置为占位符
    await queryRunner.query(`
      UPDATE dishes
      SET code = 'DISH_' || id
      WHERE code IS NULL OR code = ''
    `);
    
    // 3. 重新添加非空约束
    await queryRunner.query(`
      ALTER TABLE dishes
      ALTER COLUMN code SET NOT NULL
    `);
    
    // 4. 重新添加唯一约束
    await queryRunner.query(`
      ALTER TABLE dishes
      ADD CONSTRAINT dishes_code_key UNIQUE (code)
    `);
  }
} 