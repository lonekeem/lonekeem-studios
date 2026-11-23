-- Additive: accept optional shape stretch (sx, sy) and movable emblem pose (ex, ey, er, ew, eh)
-- in banner JSON. Replaces cleaners only; no table drops or data deletes.

create or replace function atq_mp.clan_clean_draw(d jsonb) returns jsonb
language plpgsql immutable set search_path = pg_catalog as $$
declare
  ops jsonb := '[]'::jsonb;
  raw jsonb;
  t text;
  k text;
  col text;
  hx text := '^#[0-9a-fA-F]{6}$';
  p jsonb;
  out_pts jsonb;
  i int;
  n int;
  x numeric;
  y numeric;
  w numeric;
  s numeric;
  rot numeric;
  sx numeric;
  sy numeric;
  shapes text[] := array['circle','square','triangle','star','heart','line'];
  o jsonb;
  op jsonb;
begin
  if d is null or jsonb_typeof(d) <> 'object' then return null; end if;
  if d->'ops' is null or jsonb_typeof(d->'ops') <> 'array' then return null; end if;
  for raw in select value from jsonb_array_elements(d->'ops') loop
    if jsonb_array_length(ops) >= 80 then exit; end if;
    if jsonb_typeof(raw) <> 'object' then continue; end if;
    t := raw->>'t';
    if t in ('stroke','erase') then
      p := raw->'p';
      if jsonb_typeof(p) <> 'array' then continue; end if;
      out_pts := '[]'::jsonb;
      n := jsonb_array_length(p);
      i := 0;
      while i + 1 < n and jsonb_array_length(out_pts) < 320 loop
        begin
          x := least(1, greatest(0, round((p->>i)::numeric, 3)));
          y := least(1, greatest(0, round((p->>(i+1))::numeric, 3)));
          out_pts := out_pts || to_jsonb(x) || to_jsonb(y);
        exception when others then null;
        end;
        i := i + 2;
      end loop;
      if jsonb_array_length(out_pts) < 2 then continue; end if;
      begin w := least(0.2, greatest(0.01, round(coalesce((raw->>'w')::numeric, 0.032), 3))); exception when others then w := 0.032; end;
      if t = 'stroke' then
        col := lower(coalesce(raw->>'c', '#f4f0e6'));
        if col !~ hx then col := '#f4f0e6'; end if;
        op := jsonb_build_object('t','stroke','c',col,'w',w,'p',out_pts);
      else
        op := jsonb_build_object('t','erase','w',w,'p',out_pts);
      end if;
      ops := ops || jsonb_build_array(op);
    elsif t = 'fill' then
      col := lower(coalesce(raw->>'c', '#f4f0e6'));
      if col !~ hx then continue; end if;
      begin x := least(1, greatest(0, round(coalesce((raw->>'x')::numeric, 0.5), 3))); exception when others then x := 0.5; end;
      begin y := least(1, greatest(0, round(coalesce((raw->>'y')::numeric, 0.5), 3))); exception when others then y := 0.5; end;
      ops := ops || jsonb_build_array(jsonb_build_object('t','fill','c',col,'x',x,'y',y));
    elsif t = 'shape' then
      k := raw->>'k';
      if k is null or not (k = any (shapes)) then continue; end if;
      col := lower(coalesce(raw->>'c', '#f4f0e6'));
      if col !~ hx then continue; end if;
      begin x := least(1, greatest(0, round(coalesce((raw->>'x')::numeric, 0.5), 3))); exception when others then x := 0.5; end;
      begin y := least(1, greatest(0, round(coalesce((raw->>'y')::numeric, 0.5), 3))); exception when others then y := 0.5; end;
      begin s := least(1, greatest(0.02, round(coalesce((raw->>'s')::numeric, 0.18), 3))); exception when others then s := 0.18; end;
      begin rot := round(coalesce((raw->>'r')::numeric, 0), 3); exception when others then rot := 0; end;
      begin w := least(0.2, greatest(0.01, round(coalesce((raw->>'w')::numeric, 0.025), 3))); exception when others then w := 0.025; end;
      begin sx := least(5, greatest(0.2, round(coalesce((raw->>'sx')::numeric, 1), 3))); exception when others then sx := 1; end;
      begin sy := least(5, greatest(0.2, round(coalesce((raw->>'sy')::numeric, 1), 3))); exception when others then sy := 1; end;
      op := jsonb_build_object(
        't','shape','k',k,'c',col,'x',x,'y',y,'s',s,'r',rot,'fill', coalesce((raw->>'fill')::boolean, true),'w',w
      );
      if sx is distinct from 1 then op := op || jsonb_build_object('sx', sx); end if;
      if sy is distinct from 1 then op := op || jsonb_build_object('sy', sy); end if;
      ops := ops || jsonb_build_array(op);
    end if;
  end loop;
  if jsonb_array_length(ops) = 0 then return null; end if;
  o := jsonb_build_object('v', 1, 'ops', ops);
  while pg_column_size(o) > 16000 and jsonb_array_length(ops) > 0 loop
    ops := ops - 0;
    o := jsonb_build_object('v', 1, 'ops', ops);
  end loop;
  if jsonb_array_length(ops) = 0 then return null; end if;
  return o;
