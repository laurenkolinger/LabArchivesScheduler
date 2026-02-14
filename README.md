# Marine Science Lab Equipment Scheduler

An equipment reservation system for a university marine science lab. Users with a `@uvi.edu` email can create an account (with email verification), log in, and reserve equipment. Admins can view all reservations and export CSV for billing.

## Pages

- **`index.html`** — Calendar view showing all reservations by month, with category filters and equipment directory (public)
- **`reserve.html`** — Reservation form: name, PI, fund number, dates/times, notes (login required)
- **`admin.html`** — View, filter, delete reservations and export CSV (admin login required)
- **`register.html`** — Create a new account with a `@uvi.edu` email
- **`login.html`** — Log in with email and password

## User Roles

| Role | View Calendar | Make Reservations | Delete / Export |
|------|:---:|:---:|:---:|
| Anyone (no login) | Yes | No | No |
| Registered user | Yes | Yes | No |
| Admin | Yes | Yes | Yes |

- **Anyone with a `@uvi.edu` email** can register (self-service)
- A **verification email** is sent — users must click the link before they can log in
- **Admin** status is determined by the `ADMIN_EMAILS` environment variable

## Local Development Setup

```bash
# 1. Clone and install
cd LabArchivesScheduler
npm install

# 2. Create .env from the template
cp .env.example .env
# Edit .env with your SMTP credentials, session secret, etc.

# 3. Start the server
npm start
# Open http://localhost:8080
```

If SMTP is not configured, verification links are printed to the console instead of emailed (handy for local dev).

## Deploy to Google Cloud App Engine

```bash
# 1. Install gcloud CLI and authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Set environment variables (or edit app.yaml)
gcloud app deploy --set-env-vars="\
SESSION_SECRET=your-random-secret,\
ALLOWED_DOMAIN=uvi.edu,\
ADMIN_EMAILS=admin@uvi.edu,\
SMTP_HOST=smtp.gmail.com,\
SMTP_PORT=587,\
SMTP_USER=your-email@gmail.com,\
SMTP_PASS=your-app-password,\
SMTP_FROM=Marine Science Lab <noreply@uvi.edu>,\
BASE_URL=https://YOUR_PROJECT_ID.appspot.com"

# 3. Open
gcloud app browse
```

### SMTP Setup for Gmail

1. Enable 2-Step Verification on the Google account
2. Go to Google Account > Security > App passwords
3. Generate an app password for "Mail"
4. Use that as `SMTP_PASS` in your environment

## Equipment (examples — edit `public/app.js` to customize)

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

- **Equipment & PIs** — edit the `EQUIPMENT` and `PI_LIST` arrays in `public/app.js`
- **Allowed domain** — set `ALLOWED_DOMAIN` env var (default: `uvi.edu`)
- **Admin emails** — set `ADMIN_EMAILS` env var (comma-separated)

## Project Structure

```
LabArchivesScheduler/
  server.js          # Express backend (auth, reservations API, email verification)
  package.json
  app.yaml           # Google Cloud App Engine config
  .env.example       # Environment variable template
  data/              # JSON file storage (users, reservations)
  public/            # Static frontend files
    index.html       # Calendar
    reserve.html     # Reservation form
    admin.html       # Admin dashboard
    register.html    # Account registration
    login.html       # Login page
    app.js           # Shared frontend logic
    style.css        # Styles
```

## Tech Stack

- **Backend**: Node.js + Express
- **Auth**: bcryptjs password hashing, express-session, nodemailer for email verification
- **Storage**: JSON files (in `data/` directory)
- **Frontend**: Vanilla HTML/CSS/JS
- **Deployment**: Google Cloud App Engine
