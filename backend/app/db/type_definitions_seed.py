"""
Seed rows for every `type_definitions` domain used by the schema.

Wiebe rule: fixed lists live as data, and adding a new value is an INSERT,
not a migration. This module is the canonical INSERT script — run it once
per organization (idempotent: skips rows that already exist).
"""

import uuid
from typing import Dict, List

from sqlalchemy.orm import Session

from app.db.models import TypeDefinition
from app.db.namibia_geography import (
    NAMIBIA_ADULT_SHARE,
    NAMIBIA_CONSTITUENCIES,
    NAMIBIA_LOCAL_AUTHORITIES,
    NAMIBIA_REGION_POPULATION,
)

# domain -> list of (code, label)
SEED_DATA: Dict[str, List[tuple]] = {
    "device_type": [
        ("soundbox", "SoundBox"),
    ],
    "device_status": [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("offline", "Offline"),
    ],
    # Namibia's 14 administrative regions — backs the "Geographic
    # Distribution" / "Merchant Activity Heatmaps" analytics docs/device.md
    # pitches (§5 Recommended Tech Stack, §2.2 Payment System Health Index).
    "region": [
        # Population comes from NAMIBIA_REGION_POPULATION and is written into
        # each row's config below, so access-per-capita has a denominator and
        # a correction is an UPDATE rather than a release.
        ("erongo", "Erongo"),
        ("hardap", "Hardap"),
        ("karas", "//Karas"),
        ("kavango_east", "Kavango East"),
        ("kavango_west", "Kavango West"),
        ("khomas", "Khomas"),
        ("kunene", "Kunene"),
        ("ohangwena", "Ohangwena"),
        ("omaheke", "Omaheke"),
        ("omusati", "Omusati"),
        ("oshana", "Oshana"),
        ("oshikoto", "Oshikoto"),
        ("otjozondjupa", "Otjozondjupa"),
        ("zambezi", "Zambezi"),
    ],
    # Grounded in docs/business-plan.md (Target Market)
    "merchant_type": [
        ("informal_vendor", "Informal Vendor"),
        ("taxi_driver", "Taxi Driver"),
        ("small_retailer", "Small Retailer"),
        ("fuel_station", "Fuel Station"),
        ("agent", "Cash-in/Cash-out Agent"),
        ("government_service", "Government Service (G2P)"),
    ],
    "merchant_status": [
        ("pending_kyc", "Pending KYC"),
        ("active", "Active"),
        ("suspended", "Suspended"),
        ("closed", "Closed"),
    ],
    "transaction_status": [
        ("pending", "Pending"),
        ("verified", "Verified"),
        ("success", "Success"),
        ("failed", "Failed"),
        ("reversed", "Reversed"),
    ],
    # PSD-6 payment type categories used in docs/regulatory.md
    # WayaMe carries more than merchant payments: person-to-person,
    # government disbursements, business payments, and cash withdrawal from
    # any wallet at any ATM. A sound box sits at a business, so it observes
    # anything credited to that business — not only till payments. Cash
    # agents additionally see wallet cash-out, which is the agent-counter
    # equivalent of an ATM withdrawal.
    # The seven use cases enabled for go-live, per the Bank of Namibia
    # Instant Payment Programme stakeholder pack, plus the three listed as
    # not enabled at launch. Codes follow the programme's own naming: the
    # merchant-facing case is P2B (Person-to-Business), not "p2m" — a
    # regulator reading our returns should not have to translate.
    #
    # `live_at_go_live` in config distinguishes the seven from the three that
    # are tentative. Reporting on a use case the rails do not yet carry would
    # produce a zero that reads as an absence of activity rather than an
    # absence of the capability.
    "payment_type": [
        ("p2p", "Person-to-Person"),
        ("p2b", "Person-to-Business"),
        ("b2p", "Business-to-Person"),
        ("g2p", "Government-to-Person"),
        ("cash_in_merchant", "Cash-in at a merchant"),
        ("cash_out_merchant", "Cash-out at a merchant"),
        ("atm_withdrawal", "ATM withdrawal"),
        # Listed as not enabled for go-live.
        ("p2g", "Person-to-Government"),
        ("b2g", "Business-to-Government"),
        ("b2b", "Business-to-Business"),
    ],
    # How the payer funded it. Wallet and bank account are interoperable on
    # the national rails, and the split matters: wallet-funded payments are
    # the financial-inclusion signal worth reporting on separately.
    "media_type": [
        ("merchant_storefront", "Merchant storefront photo"),
        ("device_photo", "Device photo"),
        ("region_scene", "Region scene"),
    ],
    "payer_instrument": [
        ("bank_account", "Bank account"),
        ("wallet", "Mobile wallet"),
    ],
    "anomaly_risk_level": [
        ("LOW", "Low"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High"),
    ],
    "signal_type": [
        ("suspicious_pattern", "Suspicious Pattern"),
        ("velocity_abuse", "Velocity Abuse"),
        ("amount_anomaly", "Amount Anomaly"),
        ("off_hours", "Off-Hours Transaction"),
        ("device_tamper", "Device Tamper Signal"),
    ],
    "wallet_status": [
        ("active", "Active"),
        ("dormant", "Dormant"),
        ("suspended", "Suspended"),
    ],
    # Who can act against this API. `users.role` has always carried a comment
    # pointing at this domain, but the rows were never seeded — so the list
    # existed only in that comment and in scattered role checks. Seeded now
    # that accounts can be created through the API: the set of roles an
    # administrator may assign has to be data, not a literal in a form.
    "user_role": [
        ("admin", "Administrator"),
        ("regulator", "Regulator"),
        ("merchant", "Business operator"),
    ],
    # Lifecycle of a password reset grant. `superseded` is what happens to an
    # outstanding token when a newer one is issued for the same account —
    # requesting a second reset must invalidate the first, or an old email
    # left in an inbox stays live.
    "password_reset_status": [
        ("issued", "Issued"),
        ("used", "Used"),
        ("expired", "Expired"),
        ("superseded", "Superseded"),
    ],
    # Analytics assistant threads (app/agents, docs/analytics-chat.md).
    "conversation_status": [
        ("active", "Active"),
        ("archived", "Archived"),
    ],
    # Who or what produced a turn. `tool` rows carry the query result the
    # assistant's next sentence was built from, which is what makes an
    # answer traceable back to a number.
    "message_role": [
        ("user", "User"),
        ("assistant", "Assistant"),
        ("tool", "Tool"),
    ],
    "settlement_status": [
        ("pending", "Pending"),
        ("settled", "Settled"),
        ("failed", "Failed"),
    ],
    # PSD-12 incident reporting categories, informed by NIST CSF 2.0's
    # Identify/Protect/Detect/Respond/Recover functions
    "incident_type": [
        ("cybersecurity_breach", "Cybersecurity Breach"),
        ("system_outage", "System Outage"),
        ("data_breach", "Data Breach"),
        ("anomaly_incident", "Anomaly incident"),
        ("connectivity_failure", "Connectivity Failure"),
    ],
    "event_type": [
        ("device_registered", "Device Registered"),
        ("device_heartbeat", "Device Heartbeat"),
        ("payment_received", "Payment Received"),
        ("payment_verified", "Payment Verified"),
        ("anomaly_alert_created", "Anomaly alert raised"),
        ("settlement_processed", "Settlement Processed"),
        ("report_generated", "Regulatory Report Generated"),
    ],
    # Electoral constituencies, config-linked to their parent region — see
    # namibia_geography.py for sourcing (NSA/ECN via Wikipedia).
    "constituency": [
        (code, label, {"region_code": region_code, "seat": seat})
        for region_code, entries in NAMIBIA_CONSTITUENCIES.items()
        for code, label, seat in entries
    ],
    # Cities/towns/villages (MURD's "57 unitary local authorities"),
    # config-linked to their parent region — see namibia_geography.py.
    "local_authority": [
        (code, label, {"region_code": region_code, "authority_type": authority_type})
        for region_code, entries in NAMIBIA_LOCAL_AUTHORITIES.items()
        for code, label, authority_type in entries
    ],
}


def _with_population(domain: str, code: str, config: dict) -> dict:
    """Attach census population to region rows.

    Kept out of the literal table so the geography reference stays the single
    source, and so a region without a recorded population produces a row with
    no population rather than a zero — a zero denominator would make an
    access-per-capita figure infinite rather than absent.
    """
    if domain != "region":
        return config
    population = NAMIBIA_REGION_POPULATION.get(code)
    if population is None:
        return config
    return {
        **config,
        "population": population,
        "adults": int(population * NAMIBIA_ADULT_SHARE),
        "populationSource": "Namibia Population and Housing Census 2023 (NSA)",
    }


def seed_type_definitions(db: Session, organization_id: uuid.UUID) -> int:
    """Insert any missing type_definition rows for the given organization.
    Returns the number of rows inserted. Entries may be (code, label) or
    (code, label, config)."""
    existing = {
        (row.domain, row.code)
        for row in db.query(TypeDefinition.domain, TypeDefinition.code)
        .filter(TypeDefinition.organization_id == organization_id)
        .all()
    }

    inserted = 0
    for domain, entries in SEED_DATA.items():
        for sort_order, entry in enumerate(entries):
            if len(entry) == 3:
                code, label, config = entry
            else:
                code, label = entry
                config = {}
            if (domain, code) in existing:
                continue
            db.add(
                TypeDefinition(
                    id=uuid.uuid4(),
                    organization_id=organization_id,
                    domain=domain,
                    code=code,
                    label=label,
                    config=_with_population(domain, code, config),
                    sort_order=sort_order,
                )
            )
            inserted += 1

    if inserted:
        db.commit()
    return inserted
