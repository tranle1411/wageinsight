-- Apply after 001. Existing oversized rows remain readable; new writes are bounded.
alter table public.predictions add constraint predictions_payload_size
  check (octet_length(profile::text) <= 4096 and octet_length(prediction::text) <= 65536) not valid;

create or replace function public.limit_prediction_history() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  -- Serializes inserts for this owner, including concurrent browser tabs.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if (select count(*) from public.predictions where user_id = new.user_id) >= 100 then
    raise exception 'Saved history limit reached. Delete a saved result before saving another.';
  end if;
  return new;
end;
$$;
create trigger limit_prediction_history before insert on public.predictions
  for each row execute function public.limit_prediction_history();
