-- =====================================================================
-- NODEX store: Supabase schema
-- Run once in the Supabase SQL Editor. The script is re-runnable.
-- Design rules:
--   * Prices, stock and delivery fees are decided by the database, never by the browser.
--   * Customers cannot insert into orders directly; they call place_order(), which
--     validates, prices, checks and decrements stock in one transaction.
--   * Only users whose profiles.role = 'admin' can change products, settings or order status.
-- =====================================================================

-- ---------- settings (tuneable values, editable by admins) ----------
create table if not exists public.settings (
  key         text primary key,
  value       numeric not null,
  description text not null default ''
);
insert into public.settings (key, value, description) values
  ('delivery_male_free_above', 500, 'Male'': delivery is free when the subtotal exceeds this amount (MVR)'),
  ('delivery_male_fee',        50,  'Male'': delivery fee (MVR) when the subtotal does not exceed the free threshold'),
  ('tax_rate',                 0,   'Tax rate as a fraction, e.g. 0.08 for 8%. Confirm the applicable GST rate before changing')
on conflict (key) do nothing;

-- ---------- profiles (one row per auth user) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '',
  phone      text not null default '',
  address    text not null default '',
  island     text not null default '',
  atoll      text not null default '',
  role       text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- The role is never read from user-supplied metadata.
  insert into public.profiles (id, full_name, phone)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 200),
          left(coalesce(new.raw_user_meta_data ->> 'phone', ''), 30))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- products ----------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  sku         text unique,
  name        text not null check (length(btrim(name)) between 1 and 200),
  category    text not null check (length(btrim(category)) between 1 and 80),
  price       numeric(12,2) not null check (price >= 0),
  stock       integer not null default 0 check (stock >= 0),
  description text not null default '',
  specs       jsonb not null default '[]'::jsonb,   -- [["Label","Value"], ...]
  featured    boolean not null default false,        -- hero banner product
  hue         integer not null default 200 check (hue between 0 and 360),  -- placeholder art colour
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------- orders ----------
create sequence if not exists public.order_no_seq start 1001;

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  order_no       text not null unique,
  user_id        uuid references auth.users (id) on delete set null,   -- null for guest orders
  email          text not null,
  first_name     text not null,
  last_name      text not null,
  phone          text not null,
  area           text not null check (area in ('male', 'island')),
  address        text not null default '',
  island         text not null default '',
  atoll          text not null default '',
  payment_method text not null check (payment_method in ('cod', 'bank')),
  status         text not null default 'Pending'
                   check (status in ('Pending','Confirmed','Shipped','Delivered','Cancelled')),
  subtotal       numeric(12,2) not null,
  delivery_fee   numeric(12,2) not null default 0,
  tax            numeric(12,2) not null default 0,
  total          numeric(12,2) not null,
  delivery_note  text not null default '',
  created_at     timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id);

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name       text not null,                                   -- snapshot at time of purchase
  unit_price numeric(12,2) not null check (unit_price >= 0),  -- snapshot at time of purchase
  qty        integer not null check (qty > 0)
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- Stock is restored when an order is cancelled; a cancelled order cannot be reopened.
create or replace function public.orders_status_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if old.status = 'Cancelled' then
      raise exception 'A cancelled order cannot be reopened';
    end if;
    if new.status = 'Cancelled' then
      update public.products p
         set stock = p.stock + oi.qty
        from public.order_items oi
       where oi.order_id = new.id and oi.product_id = p.id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists orders_status_guard on public.orders;
create trigger orders_status_guard before update on public.orders
  for each row execute function public.orders_status_guard();

