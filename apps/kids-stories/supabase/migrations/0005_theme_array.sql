-- 0005_theme_array.sql
-- Change stories.theme from a single constrained text value to text[] to support
-- up to 2 themes per story. Existing single-theme rows are migrated to arrays.
-- New theme keys: kindness, honesty, courage, family, friendship, challenges,
-- wonder, nature, growth (replaces adventure/animals/space/fantasy).

alter table public.stories
  drop constraint stories_theme_check;

alter table public.stories
  alter column theme type text[] using array[theme];
