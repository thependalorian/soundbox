# SoundBox & Predictive Analytics Platform

This repository contains the full source code and documentation for the SoundBox project, a hardware-enabled payment confirmation device and predictive analytics platform for the Namibian market.

## Project Structure

The project is organized into the following directories:

-   `backend/`: Contains the Python FastAPI backend services, including the API for device management, payment processing, and the predictive analytics engine.
-   `firmware/`: Contains the C/C++ source code for the embedded firmware of the SoundBox device.
-   `frontend/`: Contains the React-based web application for the merchant and regulator dashboards.
-   `docs/`: Contains the complete business plan, technical specifications, and other project documentation.

## Getting Started

### Backend

1.  Navigate to the `backend` directory.
2.  Install dependencies: `pip install -r requirements.txt`
3.  Run the server: `uvicorn app.main:app --reload`

### Firmware

1.  Navigate to the `firmware` directory.
2.  Use the provided `Makefile` to build the firmware: `make`

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
