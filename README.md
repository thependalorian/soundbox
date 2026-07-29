# SoundBox & Predictive Analytics Platform

This repository contains the full source code and documentation for the SoundBox project, a hardware-enabled payment confirmation device and predictive analytics platform for the Namibian market.

## Project Structure

The project is organized into the following directories:

-   `backend/`: Contains the Python FastAPI backend services, including the API for device management, payment processing, and the predictive analytics engine.
-   `firmware/`: Contains the C/C++ source code for the embedded firmware of the SoundBox device.
-   `frontend/`: Contains the React-based web application for the merchant and regulator dashboards.
-   `docs/`: Contains the complete business plan, technical specifications, and other project documentation.

## Deployment status

- **Frontend**: linked to Vercel project `justasoundbox.com`
  (`frontend/.vercel/project.json`). A preview deploy is live; promoting to
  the production domains (`justasoundbox.com`, `www.justasoundbox.com`) is a
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
  real frontend origin, `NAMQR_ORG_PUBLIC_KEY_PEM`, `REDIS_URL`, and set
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
    `NAMQR_ORG_PUBLIC_KEY_PEM` if you want signed-QR verification to have
    something to verify against (`backend/scripts/generate_namqr_keypair.py`
    generates a keypair). Set `APP_BASE_URL` to the origin the console is
    served from — it is embedded in password-reset links, and a production
    deploy refuses to start while it still says localhost. `RESEND_API_KEY` /
    `RESEND_FROM_EMAIL` are optional: without them reset mail is skipped and
    logged, and every other flow behaves normally.
4.  Run the migrations: `alembic upgrade head`
5.  Run the server: `uvicorn app.main:app --reload`

There is no fallback login and no self-service sign-up. Every write endpoint
requires a real JWT (`POST /api/v1/auth/login`) or, for the device-facing
endpoints, a provisioned device key (`X-Device-Code` / `X-Device-Key`, issued
once by `POST /api/v1/devices` — see
[docs/architecture.md](docs/architecture.md)). Further accounts are created by
an administrator; a forgotten password is recovered by an emailed single-use
link. See [Account lifecycle](#account-lifecycle).

### Firmware

1.  Navigate to the `firmware` directory.
2.  Install mbedTLS (`brew install mbedtls` / `apt-get install
    libmbedtls-dev`) — the NAMQR signed-QR verification in `security.c` links
    it for real ECDSA P-256/SHA-256, not a stub.
3.  Use the provided `Makefile` to build the firmware: `make`

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

- **Device-facing**: register, heartbeat, verify a payment. The only paths the
  hardware uses.
- **Resources** (`app/api/resources.py`): devices, businesses, payments and
  alerts — everything the console reads and writes.
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
- **Settings** (`app/api/settings.py`): anomaly rule configuration and its
  change history.

Nothing in any of them can initiate, hold or reverse a payment. The system
reads outcomes and announces them. See [docs/architecture.md](docs/architecture.md).

## Auth model

Two independent credentials, neither trusting anything the caller merely
asserts:

- **People** (`app/api/auth.py`, `app/core/security.py`): `POST
  /api/v1/auth/login` exchanges a bcrypt-checked password for a signed JWT.
  Every role-gated endpoint decodes that token server-side
  (`app/api/deps.py`'s `require_roles`) — nothing reads an `X-User-Role`
  header, because a header is exactly what a caller can set to whatever it
  wants.
- **Devices** (`app/api/deps.py`'s `get_authenticated_device`): a SoundBox
  unit proves itself with a per-device secret, bcrypt-hashed at rest and
  issued exactly once (in the response of `POST /api/v1/devices`), sent as
  `X-Device-Code` / `X-Device-Key` on `/devices/register`,
  `/devices/heartbeat`, `/payments/verify` and `/payments/process_qr`.

NAMQR QR codes (`app/services/namqr_processor.py`) are ECDSA P-256/SHA-256
verified per Bank of Namibia NAMQR Code Standards v5.0 Annexure I — CRC
alone is integrity, not authenticity, and only the signature check proves a
QR came from the merchant it claims to.

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
  here, and on this platform those are named regulators and businesses.
- **Only the hash of a reset token is stored**, the same way a device
  credential is. The plaintext exists once, in the email. Requesting a second
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

Generate the fallback NAMQR org keypair with
`PYTHONPATH=. python scripts/generate_namqr_keypair.py`. Only the public half
belongs in `.env` — nothing in this service signs, so it never needs the
private one.
