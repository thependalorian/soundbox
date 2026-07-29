# Fraud anomaly detection — approach

## Current status

**No model is trained, and none can be yet.** The database holds zero
transactions (verified 2026-07-27). Scoring runs entirely on the
rule-based scorer in `app/services/anomaly_scoring.py`, which is fully
functional and fully explainable.

Everything in this directory is built and runnable; it produces a model the
moment real transaction history exists. Nothing here is speculative
scaffolding — `train_anomaly.py` will run today, and will correctly refuse
to write an artifact.

## Why unsupervised

Supervised classification needs labelled outcomes: transactions known
to be fraudulent. We have none, and cannot manufacture them. Training a
classifier on synthetic labels derived from our own rules would produce a
model that has learned the rules — its accuracy score would measure how well
it imitates a heuristic we wrote, not how well it detects fraud. Presenting
that number to a regulator would be misleading.

Anomaly detection sidesteps this. It learns the shape of *normal* activity
and scores deviation from it. No labels required — only enough normal
traffic to characterise "normal."

## Why IsolationForest, and not a sequence model

The obvious reach is an LSTM over each merchant's transaction sequence.
That was considered and rejected:

| Model | Verdict |
|---|---|
| **IsolationForest** | **Chosen.** Purpose-built for tabular anomaly detection, trains on hundreds-to-thousands of rows, no GPU, sub-millisecond inference, tiny artifact. |
| LSTM / sequence autoencoder | Rejected. The temporal signal is already engineered into `velocity_1h` / `velocity_24h` / `velocity_vs_region_median`. An LSTM would rediscover those features from raw sequences, needing far more data and a heavyweight runtime (TensorFlow is ~600 MB in the API image) to reach the same place. |
| One-Class SVM | Rejected. Scales poorly (roughly quadratic in samples) and needs careful kernel tuning for no accuracy gain here. |
| Dense autoencoder | Rejected for now. Viable at much larger data volumes; revisit if IsolationForest plateaus. |

The decision rests on the fact that **feature engineering already captures
the time dimension**. If that stops being true — for example if per-session
or per-device event ordering becomes important — the choice should be
revisited.

## Why geography is a feature, not just a report dimension

This is the part that makes the model useful in Namibia specifically.

A model trained on absolute features learns the national distribution, which
is dominated by Khomas (Windhoek). It would then flag ordinary rural activity
as anomalous simply for being small and infrequent — turning a fraud tool
into a tool that penalises exactly the merchants the Instant Payment
Programme exists to bring into the formal economy.

So three features are **peer-relative**, comparing each merchant against
others in the same region:

- `amount_vs_region_median` — is this ticket unusual *for this region*?
- `velocity_vs_region_median` — is this trading pace unusual *for this region*?
- `merchant_region_volume_share` — how much of the region's volume flows
  through this one merchant? A single merchant dominating a rural region is
  a genuine money-mule signal.

Medians, not means: regional transaction distributions are heavily
right-skewed, and one large settlement would drag a mean far enough to mask
the anomalies being looked for.

Geography reaches the model through the **merchant**, not the transaction —
transactions carry no location of their own. `merchants.region_id`,
`constituency_id`, `local_authority_id`, `lat`, `lng` are populated by the
geography work in changelog 1.3.0 (119/121 constituencies, 57/57 local
authorities).

## How this ties into heatmaps and reporting

One anomaly signal feeds three surfaces:

```
transaction ──> anomaly score ──> anomaly_alerts.expected_loss
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             v                          v                          v
     triage queue                  coverage map              regulatory
   (sorted by exposure)        (weighted by exposure)         reporting
```

1. **Triage queue** (`FlaggedPage`) — sorted by `expected_loss`
   (`probability x amount`), not probability. A 40% alert on N$50,000
   outranks a 95% alert on N$500, because the first risks N$20,000 and the
   second risks N$475. This is the expected-value framing from Provost &
   Fawcett, *Data Science for Business*, Ch 7.

