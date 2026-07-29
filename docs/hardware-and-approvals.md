# Hardware, suppliers and approvals

> What the device is, who can build it, and what has to be approved before one can legally be imported.
>
> Part of the SoundBox documentation set — see [README.md](README.md).

---

## 1. CRAN type approval — a hard gate before import

**This blocks importation, not sale.** A device cannot legally enter Namibia
without it, which puts it on the critical path ahead of any pilot, any
distribution agreement, and any manufacturing order.

| | |
|---|---|
| Authority | Communications Regulatory Authority of Namibia (CRAN) |
| Applies to | Any equipment that transmits, receives or uses radio frequencies and connects to an electronic communications network. A cellular sound box is squarely in scope. |
| When | **Certificate must be obtained *prior* to importation** |
| Stated processing time | 40 days per the Type Approval Regulation |
| Validity | 3 years, then renewal |
| Who may apply | Manufacturers, importers, distributors and individuals |
| Standards | ISO, IEC and ITU, plus the Namibian Communications Act |
| Contact | Equipment Approval Team, CRAN — +264 61 222 666, [cran.na](https://www.cran.na/) |

### Consequences for planning

1. **Order the certificate before the hardware.** A 40-day statutory clock
   that starts only once a final device exists will otherwise sit directly on
   the critical path before a pilot can begin.
2. **Certify the exact variant you will ship.** Type approval attaches to a
   device configuration. Changing radio module, antenna or SoC late means
   re-approval, so the 2G/4G decision must be settled first.
3. **A supplier who has certified elsewhere has done most of the work.**
   Existing ISO/IEC/ITU test reports from an established ODM shorten the
   evidence pack considerably. This is a question to ask suppliers early.
4. **Renewal is a standing obligation.** Three years is short relative to a
   hardware lifecycle; a device deployed in year one needs recertification
   while still in the field.

---

## 2. Reference implementation — what has already been proven

Namibia's WayaMe platform is built on technology licensed from NPCI
International, so the Indian sound box deployments run on rails closely
related to ours. They are the only proven implementation of this product
category at scale, which makes them worth copying closely — while
remembering that what we ship is a Namibian device on WayaMe, certified by
CRAN and answerable to the Bank of Namibia.

| Aspect | What they did | What it implies for us |
|---|---|---|
| **SoC** | MediaTek MT6261 — a low-cost SoC built for IoT, not a smartphone chip | The bill of materials can be genuinely low. This is not a tablet with a speaker. |
| **Connectivity** | Dedicated SIM, permanently connected; 2G/4G/Wi-Fi variants exist across manufacturers | 2G is not a legacy concern, it is the rural last mile |
| **Delivery** | Push over MQTT or WebSocket for low latency on weak networks | Design for push from the start, and raise it early with IPN — the integration contract has to support it. See `architecture.md` §2 |
| **Audio** | Pre-recorded clips in NOR flash, concatenated at playback: *"You have received"* + *"forty five dollars fifty"* | Multilingual without a speech engine. This is the single most useful implementation detail found. |
| **QR** | Static code mapped to the merchant, printed | Maps directly onto NAMQR: one printed sticker carrying the seller's payment alias, valid across every participating bank |
| **Scale** | 20 million+ devices | The backend must be idempotent by design, not by patch |

### Why the audio approach matters most

On-device text-to-speech on a cheap SoC is hard, and cloud speech needs
bandwidth precisely where there is none. Concatenating short recorded clips
sidesteps both. Adding a language becomes a recording session and a flash
image — not an engineering project.

Namibia has around thirteen recognised languages. **Oshiwambo dialects are
spoken in roughly 49% of households and Khoekhoegowab in about 11%.** English
is the official language but the first language of very few. An English-only
device is therefore not a soft limitation — it is a decision to exclude most
of the target market.

### The finding that settles the approach

**No major text-to-speech platform supports Oshiwambo, Oshindonga or
Khoekhoegowab.** They are low-resource languages absent from Amazon Polly,
Google, Speechify and the rest; published TTS research for African languages
has concentrated on Luganda, Swahili and Kinyarwanda. Afrikaans is the
exception — `af-ZA` neural voices are now audiobook-grade.

So for roughly **60% of Namibian households, synthesised speech is not an
option at any price.** Recorded human clips are not merely the cheaper path,
they are the only path. That inverts how this normally looks:

| | Cloud/on-device TTS | Recorded clips |
|---|---|---|
| English, Afrikaans | Works well | Works well |
| Oshiwambo, Khoekhoegowab | **Does not exist** | Works — record a speaker |
| Cost per language | Per-request or licence | One recording session |
| Works on 2G | Needs bandwidth | Already on the device |
| Voice quality | Good | As good as the person hired |

A competitor building on cloud TTS cannot serve half of Namibia. Choosing
recordings turns an apparent constraint into the thing that makes the
product work here — and the recordings can be made once, by a native
speaker, and shipped in flash.

### Practical note on producing the clips

Afrikaans and English clips can be generated with a high-quality neural
voice offline and shipped as audio, which keeps the voice consistent and
avoids studio cost. Oshiwambo and Khoekhoegowab need a native speaker in a
room with a microphone. Budget for that explicitly; it is a small,
one-off cost that decides whether half the market can use the product.

---

## 3. Candidate suppliers

| Supplier | Standing | Relevance |
|---|---|---|
| **CWD Limited** (India) | 14M+ devices deployed; ₹100 crore PhonePe contract | Offers 2G / 4G / Wi-Fi variants and states audio confirmation can be customised into multiple languages of choice. The closest match to our requirements as stated. |
| **Oakter** (India) | ODM behind Paytm's devices; 20M+ units since 2022 | Deepest experience with the exact product. ODM relationship rather than off-the-shelf. |
| **iServeU** (India, with PAX) | All-in-one soundbox terminal — QR, NFC, EMV | More capability than we need today; relevant only if card acceptance is ever added. |
| **EazyPay Tech** | Markets a QR soundbox for African markets | Already oriented to this continent; worth asking whether they have certified in any SADC market, since that shortens the CRAN evidence pack. |

### Questions to put to any supplier

1. Which radio variants are available, and is 2G fallback native or an option?
2. Do you hold ISO/IEC/ITU test reports we can reuse for CRAN?
3. Is announcement audio replaceable by us — can we supply Oshiwambo,
   Khoekhoegowab and Afrikaans recordings, and how are clips packaged?
4. Is delivery push-based (MQTT/WebSocket), and can it point at our broker
   rather than a fixed vendor endpoint?
5. What ingress protection rating? A market stall is dust, sun and rain.
6. Battery life on a full trading day without mains power?
7. Minimum order quantity, unit cost at volume, and lead time to Windhoek?

---

## 4. Sequenced approvals

Ordered by what blocks what, rather than by importance:

1. **Settle the device variant** — radio generations, SoC, audio storage.
   Everything downstream attaches to this decision.
2. **CRAN type approval** — 40 days statutory, before import. Start as soon
   as the variant is fixed.
3. **WayaMe integration approval** — the technical engagement with Instant
   Payment Namibia, including certification against NAMQR and agreement on
   push delivery.
4. **Bank of Namibia engagement** — narrower than it would otherwise be,
   because the system holds no money and moves none. See `architecture.md` §1.
5. **Independent security review** — before live payment traffic.

Items 2 and 3 can run in parallel; neither depends on the other.
