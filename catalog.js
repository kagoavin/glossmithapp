/* Glossmith pricing & vehicle catalog — extracted verbatim from v6. Single source for menu pricing. */
(function(){
const DISCOUNT_RATE=0.08, COMMISSION_RATE=0.10;
const CHANNELS=["WhatsApp","Website","Walk-in"];
const CATEGORIES=["Car Club","Influencer","Staff Referral","Other"];
const STAGES=["New","Deposit","Progress","Closed"];
const STAGE_LABELS={New:"New",Deposit:"Deposit paid",Progress:"In progress",Closed:"Closed"};
const DETAIL = [
  { id:"none", name:"None", desc:"Skip a full detail — start with just add-ons, film or tint.", price:[0,0] },
  { id:"bronze", name:"Bronze — Express Wash & Shine", desc:"A regular clean-up that leaves the car looking sharp.", price:[5000,7000], dur:"45–60 min",
    includes:["Touchless Pink Foam pre-wash + High Foam pH-neutral snow foam, then two-bucket hand wash","Iron-fallout & brake-dust removal","Wheel face, barrel & calliper cleaning, tyre dressing + coating","Tar & adhesive removal from paintwork","Streak-free interior & exterior glass","Full interior vacuum","Dashboard cleaning & UV protection","Hyper dressing — plastics, rubber seals, trim","Ceramic Quick Detailer finish — gloss + short-term water beading (not a full coating)"] },
  { id:"silver", name:"Silver — Household Detail", desc:"Our most popular package — built for the family car.", price:[18000,22000], badge:"Most popular", dur:"2–3 hours",
    includes:["Everything in Bronze","Carpet shampoo & extraction, seat shampoo, steam-cleaned door panels","Leather deep clean + fabric & leather protective coating","Light scratch removal — surface marks treated","Door-jamb & shut-line cleaning","Engine bay steam clean, degrease & dressing","Glass watermark removal + glass polishing","Headlight restoration — cleaned and restored","Ceramic Quick Detailer finish"] },
  { id:"gold", name:"Gold — Complete Detail", desc:"Everything we offer, short of a long-term ceramic coating.", price:[40000,50000], dur:"6–8 hours (full day)",
    includes:["Everything in Silver","Graphene Pre Wash & Graphene Shampoo two-bucket wash","Clay bar decontamination","Full multi-stage (3-step) machine paint correction","Gloss enhancement, jeweling & paint-chip touch-up","Headlight restoration + Ceramic Headlight Coating","A/C deep clean + endoscope duct inspection","Air-vent sanitisation, headliner, trunk & door-panel detailing","Exterior trim restoration & ceramic coating","Graphene Detail Spray finishing coat + paint condition report"] },
  { id:"plat10", name:"Platinum 10H — 2-3 Year Coating", desc:"The complete Gold detail plus 2-3 years of ceramic protection.", price:[90000,110000], dur:"2–3 days (incl. cure)",
    includes:["Everything in Gold — the full 100% detail","Graphene Ceramic Coating (10H) — 2–3 years","Water-repellent Glass Crystal Coating on all glass"] },
  { id:"plat20", name:"Platinum 20H — Flagship Coating", desc:"The complete Gold detail plus our flagship 4-5 year coating.", price:[150000,180000], badge:"Flagship", dur:"3–5 days (incl. cure)",
    includes:["Everything in Gold — the full 100% detail","Flagship Graphene Ceramic Coating (20H) — 4–5 years","Water-repellent Glass Crystal Coating on all glass"] },
  { id:"newimport", name:"New Car Detailing", desc:"A full Gold-level detail plus extra salt & grime decontamination — the ideal first service for a new or freshly imported car.", price:[45000,55000], dur:"2–3 days",
    includes:["Everything in Gold — incl. multi-stage paint correction","Extra-strength exterior decon — heavy foam, two-bucket, clay bar, arches, barrels, callipers, iron & brake dust","Full interior reset — carpet & seat shampoo, leather deep clean, headliner, A/C health check"] },
];
const ADDONS = [
  { id:"paintcorr", name:"Paint Correction (3-Step Polish)", price:[22000,28000], dur:"6–8 hours (full day)",
    desc:"Clay decon + a full multi-stage machine polish. The best prep before any PPF or coating." },
  { id:"glasscoat", name:"Glass Coating (standalone)", price:[10000,12000], dur:"45–60 min",
    desc:"Water-repellent Glass Crystal Coating for windscreen & windows — better rain visibility, easier to clean." },
  { id:"acclean", name:"A/C Deep Clean & Decontamination", price:[3500,4500], dur:"30–45 min",
    desc:"Evaporator, ducts & vents deep clean — antibacterial + deodoriser, endoscope duct inspection, air-vent sanitisation and a negative-ion purification tablet. Ideal for Bronze/Silver clients." },
  { id:"ceramic10", name:"Ceramic Coating 10H (Standalone)", price:[65000,80000], dur:"1–2 days (incl. cure)",
    desc:"For a well-kept car that just needs the coating — paint correction + Graphene 10H (2–3 yr) + glass coating, without the full Gold detail." },
  { id:"ceramic20", name:"Ceramic Coating 20H (Standalone)", price:[110000,135000], dur:"2–3 days (incl. cure)",
    desc:"Our longest-lasting coating on a well-kept car — paint correction + flagship Graphene 20H (4–5 yr) + glass coating, without the full Gold detail." },
];
const MEMBERSHIP = [
  { id:"none", name:"None", desc:"No monthly membership.", price:[0,0] },
  { id:"standard", name:"Maintenance Club", price:[11700,15100],
    desc:"Monthly Bronze every visit; every 4th month auto-upgraded to a full Gold detail at no extra cost — around 15% less than booking separately." },
  { id:"ppf", name:"PPF Maintenance Club", price:[11700,15100],
    desc:"The same monthly commitment, PPF-safe: Bronze scope with PPF-safe products and a Wrap Detailer finish; every 4th month is a PPF Health & Interior Service — no clay bar or machine polishing that could harm the film. Same price." },
];
const PPF_COV = [
  { id:"none", name:"None", desc:"No paint protection film." },
  { id:"partial", name:"Partial Front", desc:"Front bumper, ~24in of hood and mirror caps — the highest-impact stone-chip zones. One price, all sizes.",
    price:{ xpel:[52000,52000], gloss:[58000,58000], matte:[62000,62000] } },
  { id:"fullfront", name:"Full Front", desc:"Full bumper, hood, fenders, mirrors and headlights — our most popular PPF package.", badge:"Most popular",
    price:{ xpel:[100000,125000], gloss:[140000,170000], matte:[150000,180000] } },
  { id:"fullbody", name:"Full Body", desc:"Complete edge-to-edge exterior coverage — total long-term protection.",
    price:{ xpel:[180000,220000], gloss:[350000,420000], matte:[370000,440000] } },
];
const PPF_FILM = [
  { id:"xpel", name:"XPEL Ultimate Plus", sub:"Self-healing, high-clarity — our value pick" },
  { id:"gloss", name:"3M Scotchgard Pro 200 — Glossy", sub:"Genuine 3M, glossy finish" },
  { id:"matte", name:"3M Scotchgard Pro 200 — Matte", sub:"Genuine 3M, satin matte finish" },
];
const TINT_COV = [
  { id:"none", name:"None", desc:"No window tint." },
  { id:"fullcar", name:"Full Car", desc:"All glass, including the windscreen.",
    price:{ chinese:[25000,27500], ctx:[55000,59000], irx:[72000,77000] } },
  { id:"sidesrear", name:"Sides + Rear", desc:"All glass except the windscreen.",
    price:{ chinese:[18000,20000], ctx:[39000,42000], irx:[51500,55000] } },
  { id:"windscreen", name:"Windscreen Only", desc:"Front windscreen only.",
    price:{ chinese:[7000,8000], ctx:[16000,17000], irx:[20500,22000] } },
];
const TINT_FILM = [
  { id:"chinese", name:"Chinese (Value)", sub:"Solid heat & UV rejection at an accessible price" },
  { id:"ctx", name:"Llumar CTX (Mid)", sub:"Premium ceramic, lifetime warranty, ~70% heat rejection" },
  { id:"irx", name:"Llumar IRX / 3M Crystalline (Top)", sub:"~86%+ heat rejection, lifetime warranty, total clarity" },
];
/* Problem-based menu — à la carte fixes priced from the costing model & benchmarked to package rates [saloon, SUV] */
const PROBLEMS = [
  { id:"wash",       group:"Exterior", name:"Dirty / dusty bodywork",            fix:"Exterior wash & shine",           price:[5000,7000] },
  { id:"heavy",      group:"Exterior", name:"Very dirty — mud, caked-on grime",  fix:"Heavy decontamination wash",      price:[8000,10000] },
  { id:"swirls",     group:"Exterior", name:"Swirls, scratches, dull paint",     fix:"3-step paint correction",         price:[22000,28000] },
  { id:"contam",     group:"Exterior", name:"Rough paint — tar, sap, overspray", fix:"Clay-bar decontamination",        price:[6000,8000] },
  { id:"trim",       group:"Exterior", name:"Faded black plastic trim",          fix:"Trim restoration & coating",      price:[6000,8000] },
  { id:"headlights", group:"Exterior", name:"Cloudy / yellow headlights",        fix:"Headlight restoration",           price:[5000,6000] },
  { id:"wheels",     group:"Exterior", name:"Dirty wheels, brake dust",          fix:"Wheel & arch deep clean",         price:[3500,4500] },
  { id:"glass",      group:"Exterior", name:"Water spots, poor rain visibility", fix:"Glass polish & coating",          price:[10000,12000] },
  { id:"intclean",   group:"Interior", name:"Dirty interior — dust, crumbs",     fix:"Interior vacuum & wipe-down",     price:[4000,5000] },
  { id:"seats",      group:"Interior", name:"Stained seats / carpets",           fix:"Shampoo & extraction",            price:[12000,15000] },
  { id:"dash",       group:"Interior", name:"Dull / faded dashboard & plastics", fix:"Interior dressing & restoration", price:[4000,5000] },
  { id:"leather",    group:"Interior", name:"Dry / dirty leather",               fix:"Leather deep clean & condition",  price:[6000,7500] },
  { id:"smell",      group:"Interior", name:"Smelly / musty A/C & cabin",        fix:"A/C deep clean & deodorise",      price:[3500,4500] },
  { id:"pethair",    group:"Interior", name:"Pet hair",                          fix:"Pet-hair removal",                price:[3000,4000] },
  { id:"engine",     group:"Extras",   name:"Dirty engine bay",                  fix:"Engine bay clean & dress",        price:[4000,5000] },
  { id:"newcar",     group:"Extras",   name:"Brand-new imported car",            fix:"New Car Detailing (salt decon)",  price:[45000,55000] },
];
const VEHICLES = {
    'BYD':           { models: ['Atto 3','Dolphin','Seal','Seal U','Han','Tang','Song Plus','Yuan Plus','Qin Plus','Shark'], type: {'Atto 3':'suv','Seal U':'suv',Tang:'large_suv','Song Plus':'suv','Yuan Plus':'suv',Shark:'truck'} },
    'Changan':       { models: ['CS35 Plus','CS55 Plus','CS75 Plus','UNI-T','UNI-K','Eado','Alsvin','Hunter'], type: {'CS35 Plus':'suv','CS55 Plus':'suv','CS75 Plus':'suv','UNI-T':'suv','UNI-K':'large_suv',Hunter:'truck'} },
    'Chery':         { models: ['Tiggo 2 Pro','Tiggo 4 Pro','Tiggo 7 Pro','Tiggo 8 Pro','Arrizo 5','Arrizo 6','Arrizo 8'], type: {'Tiggo 2 Pro':'suv','Tiggo 4 Pro':'suv','Tiggo 7 Pro':'suv','Tiggo 8 Pro':'large_suv'} },
    'Dongfeng':      { models: ['Rich 6','AX7','580','T5 Evo'], type: {'Rich 6':'truck',AX7:'suv','580':'suv','T5 Evo':'suv'} },
    'Foton':         { models: ['Tunland','Tunland G7','View','Aumark','Sauvana'], type: {Tunland:'truck','Tunland G7':'truck',View:'truck',Aumark:'truck',Sauvana:'large_suv'} },
    'Geely':         { models: ['Coolray','Azkarra','Atlas','Tugella','Okavango','Emgrand','Preface','Monjaro','Geometry C'], type: {Coolray:'suv',Azkarra:'suv',Atlas:'suv',Tugella:'suv',Okavango:'large_suv',Monjaro:'suv','Geometry C':'suv'} },
    'GWM':           { models: ['Poer','Wingle 5','Wingle 7','Haval H6','Haval Jolion','Tank 300','Tank 500','Ora 03'], type: {Poer:'truck','Wingle 5':'truck','Wingle 7':'truck','Haval H6':'suv','Haval Jolion':'suv','Tank 300':'suv','Tank 500':'large_suv'} },
    'Haval':         { models: ['H6','Jolion','Dargo','H9','Big Dog'], type: {H6:'suv',Jolion:'suv',Dargo:'suv',H9:'large_suv','Big Dog':'suv'} },
    'Hongqi':        { models: ['H5','H9','HS5','HS7','E-HS9'], type: {HS5:'suv',HS7:'large_suv','E-HS9':'large_suv'} },
    'JAC':           { models: ['T6','T8','T9','S2','S3','S4','JS4','J7'], type: {T6:'truck',T8:'truck',T9:'truck',S2:'suv',S3:'suv',S4:'suv',JS4:'suv'} },
    'Jetour':        { models: ['Dashing','X70','X70 Plus','X90','X95'], type: {Dashing:'suv',X70:'suv','X70 Plus':'suv',X90:'large_suv',X95:'large_suv'} },
    'Maxus':         { models: ['T60','T70','T90','D90','G10','G50'], type: {T60:'truck',T70:'truck',T90:'truck',D90:'large_suv',G10:'truck',G50:'suv'} },
    'MG':            { models: ['MG3','MG5','MG ZS','MG HS','MG RX5','MG One','MG GT','MG4'], type: {'MG ZS':'suv','MG HS':'suv','MG RX5':'suv','MG One':'suv'} },
    'Omoda':         { models: ['Omoda 5','Omoda C5'], type: {'Omoda 5':'suv','Omoda C5':'suv'} },
    'Wuling':        { models: ['Bingo','Hongguang','Almaz'], type: {Almaz:'suv'} },
    'Zeekr':         { models: ['001','007','X','7X'], type: {X:'suv','7X':'suv'} },
    'Acura':         { models: ['ILX','Integra','MDX','NSX','RDX','RLX','TL','TLX','TSX','ZDX'], type: {MDX:'suv',RDX:'suv',ZDX:'suv'} },
    'Alfa Romeo':    { models: ['4C','Giulia','Stelvio','Tonale'], type: {Stelvio:'suv',Tonale:'suv'} },
    'Aston Martin':  { models: ['DB11','DB12','DBS','DBX','Rapide','Vantage'], type: {DBX:'suv'} },
    'Audi':          { models: ['A3','A4','A5','A6','A7','A8','e-tron','e-tron GT','Q3','Q4 e-tron','Q5','Q7','Q8','R8','RS3','RS5','RS6','RS7','S3','S4','S5','S6','S7','S8','SQ5','SQ7','SQ8','TT'], type: {Q3:'suv','Q4 e-tron':'suv',Q5:'suv',Q7:'suv',Q8:'suv',SQ5:'suv',SQ7:'suv',SQ8:'suv','e-tron':'suv'} },
    'Bentley':       { models: ['Bentayga','Continental GT','Flying Spur','Mulsanne'], type: {Bentayga:'large_suv'} },
    'BMW':           { models: ['1 Series','2 Series','3 Series','4 Series','5 Series','7 Series','8 Series','i3','i4','i7','iX','M2','M3','M4','M5','M8','X1','X2','X3','X4','X5','X6','X7','XM','Z4'], type: {X1:'suv',X2:'suv',X3:'suv',X4:'suv',X5:'suv',X6:'suv',X7:'large_suv',XM:'suv',iX:'suv'} },
    'Buick':         { models: ['Enclave','Encore','Encore GX','Envision','LaCrosse'], type: {Enclave:'large_suv',Encore:'suv','Encore GX':'suv',Envision:'suv'} },
    'Cadillac':      { models: ['CT4','CT5','CT6','Escalade','Escalade ESV','Lyriq','XT4','XT5','XT6'], type: {Escalade:'large_suv','Escalade ESV':'large_suv',XT4:'suv',XT5:'suv',XT6:'large_suv',Lyriq:'suv'} },
    'Chevrolet':     { models: ['Blazer','Bolt EV','Bolt EUV','Camaro','Colorado','Corvette','Equinox','Express','Malibu','Silverado 1500','Silverado 2500HD','Silverado 3500HD','Spark','Suburban','Tahoe','Trailblazer','Traverse','Trax'], type: {Blazer:'suv',Equinox:'suv',Suburban:'large_suv',Tahoe:'large_suv',Traverse:'large_suv',Trailblazer:'suv',Trax:'suv',Colorado:'truck','Silverado 1500':'truck','Silverado 2500HD':'truck','Silverado 3500HD':'truck',Express:'truck'} },
    'Chrysler':      { models: ['300','Pacifica','Voyager'], type: {Pacifica:'suv'} },
    'Dodge':         { models: ['Challenger','Charger','Durango','Grand Caravan','Hornet'], type: {Durango:'large_suv',Hornet:'suv'} },
    'Ferrari':       { models: ['296 GTB','488','812 Superfast','California','F8 Tributo','GTC4Lusso','Portofino','Purosangue','Roma','SF90 Stradale'], type: {Purosangue:'suv'} },
    'Ford':          { models: ['Bronco','Bronco Sport','Edge','Escape','Expedition','Expedition MAX','Explorer','F-150','F-150 Lightning','F-250 Super Duty','F-350 Super Duty','Maverick','Mustang','Mustang Mach-E','Ranger','Transit'], type: {Bronco:'suv','Bronco Sport':'suv',Edge:'suv',Escape:'suv',Expedition:'large_suv','Expedition MAX':'large_suv',Explorer:'large_suv','Mustang Mach-E':'suv',Maverick:'truck',Ranger:'truck','F-150':'truck','F-150 Lightning':'truck','F-250 Super Duty':'truck','F-350 Super Duty':'truck',Transit:'truck'} },
    'Genesis':       { models: ['G70','G80','G90','GV70','GV80','GV90'], type: {GV70:'suv',GV80:'suv',GV90:'large_suv'} },
    'GMC':           { models: ['Acadia','Canyon','Sierra 1500','Sierra 2500HD','Sierra 3500HD','Terrain','Yukon','Yukon XL'], type: {Acadia:'large_suv',Terrain:'suv',Yukon:'large_suv','Yukon XL':'large_suv',Canyon:'truck','Sierra 1500':'truck','Sierra 2500HD':'truck','Sierra 3500HD':'truck'} },
    'Honda':         { models: ['Fit / Jazz','Freed','Grace','Civic / Ferio','Accord / Inspire','Insight','Vezel / HR-V','CR-V','ZR-V','Pilot','Passport','Odyssey','Stepwgn','Shuttle','N-Box','N-One','S660','Ridgeline','Prologue'], type: {'Vezel / HR-V':'suv','CR-V':'suv','ZR-V':'suv',Passport:'suv',Pilot:'large_suv',Prologue:'suv',Odyssey:'van',Stepwgn:'van',Freed:'van',Ridgeline:'truck','Accord / Inspire':'','Civic / Ferio':'','Fit / Jazz':'','Grace':'','Shuttle':'','N-Box':'','N-One':''} },
    'Hyundai':       { models: ['Accent','Elantra','IONIQ 5','IONIQ 6','IONIQ 7','Kona','Palisade','Santa Cruz','Santa Fe','Sonata','Tucson','Venue'], type: {Kona:'suv',Palisade:'large_suv','Santa Fe':'suv',Tucson:'suv',Venue:'suv','IONIQ 5':'suv','IONIQ 7':'large_suv','Santa Cruz':'truck'} },
    'Infiniti':      { models: ['Q50','Q60','QX50','QX55','QX60','QX80'], type: {QX50:'suv',QX55:'suv',QX60:'large_suv',QX80:'large_suv'} },
    'Jaguar':        { models: ['E-Pace','F-Pace','F-Type','I-Pace','XE','XF','XJ'], type: {'E-Pace':'suv','F-Pace':'suv','I-Pace':'suv'} },
    'Jeep':          { models: ['Cherokee','Compass','Gladiator','Grand Cherokee','Grand Cherokee L','Grand Wagoneer','Renegade','Wagoneer','Wrangler','Wrangler 4xe'], type: {Cherokee:'suv',Compass:'suv','Grand Cherokee':'suv','Grand Cherokee L':'large_suv','Grand Wagoneer':'large_suv',Renegade:'suv',Wagoneer:'large_suv',Wrangler:'suv','Wrangler 4xe':'suv',Gladiator:'truck'} },
    'Kia':           { models: ['Carnival','EV6','EV9','Forte','K5','Niro','Seltos','Sorento','Soul','Sportage','Stinger','Telluride'], type: {Niro:'suv',Seltos:'suv',Sorento:'suv',Telluride:'large_suv',Sportage:'suv',Soul:'suv',EV9:'large_suv',EV6:'suv',Carnival:'suv'} },
    'Lamborghini':   { models: ['Huracan','Revuelto','Urus','Sterrato'], type: {Urus:'suv'} },
    'Land Rover':    { models: ['Defender','Discovery','Discovery Sport','Range Rover','Range Rover Evoque','Range Rover Sport','Range Rover Velar'], type: {Defender:'suv',Discovery:'large_suv','Discovery Sport':'suv','Range Rover':'large_suv','Range Rover Evoque':'suv','Range Rover Sport':'suv','Range Rover Velar':'suv'} },
    'Lexus':         { models: ['ES','GS','GX','IS','LC','LS','LX','LX600','LX570','LX450d','NX','RC','RX','TX','UX'], type: {GX:'suv',LX:'large_suv',LX600:'large_suv',LX570:'large_suv',LX450d:'large_suv',NX:'suv',RX:'suv',TX:'large_suv',UX:'suv'} },
    'Lincoln':       { models: ['Aviator','Corsair','MKZ','Nautilus','Navigator','Navigator L'], type: {Aviator:'large_suv',Corsair:'suv',Nautilus:'suv',Navigator:'large_suv','Navigator L':'large_suv'} },
    'Maserati':      { models: ['Ghibli','Grecale','GranTurismo','Levante','MC20','Quattroporte'], type: {Levante:'suv',Grecale:'suv'} },
    'Mazda':         { models: ['Mazda2 / Demio','Mazda3 / Axela','Mazda6 / Atenza','CX-3','CX-30','CX-5','CX-50','CX-60','CX-70','CX-80','CX-90','Premacy','Biante','MPV','BT-50','MX-5 Miata / Roadster','MX-30'], type: {'CX-3':'suv','CX-30':'suv','CX-5':'suv','CX-50':'suv','CX-60':'suv','CX-70':'large_suv','CX-80':'large_suv','CX-90':'large_suv','MX-30':'suv','Premacy':'van','Biante':'van','MPV':'van','BT-50':'truck','Mazda2 / Demio':'','Mazda3 / Axela':'','Mazda6 / Atenza':'','MX-5 Miata / Roadster':''} },
    'Suzuki':        { models: ['Alto','Swift','Baleno','Celerio','Ignis','Wagon R','Solio','Vitara / Escudo','Jimny','SX4 S-Cross','Ertiga','Every','Carry'], type: {'Vitara / Escudo':'suv',Jimny:'suv','SX4 S-Cross':'suv',Ertiga:'van',Solio:'van',Every:'van',Carry:'truck'} },
    'Daihatsu':      { models: ['Mira','Move','Boon','Sirion','Tanto','Cast','Terios','Rocky','Hijet','Gran Max'], type: {Terios:'suv',Rocky:'suv',Hijet:'van','Gran Max':'van'} },
    'Isuzu':         { models: ['D-Max','MU-X','Bighorn','Wizard','ELF'], type: {'MU-X':'large_suv',Bighorn:'large_suv',Wizard:'suv','D-Max':'truck',ELF:'truck'} },
    'McLaren':       { models: ['570S','600LT','720S','750S','765LT','Artura','GT','Senna'] },
    'Mercedes-Benz': { models: ['A-Class','AMG GT','C-Class','C180','C200','C220d','C250','C300','C43 AMG','C63 AMG','CLA','CLS','E-Class','E200','E220d','E250','E300','E350','E400','E450','E63 AMG','EQB','EQC','EQE','EQS','G-Class','GLA','GLB','GLC','GLE','GLS','S-Class','SL'], type: {GLA:'suv',GLB:'suv',GLC:'suv',GLE:'suv',GLS:'large_suv','G-Class':'suv',EQB:'suv',EQC:'suv',EQE:'suv',EQS:'suv'} },
    'MINI':          { models: ['Clubman','Convertible','Countryman','Hardtop'], type: {Countryman:'suv'} },
    'Mitsubishi':    { models: ['Eclipse Cross','Mirage / Attrage','Outlander','Outlander PHEV','Outlander Sport / ASX','Delica','Pajero / Montero','Galant Fortis / Lancer'], type: {'Eclipse Cross':'suv',Outlander:'suv','Outlander PHEV':'suv','Outlander Sport / ASX':'suv',Delica:'suv','Pajero / Montero':'large_suv','Mirage / Attrage':'','Galant Fortis / Lancer':''} },
    'Nissan':        { models: ['Note','Note Nismo','Note e-Power','X-Trail','Juke','Qashqai / Dualis','Serena','Tiida','Sylphy','Wingroad','Navara','Altima','Armada','Frontier','GT-R','Kicks','Leaf','Maxima','Murano','Pathfinder','Rogue','Rogue Sport','Sentra','Titan','Titan XD','Z'], type: {'X-Trail':'suv',Juke:'suv','Qashqai / Dualis':'suv',Serena:'van',Navara:'truck',Armada:'large_suv',Kicks:'suv',Murano:'suv',Pathfinder:'large_suv',Rogue:'suv','Rogue Sport':'suv',Frontier:'truck',Titan:'truck','Titan XD':'truck'} },
    'Porsche':       { models: ['718 Boxster','718 Cayman','911','Cayenne','Cayenne Coupe','Macan','Panamera','Taycan'], type: {Cayenne:'suv','Cayenne Coupe':'suv',Macan:'suv'} },
    'RAM':           { models: ['1500','1500 Classic','2500','3500','ProMaster','ProMaster City'], type: {'1500':'truck','1500 Classic':'truck','2500':'truck','3500':'truck',ProMaster:'truck','ProMaster City':'truck'} },
    'Rivian':        { models: ['R1S','R1T'], type: {R1S:'large_suv',R1T:'truck'} },
    'Rolls-Royce':   { models: ['Cullinan','Dawn','Ghost','Phantom','Spectre','Wraith'], type: {Cullinan:'large_suv'} },
    'Subaru':        { models: ['Ascent','BRZ / Toyota GR86','Crosstrek / XV','Forester','Impreza','Legacy / Liberty','Outback','Solterra','WRX / Impreza WRX','Levorg','Exiga'], type: {Ascent:'large_suv','BRZ / Toyota GR86':'','Crosstrek / XV':'suv',Forester:'suv',Outback:'suv',Solterra:'suv','Legacy / Liberty':'','WRX / Impreza WRX':'','Levorg':''} },
    'Tesla':         { models: ['Cybertruck','Model 3','Model S','Model X','Model Y'], type: {'Model X':'suv','Model Y':'suv',Cybertruck:'truck'} },
    'Toyota':        { models: ['Vitz / Yaris','Passo','Aqua','Corolla / Auris','Corolla Fielder','Premio','Allion','Belta','Camry','Crown','Mark X','Avalon / Camry XV70','Prius','C-HR','Corolla Cross','RAV4','RAV4 Prime','Harrier','Venza','Rush','Fortuner','4Runner','Land Cruiser','Land Cruiser Prado','Sequoia','Highlander / Kluger','bZ4X','Sienta','Noah / Voxy','Esquire','Alphard','Vellfire','Wish','Isis','Ractis','Porte','Probox / Succeed','Hiace','Hilux','Tacoma','Tundra','86 / GT86','GR86','GR Supra / A90 Supra','Mirai'], type: {'Rush':'suv','Fortuner':'suv','4Runner':'suv','C-HR':'suv','Corolla Cross':'suv','Harrier':'suv','Venza':'suv','bZ4X':'suv','Highlander / Kluger':'large_suv','Land Cruiser':'large_suv','Land Cruiser Prado':'large_suv',Sequoia:'large_suv','RAV4':'suv','RAV4 Prime':'suv','Sienta':'van','Noah / Voxy':'van',Esquire:'van',Alphard:'van',Vellfire:'van',Wish:'van',Isis:'van',Hiace:'van','Probox / Succeed':'van',Hilux:'truck',Tacoma:'truck',Tundra:'truck'} },
    'Volkswagen':    { models: ['Arteon','Atlas','Atlas Cross Sport','Golf','Golf GTI','ID.4','ID.Buzz','Jetta','Passat','Taos','Tiguan'], type: {Atlas:'large_suv','Atlas Cross Sport':'suv','ID.4':'suv','ID.Buzz':'suv',Taos:'suv',Tiguan:'suv'} },
    'Volvo':         { models: ['C40 Recharge','EX30','EX40','EX90','S60','S90','V60','V90','XC40','XC60','XC90'], type: {'C40 Recharge':'suv',EX30:'suv',EX40:'suv',EX90:'large_suv',XC40:'suv',XC60:'suv',XC90:'large_suv'} },
    'Vauxhall':      { models: ['Corsa','Astra','Insignia','Adam','Mokka','Crossland','Grandland','Vivaro'], type: {Mokka:'suv',Crossland:'suv',Grandland:'suv',Vivaro:'van'} },
    'MG':            { models: ['MG3','MG4','MG5','MG ZS','MG HS','MG RX5'], type: {'MG ZS':'suv','MG HS':'suv','MG RX5':'suv'} },
    'Peugeot':       { models: ['108','208','308','508','2008','3008','5008','Partner','Rifter'], type: {'2008':'suv','3008':'suv','5008':'large_suv',Partner:'van',Rifter:'van'} },
    'Renault':       { models: ['Clio','Megane','Captur','Kadjar','Koleos','Duster','Kangoo','Trafic'], type: {Captur:'suv',Kadjar:'suv',Koleos:'suv',Duster:'suv',Kangoo:'van',Trafic:'van'} },
    'Citroen':       { models: ['C1','C3','C3 Aircross','C4','C5 Aircross','Berlingo'], type: {'C3 Aircross':'suv','C5 Aircross':'suv',Berlingo:'van'} },
    'Fiat':          { models: ['500','500X','Panda','Tipo','Doblo'], type: {'500X':'suv',Doblo:'van'} },
    'Skoda':         { models: ['Fabia','Scala','Octavia','Superb','Kamiq','Karoq','Kodiaq','Enyaq'], type: {Kamiq:'suv',Karoq:'suv',Kodiaq:'large_suv',Enyaq:'suv'} },
    'SEAT':          { models: ['Ibiza','Leon','Arona','Ateca','Tarraco'], type: {Arona:'suv',Ateca:'suv',Tarraco:'large_suv'} },
    'Bentley':       { models: ['Bentayga','Continental GT','Flying Spur','Mulsanne'], type: {Bentayga:'large_suv'} },
    'Aston Martin':  { models: ['DB11','DB12','DBS','Vantage','DBX','Rapide'], type: {DBX:'suv'} },
  };
const TYPE_MAP={suv:{v:1,label:"SUV / Crossover — SUV pricing"},large_suv:{v:1,label:"Large SUV — SUV pricing"},truck:{v:1,label:"Pickup / van — SUV pricing"},van:{v:1,label:"Van — SUV pricing"}};
const SALOON_RESULT={v:0,label:"Saloon / sedan / hatchback — saloon pricing"};
function detectClass(make,model){const entry=VEHICLES[make];const t=entry&&entry.type?entry.type[model]:undefined;const r=TYPE_MAP[t]||SALOON_RESULT;return{v:r.v,label:r.label};}


const SERVICE_GROUPS=[
  {id:"package",label:"Package",items:DETAIL.filter(d=>d.id!=="none")},
  {id:"addon",label:"Add-on",items:ADDONS},
  {id:"ppf",label:"PPF",items:PPF_COV.filter(p=>p.id!=="none")},
  {id:"tint",label:"Window Tint",items:TINT_COV.filter(t=>t.id!=="none")},
  {id:"problem",label:"By Problem",items:PROBLEMS},
];

window.CATALOG = {DISCOUNT_RATE,COMMISSION_RATE,CHANNELS,CATEGORIES,DETAIL,ADDONS,MEMBERSHIP,PPF_COV,PPF_FILM,TINT_COV,TINT_FILM,PROBLEMS,VEHICLES,TYPE_MAP,SALOON_RESULT,detectClass,SERVICE_GROUPS};
})();
