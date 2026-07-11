-- bootstrap-scope-self-custom: one user receives SELF and CUSTOM_DEPT from separate roles.
-- bootstrap-scope-own-below-custom: another user receives OWN_DEPT_AND_BELOW and CUSTOM_DEPT.
insert into mb_role (id, code, name, data_scope_type) values
    ('01900000-0000-7000-8000-00000000f001', 'FIXTURE_SELF', 'Fixture SELF', 'SELF'),
    ('01900000-0000-7000-8000-00000000f002', 'FIXTURE_CUSTOM_ONE', 'Fixture CUSTOM one', 'CUSTOM_DEPT'),
    ('01900000-0000-7000-8000-00000000f003', 'FIXTURE_OWN_BELOW', 'Fixture OWN below', 'OWN_DEPT_AND_BELOW'),
    ('01900000-0000-7000-8000-00000000f004', 'FIXTURE_CUSTOM_TWO', 'Fixture CUSTOM two', 'CUSTOM_DEPT');

insert into mb_dept (id, code, name) values
    ('01900000-0000-7000-8000-00000000f010', 'FIXTURE_SCOPE_ROOT', 'Fixture scope root'),
    ('01900000-0000-7000-8000-00000000f011', 'FIXTURE_SCOPE_CUSTOM', 'Fixture custom department');

insert into mb_user (id, dept_id, username, password_hash, display_name) values
    ('01900000-0000-7000-8000-00000000f020', '01900000-0000-7000-8000-00000000f010', 'fixture-self-custom', 'hash', 'Fixture SELF and CUSTOM'),
    ('01900000-0000-7000-8000-00000000f021', '01900000-0000-7000-8000-00000000f010', 'fixture-own-below-custom', 'hash', 'Fixture OWN BELOW and CUSTOM');

insert into mb_user_role (user_id, role_id) values
    ('01900000-0000-7000-8000-00000000f020', '01900000-0000-7000-8000-00000000f001'),
    ('01900000-0000-7000-8000-00000000f020', '01900000-0000-7000-8000-00000000f002'),
    ('01900000-0000-7000-8000-00000000f021', '01900000-0000-7000-8000-00000000f003'),
    ('01900000-0000-7000-8000-00000000f021', '01900000-0000-7000-8000-00000000f004');

insert into mb_role_custom_dept (role_id, dept_id) values
    ('01900000-0000-7000-8000-00000000f002', '01900000-0000-7000-8000-00000000f011'),
    ('01900000-0000-7000-8000-00000000f004', '01900000-0000-7000-8000-00000000f011');
