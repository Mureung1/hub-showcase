create index waiting_entries_expiration_candidates_idx
  on public.waiting_entries (arrival_deadline_at, id)
  where source = 'remote' and status = 'entry_requested';

create index waiting_entries_turn_reached_candidates_idx
  on public.waiting_entries (queue_id, queue_order, id)
  where source = 'remote'
    and status = 'entry_requested'
    and no_show_move_count = 0;
