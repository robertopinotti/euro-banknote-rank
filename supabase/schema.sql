-- ============================================================================
--  Schema per la classifica condivisa delle proposte di banconota.
--  Da eseguire una sola volta nell'SQL Editor del progetto Supabase.
--
--  Impostazione di fondo: il browser non scrive mai direttamente nelle tabelle.
--  Legge soltanto gli aggregati di `pair_stats` e vota chiamando `cast_vote`,
--  che valida i parametri, limita la frequenza e aggiorna in modo atomico.
--  Le policy RLS bloccano qualsiasi altra strada.
-- ============================================================================

-- ---------------------------------------------------------------- tabelle --

-- Statistiche aggregate per coppia. Una riga per (taglio, design_lo, design_hi)
-- con le lettere sempre in ordine alfabetico, così la coppia A-B e la coppia
-- B-A finiscono nella stessa riga a prescindere da come è stata mostrata.
-- Al massimo 6 tagli × 45 coppie = 270 righe: il client le scarica tutte e
-- calcola la classifica in locale.
create table if not exists public.pair_stats (
  denomination smallint not null,
  design_lo    text     not null,
  design_hi    text     not null,
  wins_lo      integer  not null default 0,
  wins_hi      integer  not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (denomination, design_lo, design_hi),
  constraint pair_stats_order check (design_lo < design_hi),
  constraint pair_stats_denomination check (denomination in (5, 10, 20, 50, 100, 200)),
  constraint pair_stats_design_lo check (design_lo ~ '^[a-j]$'),
  constraint pair_stats_design_hi check (design_hi ~ '^[a-j]$'),
  constraint pair_stats_wins_non_negative check (wins_lo >= 0 and wins_hi >= 0)
);

-- Registro dei singoli voti. Non serve per la classifica (che si ricava dagli
-- aggregati) ma permette di ricostruire tutto se `pair_stats` va perso, di
-- analizzare l'andamento nel tempo e di applicare il limite di frequenza.
create table if not exists public.votes (
  id           bigint generated always as identity primary key,
  denomination smallint not null,
  winner       text     not null,
  loser        text     not null,
  voter        text     not null,
  created_at   timestamptz not null default now(),
  constraint votes_distinct check (winner <> loser),
  constraint votes_denomination check (denomination in (5, 10, 20, 50, 100, 200)),
  constraint votes_winner check (winner ~ '^[a-j]$'),
  constraint votes_loser check (loser ~ '^[a-j]$')
);

-- Indice a sostegno del controllo di frequenza in `cast_vote`.
create index if not exists votes_voter_created_at_idx
  on public.votes (voter, created_at desc);

-- -------------------------------------------------------------------- RLS --

alter table public.pair_stats enable row level security;
alter table public.votes      enable row level security;

-- La classifica è pubblica: chiunque può leggere gli aggregati.
drop policy if exists pair_stats_public_read on public.pair_stats;
create policy pair_stats_public_read
  on public.pair_stats for select
  to anon, authenticated
  using (true);

-- Nessuna policy di scrittura su pair_stats e nessuna policy di alcun tipo su
-- votes: con RLS attivo e nessuna policy, i client anonimi non possono né
-- leggere né scrivere. L'unico accesso in scrittura è `cast_vote`, che gira
-- come SECURITY DEFINER e quindi scavalca RLS in modo controllato.

-- I permessi sono dichiarati qui invece di affidarsi ai default privileges del
-- progetto: così lo schema si comporta allo stesso modo ovunque venga eseguito,
-- e restano espliciti i due soli accessi previsti — lettura degli aggregati e
-- basta. RLS e GRANT lavorano in serie: serve superare entrambi.
revoke all on public.pair_stats from anon, authenticated;
revoke all on public.votes      from anon, authenticated;
grant select on public.pair_stats to anon, authenticated;

-- --------------------------------------------------------------- funzione --

create or replace function public.cast_vote(
  p_denomination smallint,
  p_winner       text,
  p_loser        text,
  p_voter        text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lo     text;
  v_hi     text;
  v_recent integer;
begin
  -- Validazione. Ripetuta qui anche se i CHECK la garantiscono: così un input
  -- sbagliato riceve un messaggio chiaro invece di un errore di vincolo.
  if p_denomination not in (5, 10, 20, 50, 100, 200) then
    raise exception 'Taglio non valido: %', p_denomination using errcode = '22023';
  end if;

  if p_winner !~ '^[a-j]$' or p_loser !~ '^[a-j]$' then
    raise exception 'Design non valido: % / %', p_winner, p_loser using errcode = '22023';
  end if;

  if p_winner = p_loser then
    raise exception 'Un design non può sfidare se stesso' using errcode = '22023';
  end if;

  if p_voter is null or length(p_voter) not between 8 and 64 then
    raise exception 'Identificativo votante non valido' using errcode = '22023';
  end if;

  -- Freno agli abusi: non è una difesa forte (l'identificativo sta nel browser
  -- e si può rigenerare) ma basta a impedire che uno script gonfi la classifica
  -- con migliaia di voti al secondo.
  select count(*) into v_recent
  from public.votes
  where voter = p_voter
    and created_at > now() - interval '1 minute';

  if v_recent >= 60 then
    raise exception 'Troppi voti ravvicinati, riprova tra poco'
      using errcode = '53400';
  end if;

  insert into public.votes (denomination, winner, loser, voter)
  values (p_denomination, p_winner, p_loser, p_voter);

  -- Le lettere si riordinano prima di toccare gli aggregati, così ogni coppia
  -- ha una riga sola.
  if p_winner < p_loser then
    v_lo := p_winner;
    v_hi := p_loser;
  else
    v_lo := p_loser;
    v_hi := p_winner;
  end if;

  insert into public.pair_stats (denomination, design_lo, design_hi, wins_lo, wins_hi)
  values (
    p_denomination,
    v_lo,
    v_hi,
    case when p_winner = v_lo then 1 else 0 end,
    case when p_winner = v_hi then 1 else 0 end
  )
  on conflict (denomination, design_lo, design_hi) do update
    set wins_lo    = public.pair_stats.wins_lo + excluded.wins_lo,
        wins_hi    = public.pair_stats.wins_hi + excluded.wins_hi,
        updated_at = now();
end;
$$;

-- La funzione è l'unico punto di scrittura esposto ai client anonimi.
revoke all on function public.cast_vote(smallint, text, text, text) from public;
grant execute on function public.cast_vote(smallint, text, text, text) to anon, authenticated;

-- ============================================================================
--  Ricostruzione degli aggregati dal registro dei voti, se mai servisse:
--
--    truncate public.pair_stats;
--    insert into public.pair_stats (denomination, design_lo, design_hi, wins_lo, wins_hi)
--    select denomination,
--           least(winner, loser),
--           greatest(winner, loser),
--           count(*) filter (where winner = least(winner, loser)),
--           count(*) filter (where winner = greatest(winner, loser))
--    from public.votes
--    group by 1, 2, 3;
-- ============================================================================
