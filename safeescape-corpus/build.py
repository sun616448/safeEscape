#!/usr/bin/env python3
"""Builds resources.json / resources.csv for the SafeEscape Bay Area corpus and validates them.

Every entry carries source_url, verified_on and a confidence tag:
  official   - read on a government / court / agency page this session
  aggregator - read only on a third-party directory (womenslaw.org, 1degree.org); call to confirm
  conflict   - sources disagree; see notes
"""
import csv, json, re, sys

V = "2026-11-06"
WL = "https://www.womenslaw.org/find-help/ca/advocates-and-shelters/local-programs/all"

# (id, name, category, counties, phone_24h, phone_office, text, address, hours, languages, website, services, access_note, confidence, source_url, notes)
def E(id, name, cat, counties, p24=None, office=None, text=None, addr=None, hours=None, langs=None,
      web=None, services=None, access=None, conf="official", src=None, notes=None):
    return dict(id=id, name=name, category=cat, counties=counties, phone_24h=p24, phone_office=office,
                text=text, address=addr, hours=hours, languages=langs, website=web, services=services,
                access_note=access, confidence=conf, source_url=src, verified_on=V, notes=notes)

ALL9 = ["Alameda","Contra Costa","Marin","Napa","San Francisco","San Mateo","Santa Clara","Solano","Sonoma"]

