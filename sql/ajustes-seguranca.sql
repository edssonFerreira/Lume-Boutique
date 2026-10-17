-- Lume Boutique: ajustes para aplicar no Supabase SQL Editor.
-- Este script NÃO apaga tabelas nem os dados existentes.
-- Revise as políticas atuais antes de executar em produção.

-- Garante que RLS esteja ativo nas tabelas principais.
alter table public.perfis enable row level security;
alter table public.produtos enable row level security;
alter table public.pedidos enable row level security;

-- A função SECURITY DEFINER evita recursão na policy de perfis.
-- O search_path fixo reduz o risco de resolução de objetos inesperados.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select p.is_admin
    from public.perfis p
    where p.id = (select auth.uid())
  ), false);
$$;

-- Remove e recria as policies com os nomes usados pela versão da loja.
drop policy if exists "ver perfil" on public.perfis;
drop policy if exists "ver produtos" on public.produtos;
drop policy if exists "admin gerencia produtos" on public.produtos;
drop policy if exists "cliente cria pedido" on public.pedidos;
drop policy if exists "ver pedidos" on public.pedidos;

create policy "ver perfil" on public.perfis
for select to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));

create policy "ver produtos" on public.produtos
for select to anon, authenticated
using (ativo = true or (select public.is_admin()));

create policy "admin gerencia produtos" on public.produtos
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "cliente cria pedido" on public.pedidos
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "ver pedidos" on public.pedidos
for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Bucket público para exibir as imagens dos produtos na vitrine.
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do update set public = excluded.public;

-- Policies de fotos. A leitura é pública porque o bucket é público;
-- somente usuários administradores autenticados podem alterar arquivos.
drop policy if exists "ver fotos" on storage.objects;
drop policy if exists "admin gerencia fotos" on storage.objects;
create policy "ver fotos" on storage.objects
for select to anon, authenticated
using (bucket_id = 'produtos');
create policy "admin gerencia fotos" on storage.objects
for all to authenticated
using (bucket_id = 'produtos' and (select public.is_admin()))
with check (bucket_id = 'produtos' and (select public.is_admin()));

-- Depois de criar sua conta pelo site, execute este comando separadamente,
-- trocando o e-mail pelo seu e-mail real. Confira o resultado antes de continuar:
-- update public.perfis p set is_admin = true
-- where p.id = (select u.id from auth.users u where u.email = 'seu@email.com');
