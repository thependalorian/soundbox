"""
Namibia sub-national geography reference data, for the `type_definitions`
domains `constituency` and `local_authority` (see type_definitions_seed.py).

Sources:
- Constituencies: Wikipedia "List of constituencies of Namibia"
  (https://en.wikipedia.org/wiki/List_of_constituencies_of_Namibia),
  sourced from the Namibia Statistics Agency (NSA) 2023 census and the
  Electoral Commission of Namibia's 2013 delimitation (Proclamation No. 25).
  119 of the officially-cited 121 constituencies are captured here — the
  source table used doesn't resolve the remaining 2 unambiguously. Adding
  them is a follow-up INSERT (Wiebe rule), not a migration or a blocker.
- Local authorities (cities/towns/villages): Wikipedia "List of cities and
  towns in Namibia" and "List of villages and settlements in Namibia"
  (both NSA/MURD-sourced), cross-checked against the Association of Local
  Authorities Namibia (ALAN, alan.org.na) municipalities list. 13 cities +
  26 towns + 18 villages = 57, matching MURD's published "57 unitary local
  authorities" figure.

Namibia's ISO 3166-2 region codes are not used as the `region_code` here;
these codes are this app's own `type_definitions(domain='region')` codes
(see type_definitions_seed.py) — lowercase, underscore-separated.
"""

from typing import Dict, List, Optional, Tuple

# region_code -> [(constituency_code, label, seat_or_None), ...]
# The official number of constituencies, as distinct from how many this file
# happens to list.
#
# **Coverage must be measured against the country, not against our own
# reference table.** Dividing by len(NAMIBIA_CONSTITUENCIES) would report
# "100% of constituencies reached" the moment every constituency we happen to
# know about had a payment in it — which is a statement about this file, not
# about Namibia. Verified against the individual region records: Erongo 7,
# Hardap 8, Kavango East 6, Kavango West 7, Khomas 10, Kunene 7, ǁKaras 7,
# Ohangwena 11, Omaheke 7, Omusati 12, Oshana 11, Oshikoto 11, Otjozondjupa 7,
# Zambezi 8. The two unresolved entries are a follow-up INSERT against the
# Electoral Commission of Namibia's delimitation record, not a blocker.
# Three different counts exist in circulation, and anyone reaching for a
# second source will hit the discrepancy:
#
#   121  the officially cited number, and the denominator used here
#   119  captured in this file (see the note above)
#   107  OCHA/HDX ADM2, the same source the region map geometry comes from
#
# The map deliberately uses OCHA's ADM1 (regions) only. Its ADM2 layer is not
# used anywhere, and should not be adopted as a constituency source without
# first reconciling it against the Electoral Commission's delimitation record.
NAMIBIA_CONSTITUENCY_COUNT_OFFICIAL = 121