2. **Coverage map** (`/map`, `get_geo_distribution`) — now returns
   `expectedLoss` and `openAlertCount` per merchant alongside the existing
   counts. Weighting the heat layer by transaction count only reproduces a
   population map: Windhoek glows because Windhoek is busy, which tells an
   analyst nothing they did not know. Weighting by exposure shows where
   money is actually at risk. The two views answer different questions and
   both are worth keeping.

3. **Regulatory reporting** — regional exposure aggregates are the natural
   basis for a risk annex to the PSD-6 operator return, and the same geo
   join surfaces coverage gaps (a region with zero active merchants is a
   financial-inclusion finding, not a data error).

## Training

```bash
cd backend && source venv/bin/activate
python -m ml.train_anomaly
```

Refuses to write a production artifact below `MIN_TRANSACTIONS` (2,000).
`--force` produces a `-experimental` artifact that the serving layer
deliberately **will not load** — it exists for offline evaluation only.

Output: `ml/artifacts/anomaly_isolation_forest.joblib`, containing the
fitted model, the feature-name contract, training row count, and the score
distribution used to normalise raw scores into 0-1.

`contamination` is set to 0.01 — deliberately conservative. Every flagged
transaction costs analyst attention, and an alert queue nobody can work
through is the most common way anomaly tooling fails in practice.

### On the 2,000 threshold

It is a working floor, not a guarantee. Once real data exists, set the real
threshold empirically: train on increasing subsets and watch when the set of
flagged transactions stabilises between runs. Instability means the model is
still fitting noise.

## Serving

`app/services/anomaly_detection.py` loads the artifact once, caches it, and
returns `None` for every call when no artifact exists. Callers must treat
`None` as *no signal*, never as *not anomalous*.

When a model is loaded, its output enters `predict()` as one more reason
alongside the rules, contributing 0.2. It can raise a score but never
becomes the sole justification for an alert — the rule reasons remain what an
analyst reads. `is_available()` / `describe()` let the UI state honestly
whether scoring is rule-based or model-assisted.

## Feature contract

`FEATURE_NAMES` in `features.py` is the contract between training and
inference. Appending is safe. **Reordering or removing invalidates every
previously trained artifact** and requires a new model version.

## Resolved: velocity is now judged against a seasonal baseline

**This was fixed in scorer version 1.1.0.** The description below is kept
because it explains why the current design looks the way it does.

The velocity rules used to fire on **absolute** thresholds — more than 10
payments in an hour, more than 50 in a day. Payment activity is strongly seasonal:
market vendors and taxis are busiest at weekends, government disbursement
points are dead at weekends and spike at month-end.

An absolute threshold therefore flags *busy trading*, not *unusual trading*.
The systematic consequence is a bias: the segments with the sharpest weekly
cycle — informal vendors, taxi drivers, agents — get flagged more often for
doing exactly what they normally do on a Saturday. That is the opposite of
what an anomaly detector is for.

The fix is a **per-merchant, per-day-of-week baseline**: compare Saturday
against that merchant's other Saturdays, not against its weekly mean. In
time-series terms the series has to be deseasonalised before a deviation
means anything (Mukhopadhyay, *Advanced Data Analytics Using Python*, ch. 6
— trend, seasonality, and differencing to stationarity).

Two related notes:

- The **7-day-over-7-day** comparison used on the dashboard is sound as it
  stands, because each 7-day block contains exactly one of each weekday.
  Day-of-week seasonality cancels. A 5-day or 10-day window would not have
  that property.
- The `IsolationForest` features inherit the same problem: `velocity_24h` is
  an absolute count. When the model is finally trained, the velocity features
  should be expressed as ratios against the merchant's own same-weekday
  history rather than as raw counts.

### What the fix actually does

`_weekday_baseline` takes the **median** daily count for that merchant on
that weekday over 12 weeks; `_weekday_hourly_baseline` takes the **90th
percentile** hourly count for the same weekday — the question there is what
a normal *peak* looks like, not a normal hour, since most trading hours are
quiet and comparing a rush against them would flag every rush.