-- ---------- checkout function ----------
create or replace function public.place_order(
  p_items jsonb, p_customer jsonb, p_area text, p_payment text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r          record;
  v_prod     public.products%rowtype;
  v_lines    jsonb := '[]'::jsonb;
  v_line     jsonb;
  v_sub      numeric := 0;
  v_fee      numeric := 0;
  v_tax      numeric := 0;
  v_free     numeric;
  v_male_fee numeric;
  v_rate     numeric;
  v_order    public.orders%rowtype;
  v_email    text := lower(btrim(coalesce(p_customer ->> 'email', '')));
  v_first    text := btrim(coalesce(p_customer ->> 'first', ''));
  v_last     text := btrim(coalesce(p_customer ->> 'last', ''));
  v_phone    text := btrim(coalesce(p_customer ->> 'phone', ''));
  v_address  text := btrim(coalesce(p_customer ->> 'address', ''));
  v_island   text := btrim(coalesce(p_customer ->> 'island', ''));
  v_atoll    text := btrim(coalesce(p_customer ->> 'atoll', ''));
begin
  -- input validation
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then raise exception 'Enter a valid email address'; end if;
  if v_first = '' or v_last = '' or length(v_first) > 100 or length(v_last) > 100 then raise exception 'First and last name are required'; end if;
  if length(regexp_replace(v_phone, '\D', '', 'g')) < 7 or length(v_phone) > 30 then raise exception 'Enter a valid phone number'; end if;
  if p_area not in ('male', 'island') then raise exception 'Invalid delivery area'; end if;
  if p_payment not in ('cod', 'bank') then raise exception 'Invalid payment method'; end if;
  if p_area = 'male' and v_address = '' then raise exception 'Address is required for delivery in Male'''; end if;
  if p_area = 'island' and (v_island = '' or v_atoll = '') then raise exception 'Island and atoll are required for island delivery'; end if;
  if length(v_address) > 300 or length(v_island) > 100 or length(v_atoll) > 100 then raise exception 'A delivery field is too long'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'The cart is empty or invalid';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) e
              where (e ->> 'id') !~ '^[0-9a-fA-F-]{36}$' or (e ->> 'qty') !~ '^[0-9]{1,4}$' or (e ->> 'qty')::int < 1) then
    raise exception 'The cart contains an invalid item';
  end if;

  select value into v_free     from public.settings where key = 'delivery_male_free_above';
  select value into v_male_fee from public.settings where key = 'delivery_male_fee';
  select value into v_rate     from public.settings where key = 'tax_rate';

  -- lock products in a fixed order (avoids deadlocks), check stock, price from the database
  for r in
    select (e ->> 'id')::uuid as id, sum((e ->> 'qty')::int) as qty
      from jsonb_array_elements(p_items) e group by 1 order by 1
  loop
    select * into v_prod from public.products where id = r.id for update;
    if not found then raise exception 'A product in your cart is no longer available'; end if;
    if v_prod.stock < r.qty then
      raise exception 'Insufficient stock for % (% available)', v_prod.name, v_prod.stock;
    end if;
    v_sub := v_sub + v_prod.price * r.qty;
    v_lines := v_lines || jsonb_build_object('id', v_prod.id, 'name', v_prod.name, 'price', v_prod.price, 'qty', r.qty);
  end loop;

  if p_area = 'male' then
    v_fee := case when v_sub > coalesce(v_free, 500) then 0 else coalesce(v_male_fee, 50) end;
  end if;   -- island delivery fees are arranged with the customer and are not added here
  v_tax := round(v_sub * coalesce(v_rate, 0), 2);

  insert into public.orders (order_no, user_id, email, first_name, last_name, phone, area, address, island, atoll,
                             payment_method, subtotal, delivery_fee, tax, total, delivery_note)
  values ('NX-' || nextval('public.order_no_seq'), auth.uid(), v_email, v_first, v_last, v_phone, p_area,
          v_address, v_island, v_atoll, p_payment, v_sub, v_fee, v_tax, v_sub + v_fee + v_tax,
          case when p_area = 'island' then 'Island delivery: fee to be arranged with customer' else '' end)
  returning * into v_order;

  for v_line in select * from jsonb_array_elements(v_lines) loop
    insert into public.order_items (order_id, product_id, name, unit_price, qty)
    values (v_order.id, (v_line ->> 'id')::uuid, v_line ->> 'name', (v_line ->> 'price')::numeric, (v_line ->> 'qty')::int);
    update public.products set stock = stock - (v_line ->> 'qty')::int where id = (v_line ->> 'id')::uuid;
  end loop;

  return jsonb_build_object(
    'id', v_order.id, 'order_no', v_order.order_no, 'status', v_order.status, 'area', v_order.area,
    'payment', v_order.payment_method, 'subtotal', v_order.subtotal, 'delivery_fee', v_order.delivery_fee,
    'tax', v_order.tax, 'total', v_order.total, 'items', v_lines,
    'customer', jsonb_build_object('email', v_email, 'first', v_first, 'last', v_last, 'phone', v_phone));
end $$;

revoke all on function public.place_order(jsonb, jsonb, text, text) from public;
grant execute on function public.place_order(jsonb, jsonb, text, text) to anon, authenticated;

-- ---------- row-level security ----------
alter table public.settings    enable row level security;
alter table public.profiles    enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

drop policy if exists settings_read  on public.settings;
drop policy if exists settings_admin on public.settings;
create policy settings_read  on public.settings for select to anon, authenticated using (true);
create policy settings_admin on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_read  on public.products;
drop policy if exists products_admin on public.products;
create policy products_read  on public.products for select to anon, authenticated using (true);
create policy products_admin on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists profiles_read_own  on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_read_own   on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists orders_read   on public.orders;
drop policy if exists orders_admin  on public.orders;
create policy orders_read  on public.orders for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy orders_admin on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists order_items_read on public.order_items;
create policy order_items_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