R = [
# ---------------- statewide / national ----------------
E("ndvh","National Domestic Violence Hotline","hotline",ALL9,p24="1-800-799-7233",text="Text START to 88788",
  web="https://www.thehotline.org/",services="24/7 phone, chat and text with advocates; safety planning; referrals",
  src="https://nnedv.org/content/technology-safety/",notes="Cited by Alameda, SF, Santa Clara county pages."),
E("calvcb","CalVCB (California Victim Compensation Board)","financial",ALL9,office="1-800-777-9229",
  web="https://victims.ca.gov/",services="Pays crime-related costs not covered elsewhere: relocation, mental health, medical, dental, home security.",
  access="Apply online (EN/ES) or by paper; an advocate can help via victims.ca.gov/get-help. Relay: 711.",
  src="https://victims.ca.gov/uploads/DVAM_Fact-Sheet_2026.pdf",
  notes="No police report required: DV program letter, medical/mental-health records or a restraining order can be used. Fact sheet does not name transportation or emergency housing explicitly; confirm with CalVCB."),
E("safe-at-home","California Safe at Home (Secretary of State)","state_program",ALL9,office="1-877-322-5227",
  web="https://www.sos.ca.gov/safeathome",services="Substitute mailing address accepted by state/county/city agencies; confidential voter registration.",
  access="Enroll by appointment with a designated Enrolling Agency (look-up on the SOS site). Email SafeAtHome@sos.ca.gov. Also (916) 653-6814.",
  src="https://www.sos.ca.gov/safeathome",notes="Duration/renewal terms not stated on the page; confirm with program."),
E("safety-net","NNEDV Safety Net (technology safety)","tech_safety",ALL9,web="https://www.techsafety.org/",
  services="Guidance on stalkerware, location tracking, account security, evidence documentation.",
  access="Page advises clearing browser history after visiting if your device is monitored.",
  src="https://nnedv.org/content/technology-safety/"),

# ---------------- Alameda ----------------
E("fvlc","Family Violence Law Center (Mobile Response Team)","hotline",["Alameda"],p24="1-800-947-8301",office="(510) 208-0220",
  web="https://fvlc.org/",services="24-hr crisis line, safety planning, emergency relocation to confidential location, restraining-order help, court accompaniment.",
  langs="Interpreter available",src="https://socialservices.alamedacountyca.gov/ex/our-services/Abuse-and-Protection/Other-Support/Domestic-violence",
  notes="County page also lists MRT direct line (510) 757-5123. Office number (510) 208-0220 confirmed on Alameda court flyer."),
E("acfjc","Alameda County Family Justice Center","family_justice_center",["Alameda"],office="(510) 267-8800",web="https://acfjc.org/",
  services="Multi-agency services: DV, stalking, sexual assault, trafficking, abuse; counseling; restraining-order help.",
  access="info@acfjc.org",src="https://www.alameda.courts.ca.gov/system/files/general/self-help-flyer-rev11025.pdf",
  notes="Street address and hours NOT captured (acfjc.org blocked by fetch allowlist). Verify before publishing."),
E("save","SAVE - Safe Alternatives to Violent Environments","hotline",["Alameda"],p24="(510) 794-6055",office="(510) 574-2250",
  web="https://save-dv.org/",services="IPV hotline, emergency shelter, restraining-order help, counseling (Fremont).",conf="aggregator",src=WL),
E("building-futures","Building Futures","hotline",["Alameda"],p24="(866) 292-9688",office="(510) 357-0205",web="https://bfwc.org/",
  services="DV hotline (866-A-WAY-OUT), confidential shelter, counseling, housing for homeless survivors (San Leandro).",conf="aggregator",src=WL),
E("a-safe-place","A Safe Place","hotline",["Alameda"],p24="(510) 536-7233",office="(510) 986-8600",web="https://www.asafeplace.org/",
  services="DV hotline, shelter, counseling, children's programs, legal help (Oakland).",conf="aggregator",src=WL),
E("tri-valley-haven","Tri-Valley Haven","hotline",["Alameda"],p24="(925) 449-5842",office="(925) 449-5845",web="https://trivalleyhaven.org/",
  services="DV/sexual assault hotline, shelter, counseling, food pantry (Livermore). Toll-free (800) 884-8119.",conf="aggregator",src=WL),
E("restorative-pathways","Restorative Pathways","hotline",["Alameda"],p24="(888) 339-7233",office="(510) 581-5626",text="Youth text line (510) 214-6331",
  web="https://restorativepathways.org/",services="DV and trafficking services, trauma mental health, housing, shelters (Castro Valley).",conf="aggregator",src=WL),
E("narika","Narika (South Asian community)","culturally_specific",["Alameda"],office="(800) 215-7308",web="https://www.narika.org/",
  services="Culturally specific DV services, transitional housing, multilingual support groups.",conf="aggregator",src=WL),
E("deafhope","DeafHope","culturally_specific",["Alameda","Contra Costa"],office="(510) 267-8800 (voice); (510) 735-8553 (VP)",web="http://www.deaf-hope.org/",
  services="Advocacy for Deaf survivors of DV and sexual violence; peer counseling.",conf="aggregator",src=WL),
E("bala-alameda","Bay Area Legal Aid - Oakland","legal",["Alameda"],office="(800) 551-5554",addr="1735 Telegraph Ave, Oakland, CA 94612",
  web="https://baylegal.org/",services="Free legal help with domestic violence restraining orders (income-eligible).",
  src="https://www.alameda.courts.ca.gov/system/files/general/self-help-flyer-rev11025.pdf"),
E("alameda-court-selfhelp","Alameda Superior Court Self-Help Center","court_help",["Alameda"],office="(510) 272-1393",
  hours="Phone Mon-Thu 2-4 pm (messages only; callbacks within 5 business days). Live chat Mon-Thu 9 am-12 pm.",
  web="https://www.alameda.courts.ca.gov/self-help",services="Help with DV, civil harassment, elder abuse restraining orders. Appointments by Zoom/phone/in person.",
  access="No walk-ins. Screening via LiveChat or phone.",src="https://www.alameda.courts.ca.gov/system/files/general/self-help-flyer-rev11025.pdf"),
E("alameda-da-vw","Alameda County DA Victim-Witness (Main Office)","victim_services",["Alameda"],office="(510) 272-6180",
  web="https://da.alamedacountyca.gov/victim-witness/",services="Crisis intervention, emergency aid, court accompaniment. East County (Dublin): (925) 803-7171.",conf="aggregator",src=WL),
E("alameda-housing","Alameda County emergency shelter / hotel vouchers (SSA + 211)","housing",["Alameda"],office="211",text="Text your ZIP to 898211",
  addr=None,services="Social worker at SSA office or Housing Resource Center can connect to shelter or hotel voucher. Bay Area Helpline 1-800-273-6222.",
  access="Fleeing DV qualifies as homeless for county purposes.",src="https://socialservices.alamedacountyca.gov/our-services/Shelter-and-Housing/Other-Support/emergency-shelters",
  notes="Hotel voucher eligibility criteria not published on page."),

# ---------------- Contra Costa ----------------
E("stand","STAND! For Families Free of Violence","hotline",["Contra Costa"],p24="888-215-5555",office="(925) 676-2845",
  web="https://www.standffov.org/",services="DV/child abuse hotline, safety planning, case management, legal advocacy, children's counseling. Offices Concord, Antioch, Richmond.",
  src="https://www.contracosta.ca.gov/10029/Victims-Rights-Resources",notes="Office number from womenslaw.org (aggregator)."),
E("cvs","Community Violence Solutions (sexual assault + family violence)","hotline",["Contra Costa","Marin"],p24="800-670-7273",text="Text CVS to 20121 (Contra Costa)",
  web="https://cvsolutions.org/",services="Sexual assault hotline, rape crisis center, hospital and legal accompaniment, child victim services.",
  src="https://www.contracosta.ca.gov/10029/Victims-Rights-Resources"),
E("cc-fjc","Contra Costa Family Justice Centers","family_justice_center",["Contra Costa"],
  office="Antioch 925-281-0970; Concord 925-521-6366; Danville 925-486-0100; Richmond 510-965-4949",
  hours="Mon-Fri 9 am-5 pm",web="https://www.cocofamilyjustice.org/",services="DV, sexual assault, elder abuse, human trafficking support.",
  src="https://www.contracosta.ca.gov/10029/Victims-Rights-Resources",notes="Street addresses not on county page; get from cocofamilyjustice.org."),
E("cc-da-vw","Contra Costa DA Victim-Witness Assistance","victim_services",["Contra Costa"],office="925-957-8650",hours="Mon-Fri 9 am-5 pm",
  src="https://www.contracosta.ca.gov/10029/Victims-Rights-Resources"),
E("bala-cc-dvro","Bay Area Legal Aid - Contra Costa DVRO Clinic","legal",["Contra Costa"],office="(800) 551-5554",
  hours="Held remotely by phone on Tuesdays (a Nov 10, 2026 session was listed 9:30 am-1:00 pm; confirm times)",
  web="https://baylegal.org/resources/domestic-violence-restraining-order-clinics/",services="Free DVRO clinic. Admin office (510) 663-4755. Relay 711.",
  access="Sign-up method not described on page - call the advice line.",src="https://baylegal.org/resources/domestic-violence-restraining-order-clinics/"),

# ---------------- San Francisco ----------------
E("sf-aws","Asian Women's Shelter","shelter",["San Francisco"],p24="1-877-751-0880",office="415-751-7110",addr="Office: 3543 18th St #19, SF 94110 (shelter location confidential)",
  hours="Shelter 24/7; office 9 am-5 pm",services="Emergency shelter for women and children. Coordinated-entry access point 415-926-3328 (Mon-Fri 9:30 am-4 pm, phone only).",
  access="Call the crisis line to access shelter.",src="https://www.sf.gov/information/shelter-women-and-children-experiencing-domestic-violence"),
E("sf-lacasa","La Casa de las Madres","shelter",["San Francisco"],p24="877-503-1850",office="415-503-0500",text="415-200-3575 (24-hr text); teen line 877-923-0700",
  addr="Office: 1269 Howard St, SF 94103 (shelter location confidential)",hours="Shelter 24/7; office Mon/Wed/Fri 9 am-5 pm",
  services="Emergency shelter (8-week program) for women, teens and children; male children/teens welcome.",access="Call crisis line to access shelter.",
  src="https://www.sf.gov/information/shelter-women-and-children-experiencing-domestic-violence"),
E("sf-riley","St. Vincent de Paul - Riley Center","shelter",["San Francisco"],p24="415-255-0165",addr="Access point: 1175 Howard St, SF",
  hours="Access point Mon-Fri 9 am-12 pm and 1-4:30 pm; crisis line 24/7",services="Emergency shelter; coordinated-entry access point for survivors.",
  src="https://hsh.archive.sf.gov/services/how-to-get-services/coordinated-entry-access-points-for-survivors-of-violence/"),
E("sf-safehouse","San Francisco SafeHouse","housing",["San Francisco"],office="415-643-7861",addr="Access point: 1089 Mission St, SF 94103 (in person only)",
  hours="Access point Mon 1-7:30 pm; Tue-Fri 1-5 pm and 6-11:30 pm",services="Transitional housing, rapid rehousing, emergency hotel vouchers.",
  src="https://hsh.archive.sf.gov/services/how-to-get-services/coordinated-entry-access-points-for-survivors-of-violence/",
  notes="SafeHouse serves survivors of violence/exploitation; hours came from an archived HSH page - confirm."),
E("sf-raphael","Raphael House","shelter",["San Francisco"],office="415-345-7200",addr="1065 Sutter St, SF 94109",
  services="Shelter for families and women in late pregnancy. Intake via Bayview Access Point 415-430-6320 or Central City Access Point 415-644-0504.",
  src="https://www.sf.gov/information/shelter-women-and-children-experiencing-domestic-violence",notes="Page does not say it is DV-only."),
E("sf-woman","W.O.M.A.N., Inc.","hotline",["San Francisco"],p24="877-384-3578",src="https://sf.gov/domestic-and-family-violence-resources"),
E("sf-sfwar","San Francisco Women Against Rape","hotline",["San Francisco"],p24="415-647-7273",office="415-861-2024",src="https://sf.gov/domestic-and-family-violence-resources"),
E("sf-bwr","Black Women Revolt Against Domestic Violence","hotline",["San Francisco"],office="888-260-1498",src="https://sf.gov/domestic-and-family-violence-resources"),
E("sf-lnf","Love Never Fails","hotline",["San Francisco"],office="844-249-2698",src="https://sf.gov/domestic-and-family-violence-resources"),
E("sf-ovwr","SF Mayor's Office for Victims' Rights","victim_services",["San Francisco"],office="628-652-1175",
  services="Navigation help. Leave voicemail with name, number, whether it is safe to call and when, language; they reply within 48 business hours if safe.",
  access="Online form: sf.gov/get-help-if-you-are-a-victim-or-survivor-in-san-francisco/. info.ovwr@sf.gov",src="https://www.sf.gov/help-for-domestic-and-intimate-partner-violence-victims-in-san-francisco"),
E("sf-cuav","Community United Against Violence (CUAV) - LGBTQ+","culturally_specific",["San Francisco","Alameda"],office="415-777-5500",
  text=None,addr="427 S Van Ness Ave, SF 94103",hours="Mon-Fri 10 am-6 pm",
  services="Free, no citizenship requirement. Support groups, legal assistance, resource list. 415-333-4357 listed as appointment phone.",conf="aggregator",
  src="https://www.1degree.org/opp/get-help-finding-resources-for-community-united-against-violence-san-francisco-california",
  notes="Directory says NO dedicated crisis line. Verify directly before labeling 415-333-4357 as a hotline."),
E("sf-bala","Bay Area Legal Aid - San Francisco","legal",["San Francisco"],office="415-982-1300",addr="1800 Market St, 3rd Floor, SF 94102 (walk-in)",
  web="https://baylegal.org/",services="Family law incl. restraining orders for low-income survivors.",src="https://sf.gov/domestic-and-family-violence-resources"),
E("sf-legal-other","SF legal partners: SF Bar (415-989-1616), API Legal Outreach (415-567-6255 SF / 510-251-2846 Oakland), CROC, Open Door Legal, JDC","legal",["San Francisco"],
  office="415-989-1616",services="Restraining orders and family law. Websites: roclinic.org, opendoorlegal.org, sfbar.org/jdc, apilegaloutreach.org",
  src="https://www.sf.gov/help-for-domestic-and-intimate-partner-violence-victims-in-san-francisco",notes="Split into separate entries in the app."),

# ---------------- San Mateo ----------------
E("cora","CORA - Community Overcoming Relationship Abuse","hotline",["San Mateo"],p24="800-300-1080",web="https://www.corasupport.org/",
  services="County's dedicated IPV agency. resources@corasupport.org",src="https://www.smcgov.org/ceo/news/supervisors-highlight-ongoing-support-domestic-violence-survivors"),
E("smc-fjc","San Mateo County Family Justice Center","family_justice_center",["San Mateo"],addr="1510 Fashion Island Blvd, San Mateo",
  services="DA-operated, multidisciplinary: DV, sexual assault, child/elder abuse, trafficking.",src="https://www.smcgov.org/da/news/launching-san-mateo-countys-new-family-justice-center",
  conf="conflict",notes="Source is a May 14, 2025 launch announcement. Opening date, phone, hours NOT confirmed. Verify it is open before showing."),
E("smc-court","San Mateo Superior Court restraining-order help","court_help",["San Mateo"],web="https://www.sanmateo.courts.ca.gov/flf",
  services="Family Law Facilitator LiveChat; Guide and File online questionnaire (efile: sanmateo.courts.ca.gov/ogf); DVRO e-filing accepted; forms at Redwood City clerk.",
  access="Bay Area Legal Aid San Mateo (650) 358-0745 reviews DVRO forms.",src="https://www.sanmateo.courts.ca.gov/system/files/self-help/restrainingorderassistance.pdf",
  notes="Court page gives no phone for FLF/clerk."),

# ---------------- Santa Clara ----------------
E("nds","Next Door Solutions to Domestic Violence","hotline",["Santa Clara"],p24="(408) 279-2962",addr="234 E Gish Rd, Suite 200, San Jose 95112",langs="English, Spanish, Vietnamese",
  src="https://desj.santaclaracounty.gov/offices/gender-based-violence-prevention/ogbvp-resources"),
E("ywca-sv","YWCA Silicon Valley - DV Support Network","hotline",["Santa Clara"],p24="1-800-572-2782",addr="375 S Third St, San Jose 95112",
  services="Call hotline to schedule Sunnyvale office appointment.",src="https://desj.santaclaracounty.gov/offices/gender-based-violence-prevention/ogbvp-resources"),
E("aaci","AACI Asian Women's Home","hotline",["Santa Clara"],p24="(408) 975-2739",addr="2400 Moorpark Ave, Suite 300, San Jose 95128",langs="English, Vietnamese, Chinese, other Asian languages",
  src="https://desj.santaclaracounty.gov/offices/gender-based-violence-prevention/ogbvp-resources"),
E("maitri","Maitri (South Asian families)","hotline",["Santa Clara"],p24="1-888-862-4874",langs="English, South Asian languages",
  src="https://desj.santaclaracounty.gov/offices/gender-based-violence-prevention/ogbvp-resources"),
E("community-solutions","Community Solutions (Morgan Hill, San Martin, Gilroy)","hotline",["Santa Clara"],p24="1-877-363-7238",langs="English, Spanish",
  src="https://desj.santaclaracounty.gov/offices/gender-based-violence-prevention/ogbvp-resources"),
E("sc-vsu","Santa Clara County Victim Services Unit","victim_services",["Santa Clara"],office="(408) 295-2656",addr="70 W Hedding St, Suite 116, San Jose",hours="Mon-Fri 8 am-5 pm",
  services="Crisis intervention, emergency assistance, court escort, victim compensation help.",src="https://desj.santaclaracounty.gov/offices/gender-based-violence-prevention/ogbvp-resources"),
E("sc-rohc","Santa Clara Restraining Order Help Center","court_help",["Santa Clara"],office="(408) 534-5709",addr="Family Justice Center Courthouse, 201 N First St, San Jose 95113",
  hours="CONFLICT: county page says Mon-Fri 8:30-3:00 (closed 12:30-1:30); court flyer says Mon-Thu 8:30-1:30, Fri 8:30-12:00, emergencies only",
  services="Remote help via scscourt.org; phone (408) 882-2926.",conf="conflict",
  src="https://santaclara.courts.ca.gov/system/files/general/shc-015.pdf",notes="Prefer court's own flyer; call before travel."),
E("sc-probono","Pro Bono Project Silicon Valley","legal",["Santa Clara"],office="408-998-5298",hours="Mon-Fri 8:30 am-5 pm",
  services="Free attorney help for qualifying clients on DV restraining orders, custody, visitation.",src="https://desj.santaclaracounty.gov/offices/gender-based-violence-prevention/ogbvp-resources"),

# ---------------- Marin ----------------
E("cdp","Center for Domestic Peace","hotline",["Marin"],p24="415-924-6616",text="Text line (415) 526-2557 (aggregator)",addr="734 A St, San Rafael 94901",
  hours="Hotline 24/7; office Mon-Fri 9 am-5 pm",langs="English, Spanish",web="https://centerfordomesticpeace.org/",
  services="Emergency shelter, transitional housing, counseling, free legal help; Marin coordinated-entry access point. No citizenship requirement.",
  src="https://www.1degree.org/opp/get-emergency-shelter-services-center-for-domestic-peace-san-rafael-ca",conf="aggregator",
  notes="Hotline confirmed on 1degree and womenslaw; official site not fetched."),

# ---------------- Sonoma ----------------
E("ywca-sonoma","YWCA Sonoma County - DV Services","hotline",["Sonoma"],p24="(707) 546-1234",addr="Family Justice Center, 2755 Mendocino Ave, Santa Rosa",
  hours="FJC weekdays 8:30 am-4:30 pm",langs="Support groups in English or Spanish",
  services="Confidential safe-house shelter, court accompaniment, case management, safety planning, economic empowerment.",src="https://ywca-sonoma.squarespace.com/dv-services"),

# ---------------- Napa ----------------
E("napa-news","Napa Emergency Women's Services (NEWS)","hotline",["Napa"],p24="(707) 255-6397",office="(707) 252-3687",addr="1141 Pear Tree Lane, Suite 220, Napa 94558",
  web="http://www.napanews.org/",services="Confidential emergency shelter, bilingual support groups, court advocacy.",
  src="https://solanocounty.com/depts/fvp/sexual_assault/resources.asp",notes="womenslaw.org also lists 800-799-7233, which is the national hotline - not NEWS."),
E("napa-vs","Napa County Victim Services Division","victim_services",["Napa"],office="(707) 299-1414",conf="aggregator",src=WL),

# ---------------- Solano ----------------
E("safequest","SafeQuest Solano","hotline",["Solano"],p24="1-866-487-7233",office="707-422-7345",addr="1745 Enterprise Dr #2D, Fairfield 94533",
  web="http://www.safequest.org",services="State-certified emergency shelter, 24-hr hotline.",src="https://solanocounty.com/depts/fvp/sexual_assault/resources.asp",
  notes="Solano county page; no Solano Family Justice Center found."),
]

