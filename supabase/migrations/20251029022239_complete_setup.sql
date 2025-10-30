-- =====================================================
-- MIGRATION: Complete System Setup
-- Description: Creates all tables, policies, functions and triggers
-- =====================================================

-- =====================================================
-- 1. CREATE ENUMS
-- =====================================================

DO $$ 
BEGIN
    -- Create enum for user roles
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'store_manager', 'cashier');
    END IF;

    -- Create enum for order sources
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_source') THEN
        CREATE TYPE public.order_source AS ENUM ('totem', 'whatsapp', 'presencial', 'ifood');
    END IF;

    -- Create enum for order status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE public.order_status AS ENUM ('pending', 'preparing', 'ready', 'delivered', 'cancelled');
    END IF;
END $$;

-- =====================================================
-- 2. CREATE CORE TABLES
-- =====================================================

-- Stores table
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    address TEXT,
    phone TEXT,
    image_url TEXT,
    motoboy_whatsapp_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    UNIQUE (user_id, role, store_id)
);

-- =====================================================
-- 3. CREATE PRODUCT TABLES
-- =====================================================

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    has_variations BOOLEAN DEFAULT false,
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Product variations table
CREATE TABLE IF NOT EXISTS public.product_variations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_adjustment NUMERIC NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 4. CREATE CUSTOMER & LOYALTY TABLES
-- =====================================================

-- Customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    phone TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    loyalty_points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (store_id, phone)
);

-- Loyalty rules table
CREATE TABLE IF NOT EXISTS public.loyalty_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    points_per_real DECIMAL(10, 2) DEFAULT 1,
    min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Loyalty transactions table
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    points INTEGER NOT NULL,
    transaction_type TEXT NOT NULL, -- 'earned', 'redeemed', 'expired'
    order_id UUID,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 5. CREATE ORDER TABLES
-- =====================================================

-- Cash register table
CREATE TABLE IF NOT EXISTS public.cash_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    opened_by UUID REFERENCES auth.users(id) NOT NULL,
    initial_amount DECIMAL(10, 2) NOT NULL,
    opened_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ,
    final_amount DECIMAL(10, 2)
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    order_number TEXT NOT NULL,
    customer_id UUID REFERENCES public.customers(id),
    source public.order_source NOT NULL,
    status public.order_status DEFAULT 'pending',
    total DECIMAL(10, 2) NOT NULL,
    cash_register_id UUID REFERENCES public.cash_register(id),
    created_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    product_variation_id UUID REFERENCES public.product_variations(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    variation_name TEXT,
    product_price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL
);

