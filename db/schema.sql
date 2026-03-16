-- dabom database schema
-- Run in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_krw INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  payment_id TEXT,
  amount INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','canceled')),
  gift_id UUID,
  report_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_order_id ON orders(order_id);
CREATE INDEX idx_orders_owner_id ON orders(owner_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_report_id ON orders(report_id);

-- gifts
CREATE TABLE gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_name TEXT,
  gift_status TEXT NOT NULL DEFAULT 'created' CHECK (gift_status IN ('created','active','used')),
  gift_opened_at TIMESTAMPTZ,
  report_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gifts_token ON gifts(token);
CREATE INDEX idx_gifts_buyer_id ON gifts(buyer_id);
CREATE INDEX idx_gifts_status ON gifts(gift_status);

-- fortune_reports
-- input JSONB includes: birthDate, birthTime, gender, name, relationship, calendarType, leapMonthType, interests (string[])
CREATE TABLE fortune_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  gift_id UUID REFERENCES gifts(id) ON DELETE SET NULL,
  input JSONB NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fortune_reports_owner_id ON fortune_reports(owner_id);
CREATE INDEX idx_fortune_reports_gift_id ON fortune_reports(gift_id);

-- fortune_letters
CREATE TABLE fortune_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES fortune_reports(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fortune_letters_report_id ON fortune_letters(report_id);

-- saju_calculations (provider cache)
CREATE TABLE saju_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_hash TEXT NOT NULL,
  normalized_input JSONB NOT NULL,
  provider TEXT NOT NULL,
  provider_version TEXT NOT NULL,
  canonical_json JSONB NOT NULL,
  provider_raw JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_saju_calculations_input_hash_provider
  ON saju_calculations(input_hash, provider);
CREATE INDEX idx_saju_calculations_created_at ON saju_calculations(created_at DESC);

-- updated_at trigger for orders
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- seed products
INSERT INTO products (code, name, price_krw) VALUES
  ('FORTUNE_2026', '2026년 운세 (본인용)', 3900),
  ('GIFT_FORTUNE_2026', '2026년 운세 선물하기', 3900)
ON CONFLICT (code) DO NOTHING;

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fortune_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE fortune_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE saju_calculations ENABLE ROW LEVEL SECURITY;

-- products: select all
CREATE POLICY "products_select_all" ON products FOR SELECT USING (true);

-- orders: owner select/insert/update
CREATE POLICY "orders_select_owner" ON orders FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "orders_insert_owner" ON orders FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "orders_update_owner" ON orders FOR UPDATE USING (auth.uid() = owner_id);

-- gifts: buyer select/insert/update
CREATE POLICY "gifts_select_buyer" ON gifts FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "gifts_insert_buyer" ON gifts FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "gifts_update_buyer" ON gifts FOR UPDATE USING (auth.uid() = buyer_id);

-- reports: owner select only
CREATE POLICY "reports_select_owner" ON fortune_reports FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "reports_insert_service" ON fortune_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "reports_update_service" ON fortune_reports FOR UPDATE USING (true);

-- letters: readable if linked report owner is auth user (gift flow uses service role)
CREATE POLICY "letters_select_via_report" ON fortune_letters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fortune_reports r
      WHERE r.id = fortune_letters.report_id
      AND r.owner_id = auth.uid()
    )
  );
CREATE POLICY "letters_insert_service" ON fortune_letters FOR INSERT WITH CHECK (true);

-- saju_calculations: service-only usage (service role bypasses RLS)
CREATE POLICY "saju_calculations_select_service" ON saju_calculations FOR SELECT USING (true);
CREATE POLICY "saju_calculations_insert_service" ON saju_calculations FOR INSERT WITH CHECK (true);
