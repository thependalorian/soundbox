# Device specification and analytics roadmap

> Hardware summary and the planned analytics capability sequence.
>
> Part of the SoundBox documentation set — see [README.md](README.md).

---

## Appendix C: Device Specifications Summary

| Specification | Detail |
|---------------|--------|
| **Processor** | ARM Cortex-M4 |
| **Connectivity** | 4G LTE + 2G fallback |
| **Audio** | 85+ dB speaker |
| **Display** | 1.77" LCD |
| **Battery** | 2000mAh Li-ion |
| **Charging** | USB-C |
| **SIM** | Standard SIM slot |
| **Memory** | 16MB Flash, 2MB RAM |
| **Security** | Secure Element, Tamper Detection |
| **IP Rating** | IP65 (dust/water resistant) |
| **Dimensions** | 85mm x 50mm x 25mm |
| **Weight** | 120g |

---


---

## Appendix D: Predictive Analytics Features Roadmap

| Version | Features | Timeline |
|---------|----------|----------|
| **MVP v1.0** | Real-time anomaly detection, basic health index | Month 6 |
| **v1.1** | Automated PSD-6 reports, PSD-3 compliance dashboard | Month 8 |
| **v1.2** | Merchant churn prediction, geographic heatmaps | Month 10 |
| **v2.0** | Full RegTech platform, BoN integration | Month 12 |
| **v2.1** | Cross-border flow prediction, AML network analysis | Month 15 |
| **v3.0** | AI-powered regulatory recommendations, Sentiment analysis | Month 18 |

---

*This business plan represents a comprehensive roadmap for establishing a SoundBox business and predictive analytics platform in Namibia. The document is intended for internal planning and for discussions with potential investors, partners, and regulators.*

---

## Why the device is necessary at all

The obvious objection is that a phone already shows a payment confirmation.
Two facts defeat it, and the second is the stronger one.

**A notification cannot be heard.** In a market, beside a road, or through a
taxi window, a chime does not arrive. Sound that is designed to carry does.

**Many customers have no confirmation screen to show.** Payments are
initiated through a participant app *or* through **Universal USSD** — a short
code dialled from a basic handset, no app and no data required. That channel
exists precisely to reach people without smartphones, which is a large share
of the population this programme is built for. On that path there is no rich
confirmation screen for a customer to hold up.

So for a significant share of transactions, the seller's own device is not a
convenience over the customer's phone. It is the only evidence available to
them at the moment they must decide whether to hand over goods.

This is also why announcing *pending* matters more than it first appears. A
seller with no other signal has nothing to fall back on when the box is
silent, and silence is indistinguishable from a payment that never happened.