# Regions are the top level. Constituencies are electoral subdivisions of a
# region. **Local authorities — cities, towns and villages — are a separate
# classification under the Local Authorities Act, not a subdivision of a
# constituency**, which is why they are a separate mapping below rather than
# a third level of one hierarchy. A constituency may contain a town, share
# one, or contain none.
NAMIBIA_CONSTITUENCIES: Dict[str, List[Tuple[str, str, Optional[str]]]] = {
    "erongo": [
        ("arandis", "Arandis", "Arandis"),
        ("daures", "Dâures", "Uis"),
        ("karibib", "Karibib", "Karibib"),
        ("omaruru", "Omaruru", "Omaruru"),
        ("swakopmund", "Swakopmund", "Swakopmund"),
        ("walvis_bay_rural", "Walvis Bay Rural", "Walvis Bay"),
        ("walvis_bay_urban", "Walvis Bay Urban", "Walvis Bay"),
    ],
    "hardap": [
        ("aranos", "Aranos", "Aranos"),
        ("daweb", "Daweb", "Maltahöhe"),
        ("gibeon", "Gibeon", "Gibeon"),
        ("mariental_rural", "Mariental Rural", "Stampriet"),
        ("mariental_urban", "Mariental Urban", "Mariental"),
        ("rehoboth_rural", "Rehoboth Rural", "Schlip"),
        ("rehoboth_urban_east", "Rehoboth Urban East", "Rehoboth"),
        ("rehoboth_urban_west", "Rehoboth Urban West", "Rehoboth"),
    ],
    "karas": [
        ("berseba", "Berseba", "Berseba"),
        ("karasburg_east", "Karasburg East", "Karasburg"),
        ("karasburg_west", "Karasburg West", "Noordoewer"),
        ("keetmanshoop_rural", "Keetmanshoop Rural", "Aroab"),
        ("keetmanshoop_urban", "Keetmanshoop Urban", "Keetmanshoop"),
        ("nami_nus", "ǃNamiǂNûs", "Lüderitz"),
        ("oranjemund", "Oranjemund", "Oranjemund"),
    ],
    "kavango_east": [
        ("mashare", "Mashare", "Mashare"),
        ("mukwe", "Mukwe", "Mukwe"),
        ("ndiyona", "Ndiyona", "Ndiyona"),
        ("ndonga_linena", "Ndonga Linena", "Ndonga Linena"),
        ("rundu_rural", "Rundu Rural", None),
        ("rundu_urban", "Rundu Urban", "Rundu"),
    ],
    "kavango_west": [
        ("kapako", "Kapako", "Kapako"),
        ("mankumpi", "Mankumpi", "Satotwa"),
        ("mpungu", "Mpungu", "Katwitwi"),
        ("musese", "Musese", "Rupara"),
        ("ncamagoro", "Ncamagoro", "Ncamagoro"),
        ("ncuncuni", "Ncuncuni", None),
        ("nkurenkuru", "Nkurenkuru", "Nkurenkuru"),
    ],
    "khomas": [
        ("john_pandeni", "John Pandeni", None),
        ("katutura_central", "Katutura Central", None),
        ("katutura_east", "Katutura East", None),
        ("khomasdal", "Khomasdal", None),
        ("moses_garoeb", "Moses ǁGaroëb", None),
        ("samora_machel", "Samora Machel", None),
        ("tobias_hainyeko", "Tobias Hainyeko", None),
        ("windhoek_east", "Windhoek East", None),
        ("windhoek_rural", "Windhoek Rural", "Groot Aub"),
        ("windhoek_west", "Windhoek West", None),
    ],
    "kunene": [
        ("epupa", "Epupa", None),
        ("kamanjab", "Kamanjab", "Kamanjab"),
        ("khorixas", "Khorixas", "Khorixas"),
        ("opuwo_rural", "Opuwo Rural", "Otuani"),
        ("opuwo_urban", "Opuwo Urban", "Opuwo"),
        ("outjo", "Outjo", "Outjo"),
        ("sesfontein", "Sesfontein", "Sesfontein"),
    ],
    "ohangwena": [
        ("eenhana", "Eenhana", "Onambutu"),
        ("endola", "Endola", "Oshawapala"),
        ("engela", "Engela", "Oshimwaku"),
        ("epembe", "Epembe", "Epembe"),
        ("ohangwena", "Ohangwena", "Helao Nafidi"),
        ("okongo", "Okongo", "Okongo"),
        ("omulonga", "Omulonga", "Onamukulo"),
        ("omundaungilo", "Omundaungilo", "Omundaungilo"),
        ("ondobe", "Ondobe", "Oshandi"),
        ("ongenga", "Ongenga", "Ongenga"),
        ("oshikango", "Oshikango", "Edundja"),
    ],
    "omaheke": [
        ("aminuis", "Aminuis", "Aminuis"),
        ("epukiro", "Epukiro", "Epukiro"),
        ("gobabis", "Gobabis", "Gobabis"),
        ("kalahari", "Kalahari", "Ben-Hur"),
        ("okorukambe", "Okorukambe", "Witvlei"),
        ("otjinene", "Otjinene", "Otjinene"),
        ("otjombinde", "Otjombinde", "Tallismanus"),
    ],
    "omusati": [
        ("anamulenge", "Anamulenge", "Anamulenge"),
        ("elim", "Elim", "Elim"),
        ("etayi", "Etayi", "Etayi"),
        ("ogongo", "Ogongo", "Ogongo"),
        ("okahao", "Okahao", "Okahao"),
        ("okalongo", "Okalongo", "Okalongo"),
        ("onesi", "Onesi", "Onesi"),
        ("oshikuku", "Oshikuku", "Oshikuku"),
        ("otamanzi", "Otamanzi", "Otamanzi"),
        ("outapi", "Outapi", "Outapi"),
        ("ruacana", "Ruacana", "Ruacana"),
        ("tsandi", "Tsandi", "Tsandi"),
    ],
    "oshana": [
        ("okaku", "Okaku", "Okaku"),
        ("okatana", "Okatana", "Okatana"),
        ("okatyali", "Okatyali", "Okatyali"),
        ("ompundja", "Ompundja", "Enguwantale"),
        ("ondangwa_rural", "Ondangwa Rural", "Eheke"),
        ("ondangwa_urban", "Ondangwa Urban", "Ondangwa"),
        ("ongwediva", "Ongwediva", "Ongwediva"),
        ("oshakati_east", "Oshakati East", "Oshakati"),
        ("oshakati_west", "Oshakati West", "Olupumbu"),
        ("uukwiyu", "Uukwiyu", "Uukwiyu"),
        ("uuvudhiya", "Uuvudhiya", "Engombe"),
    ],
    "oshikoto": [
        ("eengodi", "Eengodi", "Onamishu"),
        ("guinas", "Guinas", "Oshivelo"),
        ("nehale_iyampingana", "Nehale lyaMpingana", "Omboto"),
        ("okankolo", "Okankolo", "Onyuulaye"),
        ("olukonda", "Olukonda", "Olukonda"),
        ("omuntele", "Omuntele", "Omuntele"),
        ("omuthiyagwiipundi", "Omuthiyagwiipundi", None),
        ("onayena", "Onayena", "Onayena"),
        ("oniipa", "Oniipa", "Oniipa"),
        ("onyaanya", "Onyaanya", "Onyaanya"),
        ("tsumeb_constituency", "Tsumeb", None),
    ],
    "otjozondjupa": [
        ("grootfontein", "Grootfontein", "Grootfontein"),
        ("okahandja", "Okahandja", "Okahandja"),
        ("okakarara", "Okakarara", "Okakarara"),
        ("omatako", "Omatako", "Okandjira"),
        ("otavi", "Otavi", "Otavi"),
        ("otjiwarongo", "Otjiwarongo", "Otjiwarongo"),
        ("tsumkwe", "Tsumkwe", "Tsumkwe"),
    ],
    "zambezi": [
        ("judea_lyaboloma", "Judea Lyaboloma", "Sangwali"),
        ("kabbe_north", "Kabbe North", "Kabbe"),
        ("kabbe_south", "Kabbe South", "Nakabolelwa"),
        ("katima_mulilo_rural", "Katima Mulilo Rural", "Bukalo"),
        ("katima_mulilo_urban", "Katima Mulilo Urban", "Katima Mulilo"),
        ("kongola", "Kongola", "Kongola"),
        ("linyanti", "Linyanti", None),
        ("sibbinda", "Sibbinda", "Sibbinda"),
    ],
}

