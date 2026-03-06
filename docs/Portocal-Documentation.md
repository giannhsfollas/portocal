# Portocal – Frontend and Backend Documentation

This document describes how the Portocal application is structured and how its frontend and backend work. You can export it to PDF using your editor’s “Markdown: Export to PDF” feature or with Pandoc:  
`pandoc docs/Portocal-Documentation.md -o docs/Portocal-Documentation.pdf`

---

## 1. Overview

Portocal is a **per-user school calendar** web application. Each user has their own account (username and password), their own list of classes and teachers, and their own calendar events. Users cannot see or modify other users’ data.

- **Backend:** Flask (Python), SQLite database, session-based authentication.
- **Frontend:** Server-rendered HTML templates plus vanilla JavaScript and CSS. No separate frontend framework.

---

## 2. Backend

### 2.1 Stack

- **Flask** – Web framework (routes, templates, session).
- **Flask-SQLAlchemy** – ORM and database setup.
- **Werkzeug** – Password hashing (`generate_password_hash`, `check_password_hash`).

### 2.2 Project layout

```
app/
  __init__.py     # Creates Flask app, db, loads config, registers blueprints
  config.py       # SECRET_KEY, SQLALCHEMY_DATABASE_URI, etc.
  auth.py         # require_user decorator (returns 401 if not logged in)
  utils.py        # parse_hex_color (validates event color)
  models/
    __init__.py   # User, SchoolClass, Teacher, Event + association tables
  routes/
    __init__.py   # register_blueprints(application)
    auth.py       # login, logout (blueprint "auth")
    main.py       # index page (blueprint "main")
    api.py        # all /api/* endpoints (blueprint "api", url_prefix="/api")
  seed.py         # seed_sample_data(), migrate_add_user_id()
run.py            # Entry point: create_all, migrate, seed, then app.run()
templates/        # login.html, index.html
static/           # app.js, style.css
```

### 2.3 Config

- **app/config.py** – Reads `SECRET_KEY` and `SQLALCHEMY_DATABASE_URI` from the environment (with defaults for development). `SQLALCHEMY_TRACK_MODIFICATIONS` is set to `False`.

### 2.4 Models

- **User** – `id`, `username` (unique), `password_hash`. One user per calendar account.
- **SchoolClass** – `id`, `user_id`, `name`. Unique per user on `(user_id, name)`.
- **Teacher** – `id`, `user_id`, `name`.
- **Event** – `id`, `user_id`, `title`, `event_date`, `description`, `color`. Many-to-many with **SchoolClass** and **Teacher** via association tables `event_classes` and `event_teachers`.

All class/teacher/event data is scoped by `user_id`; the backend never returns or changes another user’s data.

### 2.5 Auth

- **Login:** POST to `/login` with `username` and `password`. If valid, `session["user_id"]` is set and the user is redirected to the index page.
- **Logout:** `/logout` clears the session and redirects to login.
- **Protected routes:** The index page checks for `session["user_id"]` and redirects to login if missing. All API routes use the `@require_user` decorator; if there is no user in session, they return **401 Unauthorized**.

### 2.6 Routes

- **Auth (blueprint `auth`):** `GET/POST /login`, `GET/POST /logout`.
- **Main (blueprint `main`):** `GET /` – calendar index (requires login; passes `username` to the template).
- **API (blueprint `api`, prefix `/api`):**
  - **Classes:** `GET /api/classes`, `POST /api/classes`, `DELETE /api/classes/<id>`
  - **Teachers:** `GET /api/teachers`, `POST /api/teachers`, `DELETE /api/teachers/<id>`
  - **Events:** `GET /api/events?year=&month=`, `POST /api/events`, `GET/PUT/DELETE /api/events/<id>`

All API handlers use `session["user_id"]` to filter and assign data.

### 2.7 DB lifecycle

- **run.py** (or equivalent entry point) runs inside an application context:
  1. `db.create_all()` – create tables if they don’t exist.
  2. Optional migration: add `color` column to `event` if missing.
  3. `migrate_add_user_id()` – for existing DBs without `user_id` on classes/teachers/events: add columns, create a dev user, assign existing rows to that user.
  4. `seed_sample_data()` – ensure users `dev` and `dev2` exist; for user `dev`, create sample classes and teachers if none exist.

---

## 3. Frontend

### 3.1 Templates

- **login.html** – Form with username and password; POST to `auth.login`. Shows an error message if login fails. Displays the app logo as heading.
- **index.html** – Main calendar UI: header (logo, month nav, user dropdown), calendar grid, day panel (selected date and list of events), modals for event create/edit and for “School options” (manage classes and teachers). The user dropdown includes School options, theme toggle, language toggle, and Log out.

Templates use `url_for("auth.login")`, `url_for("auth.logout")`, `url_for("main.index")`, and `url_for("static", ...)` for assets.

### 3.2 Static assets

- **app.js** – Single script that:
  - Keeps state: current year/month, lists of classes and teachers, events grouped by date, current language.
  - Loads translations (EN/EL) and applies them to elements with `data-i18n`.
  - Renders the calendar grid and day panel; loads events and classes/teachers from the API.
  - Handles event modal (view, create, edit, delete), School options modal (add/remove classes and teachers), and user menu (theme, language, logout).
  - On any API response with status **401**, redirects to `/login`.
- **style.css** – Theme variables (light/dark), layout (header, calendar, day panel, modals, forms), and styles for the login page and user dropdown.

### 3.3 Flow

1. User opens the app → if not logged in, server redirects to `/login`.
2. User submits login → server sets session and redirects to `/`.
3. Index page loads → browser runs `app.js`, which fetches `/api/classes` and `/api/teachers`, then `/api/events?year=&month=` for the current month, and renders the calendar and side panel.
4. User actions (change month, select day, add/edit/delete event, open School options, add/remove class or teacher, change theme or language) either call the API or update local state and re-render; 401 responses trigger a redirect to login.

---

## 4. How to generate a PDF

- **VS Code:** Install the “Markdown PDF” (or similar) extension, open `docs/Portocal-Documentation.md`, and use “Markdown: Export to PDF”.
- **Pandoc:**  
  `pandoc docs/Portocal-Documentation.md -o docs/Portocal-Documentation.pdf`
- **Browser:** Open the Markdown file in a viewer that supports export/print to PDF, or render it to HTML first and print to PDF.
