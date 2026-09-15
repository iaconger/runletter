-- One Strava athlete can be connected to more than one RunLetter account (a runner account and a
-- creator account). The old global UNIQUE (strava_activity_id) meant the two accounts fought over the
-- same row: each sync moved the activity to whichever account synced last, so the other went empty.
-- Make the activity unique per user instead. (Nulls stay distinct, so hand-logged runs are unaffected.)
alter table extra_runs drop constraint if exists extra_runs_strava_activity_id_key;
create unique index if not exists extra_runs_user_activity_key
  on extra_runs (user_id, strava_activity_id);
