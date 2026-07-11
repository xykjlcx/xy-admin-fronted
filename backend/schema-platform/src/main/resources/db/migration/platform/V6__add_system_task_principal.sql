insert into mb_user (id, dept_id, username, password_hash, display_name, status)
values ('01900000-0000-7000-8000-000000000011',
        '01900000-0000-7000-8000-000000000001',
        '__system_task__', '!non-login-principal!', 'System Task', 'DISABLED')
on conflict (id) do nothing;