# region_code -> [(local_authority_code, label, authority_type), ...]
# authority_type: city (Part I/II municipality) | town | village
NAMIBIA_LOCAL_AUTHORITIES: Dict[str, List[Tuple[str, str, str]]] = {
    "khomas": [
        ("windhoek", "Windhoek", "city"),
    ],
    "erongo": [
        ("walvis_bay", "Walvis Bay", "city"),
        ("swakopmund", "Swakopmund", "city"),
        ("henties_bay", "Henties Bay", "city"),
        ("omaruru", "Omaruru", "city"),
        ("arandis", "Arandis", "town"),
        ("karibib", "Karibib", "town"),
        ("usakos", "Usakos", "town"),
    ],
    "otjozondjupa": [
        ("otjiwarongo", "Otjiwarongo", "city"),
        ("okahandja", "Okahandja", "city"),
        ("grootfontein", "Grootfontein", "city"),
        ("okakarara", "Okakarara", "town"),
        ("otavi", "Otavi", "town"),
    ],
    "hardap": [
        ("mariental", "Mariental", "city"),
        ("aranos", "Aranos", "town"),
        ("rehoboth", "Rehoboth", "town"),
        ("gibeon", "Gibeon", "village"),
        ("gochas", "Gochas", "village"),
        ("kalkrand", "Kalkrand", "village"),
        ("stampriet", "Stampriet", "village"),
        ("maltahohe", "Maltahöhe", "village"),
    ],
    "kunene": [
        ("outjo", "Outjo", "city"),
        ("khorixas", "Khorixas", "town"),
        ("opuwo", "Opuwo", "town"),
        ("kamanjab", "Kamanjab", "village"),
    ],
    "omaheke": [
        ("gobabis", "Gobabis", "city"),
        ("leonardville", "Leonardville", "village"),
        ("witvlei", "Witvlei", "village"),
        ("otjinene", "Otjinene", "village"),
    ],
    "oshikoto": [
        ("tsumeb", "Tsumeb", "city"),
        ("omuthiya", "Omuthiya", "town"),
        ("oniipa", "Oniipa", "town"),
    ],
    "karas": [
        ("keetmanshoop", "Keetmanshoop", "city"),
        ("karasburg", "Karasburg", "town"),
        ("luderitz", "Lüderitz", "town"),
        ("oranjemund", "Oranjemund", "town"),
        ("aroab", "Aroab", "village"),
        ("berseba", "Berseba", "village"),
        ("bethanie", "Bethanie", "village"),
        ("koes", "Koës", "village"),
        ("tses", "Tses", "village"),
    ],
    "kavango_east": [
        ("rundu", "Rundu", "town"),
        ("divundu", "Divundu", "village"),
    ],
    "kavango_west": [
        ("nkurenkuru", "Nkurenkuru", "town"),
    ],
    "ohangwena": [
        ("eenhana", "Eenhana", "town"),
        ("helao_nafidi", "Helao Nafidi", "town"),
        ("okongo", "Okongo", "village"),
    ],
    "omusati": [
        ("okahao", "Okahao", "town"),
        ("oshikuku", "Oshikuku", "town"),
        ("outapi", "Outapi", "town"),
        ("ruacana", "Ruacana", "town"),
        ("tsandi", "Tsandi", "village"),
    ],
    "oshana": [
        ("oshakati", "Oshakati", "town"),
        ("ondangwa", "Ondangwa", "town"),
        ("ongwediva", "Ongwediva", "town"),
    ],
    "zambezi": [
        ("katima_mulilo", "Katima Mulilo", "town"),
        ("bukalo", "Bukalo", "village"),
    ],
}


