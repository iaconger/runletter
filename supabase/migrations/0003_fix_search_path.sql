-- Advisor fix: pin search_path on the trigger function.
alter function touch_updated_at() set search_path = public;
