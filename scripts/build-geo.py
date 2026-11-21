#!/usr/bin/env python3
"""Build src/lib/geo.ts from the GeoNames BD admin dump (/tmp/BD.txt).
Divisions (ADM1) -> districts (ADM2) -> upazilas (ADM3), normalized to
official Bangladeshi spellings, cross-checked against the authoritative
8-division / 64-district list."""
import json, sys
from datetime import date

rows = []
for line in open("/tmp/BD.txt", encoding="utf-8"):
    f = line.rstrip("\n").split("\t")
    if len(f) < 12:
        continue
    rows.append({
        "id": f[0], "name": f[1], "alt": f[2] if len(f) > 2 else "",
        "fclass": f[6], "fcode": f[7], "cc": f[8],
        "admin1": f[10] if len(f) > 10 else "", "admin2": f[11] if len(f) > 11 else "",
    })

def clean(name):
    n = name.replace(" Upazila Parishad", "").replace(" Upazila", "").strip()
    return n

# --- divisions ---
DIV_ALIAS = {"Dhaka Division": "Dhaka", "Chittagong": "Chattogram", "Barisal": "Barishal",
             "Barisal Division": "Barishal", "Khulna Division": "Khulna", "Rajshahi": "Rajshahi",
             "Sylhet Division": "Sylhet", "Rangpur Division": "Rangpur", "Mymensingh Division": "Mymensingh"}
div_by_code = {}
for r in rows:
    if r["fcode"] == "ADM1":
        div_by_code[r["admin1"]] = DIV_ALIAS.get(r["name"], r["name"])

# --- districts ---
DIST_ALIAS = {"Bogra": "Bogura", "Jessore": "Jashore", "Comilla": "Cumilla",
              "Chittagong": "Chattogram", "Barisal": "Barishal", "Dhaka District": "Dhaka",
              "Chapai Nababganj": "Chapainawabganj", "Netrakona": "Netrokona",
              "Kishoregonj": "Kishoreganj", "Maulvibazar": "Moulvibazar",
              "Nilphamari Zila": "Nilphamari", "Lalmonirhat District": "Lalmonirhat"}
districts = {}  # geonameid -> {division, name, upazilas}
dist_by_admin2code = {}  # official admin2 code -> geonameid
for r in rows:
    if r["fcode"] == "ADM2":
        name = DIST_ALIAS.get(r["name"], r["name"])
        div = div_by_code.get(r["admin1"], r["admin1"])
        districts[r["id"]] = {"division": div, "name": name, "upazilas": []}
        dist_by_admin2code[r["admin2"]] = r["id"]

# --- upazilas (ADM3 rows reference the district by its admin2 CODE) ---
for r in rows:
    if r["fcode"] == "ADM3":
        gid = dist_by_admin2code.get(r["admin2"])
        d = districts.get(gid) if gid else None
        if not d:
            continue
        n = clean(r["name"])
        if n and n not in d["upazilas"]:
            d["upazilas"].append(n)

# --- verify ---
EXPECTED = {
    "Dhaka": ["Dhaka","Faridpur","Gazipur","Gopalganj","Kishoreganj","Madaripur","Manikganj","Munshiganj","Narayanganj","Narsingdi","Rajbari","Shariatpur","Tangail"],
    "Chattogram": ["Bandarban","Brahmanbaria","Chandpur","Chattogram","Cumilla","Cox's Bazar","Feni","Khagrachhari","Lakshmipur","Noakhali","Rangamati"],
    "Rajshahi": ["Bogura","Joypurhat","Naogaon","Natore","Chapainawabganj","Pabna","Rajshahi","Sirajganj"],
    "Khulna": ["Bagerhat","Chuadanga","Jashore","Jhenaidah","Khulna","Kushtia","Magura","Meherpur","Narail","Satkhira"],
    "Barishal": ["Barguna","Barishal","Bhola","Jhalokati","Patuakhali","Pirojpur"],
    "Sylhet": ["Habiganj","Moulvibazar","Sunamganj","Sylhet"],
    "Rangpur": ["Dinajpur","Gaibandha","Kurigram","Lalmonirhat","Nilphamari","Panchagarh","Rangpur","Thakurgaon"],
    "Mymensingh": ["Jamalpur","Mymensingh","Netrokona","Sherpur"],
}
by_div = {}
for d in districts.values():
    by_div.setdefault(d["division"], {})[d["name"]] = d["upazilas"]

missing, extra = [], []
for div, dists in EXPECTED.items():
    for di in dists:
        if di not in by_div.get(div, {}):
            missing.append(f"{div}/{di}")
for div, dists in by_div.items():
    for di in dists:
        if div not in EXPECTED or di not in EXPECTED.get(div, []):
            extra.append(f"{div}/{di}")

total_up = sum(len(v) for dv in by_div.values() for v in dv.values())
print(f"divisions={len(by_div)} districts={sum(len(v) for v in by_div.values())} upazilas={total_up}")
print(f"missing={missing}")
print(f"extra={extra}")
if missing:
    sys.exit("ABORT: expected districts missing")

# --- emit TS ---
DIV_BN = {"Dhaka": "ঢাকা", "Chattogram": "চট্টগ্রাম", "Rajshahi": "রাজশাহী", "Khulna": "খুলনা",
          "Barishal": "বরিশাল", "Sylhet": "সিলেট", "Rangpur": "রংপুর", "Mymensingh": "ময়মনসিংহ"}
