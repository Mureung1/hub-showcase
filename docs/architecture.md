# Photo Navigation Architecture

## Development Structure

```text
apps/web  -> React user interface
apps/api  -> Express API server
Supabase  -> shooting-plan data storage
```

## Next Vertical Slice

```text
React frame selection
-> POST /shoot-plans
-> Express validation
-> Supabase shoot_plans
-> GET /shoot-plans
-> saved-plan list UI
```

The map, camera overlay, and image similarity features remain outside the first vertical slice.
