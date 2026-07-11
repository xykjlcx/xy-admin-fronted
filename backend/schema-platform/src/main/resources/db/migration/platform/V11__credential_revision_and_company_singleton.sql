alter table mb_user add column credential_revision bigint not null default 0;
alter table mb_user add constraint mb_user_credential_revision_nonnegative check (credential_revision >= 0);

create function mb_user_credential_revision_monotonic() returns trigger language plpgsql as $$
begin
  if new.credential_revision < old.credential_revision then
    raise exception 'credential_revision must be monotonic' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger mb_user_credential_revision_monotonic before update of credential_revision on mb_user
for each row execute function mb_user_credential_revision_monotonic();

alter table mb_refresh_token add column credential_revision bigint;
update mb_refresh_token t set credential_revision=u.credential_revision from mb_user u where u.id=t.user_id;
alter table mb_refresh_token alter column credential_revision set not null;
alter table mb_refresh_token add constraint mb_refresh_token_credential_revision_nonnegative check (credential_revision >= 0);

alter table mb_company add column singleton_key smallint not null default 1;
alter table mb_company add constraint mb_company_singleton_key check (singleton_key = 1);
alter table mb_company add constraint mb_company_singleton unique (singleton_key);