DISTRICT_BN = {
    "Dhaka":"ঢাকা","Faridpur":"ফরিদপুর","Gazipur":"গাজীপুর","Gopalganj":"গোপালগঞ্জ",
    "Kishoreganj":"কিশোরগঞ্জ","Madaripur":"মাদারীপুর","Manikganj":"মানিকগঞ্জ",
    "Munshiganj":"মুন্সিগঞ্জ","Narayanganj":"নারায়ণগঞ্জ","Narsingdi":"নরসিংদী",
    "Rajbari":"রাজবাড়ী","Shariatpur":"শরীয়তপুর","Tangail":"টাঙ্গাইল",
    "Bandarban":"বান্দরবান","Brahmanbaria":"ব্রাহ্মণবাড়িয়া","Chandpur":"চাঁদপুর",
    "Chattogram":"চট্টগ্রাম","Cumilla":"কুমিল্লা","Cox's Bazar":"কক্সবাজার","Feni":"ফেনী",
    "Khagrachhari":"খাগড়াছড়ি","Lakshmipur":"লক্ষ্মীপুর","Noakhali":"নোয়াখালী","Rangamati":"রাঙ্গামাতি",
    "Bogura":"বগুড়া","Joypurhat":"জয়পুরহাট","Naogaon":"নওগাঁ","Natore":"নাটোর",
    "Chapainawabganj":"চাঁপাইনবাবগঞ্জ","Pabna":"পাবনা","Rajshahi":"রাজশাহী","Sirajganj":"সিরাজগঞ্জ",
    "Bagerhat":"বাগেরহাট","Chuadanga":"চুয়াডাঙ্গা","Jashore":"যশোর","Jhenaidah":"ঝিনাইদহ",
    "Khulna":"খুলনা","Kushtia":"কুষ্টিয়া","Magura":"মাগুরা","Meherpur":"মেহেরপুর",
    "Narail":"নড়াইল","Satkhira":"সাতক্ষীরা","Barguna":"বরগুনা","Barishal":"বরিশাল",
    "Bhola":"ভোলা","Jhalokati":"ঝালকাঠি","Patuakhali":"পটুয়াখালী","Pirojpur":"পিরোজপুর",
    "Habiganj":"হবিগঞ্জ","Moulvibazar":"মৌলভীবাজার","Sunamganj":"সুনামগঞ্জ","Sylhet":"সিলেট",
    "Dinajpur":"দিনাজপুর","Gaibandha":"গাইবান্ধা","Kurigram":"কুড়িগ্রাম","Lalmonirhat":"লালমনিরহাট",
    "Nilphamari":"নীলফামারী","Panchagarh":"পঞ্চগড়","Rangpur":"রংপুর","Thakurgaon":"ঠাকুরগাঁও",
    "Jamalpur":"জামালপুর","Mymensingh":"ময়মনসিংহ","Netrokona":"নেত্রকোণা","Sherpur":"শেরপুর",
}

L = []
L.append("/**")
L.append(" * Bangladesh administrative geography — canonical reference data.")
L.append(" * Source: GeoNames BD administrative dump (ADM1/ADM2/ADM3), normalized to")
L.append(" * official spellings and cross-checked against the authoritative")
L.append(f" * 8-division / 64-district structure (fetched {date.today().isoformat()}).")
L.append(" * Bengali names included for divisions and districts. This is reference")
L.append(" * geography only — it does NOT imply any provider listings exist there.")
L.append(" */")
L.append("")
L.append("export type GeoDivision = {")
L.append("  name: string;")
L.append("  nameBn: string;")
L.append("  districts: GeoDistrict[];")
L.append("};")
L.append("")
L.append("export type GeoDistrict = {")
L.append("  name: string;")
L.append("  nameBn: string;")
L.append("  /** Upazila-level reference names. Provider coverage varies — a listed")
L.append("   * upazila never implies a registered provider works there. */")
L.append("  upazilas: string[];")
L.append("};")
L.append("")
L.append("export const GEO_DIVISIONS: GeoDivision[] = [")
for div in ["Dhaka", "Chattogram", "Rajshahi", "Khulna", "Barishal", "Sylhet", "Rangpur", "Mymensingh"]:
    L.append("  {")
    L.append(f'    name: "{div}",')
    L.append(f'    nameBn: "{DIV_BN[div]}",')
    L.append("    districts: [")
    for di in EXPECTED[div]:
        ups = by_div[div].get(di, [])
        L.append("      {")
        L.append(f'        name: {json.dumps(di, ensure_ascii=False)},')
        L.append(f'        nameBn: "{DISTRICT_BN.get(di, di)}",')
        L.append(f"        upazilas: {json.dumps(ups, ensure_ascii=False)},")
        L.append("      },")
    L.append("    ],")
    L.append("  },")
L.append("];")
L.append("")
L.append("export const ALL_DISTRICTS: string[] = GEO_DIVISIONS.flatMap((d) =>")
L.append("  d.districts.map((x) => x.name)")
L.append(");")
L.append("")
L.append("export function districtToDivision(district: string): string | null {")
L.append("  const div = GEO_DIVISIONS.find((d) =>")
L.append("    d.districts.some((x) => x.name === district)")
L.append("  );")
L.append("  return div ? div.name : null;")
L.append("}")
L.append("")
L.append("export function districtsOf(division: string): GeoDistrict[] {")
L.append("  return GEO_DIVISIONS.find((d) => d.name === division)?.districts ?? [];")
L.append("}")
L.append("")
L.append("export function upazilasOf(district: string): string[] {")
L.append("  for (const div of GEO_DIVISIONS) {")
L.append("    const d = div.districts.find((x) => x.name === district);")
L.append("    if (d) return d.upazilas;")
L.append("  }")
L.append("  return [];")
L.append("}")
L.append("")

open("/home/z/my-project/src/lib/geo.ts", "w", encoding="utf-8").write("\n".join(L) + "\n")
print("WROTE src/lib/geo.ts")
