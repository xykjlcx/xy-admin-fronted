alter table mb_menu add column runtime_label jsonb;
alter table mb_menu_customization add column localized_label jsonb;

alter table mb_menu drop constraint mb_menu_runtime_localized_label;
update mb_menu set runtime_label=coalesce(
  nullif(jsonb_strip_nulls(jsonb_build_object('zh-CN',runtime_label_zh_cn,'en-US',runtime_label_en_us)),'{}'::jsonb),
  jsonb_build_object('und',default_label_key)
) where origin='RUNTIME';
update mb_menu_customization set localized_label=jsonb_strip_nulls(jsonb_build_object('zh-CN',label_zh_cn,'en-US',label_en_us)) where label_zh_cn is not null or label_en_us is not null;

create function mb_non_empty_string_map(candidate jsonb) returns boolean language plpgsql immutable as $$
begin
  if candidate is null or jsonb_typeof(candidate)<>'object' or candidate='{}'::jsonb then return false; end if;
  return not exists(
    select 1 from jsonb_each(candidate)
    where btrim(key)='' or jsonb_typeof(value)<>'string' or btrim(value#>>'{}')=''
  );
end;
$$;

alter table mb_menu add constraint mb_menu_runtime_label_shape
  check(origin<>'RUNTIME' or mb_non_empty_string_map(runtime_label));
alter table mb_menu_customization add constraint mb_menu_custom_label_shape
  check(localized_label is null or mb_non_empty_string_map(localized_label));

create function mb_menu_catalog_reject_cycle() returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('METABUILDER_MENU_TOPOLOGY',0));
  if new.origin<>'CATALOG' or new.default_parent_source_key is null then return new; end if;
  if new.default_parent_source_key=new.source_key then raise exception 'catalog menu cycle is not allowed' using errcode='23514'; end if;
  if exists(with recursive ancestors(source_key,parent_key) as (
    select m.source_key,m.default_parent_source_key from mb_menu m where m.source_key=new.default_parent_source_key and m.deleted_at is null
    union all select m.source_key,m.default_parent_source_key from mb_menu m join ancestors a on m.source_key=a.parent_key where m.deleted_at is null
  ) select 1 from ancestors where parent_key=new.source_key) then raise exception 'catalog menu cycle is not allowed' using errcode='23514'; end if;
  return new;
end;$$;
create trigger mb_menu_catalog_reject_cycle before insert or update of source_key,default_parent_source_key on mb_menu for each row execute function mb_menu_catalog_reject_cycle();
