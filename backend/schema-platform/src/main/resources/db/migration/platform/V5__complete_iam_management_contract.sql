alter table mb_user drop constraint mb_user_status_check;
alter table mb_user add constraint mb_user_status_check
    check (status in ('ACTIVE', 'DISABLED', 'UNACTIVATED', 'LEFT'));

alter table mb_role add column description varchar(512) not null default '';
