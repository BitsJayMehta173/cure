"""
Curated clinical vocabularies for the structured fields and the synthetic Indian OPD corpus.
Phrase fields rank these by (doctor's own usage > list order), so the order below is the
default "most common first".
"""

# ─── Structured prescription fields ─────────────────────────────────────────
FREQUENCIES = [
    ("BD", "twice daily"), ("TDS", "three times a day"), ("OD", "once daily"), ("1-0-1", "morning & night"),
    ("1-1-1", "morning, afternoon, night"), ("0-0-1", "night only"), ("1-0-0", "morning only"),
    ("HS", "at bedtime"), ("SOS", "only if needed"), ("QID", "four times a day"), ("0-1-0", "afternoon only"),
    ("1/2-0-1/2", "half tablet morning & night"), ("1-1-1-1", "four times a day"), ("Stat", "immediately, once"),
    ("Once weekly", ""), ("Alternate day", ""), ("Twice daily", ""), ("Three times a day", ""), ("Once daily", ""),
    ("Every 6 hours", ""), ("Every 8 hours", ""), ("Every 4 hours", ""), ("Before meals", ""), ("After meals", ""),
]

DURATIONS = [
    "5 days", "3 days", "7 days", "10 days", "1 week", "2 weeks", "1 month", "15 days", "2 months", "3 months",
    "14 days", "6 days", "4 days", "2 days", "1 day", "3 weeks", "6 months", "Till review", "Continue",
    "Lifelong", "Till symptoms subside",
]

INSTRUCTIONS = [
    "After food", "Before food", "Empty stomach", "At bedtime", "After breakfast", "After dinner",
    "Before breakfast", "30 min before food", "With milk", "With plenty of water", "Only if fever > 100 F",
    "SOS for fever", "SOS for pain", "SOS for vomiting", "Do not exceed 4 tablets a day", "Complete the course",
    "Do not crush or chew", "Dissolve in water", "Shake well before use", "Apply thin layer twice daily",
    "Apply on affected area", "Local application", "Avoid driving after taking", "Take at the same time daily",
    "Taper as advised", "Continue till review", "Rinse mouth after use", "Instil in both eyes",
    "Instil in affected ear", "Use with spacer", "Keep in refrigerator",
]

GENERIC_DOSES = {
    "tablet": ["1 tab", "1/2 tab", "2 tabs"],
    "capsule": ["1 cap", "2 caps"],
    "syrup": ["5 ml", "10 ml", "2.5 ml", "7.5 ml", "15 ml", "1 tsf", "2 tsf"],
    "suspension": ["5 ml", "2.5 ml", "10 ml", "7.5 ml"],
    "drops": ["1 drop", "2 drops", "3 drops", "5 drops"],
    "injection": ["1 amp", "1 vial", "1 g", "500 mg"],
    "cream": ["Apply thin layer", "Local application"],
    "ointment": ["Apply thin layer", "Local application"],
    "gel": ["Apply thin layer", "Local application"],
    "lotion": ["Apply thin layer", "Local application"],
    "inhaler": ["2 puffs", "1 puff"],
    "respules": ["1 respule"],
    "sachet": ["1 sachet"],
    "powder": ["1 sachet", "1 scoop"],
    "solution": ["5 ml", "10 ml"],
    "spray": ["2 sprays", "1 spray"],
    "soap": ["Use daily"],
    "shampoo": ["Use twice weekly"],
}

REPORT_TITLES = [
    "Consultation notes", "Follow-up visit", "Clinical examination", "Provisional diagnosis", "Discharge summary",
    "CBC", "Complete blood count", "ESR", "CRP", "LFT", "Liver function test", "KFT", "Kidney function test",
    "RFT", "Serum electrolytes", "Blood sugar (FBS/PPBS)", "RBS", "HbA1c", "Lipid profile",
    "Thyroid profile (T3, T4, TSH)", "TSH", "Urine routine and microscopy", "Urine culture and sensitivity",
    "Blood culture", "Dengue NS1 antigen", "Dengue IgM/IgG", "Widal test", "Malaria parasite (MP)",
    "Typhidot", "Serum vitamin D3", "Serum vitamin B12", "Serum ferritin", "Iron studies", "PT/INR",
    "HBsAg", "HIV I & II", "HCV", "VDRL", "Stool routine", "Sputum AFB", "Chest X-ray PA view", "X-ray",
    "X-ray knee AP/lateral", "X-ray LS spine AP/lateral", "X-ray cervical spine", "USG abdomen and pelvis",
    "USG KUB", "ECG", "Resting ECG", "2D Echo", "TMT", "Holter monitoring", "CT brain (plain)", "CT abdomen",
    "HRCT chest", "MRI brain", "MRI LS spine", "MRI knee", "PFT", "Spirometry", "Audiometry", "Fundoscopy",
    "Diagnostic imaging", "Biopsy report", "Histopathology report", "FNAC", "Pap smear", "Semen analysis",
    "Pregnancy test (UPT)", "Beta hCG", "NST", "Obstetric USG", "Second-opinion findings", "Referral note",
]

