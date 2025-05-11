-- 创建健康检查表
CREATE TABLE IF NOT EXISTS health_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_key TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 添加注释
COMMENT ON TABLE health_checks IS '用于数据库健康检查的表';
COMMENT ON COLUMN health_checks.id IS '主键';
COMMENT ON COLUMN health_checks.test_key IS '测试键';
COMMENT ON COLUMN health_checks.timestamp IS '测试时间戳';
COMMENT ON COLUMN health_checks.created_at IS '记录创建时间';

-- 创建索引以加速查询
CREATE INDEX IF NOT EXISTS idx_health_checks_test_key ON health_checks(test_key);

-- 添加自动清理过期测试数据的触发器函数
CREATE OR REPLACE FUNCTION clean_old_health_checks() RETURNS TRIGGER AS $$
BEGIN
  -- 删除超过24小时的健康检查记录
  DELETE FROM health_checks 
  WHERE created_at < NOW() - INTERVAL '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 检查并创建触发器
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_clean_old_health_checks'
  ) THEN
    CREATE TRIGGER trigger_clean_old_health_checks
    AFTER INSERT ON health_checks
    EXECUTE PROCEDURE clean_old_health_checks();
  END IF;
END
$$; 