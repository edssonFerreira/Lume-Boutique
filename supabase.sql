-- Cole tudo isto em Supabase > SQL Editor > Run
create table perfis(id uuid primary key references auth.users on delete cascade, nome text, is_admin boolean default false);
create table produtos(id bigint generated always as identity primary key, nome text not null, descricao text, preco numeric(10,2) not null, categoria text default 'Geral', tamanhos text, imagem text, ativo boolean default true, criado_em timestamptz default now());
create table pedidos(id bigint generated always as identity primary key, user_id uuid references auth.users, cliente text, itens jsonb not null, total numeric(10,2), criado_em timestamptz default now());

create function is_admin() returns boolean language sql security definer stable as $$ select coalesce((select is_admin from perfis where id=auth.uid()),false) $$;
create function novo_perfil() returns trigger language plpgsql security definer as $$ begin insert into perfis(id,nome) values(new.id,new.raw_user_meta_data->>'nome'); return new; end $$;
create trigger ao_criar_usuario after insert on auth.users for each row execute function novo_perfil();

alter table perfis enable row level security;
alter table produtos enable row level security;
alter table pedidos enable row level security;
create policy "ver perfil" on perfis for select using (id=auth.uid() or is_admin());
create policy "ver produtos" on produtos for select using (ativo or is_admin());
create policy "admin gerencia produtos" on produtos for all using (is_admin()) with check (is_admin());
create policy "cliente cria pedido" on pedidos for insert with check (user_id=auth.uid());
create policy "ver pedidos" on pedidos for select using (user_id=auth.uid() or is_admin());

insert into storage.buckets(id,name,public) values('produtos','produtos',true);
create policy "ver fotos" on storage.objects for select using (bucket_id='produtos');
create policy "admin gerencia fotos" on storage.objects for all using (bucket_id='produtos' and is_admin()) with check (bucket_id='produtos' and is_admin());

-- Depois de criar sua conta na loja, torne-a administradora (troque o e-mail):
-- update perfis set is_admin=true where id=(select id from auth.users where email='seu@email.com');
