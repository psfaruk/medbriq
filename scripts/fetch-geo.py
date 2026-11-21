#!/usr/bin/env python3
"""Fetch Bangladesh admin areas (divisions -> districts -> upazilas) from
Wikipedia 'List of upazilas in Bangladesh' and emit src/lib/geo.ts."""
import urllib.request, json, re, sys

URL = "https://en.wikipedia.org/w/api.php?action=parse&page=List_of_upazilas_in_Bangladesh&format=json&prop=wikitext"
UA = {"User-Agent": "MedBricBD-build/1.0 (education platform; contact: dev@example.invalid)"}

req = urllib.request.Request(URL, headers=UA)
html = urllib.request.urlopen(req, timeout=60).read().decode("utf-8")
data = json.loads(html)
wikitext = data["parse"]["wikitext"]["*"]

# Division Bengali names
DIV_BN = {
    "Dhaka": "ঢাকা", "Chattogram": "চট্টগ্রাম", "Chittagong": "চট্টগ্রাম",
    "Rajshahi": "রাজশাহী", "Khulna": "খুলনা", "Barishal": "বরিশাল",
    "Barisal": "বরিশাল", "Sylhet": "সিলেট", "Rangpur": "রংপুর",
    "Mymensingh": "ময়মনসিংহ",
}
DISTRICT_BN = {
    "Dhaka":"ঢাকা","Faridpur":"ফরিদপুর","Gazipur":"গাজীপুর","Gopalganj":"গোপালগঞ্জ",
    "Kishoreganj":"কিশোরগঞ্জ","Madaripur":"মাদারীপুর","Manikganj":"মানিকগঞ্জ",
    "Munshiganj":"মুন্সিগঞ্জ","Narayanganj":"নারায়ণগঞ্জ","Narsingdi":"নরসিংদী",
    "Rajbari":"রাজবাড়ী","Shariatpur":"শরীয়তপুর","Tangail":"টাঙ্গাইল",
    "Bandarban":"বান্দরবান","Brahmanbaria":"ব্রাহ্মণবাড়িয়া","Chandpur":"চাঁদপুর",
    "Chattogram":"চট্টগ্রাম","Cumilla":"কুমিল্লা","Comilla":"কুমিল্লা",
    "Cox's Bazar":"কক্সবাজার","Feni":"ফেনী","Khagrachhari":"খাগড়াছড়ি",
    "Lakshmipur":"লক্ষ্মীপুর","Noakhali":"নোয়াখালী","Rangamati":"রাঙ্গামাতি",
    "Bogura":"বগুড়া","Bogra":"বগুড়া","Joypurhat":"জয়পুরহাট","Naogaon":"নওগাঁ",
    "Natore":"নাটোর","Chapainawabganj":"চাঁপাইনবাবগঞ্জ","Pabna":"পাবনা",
    "Rajshahi":"রাজশাহী","Sirajganj":"সিরাজগঞ্জ",
    "Bagerhat":"বাগেরহাট","Chuadanga":"চুয়াডাঙ্গা","Jashore":"যশোর","Jessore":"যশোর",
    "Jhenaidah":"ঝিনাইদহ","Khulna":"খুলনা","Kushtia":"কুষ্টিয়া","Magura":"মাগুরা",
    "Meherpur":"মেহেরপুর","Narail":"নড়াইল","Satkhira":"সাতক্ষীরা",
    "Barguna":"বরগুনা","Barishal":"বরিশাল","Barisal":"বরিশাল","Bhola":"ভোলা",
    "Jhalokati":"ঝালকাঠি","Patuakhali":"পটুয়াখালী","Pirojpur":"পিরোজপুর",
    "Habiganj":"হবিগঞ্জ","Moulvibazar":"মৌলভীবাজার","Sunamganj":"সুনামগঞ্জ",
    "Sylhet":"সিলেট","Dinajpur":"দিনাজপুর","Gaibandha":"গাইবান্ধা",
    "Kurigram":"কুড়িগ্রাম","Lalmonirhat":"লালমনিরহাট","Nilphamari":"নীলফামারী",
    "Panchagarh":"পঞ্চগড়","Rangpur":"রংপুর","Thakurgaon":"ঠাকুরগাঁও",
    "Jamalpur":"জামালপুর","Mymensingh":"ময়মনসিংহ","Netrokona":"নেত্রকোণা",
    "Sherpur":"শেরপুর",
}

# ---- parse wikitext ----
lines = wikitext.split("\n")
division = None
current_district = None
districts = {}   # (division, district) -> [upazilas]