# ===================== v0.2: focus counties + situation layer =====================
FOCUS = {"San Francisco", "San Mateo", "Santa Clara"}
SMC, SCC, SF = ["San Mateo"], ["Santa Clara"], ["San Francisco"]
R = [r for r in R if r["id"] != "sf-legal-other"]   # split into separate entries below
SMCD = "https://www.smcgov.org/ceo/immigration-legal-services"
VSU = "https://sites.google.com/view/vsuresourceguide/immigrant-refugee-support/immigration-law"
SFL = "https://www.sf.gov/legal-services-for-survivors"
R += [
  # ---- emergency text-to-911 ----
  E("smc-text911","Text to 911 (San Mateo County)","emergency",SMC,text="Text 911",
    services="All county police, fire and sheriff dispatchers accept texts (since Oct 2018). Call if you can, text if you can't.",
    access="English only. Needs a text/data plan and location services on. Give exact location; avoid emojis/abbreviations.",
    src="https://www.smchealth.org/article/texting-911-now-option-residents-emergency"),
  E("scc-text911","Text to 911 (Santa Clara County)","emergency",SCC,text="Text 911",
    services="Countywide since Sept 2019; texts route to the local jurisdiction's dispatcher.",
    access="Dispatch cannot pinpoint location from a text; say where you are.",conf="aggregator",
    src="https://www.cbsnews.com/amp/sanfrancisco/news/santa-clara-county-san-jose-text-911-service-first-responders",
    notes="2019 news article: Los Gatos and Campbell were not yet live then; current status unconfirmed. Verify before publishing."),
  E("sf-text911","Text to 911 (San Francisco)","emergency",SF,text="Text 911",
    services="SF.gov's DV page says: if it isn't safe to call, you can text 911.",
    src="https://sf.gov/domestic-and-family-violence-resources",notes="Single-sentence official statement; details (languages, limits) not found."),
  # ---- San Mateo ----
  E("smc-victim-services","San Mateo County Victim Services Division","victim_services",SMC,office="(650) 599-7479",
    services="Court support, emergency assistance, help with CalVCB application. Free; open to all regardless of immigration status, sexual orientation, gender identity, race, religion or income.",
    src="https://www.smcgov.org/dvc/resources"),
  E("smc-rts","Rape Trauma Services (San Mateo County)","hotline",SMC,p24="(650) 692-7273",
    services="24-hr crisis line, accompaniment, advocacy, therapy; children, teens, families. Multiple languages. Free, no insurance needed.",
    src="https://www.smcgov.org/dvc/resources",notes="Sexual violence focus; include for survivors whose abuse includes sexual assault."),
  E("smc-safepets","Peninsula Humane Society & SPCA - Safe Pets Program","pets",SMC,office="650-340-7022 ext. 378",web="https://phs-spca.org/?p=4008",
    services="Up to 30 days of free temporary housing for pets of DV victims.",
    access="Must be a San Mateo County resident AND referred by CORA. Contact: Dayna Pesenti, dpesenti@phs-spca.org.",
    src="https://phs-spca.org/?p=4008"),
  E("smc-bala","Bay Area Legal Aid - San Mateo County","legal",SMC,office="650-358-0745",
    services="Advice line 650-472-2666. Reviews self-completed DVRO forms; free help with immigration issues for low-income DV survivors, including VAWA.",
    src=SMCD),
  E("smc-las","Legal Aid Society of San Mateo County","legal",SMC,office="650-558-0915",services="VAWA, U-visas, DACA, deportation defense. Pro bono for teen parents and their families.",src=SMCD),
  E("smc-catholic","Catholic Charities - Refugee & Immigrant Services (San Mateo)","legal",SMC,office="650-295-2160",services="VAWA, U-visas, citizenship, adjustment of status, SIJS.",src=SMCD,notes="Cost not stated."),
  E("smc-clsepa","Community Legal Services in East Palo Alto","legal",SMC,office="650-326-6440",services="U visas, VAWA self-petitions, removal defense, SIJS.",src=SMCD,notes="Cost not stated."),
  E("smc-ismv","Immigration Services of Mountain View","legal",["San Mateo","Santa Clara"],office="650-938-4911",services="U visa, VAWA, fee waivers, permanent residence, citizenship.",src=SMCD,notes="Cost not stated; fee waivers mentioned."),
  E("smc-iiba","International Institute of the Bay Area","legal",SMC,office="650-780-7530",services="Citizenship, U-visas, VAWA, TPS.",src=SMCD,notes="Cost not stated."),
  E("smc-tahirih","Tahirih Justice Center","legal",SMC,office="650-270-2100",services="Gender-based asylum, VAWA petitions, T and U visas, SIJS.",src=SMCD,notes="Cost not stated."),
  # ---- Santa Clara ----
  E("safechatsv","SafeChat Silicon Valley (online chat)","hotline",SCC,web="https://safechatsv.com",
    services="Online chat with trained advocates; counselors connect you to services. Partners include YWCA, AACI, Community Solutions.",
    src="https://desj.santaclaracounty.gov/offices/gender-based-violence-prevention/ogbvp-resources",
    notes="County page lists hours that vary by day; hours were not captured. Launched 2016 - confirm still active."),
  E("scc-aaci-fjc","AACI Family Justice Center (San Jose)","family_justice_center",SCC,office="(408) 975-2730",addr="2400 Moorpark Ave, Suite 300, San Jose 95128",
    hours="Thursdays 9 am-5 pm",langs="English, Mandarin, Cantonese, Vietnamese, Spanish, Lao, Farsi, Arabic",
    services="Free consults with a DA, family-law attorneys (restraining orders, custody) and immigration attorneys (VAWA, U-visa).",conf="aggregator",src=VSU),
  E("scc-sunnyvale-fjc","Sunnyvale Family Justice Center (YWCA)","family_justice_center",SCC,office="(408) 749-0793",addr="298 S Sunnyvale Ave, Suite 105, Sunnyvale",
    conf="aggregator",src=VSU,notes="Hours/schedule not captured; ywca-sv hotline can schedule an appointment."),
  E("scc-bala","Bay Area Legal Aid - San Jose","legal",SCC,office="(408) 283-3700",addr="4 N Second St, Suite 600, San Jose",
    services="Free civil legal help for low-income people incl. DV-related immigration matters.",conf="aggregator",src=VSU),
  E("scc-cali","Centro de Ayuda Legal para Inmigrantes (CALI)","legal",SCC,office="(650) 938-4041",addr="1125 Benton St, Santa Clara",
    services="VAWA and U-visa.",conf="aggregator",src=VSU,notes="Cost/eligibility not stated."),
  # ---- San Francisco ----
  E("sf-croc","Cooperative Restraining Order Clinic (CROC)","legal",SF,office="415-864-4722",addr="3543 18th St, #5, SF",
    services="Restraining orders; crime-victim (Marsy's Law) help at 415-830-5672.",src=SFL),
  E("sf-opendoor","Open Door Legal","legal",SF,office="415-735-4124",
    addr="Offices: Bayview 4634 3rd St; Excelsior 60 Ocean Ave; Mission 2302 Mission St #104; Sunset 1722 Irving St; Tenderloin 374 Ellis St; Western Addition 1113 Fillmore St",
    services="Custody, support, dissolution, restraining orders, victim's rights, DV.",src=SFL,notes="Eligibility described elsewhere as low-income SF residents; not on this page."),
  E("sf-apilo","Asian Pacific Islander Legal Outreach - Violence Against Women Project","legal",SF,office="415-567-6255",addr="1121 Mission St, SF 94103",
    hours="Mon-Fri 9 am-5 pm",langs="Cantonese, Japanese, Korean, Lao, Mandarin, Spanish, Tagalog, Taiwanese, Thai, Vietnamese",
    services="Free full-scope legal help for survivors; family and immigration law (VAWA/U visa not explicitly listed).",
    src="https://www.1degree.org/opp/get-legal-help-for-asian-survivors-of-domestic-violence",conf="aggregator"),
  E("sf-jdc","Justice & Diversity Center, SF Bar Association","legal",SF,office="415-575-3131",addr="50 Fremont St, Suite 1700, SF",
    services="Family law incl. restraining orders; immigration matters. Free monthly clinics in Mission, Tenderloin, Bayview.",src=SFL),
  E("sf-carecen","CARECEN San Francisco","legal",SF,office="415-824-2330",services="T and U visas, VAWA, asylum, TPS, family visas, DACA.",src=SMCD,notes="Cost not stated."),
  E("sf-larazacl","La Raza Centro Legal","legal",SF,office="415-575-3500",services="Crime-victim immigration relief, asylum, family petitions. Spanish-speaking clients; fee waivers for very low income.",src=SMCD,notes="VAWA not listed."),
  E("sf-pangea","Pangea Legal Services","legal",SF,office="415-254-0475",services="U-visas, asylum, removal defense, family petitions. Low-bono and pro-bono.",src=SMCD,notes="VAWA not listed."),
]
for r in R:
    if r["id"] == "cora":
        r["address"] = "2211 Palm Ave, San Mateo 94403"; r["languages"] = "English, Spanish"
        r["services"] = ("County's dedicated IPV agency. Confidential Safe Houses (adults with minor children; no gender requirement), free Legal Line, "
                         "family-law representation, supportive housing (subsidized up to 1-3 years), counseling, children's program. "
                         "resources@corasupport.org. Referral gateway to the PHS Safe Pets Program.")
        r["source_url"] = "https://www.smc-connect.org/locations/community-overcoming-relationship-abuse-cora"
    if r["id"] == "nds":
        r["phone_office"] = "408-501-7550"
        r["services"] = "Emergency shelter (~19 people/night), housing solutions, support groups. Free. ADA accessible, LGBTQ friendly. If shelter is full, 'no one is turned away without an alternative housing solution'."
        r["confidence"] = "conflict"
        r["notes"] = ("Address conflict: county page says 234 E Gish Rd Ste 200, San Jose 95112; 1degree.org says 1400 Parkmoor Ave Ste 120, San Jose 95126. "
                      "Confirm before directing anyone in person. Shelter info from 1degree (aggregator).")
    if r["id"] == "ywca-sv":
        r["phone_office"] = "(408) 295-4011"
        r["services"] = "Counseling, safety planning, legal assistance, court accompaniment, immigration assistance, support groups. Call hotline to schedule Sunnyvale FJC appointment."
    if r["id"] == "maitri":
        r["services"] = "South Asian families. Immigration program: VAWA self-petition, U visa, T visa. Local (408) 436-8398."
    if r["id"] == "sf-safehouse":
        r["notes"] = ("Two sf.gov pages agree: SafeHouse access point = 1089 Mission St; Riley Center = 1175 Howard St. An HSH flyer PDF parsed with the labels "
                      "swapped, so phone-confirm the address before sending someone in person.")
        r["confidence"] = "conflict"