A merchant with fewer than four observations of a weekday has no baseline.
That returns `None`, which callers treat as *no opinion* rather than
*normal*: the scorer then fires only on volume too extreme to be ordinary
for any small business, and says openly that it is judging without history.

Verified by `tests/test_weekday_baseline.py`, which seeds a merchant with a
real weekly cycle (40 payments on Saturdays, 10 on weekdays) and asserts
that **the same 60 payments are ordinary on a Saturday and anomalous on a
Tuesday**. The old rule could not tell those apart.

Writing that test found two further defects, both now fixed:

- Velocity was measured from `utcnow()` rather than from the timestamp of
  the transaction being scored, so any replay, backfill or batch rescoring
  measured the wrong window.
- The velocity query filtered by merchant but not by organisation, unlike
  every other query in the file. No tenant boundary should rest on id
  uniqueness.

The ML feature contract changed alongside: `velocity_1h` / `velocity_24h`
became `velocity_1h_vs_weekday_peak` / `velocity_24h_vs_weekday_norm`. Raw
counts would have taught a model the same seasonal bias, except baked into
weights where nobody can read it rather than into a threshold anyone can.

## Validating without confirmed cases

An earlier version of this document said accuracy could not be measured at
all until confirmed outcomes existed. That was too strong, and the better
approach comes from the central banking literature.

**BIS Working Paper 1188** — Desai, Kosse & Sharples, *Finding a Needle in a
Haystack: A Machine Learning Framework for Anomaly Detection in Payment
Systems* (May 2024) — addresses precisely this position, naming "the scarcity
of anomalies and the absence of pre-identified examples" as the primary
obstacle for payment system operators. Their resolution is to validate
against **artificially manipulated transactions**: generate real behaviour,
manipulate copies of it, and measure whether the detector separates the two.
On Canadian HVPS data their isolation forest scored manipulated transactions
roughly twice as anomalous as the originals.

The distinction that keeps this honest: nothing is *trained* on synthetic
labels, which would be circular. The detector is asked whether it can tell
manipulated payments from real ones — a measure of **sensitivity**, which is
a different and answerable question from "how much fraud is there".

`tests/test_injection_validation.py` implements this. Current result:

| Manipulation | Score | Represents |
|---|---|---|
| Amount inflated 8x | 0.20 | a compromised terminal pushing value through |
| Volume burst | 0.80 | an account drained by rapid repeat payments |
| Outside trading hours | 0.10 | activity while the business is closed |
| Duplicate amount | 0.70 | the same payment submitted twice |
| **Ordinary trading** | **0.00** | eight probes across normal hours |

Ordinary trading scores zero, so separation is absolute rather than a ratio.
Every manipulation the scorer was designed to notice is noticed, and normal
activity stays silent.

This is a sensitivity result, not a detection rate. A detection rate needs
confirmed outcomes, and the reviewer verdict path is what will produce them.

## Rules the scorer applies

Every rule below is a configuration row, not a constant: `enabled`,
`contribution`, and a bounded `threshold` are set per deployment and every
change is recorded in `anomaly_rule_config_log`. Scores carry a fingerprint
of the configuration that produced them, so an alert stays interpretable
after the policy moves. See `app/services/anomaly_rule_config.py`.


Beyond velocity, two rules come from commercial practice — Nomentia's
payment anomaly product puts erroneous and duplicate payments *ahead of*
fraud by loss volume, noting that recovering the money afterwards costs more
than catching it:

- **Possible duplicate** — the same amount to the same business within ten
  minutes. Distinct from protocol idempotency, which catches the same
  reference reported twice; this catches a genuine double payment.
- **First payment from a payer** — ordinary at a market stall, notable at a
  business trading with a settled set of suppliers. Weighted lightly alone.