# Region populations, 2023 Namibia Population and Housing Census (Namibia
# Statistics Agency, main report published 30 October 2024). Held here as
# reference data and written into each `region` type_definition row's config
# at seed time, so a correction is an UPDATE rather than a code change.
#
# These drive access-per-adult measures, the standard way payment system
# access is reported (IMF Financial Access Survey and CPMI convention:
# access points per 10,000 adults). Without a denominator, "142 businesses in
# Khomas" cannot be compared with "31 in Omaheke".
#
# The fourteen figures sum to 3,022,401, which is the published national
# total — checked by tests/test_census_figures.py so a typo in this table
# cannot pass silently into a regulatory return.
NAMIBIA_REGION_POPULATION: Dict[str, int] = {
    "erongo": 240_206,
    "hardap": 106_680,
    "karas": 109_893,
    "kavango_east": 218_421,
    "kavango_west": 123_266,
    "khomas": 494_605,
    "kunene": 120_762,
    "ohangwena": 337_729,
    "omaheke": 102_881,
    "omusati": 316_671,
    "oshana": 230_801,
    "oshikoto": 257_302,
    "otjozondjupa": 220_811,
    "zambezi": 142_373,
}

# Published national total, 2023 census. The table above must reconcile to it.
NAMIBIA_CENSUS_TOTAL = 3_022_401

# Share of the population aged 15 and over, from the 2023 census age
# structure: 15-59 is 56.1% and 60+ is 6.8%.
#
# **15+, not 18+, and deliberately so.** The Global Findex and the IMF
# Financial Access Survey both report financial access on a 15+ basis, so
# this keeps our figures comparable with the ones Namibia already reports
# internationally. An 18+ denominator would need the 15-17 band interpolated
# out of a published aggregate, and an interpolated denominator quietly
# changes every access figure built on it.
#
# Applied uniformly across regions. Namibia's age structure varies — urban
# regions skew older — so this understates adults in Khomas and overstates
# them in Ohangwena. One stated approximation is more honest than fourteen
# invented ones, and the API reports the denominator it used.
NAMIBIA_ADULT_SHARE = 0.629