# ---- situation layer ----
SILENT = {"text", "chat", "web_form", "email", "web_info"}   # can be done quietly (device caution still applies)
VOICE = {"voice", "in_person"}                                # needs privacy / partner away
DEF_CH = {"hotline":["voice"],"shelter":["voice"],"housing":["voice","in_person"],"legal":["voice"],"court_help":["voice"],
          "family_justice_center":["voice","in_person"],"victim_services":["voice"],"financial":["web_form","voice"],
          "state_program":["in_person","voice"],"tech_safety":["web_info"],"culturally_specific":["voice"],"emergency":["text","voice"],"pets":["voice"]}
DEF_URG = {"hotline":["immediate","planning"],"shelter":["immediate","planning"],"housing":["planning","immediate"],"emergency":["immediate"],
           "legal":["planning"],"court_help":["planning"],"family_justice_center":["planning"],"victim_services":["planning"],"financial":["planning"],
           "state_program":["planning"],"tech_safety":["planning"],"culturally_specific":["immediate","planning"],"pets":["immediate","planning"]}
DEF_WHEN = {"hotline":"You want to talk to an advocate about safety, options or a plan.","shelter":"You need a safe place to stay.",
            "housing":"You need shelter or longer-term housing after leaving.","emergency":"You are in immediate danger and cannot speak.",
            "legal":"You want a restraining order, custody help or immigration relief.","court_help":"You are filing or responding to a restraining order.",
            "family_justice_center":"You want several services (advocate, legal, police/DA) in one place.","victim_services":"You want help with court, emergency aid or compensation.",
            "financial":"You need money for relocation, counseling or medical costs.","state_program":"You want your new address kept confidential.",
            "tech_safety":"You think your phone or accounts are being monitored.","culturally_specific":"You want an agency that fits your community or language.",
            "pets":"You are worried about leaving a pet behind."}