# Common Indian OPD brands — ranking boost when they exist in the medicine dataset.
COMMON_BRANDS = [
    "Dolo 650", "Crocin 650", "Calpol 650", "Crocin Advance", "Pan 40", "Pan D", "Pantocid 40", "Pantocid DSR",
    "Pantop 40", "Razo 20", "Razo D", "Rablet 20", "Rablet D", "Omez 20", "Omez D", "Nexpro 40", "Aciloc 150",
    "Rantac 150", "Zinetac 150", "Digene", "Gelusil", "Mucaine Gel", "Sucrafil", "Cyclopam", "Meftal Spas",
    "Buscopan", "Drotin", "Ondem 4", "Emeset 4", "Vomikind", "Domstal", "Perinorm", "Norflox TZ", "Ciplox TZ",
    "Oflox TZ", "O2 Tablet", "Oflox 200", "Metrogyl 400", "Flagyl 400", "Augmentin 625 Duo", "Moxikind CV 625",
    "Clavam 625", "Mox 500", "Novamox 500", "Azithral 500", "Azee 500", "Azithral 250", "Taxim O 200",
    "Zifi 200", "Cefix 200", "Monocef", "Ceftum 500", "Levoflox 500", "Glevo 500", "Ciplox 500",
    "Doxy 1 LDR Forte", "Montair LC", "Montek LC", "Levocet", "Cetzine", "Okacet", "Allegra 120", "Allegra 180",
    "Avil 25", "Atarax 10", "Atarax 25", "Sinarest", "Cheston Cold", "Ascoril LS", "Ascoril D", "Grilinctus",
    "Benadryl", "Alex", "Deriphyllin", "Asthalin", "Asthalin Inhaler", "Budecort", "Foracort", "Seroflo",
    "Duolin", "Levolin", "Combiflam", "Brufen 400", "Zerodol P", "Zerodol SP", "Hifenac P", "Aceclo Plus",
    "Ultracet", "Voveran SR 100", "Voveran", "Volini", "Thiocolchicoside", "Myoril", "Nise", "Sumo",
    "Shelcal 500", "Shelcal HD", "Calcimax", "Uprise D3", "Calcirol", "Becosules", "Neurobion Forte", "Limcee",
    "Zincovit", "Supradyn", "Livogen", "Orofer XT", "Autrin", "Fefol", "Folvite", "Ecosprin 75", "Ecosprin AV 75",
    "Clopilet 75", "Atorva 10", "Atorva 20", "Rozavel 10", "Storvas 10", "Telma 40", "Telma H", "Telma AM",
    "Amlong 5", "Amlokind 5", "Stamlo 5", "Losar 50", "Cilacar 10", "Met XL 25", "Met XL 50", "Concor 5",
    "Aten 50", "Glycomet 500", "Glycomet GP 1", "Gluconorm G1", "Janumet 50/500", "Galvus Met", "Istamet",
    "Amaryl 1", "Glimisave M1", "Thyronorm 50", "Thyronorm 25", "Eltroxin 50", "Vertin 16", "Stugeron",
    "Duphalac", "Cremaffin", "Dulcolax", "Sat Isabgol", "Econorm", "Vizylac", "Sporlac", "Enterogermina",
    "Electral", "Martifur 100", "Urispas", "Cital", "Candid", "Candid B", "Clotrimazole", "Soframycin",
    "T-Bact", "Fucidin", "Lulifin", "Itaspor 200", "Canditral 200", "Forcan 150", "Terbicip 250",
    "Permite", "Ivecop 12", "Zentel", "Nitazox", "Refresh Tears", "Moxicip", "Vigamox", "Ciplox Eye",
    "Otrivin", "Nasivion", "Waxsol", "Pantosec D", "Ranidom", "Zyrtec", "Nexito 10", "Clonotril 0.5",
    "Etizola 0.5", "Stamlo Beta", "Envas 5", "Dytor 10", "Lasix 40", "Aldactone 25", "Sorbitrate 5",
    "Ivabrad 5", "Arkamin", "Minipress XL", "Prolomet XL", "Nebicard 5", "Warf 5", "Deplatt A 75",
    "Wysolone 10", "Omnacortil 10", "Medrol 4", "Dexona", "Betnesol",
]

