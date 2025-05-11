-- 创建存储过程以添加isDefault列
CREATE OR REPLACE FUNCTION add_isdefault_column()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 如果isDefault列不存在，则添加它
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'printers' AND column_name = 'isDefault'
    ) THEN
        ALTER TABLE printers ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- 创建用于刷新视图和模式缓存的函数
CREATE OR REPLACE FUNCTION reload_schema()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 刷新视图和模式缓存
    NOTIFY pgrst, 'reload schema';
END $$; 