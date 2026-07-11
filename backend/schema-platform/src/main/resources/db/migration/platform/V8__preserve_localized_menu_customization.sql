alter table mb_menu add column runtime_label_zh_cn varchar(255);
alter table mb_menu add column runtime_label_en_us varchar(255);
alter table mb_menu_customization add column label_zh_cn varchar(255);
alter table mb_menu_customization add column label_en_us varchar(255);

alter table mb_menu add constraint mb_menu_runtime_localized_label check (
  origin <> 'RUNTIME' or (runtime_label_zh_cn is not null and runtime_label_en_us is not null)
) not valid;

create function mb_menu_customization_reject_cycle() returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('METABUILDER_MENU_TOPOLOGY', 0));
  if not new.parent_overridden or new.parent_id is null then return new; end if;
  if new.parent_id = new.menu_id then raise exception 'menu cycle is not allowed' using errcode='23514'; end if;
  if exists (
    with recursive descendants(id) as (
      select m.id from mb_menu m
      left join mb_menu_customization c on c.menu_id=m.id
      left join mb_menu parent_default on parent_default.source_key=m.default_parent_source_key and parent_default.deleted_at is null
      where (case when coalesce(c.parent_overridden,false) then c.parent_id else parent_default.id end)=new.menu_id
      union all
      select m.id from mb_menu m
      left join mb_menu_customization c on c.menu_id=m.id
      left join mb_menu parent_default on parent_default.source_key=m.default_parent_source_key and parent_default.deleted_at is null
      join descendants d on (case when coalesce(c.parent_overridden,false) then c.parent_id else parent_default.id end)=d.id
    ) select 1 from descendants where id=new.parent_id
  ) then raise exception 'menu cycle is not allowed' using errcode='23514'; end if;
  return new;
end;
$$;

create trigger mb_menu_customization_reject_cycle before insert or update of parent_overridden,parent_id
on mb_menu_customization for each row execute function mb_menu_customization_reject_cycle();