-- ---------- privileges (defence in depth, in addition to RLS) ----------
revoke all on public.profiles, public.orders, public.order_items, public.settings from anon, authenticated;
grant select on public.settings to anon, authenticated;
grant update (value) on public.settings to authenticated;
grant select, update (full_name, phone, address, island, atoll) on public.profiles to authenticated;   -- role cannot be changed by the user
grant select on public.orders, public.order_items to authenticated;
grant update (status) on public.orders to authenticated;                                                -- admins only, via policy
revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;                                       -- admins only, via policy

-- ---------- sample products (safe to delete) ----------
insert into public.products (sku, name, category, price, stock, description, specs, featured, hue) values
 ('NX-LT-001','Aether 14 Pro Laptop','Laptops',18999,6,'14-inch performance laptop for creators and developers. Placeholder product content.','[["Display","14\" 2.8K OLED, 120 Hz"],["Processor","8-core, 4.8 GHz boost"],["Memory","32 GB LPDDR5"],["Storage","1 TB NVMe"],["Weight","1.4 kg"]]',true,190),
 ('NX-LT-002','Strata X Ultrabook 13','Laptops',14499,3,'Thin and light 13-inch ultrabook with all-day battery. Placeholder product content.','[["Display","13.3\" FHD IPS"],["Memory","16 GB"],["Storage","512 GB NVMe"],["Battery","Up to 16 h"]]',false,215),
 ('NX-PH-001','Pulse 12 Smartphone','Phones',8999,14,'Flagship-class smartphone with a dual-camera system. Placeholder product content.','[["Display","6.4\" AMOLED, 120 Hz"],["Storage","256 GB"],["Camera","50 MP + 12 MP"],["Battery","5000 mAh"]]',false,270),
 ('NX-PH-002','Pulse 12 Lite','Phones',4999,22,'Value smartphone with a large battery. Placeholder product content.','[["Display","6.6\" LCD, 90 Hz"],["Storage","128 GB"],["Battery","5000 mAh"]]',false,300),
 ('NX-AU-001','Halo ANC Headphones','Audio',2799,18,'Over-ear wireless headphones with active noise cancellation. Placeholder product content.','[["Drivers","40 mm"],["Battery","Up to 40 h"],["Connectivity","Bluetooth 5.3"]]',false,160),
 ('NX-AU-002','Orbit Buds Pro','Audio',1299,0,'True wireless earbuds with a compact charging case. Placeholder product content.','[["Battery","7 h + 21 h case"],["Rating","IPX4"]]',false,140),
 ('NX-CP-001','Core R7 Processor','Components',5499,9,'8-core desktop processor for gaming and productivity. Placeholder product content.','[["Cores / Threads","8 / 16"],["Boost clock","5.0 GHz"],["Socket","AM5"]]',false,20),
 ('NX-CP-002','Vector 16GB DDR5 Kit','Components',1899,25,'2 x 8 GB DDR5 memory kit. Placeholder product content.','[["Capacity","16 GB (2 x 8)"],["Speed","6000 MT/s"],["Latency","CL30"]]',false,40),
 ('NX-CP-003','Titan 1TB NVMe SSD','Components',1599,30,'PCIe 4.0 M.2 solid-state drive. Placeholder product content.','[["Capacity","1 TB"],["Read","up to 7,000 MB/s"],["Interface","PCIe 4.0 x4"]]',false,350),
 ('NX-AC-001','Keystone Mechanical Keyboard','Accessories',1499,12,'Hot-swappable mechanical keyboard with per-key lighting. Placeholder product content.','[["Layout","75%"],["Switches","Linear, hot-swap"],["Connectivity","USB-C / Bluetooth"]]',false,180),
 ('NX-AC-002','Glide Wireless Mouse','Accessories',699,40,'Lightweight wireless mouse with a high-precision sensor. Placeholder product content.','[["Sensor","26,000 DPI"],["Weight","62 g"],["Battery","Up to 80 h"]]',false,200),
 ('NX-SH-001','Nest Hub Smart Display','Smart Home',1899,8,'Smart display and home-control hub. Placeholder product content.','[["Screen","7\" touch"],["Connectivity","Wi-Fi, Bluetooth, Thread"]]',false,120)
on conflict (sku) do nothing;

-- ---------- FIRST ADMIN ----------
-- 1. Create your account through the store (Account > Create account), confirm the email if required.
-- 2. Then run this once, with your own email address:
--
--   update public.profiles set role = 'admin'
--    where id = (select id from auth.users where email = 'you@example.com');
