# Buffr Intelligence

A RegTech and SupTech analytics platform for the Bank of Namibia. It reads
transaction-pattern data from Namibia's instant payment rails and turns it
into real-time dashboards, explainable anomaly detection, market-structure and
financial-inclusion measures, and automated regulatory reporting.

**It is an observer, not a participant.** The platform is told the outcome of
payments and analyses them. It cannot start, stop, hold or reverse a payment
and holds no funds at any point — see
[docs/architecture.md](docs/architecture.md) §1.

## Project structure

-   `backend/`: FastAPI services — analytics, oversight, reporting, scoring and
    the natural-language assistant.
    -   `backend/ml/`: offline model training and behavioural segmentation.
    -   `backend/notebooks/`: the anomaly-detection framework end to end,
        runnable, with five classifiers compared and every score explained.
    -   `backend/scripts/`: synthetic data generation for Phase 0 validation.
-   `frontend/`: React console for regulator and administrator roles, plus the
    public site.
    -   `frontend/scripts/`: brand asset derivation. Run it; do not hand-edit
        the outputs.
-   `docs/`: architecture, business plan, privacy, regulatory and design
    documentation.

## Deployment status

- **Frontend**: linked to Vercel project `buffranalytics.com`
  (`frontend/.vercel/project.json`). A preview deploy is live; promoting to
  the production domains (`buffranalytics.com`, `www.buffranalytics.com`) is a
  manual `vercel deploy --prod` (or promote-in-dashboard) once the backend
  below is reachable — the frontend still points `REACT_APP_API_URL` at
  `http://localhost:8000/api/v1` (see `frontend/.env.local`), so a
  production promote before the backend is live only works from a machine
  running the backend locally.
- **Backend**: not deployed yet. Target is Fly.io — the GitHub app (`fly.io
  → thependalorian/soundbox`, working directory `backend`, branch `main`)
  is connected, but the Fly account needs a payment method attached before
  any deploy (including the first one) will run; paused there by choice.
  Once unblocked: `fly deploy` from `backend/`, then `fly secrets set` for
  every value in `backend/.env` (`DATABASE_URL`, `SECRET_KEY`,
  `BOOTSTRAP_ADMIN_EMAIL`/`PASSWORD`, `CORS_ALLOWED_ORIGINS` updated to the
  real frontend origin, `REDIS_URL`, and set
  `ENVIRONMENT=production`), then point `REACT_APP_API_URL` at the Fly
  hostname and redeploy the frontend.
- **DNS**: not configured. Once the backend has a stable Fly hostname, a
  Namecheap CNAME (e.g. `api` → `<app>.fly.dev`) is the remaining step.

## Getting Started

### Backend

1.  Navigate to the `backend` directory.
2.  Install dependencies: `pip install -r requirements.txt`
3.  Copy `.env.example` to `.env` and fill it in — `SECRET_KEY`,
    `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD` (creates the first
    login on an empty database; skipped if either is unset), and
    and `APP_BASE_URL` set to the origin the console is
    served from — it is embedded in password-reset links, and a production
    deploy refuses to start while it still says localhost. `RESEND_API_KEY` /
    `RESEND_FROM_EMAIL` are optional: without them reset mail is skipped and
    logged, and every other flow behaves normally.
4.  Run the migrations: `alembic upgrade head`
5.  Run the server: `uvicorn app.main:app --reload`
6.  Optionally populate a Phase 0 dataset:
    `PYTHONPATH=. python scripts/seed_synthetic.py`. Every row it writes is
    marked synthetic (`SYN-` prefix), so it can never be mistaken for real
    activity, and `--purge` removes exactly what it wrote.

