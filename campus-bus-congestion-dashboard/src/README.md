# Source Structure

Campus Flow uses a light Feature-Sliced Design layout.

- `app`: application entry and global composition.
- `screens`: route-level screen composition. This project uses `screens` instead of `pages` because `src/pages` is treated as routes by vinext.
- `widgets`: reusable UI blocks that combine entity data with presentation, such as maps and charts.
- `entities`: domain types and domain logic for campus, stop, and usage data.
- `shared`: app-wide providers and generated static data.

