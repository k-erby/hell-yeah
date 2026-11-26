# Hell Yeah

A phone-first routine tracker with a game layer, built for Sam (and Bo).

## Run it

```bash
npm install
npm run dev      # opens on your network too, so you can test on your phone
npm test         # logic tests (dates, XP, streaks, decay)
npm run build    # static site in dist/
```

## Put it on Sam's phone

`dist/` is a static site, so any static host works (Netlify drop, Vercel, GitHub Pages).
Then on her iPhone: open the link in Safari → Share → **Add to Home Screen**. It opens full-screen like an app.

Her data lives in that browser's localStorage. **Settings → Export** makes a backup file, and **Import** restores it.

## Adding Supabase later (buddy sync)

Storage is behind the `Repo` interface in `src/storage.ts`. The whole app state is one JSON document, so the
simplest Supabase setup is:

```sql
create table profiles (
  user_id uuid primary key references auth.users,
  state jsonb not null,
  updated_at timestamptz default now()
);
create table buddies (          -- who can see whose status
  user_id uuid references auth.users,
  buddy_id uuid references auth.users,
  primary key (user_id, buddy_id)
);
alter table profiles enable row level security;
create policy "own row" on profiles for all using (auth.uid() = user_id);
create policy "buddies can read" on profiles for select
  using (exists (select 1 from buddies b where b.user_id = profiles.user_id and b.buddy_id = auth.uid()));
```

Then write a `SupabaseRepo` (magic-link login, `load` = select own row, `save` = upsert) and swap it in at the
top of `src/main.ts`. A buddy view would read the other person's row and reuse `streak()`, `rankFor()` and `moodFor()`.
