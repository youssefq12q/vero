-- =========================================================================
-- VERO BOUTIQUE SUPABASE DATABASE MIGRATION SCRIPT
-- =========================================================================
-- This script creates all required tables, foreign keys, indexes, triggers,
-- Row Level Security (RLS) policies, and public storage buckets for product images.
-- Paste this entire script into your Supabase SQL Editor and click 'Run'.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id text PRIMARY KEY,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id text PRIMARY KEY,
    name text NOT NULL,
    category_id text REFERENCES public.categories(id) ON DELETE SET NULL,
    category_name text,
    price numeric NOT NULL,
    image text NOT NULL,
    secondary_images text[] DEFAULT '{}'::text[],
    description text DEFAULT '',
    tagline text DEFAULT '',
    is_new boolean DEFAULT false NOT NULL,
    material_options text[] DEFAULT '{}'::text[],
    size_options text[] DEFAULT '{}'::text[],
    details text[] DEFAULT '{}'::text[],
    craftsmanship text DEFAULT '',
    stock integer,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create product_images table
CREATE TABLE IF NOT EXISTS public.product_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id text REFERENCES public.products(id) ON DELETE CASCADE,
    image_url text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create users table (public profile mapped to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY, -- references auth.users(id)
    name text NOT NULL,
    email text NOT NULL,
    avatar text,
    provider text DEFAULT 'email',
    tier text DEFAULT 'Bronze',
    loyalty_points integer DEFAULT 0 NOT NULL,
    total_spent numeric DEFAULT 0.0 NOT NULL,
    joined_date text,
    redeemed_rewards text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create cart table
CREATE TABLE IF NOT EXISTS public.cart (
    id text PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    product_id text REFERENCES public.products(id) ON DELETE CASCADE,
    quantity integer DEFAULT 1 NOT NULL,
    selected_material text,
    selected_size text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create wishlist table
CREATE TABLE IF NOT EXISTS public.wishlist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    product_id text REFERENCES public.products(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

-- 7. Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id text PRIMARY KEY,
    order_number text NOT NULL UNIQUE,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    email text NOT NULL,
    shipping_name text NOT NULL,
    shipping_address text NOT NULL,
    shipping_city text NOT NULL,
    shipping_zip text DEFAULT '',
    shipping_phone text DEFAULT '',
    total numeric NOT NULL,
    status text NOT NULL,
    date text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id text REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id text REFERENCES public.products(id) ON DELETE SET NULL,
    quantity integer DEFAULT 1 NOT NULL,
    selected_material text,
    selected_size text,
    price numeric NOT NULL
);

-- 9. Create loyalty_points table
CREATE TABLE IF NOT EXISTS public.loyalty_points (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    points integer NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id text REFERENCES public.products(id) ON DELETE CASCADE,
    author text NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text DEFAULT '',
    date text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
    code text PRIMARY KEY,
    discount numeric NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_user ON public.cart(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON public.wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user ON public.loyalty_points(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews(product_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Anonymous and authenticated permissive policies for effortless client operations
CREATE POLICY "Allow public select categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public insert categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update categories" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Allow public delete categories" ON public.categories FOR DELETE USING (true);

CREATE POLICY "Allow public select products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow public insert products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Allow public delete products" ON public.products FOR DELETE USING (true);

CREATE POLICY "Allow public select product_images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Allow public insert product_images" ON public.product_images FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update product_images" ON public.product_images FOR UPDATE USING (true);
CREATE POLICY "Allow public delete product_images" ON public.product_images FOR DELETE USING (true);

CREATE POLICY "Allow public select users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update users" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Allow public delete users" ON public.users FOR DELETE USING (true);

CREATE POLICY "Allow public select cart" ON public.cart FOR SELECT USING (true);
CREATE POLICY "Allow public insert cart" ON public.cart FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update cart" ON public.cart FOR UPDATE USING (true);
CREATE POLICY "Allow public delete cart" ON public.cart FOR DELETE USING (true);

CREATE POLICY "Allow public select wishlist" ON public.wishlist FOR SELECT USING (true);
CREATE POLICY "Allow public insert wishlist" ON public.wishlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update wishlist" ON public.wishlist FOR UPDATE USING (true);
CREATE POLICY "Allow public delete wishlist" ON public.wishlist FOR DELETE USING (true);

CREATE POLICY "Allow public select orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update orders" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Allow public delete orders" ON public.orders FOR DELETE USING (true);

CREATE POLICY "Allow public select order_items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert order_items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update order_items" ON public.order_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete order_items" ON public.order_items FOR DELETE USING (true);

CREATE POLICY "Allow public select loyalty_points" ON public.loyalty_points FOR SELECT USING (true);
CREATE POLICY "Allow public insert loyalty_points" ON public.loyalty_points FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update loyalty_points" ON public.loyalty_points FOR UPDATE USING (true);
CREATE POLICY "Allow public delete loyalty_points" ON public.loyalty_points FOR DELETE USING (true);

CREATE POLICY "Allow public select reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Allow public insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update reviews" ON public.reviews FOR UPDATE USING (true);
CREATE POLICY "Allow public delete reviews" ON public.reviews FOR DELETE USING (true);

CREATE POLICY "Allow public select coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Allow public insert coupons" ON public.coupons FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update coupons" ON public.coupons FOR UPDATE USING (true);
CREATE POLICY "Allow public delete coupons" ON public.coupons FOR DELETE USING (true);

-- ==========================================
-- STORAGE BUCKETS SETUP & POLICIES
-- ==========================================
-- Insert public storage bucket for product assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-assets', 'product-assets', true) 
ON CONFLICT (id) DO NOTHING;

-- Policies for public storage bucket access
CREATE POLICY "Allow public select storage" ON storage.objects FOR SELECT USING (bucket_id = 'product-assets');
CREATE POLICY "Allow public insert storage" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-assets');
CREATE POLICY "Allow public update storage" ON storage.objects FOR UPDATE USING (bucket_id = 'product-assets');
CREATE POLICY "Allow public delete storage" ON storage.objects FOR DELETE USING (bucket_id = 'product-assets');

-- ==========================================
-- TRIGGER: PUBLIC.USERS PROFILES ON AUTH SIGN-UP
-- ==========================================
-- This automatically inserts a corresponding profile row in public.users when a user signs up via auth.signUp
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, avatar, provider, tier, loyalty_points, total_spent, joined_date, redeemed_rewards)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || new.id),
    'email',
    'Bronze',
    0,
    0.0,
    to_char(now(), 'YYYY-MM-DD'),
    '{}'::text[]
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- SEED INITIAL DATA (Optional - Categories)
-- ==========================================
INSERT INTO public.categories (id, name) VALUES
('html', 'HTML'),
('react', 'React'),
('css', 'CSS'),
('python-django', 'Python-Django'),
('rings', 'Rings'),
('necklaces', 'Necklaces'),
('bracelets', 'Bracelets')
ON CONFLICT (id) DO NOTHING;