There is no fallback login and no self-service sign-up. Every endpoint —
reads included — requires a real JWT (`POST /api/v1/auth/login`), enforced at
the router rather than per endpoint so a newly added endpoint is protected by
default. Further accounts are created by an administrator; a forgotten
password is recovered by an emailed single-use link. See
[Account lifecycle](#account-lifecycle).

### Workstation setup

Two settings live on your machine rather than in this repository, and neither
is set by cloning it. Both defend against the npm supply-chain attacks of
2025–26, where malicious package versions were live for hours before being
pulled:

```
# Block install-time script execution. preinstall/postinstall hooks are the
# main delivery channel for npm malware. Packages that genuinely need them
# (esbuild, sharp, bcrypt) get rebuilt explicitly:
#   npm rebuild <pkg> --ignore-scripts=false     <- the flag is required
npm config set ignore-scripts true

# A pre-commit scan for known malware indicators, so a poisoned file is
# blocked before it reaches the remote.
git config --global core.hooksPath <path-to-your-hooks-dir>
```

The rest is already enforced in the repository and needs nothing from you:
exact dependency versions with no `^` or `~`, a committed lockfile, and
`npm ci` in the Docker image with the lockfile copied by explicit path rather
than a `package*.json` glob — the glob tolerates a missing lockfile, which is
precisely the failure it looks like it prevents.

**Check your setup:**

```
npm config get ignore-scripts                     # true
git config --global core.hooksPath                # a path, not empty
grep -E '"[^"]+": *"[\^~]' frontend/package.json # no output
ls frontend/package-lock.json                     # present
```

A seven-day cool-down applies to every new dependency version: malicious
releases are usually caught and yanked within 24–72 hours. If something is
genuinely urgent before that, raise it rather than upgrading quietly.

### Notebooks

1.  `pip install -r requirements.txt -r requirements-notebook.txt`
2.  `cd notebooks && jupyter lab anomaly_detection.ipynb`

The notebook runs against whatever is in the database. With the synthetic
seed loaded it reproduces every figure end to end in a few minutes.

### Frontend

1.  Navigate to the `frontend` directory.
2.  Install dependencies: `npm install`
3.  Run the development server: `npm start`

## Running the stack

```
docker compose up -d rabbitmq redis      # broker and cache
cd backend && source venv/bin/activate
uvicorn app.main:app --reload            # API
python -m app.events.consumer            # event worker, separate process
```

The broker and cache are both optional at runtime. With RabbitMQ down,
payments complete and events are dropped (`EVENTS_ENABLED=false` turns
publishing off entirely). With Redis down, every request computes normally.
Neither can break a payment — see [docs/architecture.md](docs/architecture.md).

The RabbitMQ management UI is at `http://localhost:15672` (guest/guest
locally). Queue depth and unroutable counts are the two numbers that say
whether the event layer is working.

## Frontend conventions

- **User-facing copy lives in `src/lib/copy/`**, never hardcoded on a page.
  Much of the public copy states facts about how the national rails work, and
  those have to change in one place when they change.
- **Diagnostics go through `src/lib/logger.ts`**, never raw `console.*`. This
  console can hold payment references and merchant identifiers; a single sink
  is the only place that decision can be made.
- Public pages carry no scheme codes or acronyms. The precise taxonomy is for
  regulatory returns; the public site is read by someone standing at a stall.
- **Rendered copy and code comments use different registers, on purpose.** A
  comment should say "silhouette score" because the next person to change the
  scoring needs that word. The screen should say whether the groups are
  distinct, because that is what the reader needs. Precision in the comment,
  plain language on the screen — never specification language in either.

## Verifying a change

Both scorer tests run against the configured database and clean up the
fixture businesses they create, so they are safe to run repeatedly.

```
cd backend && source venv/bin/activate
python -m py_compile $(find app ml tests -name "*.py")   # syntax
python -m tests.test_weekday_baseline                    # seasonal fairness
python -m tests.test_injection_validation                # detector sensitivity
python -m tests.test_census_figures                      # access denominators
python -m tests.test_namqr_signature                     # real ECDSA sign/verify round-trip
python -m tests.test_soft_delete_filters                 # withdrawn records stay uncounted
```

```
cd frontend
npx tsc --noEmit                                         # types
```

`test_weekday_baseline` proves the same payment volume is judged differently
by weekday — a busy Saturday is not an unusual one. `test_injection_validation`
follows the BIS WP 1188 method: it manipulates copies of real behaviour and
measures whether the scorer separates them. Neither is a fraud detection rate;
no confirmed cases exist, and none is claimed. See `backend/ml/README.md`.

`test_soft_delete_filters` is a structural guard rather than a behavioural
one. Soft deletes are the only deletion this schema has, so a read that
forgets `deleted_at IS NULL` does not lose a record — it keeps counting one
that was withdrawn. That happened across thirty-eight query blocks and put
withdrawn payments into the PSD-6 return; the test reads the source and fails
if any tenant-scoped query omits the filter without a documented reason. See
`docs/architecture.md` §8.4.

## The API surface

- **Resources** (`app/api/resources.py`): businesses, payments, settlements
  and alerts — everything the console reads and writes.
- **Analytics** (`app/api/analytics.py`): aggregates, geographic drill-down,
  and the question-answering endpoint.
- **Oversight** (`/market/*`): concentration (Herfindahl-Hirschman by
  business and region), value distribution, financial-inclusion measures,
  cohort retention, availability with worst-day and worst-hour figures, and
  behavioural segmentation of businesses. These answer what a payment system
  department asks, which is not what an operations desk watches. Mapped to
  the NPS Vision 2030 success indicators in
  [docs/regulatory.md](docs/regulatory.md).
- **Reports** (`app/api/reports.py`): the regulatory returns.
- **Assistant** (`app/api/assistant.py`): the natural-language analytics
  endpoint, tool-calling over the same service methods the dashboards use and
  never raw SQL.
- **Settings** (`app/api/settings.py`): anomaly rule configuration and its
  append-only change history.

Nothing in any of them can initiate, hold or reverse a payment. The system
reads outcomes and analyses them. See
[docs/architecture.md](docs/architecture.md).

## Auth model

One credential, and it never trusts anything the caller merely asserts.

`POST /api/v1/auth/login` (`app/api/auth.py`, `app/core/security.py`)
exchanges a bcrypt-checked password for a signed JWT. Every role-gated
endpoint decodes that token server-side (`app/api/deps.py`'s `require_roles`)
— nothing reads an `X-User-Role` header, because a header is exactly what a
caller can set to whatever it wants.

**Authentication is applied at the router, not per endpoint.** Every
analytics, oversight, reporting, resource and settings router is mounted with
an authentication dependency in `app/main.py`, so an endpoint added to any of
them is protected by default rather than by remembering a decorator.

**Changing a password invalidates every existing session.** A token's `iat`
is compared against `users.password_changed_at` on each request, so
revocation needs no server-side session store.

### Account lifecycle

**Accounts are issued, not requested.** There is no self-service sign-up and
none is planned: on a platform whose purpose is oversight, an account someone
can create for themselves is a defect. The login page has no sign-up link
because there is nothing behind one.

| Flow | Endpoint | Who |
|---|---|---|
| Create an account | `POST /users` | admin |
| List accounts | `GET /users` | admin |
| Assignable roles | `GET /users/roles` | admin |
| Deactivate / reactivate | `PUT /users/{id}/active` | admin |
| Change own password | `POST /auth/change-password` | any signed-in user |
| Request a reset link | `POST /auth/forgot-password` | unauthenticated |
| Set a new password | `POST /auth/reset-password` | unauthenticated, token-bearing |

Roles come from `type_definitions` (domain `user_role`), so adding one is an
INSERT. `users.role` had always carried a comment pointing at that domain,
but the rows were never seeded — the list existed only in the comment.

Access is removed by **deactivating, never deleting**. The row is what makes a
name in a status log still resolve months later; "who approved this business?"
has no answer if the approver's account was erased.

Four properties worth stating because each is load-bearing:

- **A password change ends every other session.** JWTs are stateless and
  cannot be revoked, so every token carries an `iat` and `app/api/deps.py`
  refuses any issued before `users.password_changed_at`. Without this a reset
  would leave a stolen session valid for the rest of its twelve hours —
  through the very reset intended to end it.
- **The reset response never reveals whether an address is registered.**
  `POST /auth/forgot-password` answers identically for a registered address,
  an unregistered one, a deactivated account, and an undeliverable email.
  Anything else turns the form into a way to enumerate who holds an account
  here, and on this platform those are named supervisory staff.
- **Only the hash of a reset token is stored**, the same way a password is.
  The plaintext exists once, in the email. Requesting a second
  reset supersedes the first, so an older link left in an inbox stops working
  rather than widening the window.
- **The first password is shown to the administrator, not emailed.** The mail
  path exists only for resets, where the recipient is already proven to
  control the address. Sending a working credential to an unverified address
  is how accounts reach the wrong person.

Password reset mail goes out through Resend (`app/services/email_service.py`).
A send failure is logged and never surfaced — the caller must not be able to
tell "not sent" from "no such account". `APP_BASE_URL` is the origin embedded
in that link, and `assert_production_ready` refuses to boot if it is still
localhost: a reset link pointing at the recipient's own machine fails in a way
that looks like the email never arrived.

