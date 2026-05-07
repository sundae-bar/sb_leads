create type user_role as enum ('admin', 'member');

alter table profiles drop constraint if exists profiles_role_check;

alter table profiles
  alter column role drop default,
  alter column role drop not null;

alter table profiles
  alter column role type user_role using role::user_role;

alter table profiles
  alter column role set default 'member'::user_role,
  alter column role set not null;