# ─── Synthetic corpus building blocks (Indian OPD writing style) ─────────────
SYMPTOMS = [
    "fever", "fever with chills", "cough", "dry cough", "productive cough", "cold", "running nose", "sore throat",
    "headache", "body ache", "loose motions", "vomiting", "nausea", "abdominal pain", "pain abdomen",
    "burning micturition", "chest pain", "breathlessness", "giddiness", "generalised weakness", "joint pain",
    "knee pain", "low back pain", "neck pain", "skin rash", "itching", "acidity", "heartburn", "constipation",
    "palpitations", "swelling of feet", "ear pain", "redness of eyes", "watering of eyes", "loss of appetite",
    "fatigue", "weight loss", "sneezing", "nasal blockage", "painful swallowing", "burning epigastric pain",
    "bloating", "increased frequency of urination", "tingling in feet", "numbness", "irregular periods",
    "white discharge", "dizziness", "blurring of vision", "toothache", "difficulty in sleeping",
]

DURATION_PHRASES = [
    "x 2 days", "x 3 days", "x 5 days", "x 1 week", "x 10 days", "x 2 weeks", "x 1 month", "since 2 days",
    "since yesterday", "since morning", "for 3 days", "for the last 1 week", "for 15 days", "x 6 months",
]

COMORBIDITIES = ["DM", "HTN", "T2DM", "hypothyroidism", "bronchial asthma", "CAD", "CKD", "COPD", "dyslipidemia",
                 "epilepsy", "migraine", "osteoarthritis", "PCOS", "GERD", "BPH"]

DIAGNOSES = [
    "Viral fever", "Acute pharyngitis", "URTI", "Acute gastroenteritis", "UTI", "Acute bronchitis",
    "Allergic rhinitis", "Acid peptic disease", "GERD", "Migraine", "Tension type headache", "Hypertension",
    "T2DM uncontrolled", "Dengue fever (suspected)", "Enteric fever", "Lumbar spondylosis", "Cervical spondylosis",
    "Osteoarthritis knee", "Iron deficiency anaemia", "Acute tonsillitis", "Sinusitis", "Fungal infection",
    "Contact dermatitis", "Urticaria", "Conjunctivitis", "Otitis media", "Vertigo (BPPV)", "Dyspepsia",
    "Irritable bowel syndrome", "Musculoskeletal pain", "Hypothyroidism", "Vitamin D deficiency", "Anxiety",
    "Community acquired pneumonia", "Bronchial asthma exacerbation", "Renal calculus", "Plantar fasciitis",
]

INVESTIGATIONS = [
    "CBC", "ESR", "CRP", "LFT", "KFT", "serum electrolytes", "FBS", "PPBS", "RBS", "HbA1c", "lipid profile",
    "TFT", "TSH", "urine R/M", "urine C/S", "Dengue NS1", "Widal", "MP", "chest X-ray PA view",
    "USG abdomen", "ECG", "2D Echo", "serum vitamin D3", "serum B12", "X-ray knee AP/lateral",
    "X-ray LS spine", "stool R/M", "sputum AFB",
]

EXAM_FINDINGS = [
    "O/E: Temp {temp} F, PR {pr}/min, BP {bp} mmHg, SpO2 {spo2}% on RA",
    "Vitals: BP {bp} mmHg, PR {pr}/min, RR {rr}/min, SpO2 {spo2}%",
    "Chest: B/L air entry equal, clear", "Chest: B/L crepts present", "Chest: occasional wheeze heard",
    "CVS: S1 S2 heard, no murmur", "P/A: soft, non-tender, no organomegaly", "P/A: epigastric tenderness present",
    "P/A: soft, mild tenderness in right iliac fossa", "CNS: NAD, no focal neurological deficit",
    "Throat congested, tonsils enlarged", "Throat congested", "Pallor present", "No pallor, icterus, cyanosis, clubbing, lymphadenopathy or edema",
    "Pedal edema present", "Local tenderness present", "Tenderness over L4-L5", "SLR negative B/L",
    "Crepitus present in both knees", "Range of movement restricted and painful", "Tympanic membrane congested",
    "Conjunctival congestion present", "Erythematous papular rash over trunk", "Annular scaly lesions over groin",
]