def C(status, note=None): return {"status": status, "note": note}
UNK = C("unknown")
ENRICH = {
 "ndvh":  dict(channels=["voice","text","chat"], cn="Chat at thehotline.org; text START to 88788.", when="You want anonymous support or are not sure where to start. Works while a partner is nearby if you use chat or text.", topics=["safety_planning"]),
 "sf-lacasa": dict(channels=["voice","text"], cn="24-hr text line 415-200-3575; teen line 877-923-0700.", children=C("yes","Women, teens and children; male children and teens welcome."), pop="Women, teens and their children", when="You need emergency shelter or want to text an advocate."),
 "sf-aws": dict(children=C("yes","Women and children"), pop="Women and children; API community focus"),
 "sf-raphael": dict(children=C("yes","Families and women in late pregnancy"), pop="Families"),
 "sf-ovwr": dict(channels=["voice","web_form","email"], cn="Online form at sf.gov/get-help-if-you-are-a-victim-or-survivor-in-san-francisco/. Voicemail: say if it is safe to call back and when. Reply within 48 business hours.", when="You want someone to help you navigate SF services without calling a hotline. Form works while partner is home.", urgency=["planning"]),
 "sf-cuav": dict(pop="LGBTQ+ survivors", citizenship=C("no","No citizenship requirement listed (1degree.org)."), when="You are LGBTQ+ and want a community-specific advocate."),
 "sf-apilo": dict(pop="API and other survivors", citizenship=UNK, topics=["immigration","restraining_order"]),
 "sf-text911": dict(channels=["text"], cn="Silent option when you cannot speak.", urgency=["immediate"]),
 "smc-text911": dict(channels=["text"], cn="Silent option when you cannot speak. English only.", urgency=["immediate"]),
 "scc-text911": dict(channels=["text"], cn="Silent option when you cannot speak.", urgency=["immediate"]),
 "cora": dict(channels=["voice","email"], cn="Hotline 24/7. Email resources@corasupport.org is listed, but response time is unknown; use the hotline for urgent needs.",
              children=C("yes","Safe House accepts adults with minor children; boys' age limit not stated."),
              pets=C("partial","Pets can be placed up to 30 days via PHS Safe Pets Program with CORA referral (SMC residents). Pets in the Safe House itself: not stated."),
              citizenship=UNK, pop="Anyone experiencing intimate partner abuse, any gender", when="You need a safe house, legal help or a plan in San Mateo County. Ask about pet placement."),
 "smc-safepets": dict(pets=C("yes","Up to 30 days, free; needs CORA referral and SMC residency."), channels=["voice"], cn="Referral comes through CORA; you do not contact PHS first. The PHS staff email is for advocates, not survivors.", when="You are leaving and cannot take a pet to shelter. Ask CORA to refer you.", topics=["pets"]),
 "smc-victim-services": dict(citizenship=C("no","Open to all regardless of immigration status."), channels=["voice"]),
 "smc-bala": dict(topics=["immigration","restraining_order"], citizenship=C("no","Immigration issues for DV survivors incl. VAWA are served; low income required.")),
 "smc-las": dict(topics=["immigration"]), "smc-catholic": dict(topics=["immigration"]), "smc-clsepa": dict(topics=["immigration"]),
 "smc-ismv": dict(topics=["immigration"]), "smc-iiba": dict(topics=["immigration"]), "smc-tahirih": dict(topics=["immigration"]),
 "smc-court": dict(channels=["chat","web_form","in_person"], cn="Family Law Facilitator LiveChat; Guide and File builds and e-files DVRO forms online; e-filing accepted for DV orders.", when="You want to prepare a restraining order online. Works while partner is home.", topics=["restraining_order"]),
 "smc-fjc": dict(channels=["in_person"], urgency=["planning"]),
 "nds": dict(children=C("yes","Boys and girls up to 18, and into adulthood when accompanying their mothers."), pets=UNK, citizenship=C("no","'No citizenship requirements' (1degree.org)."), pop="Women and their children; LGBTQ friendly", channels=["voice","in_person"], when="You need shelter in Santa Clara County; call to ask about space."),
 "ywca-sv": dict(topics=["immigration","restraining_order"], channels=["voice","in_person"]),
 "safechatsv": dict(channels=["chat"], cn="Quiet option while partner is home; chat history can be seen on a shared device.", when="You can't talk out loud and want to chat with an advocate.", urgency=["immediate","planning"]),
 "aaci": dict(pop="Asian communities; multilingual", citizenship=UNK),
 "sc-rohc": dict(channels=["chat","email","voice","in_person"], cn="Remote help through scscourt.org live chat and email; phone (408) 882-2926.", when="You want help filing a restraining order.", topics=["restraining_order"]),
 "sc-probono": dict(topics=["restraining_order","custody"]),
 "scc-aaci-fjc": dict(topics=["immigration","restraining_order","custody"], channels=["in_person","voice"]),
 "calvcb": dict(channels=["web_form","voice"], cn="Apply online (English/Spanish); no police report needed.", when="You want help paying for relocation, counseling or medical costs. Application can be started while partner is home, but keep any paperwork where it can't be found.", topics=["money"]),
 "safe-at-home": dict(channels=["in_person","voice","email"], cn="Requires an appointment with an enrolling agency.", topics=["address_confidentiality"]),
 "safety-net": dict(channels=["web_info"], cn="Read on a safer device. Clear browser history afterward.", topics=["tech_safety"]),
 "sf-bala": dict(topics=["restraining_order","custody","immigration"]), "sf-croc": dict(topics=["restraining_order"]), "sf-opendoor": dict(topics=["restraining_order","custody"]),
 "sf-jdc": dict(topics=["restraining_order","custody","immigration"]), "sf-carecen": dict(topics=["immigration"]), "sf-larazacl": dict(topics=["immigration"]), "sf-pangea": dict(topics=["immigration"]),
 "sf-safehouse": dict(channels=["in_person","voice"], when="You need hotel vouchers, transitional or rapid rehousing. In person only; check hours first."),
 "sf-riley": dict(channels=["voice","in_person"]),
 "scc-cali": dict(topics=["immigration"]), "scc-bala": dict(topics=["restraining_order","immigration"]),
}
for r in R:
    e = ENRICH.get(r["id"], {}); cat = r["category"]
    r["focus"] = bool(set(r["counties"]) & FOCUS)
    r["channels"] = e.get("channels", DEF_CH.get(cat, ["voice"]))
    r["channel_notes"] = e.get("cn")
    r["urgency"] = e.get("urgency", DEF_URG.get(cat, ["planning"]))
    r["when_to_use"] = e.get("when", DEF_WHEN.get(cat))
    r["topics"] = e.get("topics", [])
    r["constraints"] = {"children": e.get("children", UNK), "pets": e.get("pets", UNK),
                        "citizenship_required": e.get("citizenship", UNK), "population": e.get("pop")}
    r["situation"] = {"partner_home": [m for m in r["channels"] if m in SILENT], "partner_away": [m for m in r["channels"] if m in VOICE]}
    r["partner_home_ok"] = bool(r["situation"]["partner_home"])
    # Not fixing these now (hackathon): the app shows "details may be out of date, confirm by phone".
    r["verification_flag"] = {"conflict": "inconsistent", "aggregator": "unverified"}.get(r["confidence"])
    for k in ("services", "access_note", "notes"):
        pass