BIS 1188 also names the limitation of any rule set, including this one:
rules "require prior assumptions about how anomalous payments would look",
and those assumptions "may not cover all forms of anomalies, as it is
impossible to anticipate all potential scenarios". That is the argument for
the unsupervised layer, and the reason the rules are transparent rather than
trusted.

## Where this design already agrees with the literature

- **Central observation beats per-participant.** BIS 1188 notes that tools
  run by individual participants "only capture transactions to and from that
  particular participant, which limits their utility for system-wide
  monitoring". Our position is the system-wide one.
- **Observe without intercepting.** Vyntra's transaction-monitoring guidance
  recommends operating "alongside existing systems ... without intercepting
  live payments". That is our architecture exactly, and for us it is
  structural rather than a choice.
- **Layered detection.** BIS separates typical from unusual first, then runs
  only the unusual through unsupervised detection. Ours is the same shape
  with a transparent rule layer first — which additionally means every alert
  arrives with a readable reason.

## What is deliberately not done

- **No synthetic fraud labels.** See "Why unsupervised."
- **No accuracy/precision/recall claims.** Without labelled outcomes there is
  no ground truth to measure against. Anomaly rate and flagged-volume are
  reportable; detection accuracy is not.
- **No blocking, by construction.** This system observes the payment rail; it
  does not sit in it. There is no code path that can hold, reverse or refuse a
  payment, so a scoring bug can produce a bad alert but never a declined
  payment. Alerts are raised after the fact, for a human to judge.

## Path to a supervised model

Analyst Confirm / Reject decisions on alerts are recorded in
`anomaly_alert_status_log`. Those accumulate into the labelled dataset that
does not exist today. Once there are enough confirmed and rejected alerts, a
supervised classifier becomes trainable and can be evaluated honestly — at
which point the anomaly score becomes one input feature to it rather than a
standalone signal.

---

## Segmentation is a different job from scoring

`ml/segmentation.py` clusters merchants; `app/services/anomaly_scoring.py`
scores payments. They are often conflated and should not be:

| | Anomaly scoring | Segmentation |
|---|---|---|
| Question | Is this payment unlike this business's own past? | Which businesses behave alike? |
| Method | Rules now, IsolationForest when data allows | K-means on behavioural aggregates |
| Output | A score and the reasons behind it | Groups, with a measure of how well they separate |
| Needs labels | No | No |

An isolation forest finds outliers. It does not produce groups, so it cannot
answer "what kinds of merchant are on these rails" — which is the question a
regulator asks first.

**k is chosen, not assumed.** Silhouette score across k=2..7 picks the number
of segments. Silhouette asks whether points sit closer to their own cluster
than to the next nearest, which measures whether the grouping is real rather
than whether the algorithm converged. It is reported alongside the segments
because a reader entitled to the groups is entitled to know how separated
they are.

**Features are scale-free where possible.** Shares and coefficients of
variation rather than raw totals, so a segment describes how a business
trades rather than how big it is. Value is log-transformed: on these rails it
spans orders of magnitude, and untransformed amounts would let one large
merchant dominate every distance calculation.

**Standardisation is required, not cosmetic.** K-means uses Euclidean
distance, so without it `payments_per_active_day` (tens) would overwhelm
`weekend_share` (a fraction) and the result would be a single-feature sort.

**It refuses below 30 merchants** with 20 payments each, the same discipline
as the anomaly trainer. Merchants under the floor are excluded rather than
padded with zeros — a zero row is an absence of evidence, not a quiet
business, and k-means would cluster those absences together and the result
would read as a discovered segment.

## What segmentation makes possible

1. **Peer comparison that means something.** "Unusual versus regional peers"
   currently compares a market stall to every business in the region,
   including fuel stations. Feeding segment membership into the peer-relative
   features is the next step.
2. **A picture of the market for oversight.** Behaviour is more honest than
   the merchant-type field somebody typed at onboarding, and it updates
   itself.
3. **Coverage gaps by segment.** That high-frequency low-value traders are
   absent from a region says something a headcount does not.
