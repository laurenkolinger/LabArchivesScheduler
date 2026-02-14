# Marine Science Lab Equipment Scheduler

A browser-based equipment reservation system for a university marine science lab. All data is stored in the browser's localStorage and can be exported to CSV for billing.

## Pages

- **`index.html`** — Calendar view showing all reservations by month, with category filters and an equipment directory
- **`reserve.html`** — Reservation form (name, PI, fund number, dates/times, notes)
- **`admin.html`** — Password-protected admin page to view, filter, delete reservations and export CSV

## How to Use

1. Open `index.html` in a browser (no server required — just open the file)
2. Click **Make a Reservation** to book equipment
3. Use **Admin / Export** to download CSV for billing (default password: `marinelab`)

## Equipment (examples — edit `app.js` to customize)

| Name | What It Really Is | Category |
|------|-------------------|----------|
| SS Enterprise | 26ft Boston Whaler | Boat |
| The Black Pearl | 18ft Carolina Skiff | Boat |
| Serenity | 22ft RIB | Boat |
| The Orca | 34ft Research Vessel | Boat |
| The Batcave | Dive Gear Room | Room |
| Room 237 | Wet Lab | Room |
| The Holodeck | Conference Room | Room |
| Mjolnir | Sediment Corer | Tool |
| Sonic Screwdriver | CTD Probe | Tool |
| The Precious | Underwater ROV | Tool |
| The Mystery Machine | Ford Transit Field Van | Vehicle |
| Ecto-1 | F-250 Truck w/ Trailer | Vehicle |

## Customization

All configuration lives in `app.js`:

- **`EQUIPMENT`** array — add, remove, or rename equipment
- **`PI_LIST`** array — update with real PI names
- **`ADMIN_PASSWORD`** in `admin.html` — change before deploying

## Tech Stack

Plain HTML + CSS + vanilla JavaScript. No frameworks, no build step, no server required.