end $$;


create or replace function atq_mp.clan_clean_banner(b jsonb) returns jsonb
language plpgsql immutable set search_path = pg_catalog as $$
declare
  shapes text[] := array['standard','swallowtail','gonfalon','shield','pennant','square','rounded','scallop'];
  patterns text[] := array['solid','stripes-h','stripes-v','stripes-d','chevron','split-h','split-v','split-d','cross','saltire','quarters','rays','diamonds','zigzag'];
  emblems text[] := array['skull','bunny','flame','wolf','crown','crossbones','star','hazard','moon','raven','axe','shield','tree','bolt','heart','eye','sun','mountain'];
  trims text[] := array['none','thin','thick','rope'];
  hx text := '^#[0-9a-fA-F]{6}$';
  o jsonb := '{}'::jsonb;
  pick text;
  dr jsonb;
begin
  if b is null or jsonb_typeof(b) <> 'object' then b := '{}'::jsonb; end if;
  if pg_column_size(b) > 16384 then raise exception 'rejected: banner too big' using errcode = '22023'; end if;
  pick := coalesce(b->>'shape','standard'); if not (pick = any (shapes)) then pick := 'standard'; end if; o := o || jsonb_build_object('shape', pick);
  pick := coalesce(b->>'pattern','solid'); if not (pick = any (patterns)) then pick := 'solid'; end if; o := o || jsonb_build_object('pattern', pick);
  pick := coalesce(b->>'emblem','star'); if not (pick = any (emblems)) then pick := 'star'; end if; o := o || jsonb_build_object('emblem', pick);
  pick := coalesce(b->>'trimStyle','thin'); if not (pick = any (trims)) then pick := 'thin'; end if; o := o || jsonb_build_object('trimStyle', pick);
  pick := coalesce(b->>'bg','#1e4d3a'); if pick !~ hx then pick := '#1e4d3a'; end if; o := o || jsonb_build_object('bg', lower(pick));
  pick := coalesce(b->>'bg2','#d9b44a'); if pick !~ hx then pick := '#d9b44a'; end if; o := o || jsonb_build_object('bg2', lower(pick));
  pick := coalesce(b->>'emblemColor','#f4f0e6'); if pick !~ hx then pick := '#f4f0e6'; end if; o := o || jsonb_build_object('emblemColor', lower(pick));
  pick := coalesce(b->>'trim','#d9b44a'); if pick !~ hx then pick := '#d9b44a'; end if; o := o || jsonb_build_object('trim', lower(pick));
  -- optional emblem placement (Draw > Move)
  begin
    if (b ? 'ex') and (b ? 'ey') then
      o := o || jsonb_build_object(
        'ex', least(1, greatest(0, round((b->>'ex')::numeric, 3))),
        'ey', least(1, greatest(0, round((b->>'ey')::numeric, 3)))
      );
    end if;
  exception when others then null;
  end;
  begin
    if (b ? 'er') and ((b->>'er')::numeric is distinct from 0) then
      o := o || jsonb_build_object('er', round((b->>'er')::numeric, 3));
    end if;
  exception when others then null;
  end;
  begin
    if (b ? 'ew') and ((b->>'ew')::numeric is distinct from 1) then
      o := o || jsonb_build_object('ew', least(4, greatest(0.2, round((b->>'ew')::numeric, 3))));
    end if;
  exception when others then null;
  end;
  begin
    if (b ? 'eh') and ((b->>'eh')::numeric is distinct from 1) then
      o := o || jsonb_build_object('eh', least(4, greatest(0.2, round((b->>'eh')::numeric, 3))));
    end if;
  exception when others then null;
  end;
  dr := atq_mp.clan_clean_draw(b->'draw');
  o := o || jsonb_build_object('v', 1);
  if dr is not null then o := o || jsonb_build_object('draw', dr); end if;
  return o;
end $$;
