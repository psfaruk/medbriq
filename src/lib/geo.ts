/**
 * Bangladesh administrative geography — canonical reference data.
 * Source: GeoNames BD administrative dump (ADM1/ADM2/ADM3), normalized to
 * official spellings and cross-checked against the authoritative
 * 8-division / 64-district structure (fetched 2026-11-21).
 * Bengali names included for divisions and districts. This is reference
 * geography only — it does NOT imply any provider listings exist there.
 */

export type GeoDivision = {
  name: string;
  nameBn: string;
  districts: GeoDistrict[];
};

export type GeoDistrict = {
  name: string;
  nameBn: string;
  /** Upazila-level reference names. Provider coverage varies — a listed
   * upazila never implies a registered provider works there. */
  upazilas: string[];
};

export const GEO_DIVISIONS: GeoDivision[] = [
  {
    name: "Dhaka",
    nameBn: "ঢাকা",
    districts: [
      {
        name: "Dhaka",
        nameBn: "ঢাকা",
        upazilas: ["Keraniganj", "Dohar", "Dhamrai", "Savar", "DNCC (Dhaka)", "DSCC (Dhaka)", "Nawabganj", "DCC (Kotwali)"],
      },
      {
        name: "Faridpur",
        nameBn: "ফরিদপুর",
        upazilas: ["Boalmari", "Nagarkanda", "Char Bhadrasan", "Madhukhali", "Alfadanga", "Bhanga", "Sadarpur", "Faridpur Sadar"],
      },
      {
        name: "Gazipur",
        nameBn: "গাজীপুর",
        upazilas: ["Kaliganj", "Kaliakair", "Kapasia", "Gazipur S.", "Sreepur"],
      },
      {
        name: "Gopalganj",
        nameBn: "গোপালগঞ্জ",
        upazilas: ["Gopalganj S.", "Kashiani", "Kotalipara", "Tungipara", "Muksudpur"],
      },
      {
        name: "Kishoreganj",
        nameBn: "কিশোরগঞ্জ",
        upazilas: ["Karimganj", "Katiadi", "Nikli", "Tarail", "Bajitpur", "Astagram", "Mithamain", "Kishoreganj Sadar", "Kuliarchar", "Itna", "Bhairab", "Pakundia", "Hossainpur"],
      },
      {
        name: "Madaripur",
        nameBn: "মাদারীপুর",
        upazilas: ["Madaripur S.", "Kalkini", "Rajoir", "Shibchar"],
      },
      {
        name: "Manikganj",
        nameBn: "মানিকগঞ্জ",
        upazilas: ["Singair", "Harirampur", "Saturia", "Shivalaya", "Manikgonj Sadar", "Ghior", "Dawlatpur"],
      },
      {
        name: "Munshiganj",
        nameBn: "মুন্সিগঞ্জ",
        upazilas: ["Tongibari", "Lohajang", "Sirajdikhan", "Sreenagar", "Gazaria", "Munshiganj S."],
      },
      {
        name: "Narayanganj",
        nameBn: "নারায়ণগঞ্জ",
        upazilas: ["Sonargaon", "Araihazar", "Bandar", "Narayanganj S.", "Rupganj"],
      },
      {
        name: "Narsingdi",
        nameBn: "নরসিংদী",
        upazilas: ["Narsingdi S.", "Raipura", "Belabo", "Shibpur", "Monohardi", "Palash"],
      },
      {
        name: "Rajbari",
        nameBn: "রাজবাড়ী",
        upazilas: ["Baliakandi", "Pangsha", "Goalandaghat", "Rajbari Sadar"],
      },
      {
        name: "Shariatpur",
        nameBn: "শরীয়তপুর",
        upazilas: ["Zanjira", "Bhedarganj", "Gosairhat", "Damudya", "Naria", "Palong"],
      },
      {
        name: "Tangail",
        nameBn: "টাঙ্গাইল",
        upazilas: ["Bhuapur", "Gopalpur", "Kalihati", "Nagarpur", "Ghatail", "Delduar", "Tangail Sadar", "Madhupur", "Sakhipur", "Basail", "Mirzapur", "Dhanbari"],
      },
    ],
  },
  {
    name: "Chattogram",
    nameBn: "চট্টগ্রাম",
    districts: [
      {
        name: "Bandarban",
        nameBn: "বান্দরবান",
        upazilas: ["Lama", "Rowangghhari", "Alikadam", "Naikhongchhari", "Ruma", "Thanchi", "Bandarban Sadar"],
      },
      {
        name: "Brahmanbaria",
        nameBn: "ব্রাহ্মণবাড়িয়া",
        upazilas: ["Akhaura", "Sarail", "Brahmanbaria S.", "Kasba", "Nasirnagar", "Nabinagar", "Bancharampur", "Ashuganj"],
      },
      {
        name: "Chandpur",
        nameBn: "চাঁদপুর",
        upazilas: ["Kachua", "Shahrasti", "Faridganj", "Haimchar", "Haziganj", "Chandpur S.", "Matlab Uttar", "Matlab Dakshin"],
      },
      {
        name: "Chattogram",
        nameBn: "চট্টগ্রাম",
        upazilas: ["Rangunia", "Banshkhali", "Anwara", "Boalkhali", "Fatikchhari", "Lohagara", "Sandwip", "Mirsharai", "Patiya", "Raozan", "Hathazari", "Sitakunda", "Satkania", "CCC (Kotwali)", "Chandanaish"],
      },
      {
        name: "Cumilla",
        nameBn: "কুমিল্লা",
        upazilas: ["Homna", "Muradnagar", "Brahmanpara", "Burichang", "Comilla S.", "Barura", "Chandhina", "Nangalkot", "Chauddagram", "Daudkandi", "Laksam", "Titas", "Cumilla Sadar Dakshin", "Meghna", "Monoharganj", "Debidwar"],
      },
      {
        name: "Cox's Bazar",
        nameBn: "কক্সবাজার",
        upazilas: ["Maheshkhali", "Ramu", "Teknaf", "Ukhia", "Kutubdia", "Pekua", "Chakaria", "Cox's Bazar Sadar"],
      },
      {
        name: "Feni",
        nameBn: "ফেনী",
        upazilas: ["Chhagalnaiya", "Parshuram", "Fulgazi", "Feni Sadar", "Sonagazi", "Daganbhuiyan"],
      },
      {
        name: "Khagrachhari",
        nameBn: "খাগড়াছড়ি",
        upazilas: ["Lakshmichhari", "Matiranga", "Panchhari", "Khagrachhari", "Manikchhari", "Mahalchhari", "Dighinala", "Ramgarh"],
      },
      {
        name: "Lakshmipur",
        nameBn: "লক্ষ্মীপুর",
        upazilas: ["Raipur", "Ramgati", "Ramganj", "Lakshmipur Sadar"],
      },
      {
        name: "Noakhali",
        nameBn: "নোয়াখালী",
        upazilas: ["Companiganj", "Noakhali S.", "Hatiya", "Senbagh", "Subarnachar", "Kabirhat", "Chatkhil", "Sonaimuri", "Begumganj"],
      },
      {
        name: "Rangamati",
        nameBn: "রাঙ্গামাতি",
        upazilas: ["Bagaichhari", "Barkal", "Belaichhari", "Juraichhari", "Langadu", "Nannerchar", "Kaptai", "Rajasthali", "Kawkhali", "Rangamati Sadar"],
      },
    ],
  },
  {
    name: "Rajshahi",
    nameBn: "রাজশাহী",
    districts: [
      {
        name: "Bogura",
        nameBn: "বগুড়া",
        upazilas: ["Dhunot", "Nandigram", "Shibganj", "Sonatala", "Kahaloo", "Bogra", "Sherpur", "Gabtali", "Saraikandi", "Adamdighi", "Dhupchanchia", "Shajahanpur"],
      },
      {
        name: "Joypurhat",
        nameBn: "জয়পুরহাট",
        upazilas: ["Khetlal", "Joypurhat Sadar", "Akkelpur", "Kalai", "Panchbibi"],
      },
      {
        name: "Naogaon",
        nameBn: "নওগাঁ",
        upazilas: ["Manda", "Atrai", "Patnitala", "Naogaon S.", "Dhamoirhat", "Niamatpur", "Porsha", "Raninagar", "Badalgachhi", "Mohadevpur", "Sapahar"],
      },
      {
        name: "Natore",
        nameBn: "নাটোর",
        upazilas: ["Baraigram", "Singra", "Lalpur", "Natore S.", "Gurudaspur", "Bagatipara"],
      },
      {
        name: "Chapainawabganj",
        nameBn: "চাঁপাইনবাবগঞ্জ",
        upazilas: ["Nachole", "Shibganj", "Bholahat", "Gomastapur", "Nawabganj Sadar"],
      },
      {
        name: "Pabna",
        nameBn: "পাবনা",
        upazilas: ["Santhia", "Pabna S.", "Chatmohar", "Sujanagar", "Bhangura", "Atgharia", "Ishwardi", "Bera", "Faridpur U"],
      },
      {
        name: "Rajshahi",
        nameBn: "রাজশাহী",
        upazilas: ["Tanore", "Mohanpur", "Bagmara", "Bagha", "Godagari", "Durgapur", "Boalia", "Paba", "Charghat", "Puthia", "RCC (Rajpara)", "RCC (Motihar)", "RCC (Shahmokhdum)"],
      },
      {
        name: "Sirajganj",
        nameBn: "সিরাজগঞ্জ",
        upazilas: ["Kazipur", "Raiganj", "Tarash", "Belkuchi", "Shahjadpur", "Ullahpara", "Kamarkhanda", "Sirajganj Sadar", "Chauhali"],
      },
    ],
  },
  {
    name: "Khulna",
    nameBn: "খুলনা",
    districts: [
      {
        name: "Bagerhat",
        nameBn: "বাগেরহাট",
        upazilas: ["Bagerhat S.", "Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Morrelganj", "Rampal", "Sarankhola", "Mongla"],
      },
      {
        name: "Chuadanga",
        nameBn: "চুয়াডাঙ্গা",
        upazilas: ["Alamdanga", "Chuadanga Sadar", "Damurhuda", "Jibannagar"],
      },
      {
        name: "Jashore",
        nameBn: "যশোর",
        upazilas: ["Chaugachha", "Sharsha", "Jessore Sadar", "Manirampur", "Abhaynagar", "Bagherpara", "Jhikargachha", "Keshabpur"],
      },
      {
        name: "Jhenaidah",
        nameBn: "ঝিনাইদহ",
        upazilas: ["Harinakunda", "Maheshpur", "Shailkupa", "Jhenaidah Sadar", "Kaliganj", "Kotchandpur"],
      },
      {
        name: "Khulna",
        nameBn: "খুলনা",
        upazilas: ["Koyra", "Paikgachha", "Rupsa", "Terokhada", "Batiaghata", "Dacope", "Dumuria", "Dighalia", "Phultala", "Kotwali", "Khan Jahan Ali", "KCC (Khalishpur)", "KCC (Sonadanga)", "KCC (Daulatpur)"],
      },
      {
        name: "Kushtia",
        nameBn: "কুষ্টিয়া",
        upazilas: ["Daulatpur", "Mirpur", "Bheramara", "Kushtia Sadar", "Kumarkhali", "Khoksa"],
      },
      {
        name: "Magura",
        nameBn: "মাগুরা",
        upazilas: ["Mohammadpur", "Shalikha", "Sreepur", "Magura Sadar"],
      },
      {
        name: "Meherpur",
        nameBn: "মেহেরপুর",
        upazilas: ["Gangni", "Mujibnagar", "Meherpur Sadar"],
      },
      {
        name: "Narail",
        nameBn: "নড়াইল",
        upazilas: ["Lohagara", "Narail S.", "Kalia"],
      },
      {
        name: "Satkhira",
        nameBn: "সাতক্ষীরা",
        upazilas: ["Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Satkhira Sadar", "Tala", "Shyamnagar"],
      },
    ],
  },
  {
    name: "Barishal",
    nameBn: "বরিশাল",
    districts: [
      {
        name: "Barguna",
        nameBn: "বরগুনা",
        upazilas: ["Amtali", "Barguna S.", "Patharghata", "Bamna", "Betagi"],
      },
      {
        name: "Barishal",
        nameBn: "বরিশাল",
        upazilas: ["Agailjhara", "Wazirpur", "Barishal Sadar", "Mehendiganj", "Hizla", "Babuganj", "Bakerganj", "Banaripara", "Gaurnadi", "Muladi"],
      },
      {
        name: "Bhola",
        nameBn: "ভোলা",
        upazilas: ["Charfasson", "Manpura", "Burhanuddin", "Daulatkhan", "Lalmohan", "Tazumuddin", "Bhola Sadar"],
      },
      {
        name: "Jhalokati",
        nameBn: "ঝালকাঠি",
        upazilas: ["Nalchity", "Rajapur", "Jhalokati Sadar", "Kathalia"],
      },
      {
        name: "Patuakhali",
        nameBn: "পটুয়াখালী",
        upazilas: ["Bauphal", "Galachipa", "Kalapara", "Mirzaganj", "Dashmina", "Rangabali", "Dumki"],
      },
      {
        name: "Pirojpur",
        nameBn: "পিরোজপুর",
        upazilas: ["Nazirpur", "Pirojpur S.", "Bhandaria", "Mathbaria", "Kawkhali", "Nesarabad", "Zianagar"],
      },
    ],
  },
  {
    name: "Sylhet",
    nameBn: "সিলেট",
    districts: [
      {
        name: "Habiganj",
        nameBn: "হবিগঞ্জ",
        upazilas: ["Bahubal", "Lakhai", "Ajmiriganj", "Baniachong", "Nabiganj", "Madhabpur", "Chunarughat", "Habiganj Sadar"],
      },
      {
        name: "Moulvibazar",
        nameBn: "মৌলভীবাজার",
        upazilas: ["Kamalganj", "Kulaura", "Sreemangal", "Barlekha", "Rajnagar", "Juri", "Moulvibazar Sadar"],
      },
      {
        name: "Sunamganj",
        nameBn: "সুনামগঞ্জ",
        upazilas: ["Derai", "Jamalganj", "Sunamganj S.", "Jagannathpur", "Bishwamvarpur", "Chhatak", "Dharampasha", "Dowarabazar", "Tahirpur", "Sullah", "Sunamganj"],
      },
      {
        name: "Sylhet",
        nameBn: "সিলেট",
        upazilas: ["Zakiganj", "Kanaighat", "Jaintiapur", "Gowainghat", "Beanibazar", "Balaganj", "Companiganj", "Sylhet S.", "South Surma", "Fenchuganj", "Golabganj", "Bishwanath"],
      },
    ],
  },
  {
    name: "Rangpur",
    nameBn: "রংপুর",
    districts: [
      {
        name: "Dinajpur",
        nameBn: "দিনাজপুর",
        upazilas: ["Parbatipur", "Ghoraghat", "Kaharole", "Khansama", "Birol", "Phulbari", "Chirirbandar", "Birganj", "Dinajpur Sadar", "Nawabgonj", "Hakimpur", "Bochaganj", "Birampur"],
      },
      {
        name: "Gaibandha",
        nameBn: "গাইবান্ধা",
        upazilas: ["Gobindaganj", "Sundarganj", "Phulchhari", "Gaibandha S.", "Sadullapur", "Palashbari", "Saghata"],
      },
      {
        name: "Kurigram",
        nameBn: "কুড়িগ্রাম",
        upazilas: ["Char Rajibpur", "Kurigram S.", "Chilmari", "Nageshwari", "Rajarhat", "Ulipur", "Bhurungamari", "Phulbari", "Raomari"],
      },
      {
        name: "Lalmonirhat",
        nameBn: "লালমনিরহাট",
        upazilas: ["Hatibandha", "Aditmari", "Lalmonirhat Sadar", "Kaliganj", "Patgram"],
      },
      {
        name: "Nilphamari",
        nameBn: "নীলফামারী",
        upazilas: ["Jaldhaka", "Saidpur", "Dimla", "Nilphamari Sadar", "Domar", "Kishoreganj"],
      },
      {
        name: "Panchagarh",
        nameBn: "পঞ্চগড়",
        upazilas: ["Panchagarh Sadar", "Debiganj", "Atwari", "Boda", "Tetulia"],
      },
      {
        name: "Rangpur",
        nameBn: "রংপুর",
        upazilas: ["Kaunia", "Taraganj", "Gangachhara", "Pirgachha", "Pirganj", "Badarganj", "Rangpur Sadar", "Mithapukur"],
      },
      {
        name: "Thakurgaon",
        nameBn: "ঠাকুরগাঁও",
        upazilas: ["Thakurgaon S.", "Baliadangi", "Haripur", "Ranisankail", "Pirganj"],
      },
    ],
  },
  {
    name: "Mymensingh",
    nameBn: "ময়মনসিংহ",
    districts: [
      {
        name: "Jamalpur",
        nameBn: "জামালপুর",
        upazilas: ["Dewanganj", "Islampur", "Sarishabari", "Baksiganj", "Madarganj", "Melandaha", "Jamalpur"],
      },
      {
        name: "Mymensingh",
        nameBn: "ময়মনসিংহ",
        upazilas: ["Trishal", "Dhobaura", "Ishwarganj", "Gaffargaon", "Gauripur", "Haluaghat", "Mymensingh S.", "Nandail", "Phulpur", "Muktagacha", "Bhaluka", "Fulbaria"],
      },
      {
        name: "Netrokona",
        nameBn: "নেত্রকোণা",
        upazilas: ["Khaliajuri", "Durgapur", "Kalmakanda", "Kendua", "Madan", "Barhatta", "Mohanganj", "Netrokona Sadar", "Purbadhala", "Atpara"],
      },
      {
        name: "Sherpur",
        nameBn: "শেরপুর",
        upazilas: ["Sreebardi", "Nakla", "Jhenaigati", "Nalitabari", "Sherpur Sadar"],
      },
    ],
  },
];

export const ALL_DISTRICTS: string[] = GEO_DIVISIONS.flatMap((d) =>
  d.districts.map((x) => x.name)
);

export function districtToDivision(district: string): string | null {
  const div = GEO_DIVISIONS.find((d) =>
    d.districts.some((x) => x.name === district)
  );
  return div ? div.name : null;
}

export function districtsOf(division: string): GeoDistrict[] {
  return GEO_DIVISIONS.find((d) => d.name === division)?.districts ?? [];
}

export function upazilasOf(district: string): string[] {
  for (const div of GEO_DIVISIONS) {
    const d = div.districts.find((x) => x.name === district);
    if (d) return d.upazilas;
  }
  return [];
}