ADVICE_SENTENCES = [
    "Plenty of oral fluids", "Take plenty of oral fluids", "Adequate rest", "Steam inhalation twice daily",
    "Warm saline gargles 3-4 times a day", "Avoid oily and spicy food", "Avoid cold drinks and ice cream",
    "Soft bland diet", "ORS after every loose stool", "Monitor temperature every 4 hours",
    "Tepid sponging if fever is more than 101 F", "Review after 3 days", "Review after 1 week",
    "Review with reports", "Follow up after 2 weeks", "Revisit if symptoms persist or worsen", "Review SOS",
    "Low salt diet", "Diabetic diet", "Low fat diet", "Regular exercise for 30 minutes daily",
    "Brisk walk for 30 minutes daily", "Check BP regularly and maintain a record",
    "Monitor blood sugar (FBS and PPBS) weekly", "Continue same medications", "Stop smoking and alcohol",
    "Hot fomentation twice daily", "Avoid lifting heavy weights", "Sleep on a firm mattress",
    "Report to emergency if chest pain or breathlessness", "Avoid self medication",
    "Maintain hand hygiene", "Wear a mask", "Keep the affected area clean and dry", "Avoid scratching",
    "Wear loose cotton clothes", "Avoid prolonged standing", "Weight reduction advised",
    "Physiotherapy advised", "Neck and back strengthening exercises", "Avoid screen time before bed",
    "Adequate sleep of 7-8 hours", "Small frequent meals", "Avoid lying down immediately after meals",
    "Elevate head end of bed", "High fibre diet", "Drink at least 3 litres of water daily",
    "Complete the full course of antibiotics", "Do not stop medicines without consulting",
    "Get the investigations done before next visit", "Bring all previous reports on next visit",
]

ADVICE_OPENERS = ["Advised", "Adv", "Advice", "Patient advised", "Counselled regarding"]
FOLLOW_UP = ["Review after 3 days", "Review after 5 days", "Review after 1 week", "Review after 2 weeks",
             "Follow up after 1 month", "Review with reports", "Review SOS", "Revisit if fever persists beyond 3 days"]

LAB_RESULT_LINES = [
    "Hb {hb} g/dL, TLC {tlc}/cumm, platelets {plt} lakh/cumm", "ESR {esr} mm/hr",
    "FBS {fbs} mg/dL, PPBS {ppbs} mg/dL", "HbA1c {a1c}%", "TSH {tsh} mIU/L",
    "Total cholesterol {chol} mg/dL, LDL {ldl} mg/dL, HDL {hdl} mg/dL, triglycerides {tg} mg/dL",
    "Serum creatinine {cr} mg/dL, blood urea {urea} mg/dL", "SGOT {ast} U/L, SGPT {alt} U/L",
    "Dengue NS1 antigen negative", "Dengue NS1 antigen positive", "Widal negative", "MP not detected",
    "Urine: pus cells {pus}/hpf, RBCs nil, albumin nil",
]

IMAGING_LINES = [
    "Chest X-ray: B/L lung fields clear, CP angles clear, cardiac size normal",
    "Chest X-ray: right lower zone consolidation noted",
    "ECG: normal sinus rhythm, HR {pr} bpm, no ST-T changes", "ECG: sinus tachycardia, no ST-T changes",
    "USG abdomen: liver normal in size and echotexture, no focal lesion",
    "USG abdomen: grade I fatty liver, rest normal", "USG KUB: right renal calculus of {stone} mm, no hydronephrosis",
    "2D Echo: normal LV function, LVEF {ef}%, no RWMA", "X-ray knee: reduced joint space with osteophytes",
    "X-ray LS spine: lumbar spondylotic changes", "MRI LS spine: L4-L5 disc bulge with thecal sac indentation",
]
