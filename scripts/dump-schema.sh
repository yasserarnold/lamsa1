#!/usr/bin/env bash
# Regenerate SQL scripts for the whole public schema into db/.
# Usage: bash scripts/dump-schema.sh   (requires PG* env vars)
set -euo pipefail
OUT="$(dirname "$0")/../db"
mkdir -p "$OUT"
q() { psql -tAX -c "$1"; }

# 1) Enum types
{
  echo "-- Enum types (public)";
  q "select format('CREATE TYPE public.%I AS ENUM (%s);', t.typname,
        string_agg(quote_literal(e.enumlabel), ', ' order by e.enumsortorder))
     from pg_type t
     join pg_enum e on e.enumtypid = t.oid
     join pg_namespace n on n.oid = t.typnamespace
     where n.nspname='public' group by t.typname order by t.typname;"
} > "$OUT/01_types.sql"

# 2) Tables (columns, defaults, not null) + PK/unique/FK/check constraints + indexes
{
  echo "-- Tables";
  q "select format(E'CREATE TABLE IF NOT EXISTS public.%I (\n%s\n);', c.relname,
        string_agg(format('  %I %s%s%s', a.attname,
          format_type(a.atttypid, a.atttypmod),
          case when a.attnotnull then ' NOT NULL' else '' end,
          coalesce(' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid), '')),
          E',\n' order by a.attnum))
     from pg_class c
     join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
     left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum
     where c.relkind='r' group by c.relname order by c.relname;"
  echo; echo "-- Constraints";
  q "select format('ALTER TABLE public.%I ADD CONSTRAINT %I %s;', rel.relname, con.conname, pg_get_constraintdef(con.oid))
     from pg_constraint con
     join pg_class rel on rel.oid=con.conrelid
     join pg_namespace n on n.oid=rel.relnamespace and n.nspname='public'
     order by rel.relname, con.contype desc, con.conname;"
  echo; echo "-- Indexes";
  q "select indexdef || ';' from pg_indexes where schemaname='public'
       and indexname not in (select conname from pg_constraint) order by tablename, indexname;"
} > "$OUT/02_tables.sql"

# 3) Functions
{
  echo "-- Functions (public)";
  q "select pg_get_functiondef(p.oid) || E';\n'
     from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.prokind='f' order by p.proname;"
} > "$OUT/03_functions.sql"

# 4) Triggers
{
  echo "-- Triggers (public)";
  q "select pg_get_triggerdef(t.oid) || ';'
     from pg_trigger t join pg_class c on c.oid=t.tgrelid
     join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     where not t.tgisinternal order by c.relname, t.tgname;"
} > "$OUT/04_triggers.sql"

# 5) RLS + policies
{
  echo "-- Row Level Security";
  q "select format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', relname)
     from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     where c.relkind='r' and c.relrowsecurity order by relname;"
  echo; echo "-- Policies";
  q "select format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s;',
        policyname, tablename, permissive, cmd, array_to_string(roles, ', '),
        coalesce(' USING (' || qual || ')',''),
        coalesce(' WITH CHECK (' || with_check || ')',''))
     from pg_policies where schemaname='public' order by tablename, policyname;"
} > "$OUT/05_rls_policies.sql"

# 6) Grants (tables + functions)
{
  echo "-- Table grants";
  q "select format('GRANT %s ON public.%I TO %I;', a.privilege_type, c.relname, pg_get_userbyid(a.grantee))
     from pg_class c
     join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     cross join lateral aclexplode(c.relacl) a
     where c.relkind='r'
       and pg_get_userbyid(a.grantee) in ('anon','authenticated','service_role')
       and a.privilege_type in ('SELECT','INSERT','UPDATE','DELETE')
     order by c.relname, pg_get_userbyid(a.grantee), a.privilege_type;"
  echo; echo "-- Function execute grants";
  q "select format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC;',
        p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')')
     from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.prokind='f' order by p.proname;"
  q "select format('GRANT EXECUTE ON FUNCTION public.%s TO %I;',
        p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', r.grantee)
     from pg_proc p
     join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
     join lateral (select unnest(array['anon','authenticated','service_role']) as grantee) r on true
     where p.prokind='f'
       and has_function_privilege(r.grantee, p.oid, 'EXECUTE')
     order by p.proname, r.grantee;"
} > "$OUT/06_grants.sql"

# 7) Storage buckets
{
  echo "-- Storage buckets";
  q "select format('INSERT INTO storage.buckets (id, name, public) VALUES (%L, %L, %L) ON CONFLICT (id) DO NOTHING;', id, name, public)
     from storage.buckets order by id;"
  echo; echo "-- Storage policies";
  q "select format('CREATE POLICY %I ON storage.objects AS %s FOR %s TO %s%s%s;',
        policyname, permissive, cmd, array_to_string(roles, ', '),
        coalesce(' USING (' || qual || ')',''),
        coalesce(' WITH CHECK (' || with_check || ')',''))
     from pg_policies where schemaname='storage' and tablename='objects' order by policyname;"
} > "$OUT/07_storage.sql"

cat "$OUT"/0*.sql > "$OUT/full_schema.sql"
echo "Wrote scripts to $OUT"