bad = [r["id"] for r in R if not set(r["channels"]) <= (SILENT | VOICE)]
bad += [r["id"] for r in R if not set(r["urgency"]) <= {"immediate", "planning"}]
bad += [r["id"] for r in R for k, v in r["constraints"].items() if k != "population" and v["status"] not in ("yes","no","unknown","partial")]
bad += [r["id"] for r in R if r["focus"] and not r["when_to_use"]]
if bad: print("v0.2 validation errors:", bad); sys.exit(1)

# ---------- validation ----------
ids=set(); errs=[]
for r in R:
    if r["id"] in ids: errs.append("dup id "+r["id"])
    ids.add(r["id"])
    if not r["source_url"]: errs.append("no source "+r["id"])
    if r["confidence"] not in ("official","aggregator","conflict"): errs.append("bad conf "+r["id"])
    for c in r["counties"]:
        if c not in ALL9: errs.append("bad county %s in %s"%(c,r["id"]))
    for k in ("phone_24h",):
        v=r[k]
        if v and not re.search(r"\d{3}.*\d{3}.*\d{4}",v): errs.append("odd phone %s %s"%(r["id"],v))
if errs:
    print("\n".join(errs)); sys.exit(1)

json.dump(R, open("resources.json","w"), indent=2, ensure_ascii=False)
cols=list(R[0].keys())
with open("resources.csv","w",newline="",encoding="utf-8") as f:
    w=csv.DictWriter(f,fieldnames=cols); w.writeheader()
    for r in R:
        r=dict(r)
        for k,v in r.items():
            if isinstance(v,(list,dict)): r[k]=json.dumps(v,ensure_ascii=False)
        w.writerow(r)
