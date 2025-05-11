DO $$
BEGIN
    -- 如果isDefault列不存在，则添加它
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'printers' AND column_name = 'isDefault'
    ) THEN
        ALTER TABLE printers ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- 刷新视图和模式缓存
NOTIFY pgrst, 'reload schema'; 