for ln in lines:
    m = re.search(r"=\s*(Dhaka|Chittagong|Chattogram|Rajshahi|Khulna|Barisal|Barishal|Sylhet|Rangpur|Mymensingh)\s*Division\s*=", ln)
    if m:
        division = m.group(1)
        if division == "Chittagong": division = "Chattogram"
        if division == "Barisal": division = "Barishal"
        continue
    # table row cells
    if ln.strip().startswith("|"):
        cells = re.findall(r"\|\s*([^|]+)", ln)
        cells = [c.strip() for c in cells if c.strip()]
        if not cells: continue
        # district header row? e.g. | '''Dhaka''' (13) ||
        dm = re.match(r"^'''([^']+)'''", cells[0])
        if dm:
            current_district = dm.group(1).strip()
        elif division and current_district and cells and not cells[0].startswith("class="):
            # upazila row: first cell = upazila name (strip wiki links)
            name = re.sub(r"\[\[([^|\]]+\|)?([^\]]+)\]\]", r"\2", cells[0])
            name = re.sub(r"'''?", "", name).strip()
            name = name.replace("Upazila", "").strip()
            if name and not name.startswith("!") and len(name) > 2 and re.match(r"^[A-Z]", name):
                key = (division, current_district)
                districts.setdefault(key, [])
                if name not in districts[key]:
                    districts[key].append(name)

# normalize district names (Wikipedia may use "Bogra"/"Jessore"/"Comilla")
ALIAS = {"Bogra": "Bogura", "Jessore": "Jashore", "Comilla": "Cumilla",
         "Mymensingh District": "Mymensingh"}
norm = {}
for (div, dist), ups in districts.items():
    dist = ALIAS.get(dist, dist)
    dist = re.sub(r"\s*\(.*\)$", "", dist).strip()
    norm.setdefault((div, dist), [])
    for u in ups:
        u = re.sub(r"\s*\(.*\)$", "", u).strip()
        if u and u not in norm[(div, dist)]:
            norm[(div, dist)].append(u)

# The expected 64 districts, grouped by division (authoritative check list)
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
found = {(d, di): ups for (d, di), ups in norm.items()}
missing = []
for div, dists in EXPECTED.items():
    for di in dists:
        if (div, di) not in found or not found[(div, di)]:
            missing.append(f"{div}/{di}")

total_upazilas = sum(len(v) for v in found.values())
print(f"parsed districts={len(found)} upazilas={total_upazilas} missing={missing}", file=sys.stderr)

# emit TS
out = []
out.append("/**")
out.append(" * Bangladesh administrative geography — canonical reference data.")
out.append(" * Source: Wikipedia “List of upazilas in Bangladesh” (fetched at build")
out.append(" * time, " + __import__("datetime").date.today().isoformat() + ") cross-checked against the")
out.append(" * 8-division / 64-district structure. Bengali names for divisions and")
out.append(" * districts are included. Data is reference data, not provider listings.")
out.append(" */")
out.append("")
out.append("export type GeoDivision = {")
out.append("  name: string;")
out.append("  nameBn: string;")
out.append("  districts: GeoDistrict[];")
out.append("};")
out.append("")
out.append("export type GeoDistrict = {")
out.append("  name: string;")
out.append("  nameBn: string;")
out.append("  upazilas: string[];")
out.append("};")
out.append("")
out.append("export const GEO_DIVISIONS: GeoDivision[] = [")
for div, dists in EXPECTED.items():
    out.append("  {")
    out.append(f'    name: "{div}",')
    out.append(f'    nameBn: "{DIV_BN[div]}",')
    out.append("    districts: [")
    for di in dists:
        ups = found.get((div, di), [])
        up_str = json.dumps(ups, ensure_ascii=False)
        out.append("      {")
        out.append(f'        name: "{di}",')
        out.append(f'        nameBn: "{DISTRICT_BN.get(di, di)}",')
        out.append(f"        upazilas: {up_str},")
        out.append("      },")
    out.append("    ],")
    out.append("  },")
out.append("];")
out.append("")
out.append("export const ALL_DISTRICTS: string[] = GEO_DIVISIONS.flatMap((d) => d.districts.map((x) => x.name));")
out.append("")
out.append("export function districtToDivision(district: string): string | null {")
out.append("  const div = GEO_DIVISIONS.find((d) => d.districts.some((x) => x.name === district));")
out.append("  return div ? div.name : null;")
out.append("}")
out.append("")
out.append("export function upazilasOf(district: string): string[] {")
out.append("  const div = GEO_DIVISIONS.find((d) => d.districts.some((x) => x.name === district));")
out.append("  const dist = div?.districts.find((x) => x.name === district);")
out.append("  return dist?.upazilas ?? [];")
out.append("}")
out.append("")
out.append("export function districtsOf(division: string): GeoDistrict[] {")
out.append("  return GEO_DIVISIONS.find((d) => d.name === division)?.districts ?? [];")
out.append("}")

open("/home/z/my-project/src/lib/geo.ts", "w").write("\n".join(out) + "\n")
print(f"WROTE src/lib/geo.ts — divisions=8 districts=64 upazilas={total_upazilas}")
if missing:
    print("WARNING missing:", missing)
