# Personal data and consumer protection

> What personal data this system holds, why, for how long, and the standard it is built to.
>
> Part of the SoundBox documentation set — see [README.md](README.md).

---

## 1. The legal position, stated accurately

**Namibia has no enacted data protection law.** The Data Protection Bill was
published in March 2022 and was reported ready for resubmission to cabinet in
January 2026, but it has not been passed and is not in force. Existing
protection comes from sector-specific rules, including banking secrecy
obligations.

That is a reason to build to a higher standard now, not a lower one:

1. **The Bill is drafted along GDPR and POPIA lines.** It is expected to
   establish a supervisory authority and define controller and processor
   obligations. Building to those principles today means the eventual
   compliance exercise is an audit, not a rebuild.
2. **Our counterparty is a central bank subsidiary.** Banking-sector
   confidentiality expectations apply to anything touching payment data
   regardless of whether a general privacy statute exists.
3. **Retrofitting minimisation is expensive.** Deciding not to collect
   something is free. Deleting it from years of backups, logs and derived
   tables is not.

**We therefore treat GDPR/POPIA principles as binding on ourselves, by
choice, ahead of any legal requirement to do so.**

---

## 2. What personal data exists in this system

| Where | Field | Why it is held | Sensitivity |
|---|---|---|---|
| `merchants` | Contact phone, contact email | Operational contact for the business | Business contact, low |
| `merchants` | `lat` / `lng` | The stall location — needed for coverage analysis | Location of a workplace, moderate |
| `beneficial_owners` | Full name, ID number, PEP flag | Ownership transparency obligations | **High — national identifier** |
| `transactions` | `payer_info` (JSONB) | Whatever the rails return about the payer | **High if unminimised** |
| `transactions` | `payee_info` (JSONB) | The receiving business | Business, low |
| `anomaly_alert_status_log` | Reviewer name | Who made a decision, and when | Staff, low |
| `users` | Email, display name | Identifies a person who can act against the API | Staff, low |
| `users` | `password_hash`, `password_changed_at` | Authentication; the timestamp ends stale sessions | Credential, **never readable** |
| `password_reset_tokens` | `token_hash`, `requested_ip` | Proving a reset request, and investigating abuse of it | Credential + network identifier, moderate |
| `conversation_messages` | Question text, tool results | The transcript behind an oversight figure | Staff, low — but see below |

### On the three added since this table was written

**No credential is stored in a readable form.** Passwords are bcrypt hashes,
and a password reset token is stored as a hash too — the plaintext exists once,
in the email that carries it. A database dump therefore does not let anyone log
in or reset an account, which is the entire reason to hash the token rather
than store it.

**`password_reset_tokens.requested_ip` is a network identifier**, held because
an attacker probing for accounts leaves a trail there and a deleted row leaves
none. Reset rows are deliberately retained after use for that reason. It is
never returned by any endpoint and never reaches a browser. It is the one field
added here that a retention policy should eventually age out; there is no sweep
today, and saying so is more useful than implying one exists.

**Assistant transcripts are working notes, not payment records.** They can
quote figures about businesses, so they carry the same tenancy and soft-delete
rules as everything else and are readable only by the account that created
them. `conversation_messages` is immutable by design — an answer acted on has
to be reproducible — which means a correction is a new turn rather than an
edit, and that is a deliberate trade against the ability to redact one.

### The two that matter

**`payer_info` is the real exposure.** It is a free-shaped JSON column on
every transaction row, so without discipline it will accumulate whatever the
integration happens to return — full phone numbers, account numbers, payer
names — multiplied by every payment ever made. The rule is:

> Store a **masked alias** and, where present, a display name. Never a full
> phone number, never a national ID, never an account number.

A sound box needs to announce *an amount*. It does not need to know who paid.
The oversight platform needs *patterns*, which survive masking intact.

**The API never returns `id_number`.** `GET /merchants/{id}` returns
`hasIdOnFile` instead, so the identifier is not sent to a browser, not held
in frontend state, and not present in any client-side cache. A reviewer needs
to know the check was done, not to read the number again. The frontend type
has no field for it, so re-introducing one would not typecheck.

**`beneficial_owners.id_number` is a national identifier** and is the single
most sensitive field in the schema. It is held because ownership
transparency requires identifying a specific person, not a name that could
match thousands. It should be encrypted at rest independently of the
database, and access to it should be logged separately from ordinary reads.

---

## 3. Principles we hold ourselves to

**Minimisation.** Collect what a stated purpose requires. If a field cannot
be tied to a purpose in the table above, it should not be captured.

**Purpose limitation.** Payment data is collected to confirm payments and to
support oversight of the payment system. It is not marketing data. It is not
sold, and it is not shared with third parties for their own purposes.

**Storage limitation.** Transaction records support regulatory reporting and
dispute resolution, so they persist for the retention period the financial
sector requires. `payer_info` does not need that lifetime — payer detail
should be reduced to a masked alias once the dispute window has closed, while
the transaction itself remains for reporting.

**Integrity.** The system is append-only by design: corrections are new rows.
This is a privacy strength as much as an audit one, because it means a
record cannot be altered without leaving a trace of who altered it.

**Accountability.** Every status change records an actor. Every anomaly score
records the model and version that produced it. A person whose payment was
flagged can, in principle, be told why — which is exactly what the
explainable scoring in `architecture.md` exists to make possible.

---

## 4. Automated decisions

GDPR and POPIA both restrict decisions made solely by automated means where
those decisions have a significant effect on someone.

**The system is structurally clear of that restriction**: it cannot decline,
hold or reverse a payment. Scoring raises an alert for a human to review
after the fact. No customer is refused anything by software here.

Beyond that, three properties were built specifically so this stays true:

- Alerts state the reasons that produced them, in the business's own numbers.
- Every score is attributable to a named model and version.
- A reviewer's verdict is recorded, so a human decision is always the one on
  the record.

---

## 5. Sellers are consumers too

Consumer protection is usually framed around the payer. Here the more
vulnerable party is often the **seller** — a market trader with a thin
margin who cannot absorb a disputed sale.

Three product decisions follow from that, and they are protections rather
than features:

- **The device never claims a payment succeeded when it has not.** Silence
  and uncertainty are announced as pending, because a false confirmation
  costs a trader their stock.
- **The same payment is never counted twice**, so a device retrying on a bad
  connection cannot double-charge a customer *or* overstate a seller's
  takings.
- **Being flagged is not being punished.** An alert affects nothing except an
  analyst's queue. A seller keeps trading, keeps being paid, and is never
  cut off by a score.

---

## 6. Outstanding

- Field-level encryption for `beneficial_owners.id_number` at rest. It is
  already withheld from every API response; this is the remaining half.
- A written retention schedule with concrete durations, agreed with counsel
  once the Bill's final text is known.
- A masking routine applied to `payer_info` at ingestion, so minimisation is
  enforced by code rather than convention.
- A subject access process — how a person asks what is held about them, and
  who answers.
- A retention sweep for `password_reset_tokens`. Rows are kept after use on
  purpose — a reset trail is what shows someone probing an account — but the
  `requested_ip` on them is a network identifier with no expiry today.

None of these are blocked by the absence of a law. They are blocked only on
the work being scheduled.
