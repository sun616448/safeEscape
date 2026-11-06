#!/usr/bin/env python3
"""Reference matcher + scenario tests for the situation layer. Port the logic to TypeScript for the app.

Situation input:
  county: "San Francisco" | "San Mateo" | "Santa Clara"
  urgency: "immediate" | "planning"
  partner_present: True -> only entries with a quiet channel (text/chat/web form/email/web info)
  has_children, has_pets: bool
  immigration_concern: bool (prefers entries that list immigration help; never filters out on citizenship)
  need: optional topic (restraining_order, custody, immigration, money, pets, ...)
Constraint rule: drop an entry only when it says "no" explicitly. "unknown" stays but is flagged so the UI can say "ask them".
"""
import json, sys

R = json.load(open("resources.json"))

def match(s):
    out = []
    for r in R:
        if s["county"] not in r["counties"]: continue
        if s["urgency"] not in r["urgency"]: continue
        quiet = r["situation"]["partner_home"]; away = r["situation"]["partner_away"]
        # partner present: quiet-channel entries go in "now"; the rest are kept in "later" (do when partner is away)
        bucket = "now" if (not s.get("partner_present") or quiet) else "later"
        ch = quiet if (s.get("partner_present") and quiet) else (quiet + away)
        c = r["constraints"]; flags = []
        if s.get("has_children"):
            if c["children"]["status"] == "no": continue
            if c["children"]["status"] == "unknown" and r["category"] in ("shelter", "housing"): flags.append("ask about children")
        if s.get("has_pets") and r["category"] in ("shelter", "housing") and c["pets"]["status"] in ("unknown", "no"): flags.append("ask about pets")
        if s.get("immigration_concern") and c["citizenship_required"]["status"] == "yes": continue
        if s.get("need") and s["need"] not in r["topics"] and r["category"] not in ("hotline", "emergency"): continue
        score = 0
        score += 3 if s.get("has_pets") and r["category"] == "pets" else 0
        score += 3 if s.get("immigration_concern") and "immigration" in r["topics"] else 0
        score += 2 if r["category"] in ("emergency", "hotline", "shelter") and s["urgency"] == "immediate" else 0
        score += 2 if s.get("has_children") and c["children"]["status"] == "yes" else 0
        score += 1 if r["confidence"] == "official" else 0
        out.append((score, r["id"], r["name"], ch, flags, bucket))
    out.sort(key=lambda x: (-x[0], x[1]))
    return out

TESTS = [
  ("SMC, partner home, immediate, can't talk",   dict(county="San Mateo", urgency="immediate", partner_present=True),  {"smc-text911", "ndvh"}, {"smc-victim-services"}),
  ("SF, partner away, need shelter with kids",   dict(county="San Francisco", urgency="immediate", partner_present=False, has_children=True), {"sf-lacasa", "sf-aws"}, set()),
  ("SMC, planning, has dog, partner away",        dict(county="San Mateo", urgency="planning", has_pets=True), {"smc-safepets", "cora"}, set()),
  ("SCC, planning, immigration concern, home",    dict(county="Santa Clara", urgency="planning", partner_present=True, immigration_concern=True, need="immigration"), set(), {"nds"}),
  ("SF, planning, restraining order, home",       dict(county="San Francisco", urgency="planning", partner_present=True, need="restraining_order"), set(), {"sf-croc"}),
]
fails = 0
for name, s, must, mustnot in TESTS:
    res = match(s)
    ids = {x[1] for x in res if x[5] == "now"}      # tests check the "now" bucket
    ok = must <= ids and not (mustnot & ids)
    later = [x[1] for x in res if x[5] == "later"][:4]
    print(("PASS " if ok else "FAIL ") + name + "\n      now:   " + ", ".join(x[1] for x in res if x[5] == "now")[:150] + "\n      later: " + ", ".join(later))
    if not ok:
        fails += 1; print("   missing:", must - ids, " unexpected:", mustnot & ids)
sys.exit(1 if fails else 0)