# ---- candidate export matching the app's schema in CLAUDE.md (data/resources.bay-area.json) ----
TYPE_MAP = {"hotline":"hotline","shelter":"shelter","legal":"legal","court_help":"legal","housing":"housing"}
def app_entry(r):
    langs = [s.strip() for s in re.split(r",|;", r["languages"])] if r["languages"] else []
    return {
        "id": r["id"], "name": r["name"], "type": TYPE_MAP.get(r["category"], "other"),
        "counties": r["counties"],
        "phone": r["phone_24h"] or r["phone_office"],
        "text": r["text"], "url": r["website"], "hours": r["hours"], "languages": langs,
        "notes": " ".join(x for x in (r["services"], r["access_note"], r["notes"]) if x) or None,
        "lastVerified": r["verified_on"],
        # extras beyond the agreed schema; drop if the shared type forbids them
        "sourceUrl": r["source_url"], "confidence": r["confidence"], "category": r["category"],
        # situation layer (v0.2)
        "urgency": r["urgency"], "whenToUse": r["when_to_use"], "topics": r["topics"],
        "channels": r["channels"], "channelNotes": r["channel_notes"],
        "partnerHomeOk": r["partner_home_ok"], "verificationFlag": r["verification_flag"], "situation": r["situation"], "constraints": r["constraints"],
    }