-- =====================================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_store_id ON public.profiles(store_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_variations_product_id ON public.product_variations(product_id);
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_variation_id ON public.order_items(product_variation_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_id ON public.loyalty_transactions(customer_id);

-- =====================================================
-- 7. CREATE UTILITY FUNCTIONS
-- =====================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$;

-- Function to generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    -- Get current date in YYYYMMDD format
    new_number := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Count orders created today
    SELECT COUNT(*) + 1 INTO counter
    FROM public.orders
    WHERE order_number LIKE new_number || '%';
    
    -- Append counter with zero padding
    new_number := new_number || LPAD(counter::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$;

-- =====================================================
-- 8. CREATE TRIGGERS
-- =====================================================

-- Trigger to update updated_at on stores
DROP TRIGGER IF EXISTS update_stores_updated_at ON public.stores;
CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON public.stores
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on products
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on product_variations
DROP TRIGGER IF EXISTS update_product_variations_updated_at ON public.product_variations;
CREATE TRIGGER update_product_variations_updated_at
    BEFORE UPDATE ON public.product_variations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on customers
DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on orders
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on categories
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 9. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 10. CREATE RLS POLICIES
-- =====================================================

-- Stores policies
DROP POLICY IF EXISTS "Admins can view all stores" ON public.stores;
CREATE POLICY "Admins can view all stores"
    ON public.stores FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view their store" ON public.stores;
CREATE POLICY "Users can view their store"
    ON public.stores FOR SELECT
    TO authenticated
    USING (id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Public can view stores" ON public.stores;
CREATE POLICY "Public can view stores"
    ON public.stores FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Admins can insert stores" ON public.stores;
CREATE POLICY "Admins can insert stores"
    ON public.stores FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update stores" ON public.stores;
CREATE POLICY "Admins can update stores"
    ON public.stores FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete stores" ON public.stores;
CREATE POLICY "Admins can delete stores"
    ON public.stores FOR DELETE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- User roles policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Categories policies
DROP POLICY IF EXISTS "Users can view categories from their store" ON public.categories;
CREATE POLICY "Users can view categories from their store"
    ON public.categories FOR SELECT
    TO authenticated
    USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
    ON public.categories FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Users can insert categories in their store" ON public.categories;
CREATE POLICY "Users can insert categories in their store"
    ON public.categories FOR INSERT
    TO authenticated
    WITH CHECK (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update categories in their store" ON public.categories;
CREATE POLICY "Users can update categories in their store"
    ON public.categories FOR UPDATE
    TO authenticated
    USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete categories in their store" ON public.categories;
CREATE POLICY "Users can delete categories in their store"
    ON public.categories FOR DELETE
    TO authenticated
    USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

-- Products policies
DROP POLICY IF EXISTS "Users can view products from their store" ON public.products;
CREATE POLICY "Users can view products from their store"
    ON public.products FOR SELECT
    TO authenticated
    USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products"
    ON public.products FOR SELECT
    TO anon
    USING (active = true);

DROP POLICY IF EXISTS "Users can insert products in their store" ON public.products;
CREATE POLICY "Users can insert products in their store"
    ON public.products FOR INSERT
    TO authenticated
    WITH CHECK (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update products in their store" ON public.products;
CREATE POLICY "Users can update products in their store"
    ON public.products FOR UPDATE
    TO authenticated
    USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete products in their store" ON public.products;
CREATE POLICY "Users can delete products in their store"
    ON public.products FOR DELETE
    TO authenticated
    USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

-- Product variations policies
DROP POLICY IF EXISTS "Users can view product variations from their store" ON public.product_variations;
CREATE POLICY "Users can view product variations from their store"
    ON public.product_variations FOR SELECT
    USING (product_id IN (
        SELECT id FROM public.products
        WHERE store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid())
    ));

DROP POLICY IF EXISTS "Public can view product variations" ON public.product_variations;
CREATE POLICY "Public can view product variations"
    ON public.product_variations FOR SELECT
    TO anon
    USING (product_id IN (SELECT id FROM public.products WHERE active = true));

DROP POLICY IF EXISTS "Users can insert product variations in their store" ON public.product_variations;
CREATE POLICY "Users can insert product variations in their store"
    ON public.product_variations FOR INSERT
    TO authenticated
    WITH CHECK (product_id IN (
        SELECT id FROM public.products
        WHERE store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid())
    ));

DROP POLICY IF EXISTS "Users can update product variations in their store" ON public.product_variations;
CREATE POLICY "Users can update product variations in their store"
    ON public.product_variations FOR UPDATE
    TO authenticated
    USING (product_id IN (
        SELECT id FROM public.products
        WHERE store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid())
    ));

DROP POLICY IF EXISTS "Users can delete product variations in their store" ON public.product_variations;
CREATE POLICY "Users can delete product variations in their store"
    ON public.product_variations FOR DELETE
    TO authenticated
    USING (product_id IN (
        SELECT id FROM public.products
        WHERE store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid())
    ));

-- Customers policies
DROP POLICY IF EXISTS "Users can manage customers from their store" ON public.customers;
CREATE POLICY "Users can manage customers from their store"
    ON public.customers FOR ALL
    TO authenticated
    USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

-- Loyalty rules policies
DROP POLICY IF EXISTS "Users can manage loyalty rules from their store" ON public.loyalty_rules;
CREATE POLICY "Users can manage loyalty rules from their store"
    ON public.loyalty_rules FOR ALL
    TO authenticated
    USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

-- Loyalty transactions policies
DROP POLICY IF EXISTS "Users can manage loyalty transactions from their store" ON public.loyalty_transactions;
CREATE POLICY "Users can manage loyalty transactions from their store"
    ON public.loyalty_transactions FOR ALL
    TO authenticated
    USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

-- Cash register policies
DROP POLICY IF EXISTS "Users can manage cash register from their store" ON public.cash_register;
CREATE POLICY "Users can manage cash register from their store"
    ON public.cash_register FOR ALL
    TO authenticated
    USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

-- Orders policies
DROP POLICY IF EXISTS "Users can manage orders from their store" ON public.orders;
CREATE POLICY "Users can manage orders from their store"
    ON public.orders FOR ALL
    TO authenticated
    USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

-- Order items policies
DROP POLICY IF EXISTS "Users can manage order items from their store" ON public.order_items;
CREATE POLICY "Users can manage order items from their store"
    ON public.order_items FOR ALL
    TO authenticated
    USING (order_id IN (
        SELECT id FROM public.orders
        WHERE store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid())
    ));

-- =====================================================
-- 11. ENABLE REALTIME
-- =====================================================

-- Enable realtime for orders (for order panel)
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- =====================================================
-- 12. GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant select on all tables for authenticated users (RLS will control access)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant select on stores and products for anonymous users (for customer store view)
GRANT SELECT ON public.stores TO anon;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.product_variations TO anon;
GRANT SELECT ON public.categories TO anon;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
