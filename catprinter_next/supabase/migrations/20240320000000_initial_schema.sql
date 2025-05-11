-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create dishes table
CREATE TABLE dishes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL DEFAULT '未分类',
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    food_type TEXT,
    volume TEXT,
    has_sub_items BOOLEAN NOT NULL DEFAULT false,
    sub_items JSONB,
    drink_items JSONB,
    food_default_items JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_no TEXT UNIQUE NOT NULL,
    table_no TEXT NOT NULL,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT '待处理',
    print_count INTEGER NOT NULL DEFAULT 0,
    last_print_time TIMESTAMP WITH TIME ZONE,
    total_price DECIMAL(10,2) NOT NULL,
    print_retries INTEGER NOT NULL DEFAULT 0,
    queued_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qty INTEGER NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    detail TEXT,
    is_custom_dumpling BOOLEAN NOT NULL DEFAULT false,
    food_type TEXT,
    volume TEXT,
    dumpling_type TEXT,
    price DECIMAL(10,2),
    sub_items JSONB,
    dish_id UUID REFERENCES dishes(id),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create printers table
CREATE TABLE printers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sn TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    address TEXT,
    status TEXT NOT NULL DEFAULT '离线',
    is_default BOOLEAN NOT NULL DEFAULT false,
    last_active_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create print_logs table
CREATE TABLE print_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status TEXT NOT NULL,
    message TEXT,
    print_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    order_id UUID NOT NULL REFERENCES orders(id),
    printer_id UUID NOT NULL REFERENCES printers(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create system_settings table
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create system_logs table
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level TEXT NOT NULL DEFAULT 'info',
    source TEXT,
    message TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create offline_queue_items table
CREATE TABLE offline_queue_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_try_time TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dishes_updated_at
    BEFORE UPDATE ON dishes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_printers_updated_at
    BEFORE UPDATE ON printers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_print_logs_updated_at
    BEFORE UPDATE ON print_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offline_queue_items_updated_at
    BEFORE UPDATE ON offline_queue_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_queue_items ENABLE ROW LEVEL SECURITY;

-- Create default policies (modify these according to your security requirements)
CREATE POLICY "Enable read access for all users" ON dishes FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON orders FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON order_items FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON printers FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON print_logs FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON system_logs FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON offline_queue_items FOR SELECT USING (true);

-- Create indexes
CREATE INDEX idx_dishes_code ON dishes(code);
CREATE INDEX idx_dishes_category ON dishes(category);
CREATE INDEX idx_orders_order_no ON orders(order_no);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_dish_id ON order_items(dish_id);
CREATE INDEX idx_printers_sn ON printers(sn);
CREATE INDEX idx_print_logs_order_id ON print_logs(order_id);
CREATE INDEX idx_print_logs_printer_id ON print_logs(printer_id);
CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_offline_queue_items_order_id ON offline_queue_items(order_id);
CREATE INDEX idx_offline_queue_items_status ON offline_queue_items(status); 


-- Policies for authenticated users (INSERT, UPDATE, DELETE)

-- dishes
CREATE POLICY "Allow authenticated users to insert dishes" ON public.dishes
    FOR INSERT TO authenticated
    WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update dishes" ON public.dishes
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete dishes" ON public.dishes
    FOR DELETE TO authenticated
    USING (true);

-- orders
CREATE POLICY "Allow authenticated users to insert orders" ON public.orders
    FOR INSERT TO authenticated
    WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update orders" ON public.orders
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete orders" ON public.orders
    FOR DELETE TO authenticated
    USING (true);

-- order_items
CREATE POLICY "Allow authenticated users to insert order_items" ON public.order_items
    FOR INSERT TO authenticated
    WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update order_items" ON public.order_items
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete order_items" ON public.order_items
    FOR DELETE TO authenticated
    USING (true);

-- printers
CREATE POLICY "Allow authenticated users to insert printers" ON public.printers
    FOR INSERT TO authenticated
    WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update printers" ON public.printers
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete printers" ON public.printers
    FOR DELETE TO authenticated
    USING (true);

-- print_logs
CREATE POLICY "Allow authenticated users to insert print_logs" ON public.print_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update print_logs" ON public.print_logs
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete print_logs" ON public.print_logs
    FOR DELETE TO authenticated
    USING (true);

-- system_settings
CREATE POLICY "Allow authenticated users to insert system_settings" ON public.system_settings
    FOR INSERT TO authenticated
    WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update system_settings" ON public.system_settings
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete system_settings" ON public.system_settings
    FOR DELETE TO authenticated
    USING (true);

-- system_logs
CREATE POLICY "Allow authenticated users to insert system_logs" ON public.system_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);
-- Note: UPDATE and DELETE for system_logs are typically not granted to general authenticated users.

-- offline_queue_items
CREATE POLICY "Allow authenticated users to insert offline_queue_items" ON public.offline_queue_items
    FOR INSERT TO authenticated
    WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update offline_queue_items" ON public.offline_queue_items
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete offline_queue_items" ON public.offline_queue_items
    FOR DELETE TO authenticated
    USING (true);