# candidate export = focus counties only (San Francisco, San Mateo, Santa Clara)
json.dump([app_entry(r) for r in R if r["focus"]], open("resources.bay-area.candidate.json","w"), indent=2, ensure_ascii=False)

by={}
for r in R:
    for c in r["counties"]:
        if c in ALL9 and len(r["counties"])<9: by.setdefault(c,[]).append(r["category"])
print(len(R),"entries;",sum(r["focus"] for r in R),"in focus counties (SF/SMC/SCC)")
for c in ["San Francisco","San Mateo","Santa Clara"]:
    es=[r for r in R if c in r["counties"] and len(r["counties"])<9]
    print("%-14s %2d entries | partner-home-ok: %2d | immigration: %2d | pets: %d"%(c,len(es),sum(e["partner_home_ok"] for e in es),
          sum("immigration" in e["topics"] for e in es),sum(e["constraints"]["pets"]["status"] in ("yes","partial") for e in es)))
for c in ALL9:
    cats=by.get(c,[]); print("%-14s %2d  hotline24=%s fjc=%s legal/court=%s housing/shelter=%s"%(c,len(cats),
        "hotline" in cats,"family_justice_center" in cats,("legal" in cats or "court_help" in cats),("shelter" in cats or "housing" in cats)))
print("confidence:",{k:sum(1 for r in R if r["confidence"]==k) for k in ("official","aggregator","conflict")})


# ---- compact, prompt-ready context for the Claude call (focus counties only) ----
def line(r):
    c = r["constraints"]
    def cv(k): return {"yes":"Y","no":"N","unknown":"?","partial":"~"}[c[k]["status"]]
    phone = r["phone_24h"] or r["phone_office"] or "-"
    quiet = "/".join(r["situation"]["partner_home"]) or "none"
    flag = {"inconsistent":"FLAG:inconsistent","unverified":"FLAG:unverified"}.get(r["verification_flag"],"")
    bits = [r["id"], r["name"], "/".join(x for x in r["counties"] if x in FOCUS) if len(r["counties"])<9 else "all 3 counties",
            r["category"], "phone "+phone + ((" ; text "+r["text"]) if r["text"] else ""), "urgency "+"+".join(r["urgency"]),
            "quiet-channels "+quiet, "kids %s pets %s citizenship-req %s"%(cv("children"),cv("pets"),cv("citizenship_required")),
            "topics "+",".join(r["topics"]) if r["topics"] else "", "use: "+(r["when_to_use"] or ""), flag]
    return " | ".join(b for b in bits if b)
ctx = ["# Curated Bay Area resources (San Francisco, San Mateo, Santa Clara). Only cite ids from this list.",
       "# kids/pets/citizenship-req: Y=yes N=no ?=unknown (ask the agency) ~=partial/conditional. quiet-channels = can be used while partner is nearby."]
ctx += [line(r) for r in R if r["focus"]]
open("resources.prompt.txt","w",encoding="utf-8").write("\n".join(ctx)+"\n")
print("prompt context: %d chars (~%d tokens), flagged: %d"%(len("\n".join(ctx)),len("\n".join(ctx))//4,sum(1 for r in R if r["focus"] and r["verification_flag"])))
