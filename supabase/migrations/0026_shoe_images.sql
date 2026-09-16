-- Somewhere to keep a licensed product image and its buy link, once an affiliate feed is approved.
-- Empty until then; the drawn silhouette is the fallback and stays the default.
alter table shoes add column if not exists image_url text;
alter table shoes add column if not exists buy_url text;
