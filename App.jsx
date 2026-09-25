import React, { useState, useEffect } from "react";

/* ───────── storage: browser localStorage, same shape as before ───────── */
const MEM = {};
let CAN_SAVE = true;
try { localStorage.setItem("__t", "1"); localStorage.removeItem("__t"); } catch (e) { CAN_SAVE = false; }
const store = {
  get: async (k) => { const v = CAN_SAVE ? localStorage.getItem(k) : MEM[k]; return v ? { key: k, value: v } : null; },
  set: async (k, v) => { if (CAN_SAVE) localStorage.setItem(k, v); else MEM[k] = v; return { key: k, value: v }; },
};


/* ───────────────────────── palette ───────────────────────── */
const C = {
  bg: "#FFF0F5", card: "#FFFFFF", cardAlt: "#FFF3F7",
  line: "#F4C6D7", lineSoft: "#FADCE7",
  ink: "#3B1830", ink2: "#6A3553", muted: "#8C5873",
  pink: "#FFC1D6", pinkSoft: "#FFE8F0", pinkDeep: "#E0217F",
  blue: "#D41F72", clay: "#D2453F", sage: "#7348C2", blush: "#FFC1D6",
  sky: "#11808D", butter: "#B25E07", lav: "#8358C7", moss: "#7348C2",
};
/* soft backgrounds that pair with each session color */
const TINT = {
  upper: "#FFE0EC", lower: "#FFE5E0", calisthenics: "#EFE6FF", cardio: "#DAF4F4",
  ruck: "#FFEBD6", mobility: "#F1EAFF", rest: "#F8EAF0", push: "#FFE0EC", pull: "#EFE6FF", legs: "#FFE5E0",
};
const F = "'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif";
const SERIF = "'Fraunces',Georgia,'Times New Roman',serif";

const SLOTS = {
  upper: { label: "upper", color: C.blue },
  lower: { label: "lower", color: C.clay },
  cardio: { label: "run", color: C.sky },
  ruck: { label: "ruck", color: C.butter },
  mobility: { label: "mobility", color: C.lav },
  calisthenics: { label: "calisthenics", color: C.moss },
  rest: { label: "rest", color: C.muted },
  /* older split, kept so past logs and weight history still read right */
  push: { label: "push", color: C.clay, old: true },
  pull: { label: "pull", color: C.sage, old: true },
  legs: { label: "legs", color: C.clay, old: true },
};
const CATS = ["upper", "lower", "calisthenics", "cardio", "ruck", "mobility", "push", "pull", "legs"];
const DAY_SLOTS = ["upper", "lower", "calisthenics", "cardio", "ruck", "mobility", "rest"];

/* the infinity rotation. it only moves forward when you log the session,
   so a missed day never costs you your place. */
const ROTATION = [
  { slot: "upper", name: "upper A", fin: "calisthenics C", run: "easy run", why: "conversation pace, any length that feels good" },
  { slot: "lower", name: "lower A", fin: "calisthenics A", run: "optional short easy run", why: "ideally 6+ hours apart from lifting. skipping it is fine" },
  { slot: "upper", name: "upper B", fin: "calisthenics B", run: "easy run", why: "conversation pace" },
  { slot: "lower", name: "lower B", fin: "calisthenics C", run: "no run", why: "rest from running, or a walk" },
  { slot: "upper", name: "upper C", fin: "calisthenics B", run: "hard run", why: "intervals or tempo, after lifting or later in the day" },
  { slot: "ruck", name: "weekly ruck", fin: null, run: "ruck or long easy run", why: "no lifting today. add weight or distance slowly, one at a time" },
];

const TYPES = [["easy", "easy run"], ["hard", "hard run"], ["stairruck", "stairmaster ruck"], ["ruck", "outdoor ruck"], ["walk", "walk"], ["stairs", "stairs"], ["run", "run"], ["ruckrun", "ruck run"]];
const QUICK = ["easy", "hard", "stairruck", "ruck", "walk"];
const TODS = ["morning", "midday", "afternoon", "evening"];
const fmtW = (w) => (w ? `${w} lb` : "bw");
const typeLabel = (t) => TYPES.find((x) => x[0] === t)?.[1] || t;
const HARD = new Set(["hard"]);
const EASY = new Set(["easy", "run"]);
const RUCKS = new Set(["stairruck", "ruck", "ruckrun"]);

/* ───────── reading macros pasted from any AI chat ───────── */
const MACRO_PROMPT = "At the end, list each food on its own line in exactly this format, no extra text on those lines:\nfood name | calories | protein g | carbs g | fat g";
function parseMacros(raw) {
  const toN = (v) => { if (v == null) return null; const m = String(v).replace(/,/g, "").match(/\d+(?:\.\d+)?/); return m ? Math.round(parseFloat(m[0])) : null; };
  const grab = (l, res) => { for (const re of res) { const m = l.match(re); if (m) return toN(m[1]); } return null; };
  const CAL = [/(\d[\d,]*(?:\.\d+)?)\s*(?:kcal|cals?|calories)\b/i, /(?:calories|kcal|cals?)\s*[:=~≈-]?\s*(?:about|approx\.?|~)?\s*(\d[\d,]*)/i];
  const PRO = [/(\d+(?:\.\d+)?)\s*g?\s*(?:of\s+)?protein/i, /protein\s*[:=~≈-]?\s*(?:about|~)?\s*(\d+(?:\.\d+)?)/i, /(\d+(?:\.\d+)?)\s*g?\s*P\b/];
  const CARB = [/(\d+(?:\.\d+)?)\s*g?\s*(?:of\s+)?carb(?:s|ohydrates?)?/i, /carb(?:s|ohydrates?)?\s*[:=~≈-]?\s*(?:about|~)?\s*(\d+(?:\.\d+)?)/i, /(\d+(?:\.\d+)?)\s*g?\s*C\b/];
  const FAT = [/(\d+(?:\.\d+)?)\s*g?\s*(?:of\s+)?fats?\b/i, /fats?\s*[:=~≈-]?\s*(?:about|~)?\s*(\d+(?:\.\d+)?)/i, /(\d+(?:\.\d+)?)\s*g?\s*F\b/];
  const LABEL = /^(?:estimated\s+|approx\.?\s+|total\s+)?(?:calories|kcal|protein|carbs?|carbohydrates|fats?)\s*[:=~≈-]?\s*(?:about|approx\.?|~)?\s*\d/i;
  const clean = (t) => t.replace(/\*\*|__|`|#+/g, "").replace(/^\s*(?:[-*•>]|\d+[.)])\s+/, "").trim();
  const nameOf = (l) => { const m = l.match(/^(.*?)(?:\s*[:–—|=]\s*|\s+-\s+|\s*\(|\s+~?\d)/); return clean(m ? m[1] : l).replace(/[:\s]+$/, ""); };

  const items = []; let total = null; let header = null; let pending = ""; let cur = null;
  for (const rawLine of raw.split(/\r?\n/)) {
    const l = clean(rawLine);
    if (!l) continue;
    if (/^\|?\s*:?-{2,}/.test(l)) continue;
    const isTotal = /\btotal/i.test(l);
    if (l.includes("|") && (l.startsWith("|") || l.split("|").filter((c) => c.trim()).length >= 3)) {
      const cells = l.split("|").map((c) => c.trim()).filter(Boolean);
      if (!cells.slice(1).some((c) => /\d/.test(c))) {
        header = { cal: cells.findIndex((c) => /cal|kcal/i.test(c)), pro: cells.findIndex((c) => /protein|^p$/i.test(c)),
          c: cells.findIndex((c) => /carb|^c$/i.test(c)), f: cells.findIndex((c) => /fat|^f$/i.test(c)) };
        continue;
      }
      const at = (key, pos) => toN(cells[header && header[key] >= 0 ? header[key] : pos]);
      const row = { name: clean(cells[0]), cal: at("cal", 1), pro: at("pro", 2), c: at("c", 3), f: at("f", 4) };
      if (isTotal) total = row; else items.push(row);
      cur = null; continue;
    }
    const hasNum = /\d/.test(l);
    if (!hasNum) { pending = isTotal ? "__total" : l.replace(/:$/, ""); cur = null; continue; }
    const vals = { cal: grab(l, CAL), pro: grab(l, PRO), c: grab(l, CARB), f: grab(l, FAT) };
    if (vals.cal == null && vals.pro == null && vals.c == null && vals.f == null) {
      if (!LABEL.test(l)) { pending = l.replace(/:$/, ""); cur = null; }
      continue;
    }
    if (LABEL.test(l)) {
      /* stacked format: a name line, then "Calories: 450", "Protein: 30g" under it */
      if (pending === "__total" || (isTotal && !pending)) { total = { ...(total || { name: "total" }), ...Object.fromEntries(Object.entries(vals).filter(([, v]) => v != null)) }; continue; }
      if (!cur) { cur = { name: pending || "meal", cal: null, pro: null, c: null, f: null }; items.push(cur); }
      Object.entries(vals).forEach(([k, v]) => { if (v != null) cur[k] = v; });
      continue;
    }
    let nm = nameOf(l).replace(/[,.;]+$/, "");
    if (!nm || /\b(based|roughly|estimate[sd]?|approximately|that's|that is|you had|you ate)\b/i.test(nm) || nm.split(/\s+/).length > 7) nm = pending || "from AI";
    const row = { name: nm, ...vals };
    if (isTotal) total = row; else items.push(row);
    cur = null;
  }
  const done = items.filter((i) => i.cal != null || i.pro != null).map((i) => ({ name: i.name, cal: i.cal || 0, pro: i.pro || 0, c: i.c || 0, f: i.f || 0 }));
  if (!done.length && total) done.push({ name: "day from AI", cal: total.cal || 0, pro: total.pro || 0, c: total.c || 0, f: total.f || 0 });
  return done;
}

/* ───────── Apple Health, via an iPhone Shortcut that copies a line like
   "steps 8432, distance 3.21" to the clipboard ───────── */
const SHORTCUT_NAME = "training plan sync";
function parseHealth(raw) {
  const t = String(raw || "").toLowerCase();
  const num = (re) => { const m = t.match(re); return m ? parseFloat(m[1].replace(/,/g, "")) : null; };
  const steps = num(/steps?\D{0,4}(\d[\d,]*)/);
  const dist = num(/(?:distance|dist|miles?)\D{0,4}(\d+(?:\.\d+)?)/);
  const dm = t.match(/(\d{4}-\d{2}-\d{2})/);
  if (steps == null && dist == null) return null;
  return { steps: steps != null ? Math.round(steps) : null, dist: dist != null ? Math.round(dist * 100) / 100 : null, date: dm ? dm[1] : null };
}

/* ───────── swaps: easy alternatives for a day when something hurts ───────── */
const ALTS = [
  [/pike push/, [["Decline push-ups", "easier"], ["Pike hold", "static"], ["Wall walks", "builds up"], ["Handstand push-up negatives", "harder"]]],
  [/\bdips?\b/, [["Bench dips", "easier"], ["Assisted dip machine", "assisted"], ["Close-grip push-ups", "floor"], ["Straight bar dips", "harder"]]],
  [/inverted row/, [["Band rows", "garage"], ["Feet-elevated inverted rows", "harder"], ["Underhand inverted rows", "more biceps"]]],
  [/scapular/, [["Dead hang", "easier"], ["Active hang", "hold the top"], ["Band pull-aparts", "garage"]]],
  [/dead hang/, [["Active hang", "shoulders down"], ["Scapular pull-ups", "moving"], ["Towel hang", "grip"]]],
  [/hollow/, [["Tuck hollow hold", "easier"], ["Hollow rocks", "moving"], ["Dead bug", "easiest on the back"], ["Plank", "floor"]]],
  [/l.sit/, [["One-leg tuck sit", "easier"], ["Hanging knee raise", "hanging"], ["Seated leg lifts", "compression"], ["Full L-sit", "harder"]]],
  [/wall walk|handstand|kick.up/, [["Pike hold on a box", "wrist friendly"], ["Crow pose", "balance"], ["Wall walks", "builds up"], ["Shoulder taps at the wall", "harder"], ["Freestanding kick-ups", "harder"]]],
  [/hex bar deadlift|deadlift/, [["Belt squat", "easiest on the back"], ["Leg press", "back supported"], ["Barbell hip thrust", "back supported"], ["Cable pull-through", "light hinge"], ["Kettlebell deadlift", "lighter hinge"]]],
  [/single.leg rdl/, [["Cable pull-through", "light hinge"], ["Seated leg curl", "no back load"], ["45° back extension", "bodyweight"], ["Reverse lunge", "single leg"]]],
  [/rdl|good morning/, [["Seated leg curl", "no back load"], ["Lying leg curl", "no back load"], ["Cable pull-through", "light hinge"], ["45° back extension", "bodyweight"], ["DB RDL", "lighter"]]],
  [/hip thrust|glute bridge/, [["Glute bridge machine", "same muscle"], ["Smith machine hip thrust", "more stable"], ["Single-leg hip thrust", "bodyweight"], ["Cable kickbacks", "no bar on hips"]]],
  [/bulgarian|split squat|lunge|step.up/, [["Reverse lunge", "easier balance"], ["Step-ups", "knee friendly"], ["Split squat", "back foot down"], ["Single-leg leg press", "machine"]]],
  [/hack squat|leg press|squat/, [["Leg press", "back supported"], ["Hack squat", "machine"], ["Goblet squat", "light"], ["Belt squat", "no spine load"], ["Smith machine squat", "more stable"]]],
  [/leg curl|nordic/, [["Lying leg curl", "machine"], ["Seated leg curl", "machine"], ["Stability ball leg curl", "no machine"], ["Nordic curl negatives", "harder"]]],
  [/leg extension/, [["Spanish squat", "knee friendly"], ["Leg press, feet low", "quads"], ["Goblet squat", "light"]]],
  [/calf/, [["Seated calf raise", "machine"], ["Standing calf raise", "machine"], ["Leg press calf raise", "machine"], ["Single-leg calf raise", "bodyweight"]]],
  [/box jump|broad jump|pogo|bound|jump/, [["Pogo hops", "low impact"], ["Kettlebell swing", "no landing"], ["Jump squats", "no box"], ["Med ball slam", "upper body power"]]],
  [/pull.up|chin.up/, [["Assisted pull-up machine", "same path"], ["Lat pulldown", "machine"], ["Inverted rows", "bodyweight"], ["Dead hang", "grip + shoulders"]]],
  [/lat pulldown|pulldown/, [["Assisted pull-up machine", "same path"], ["Single-arm cable pulldown", "one side"], ["Straight-arm pulldown", "no biceps"], ["Band pulldown", "garage"]]],
  [/row/, [["Seated cable row", "machine"], ["Single-arm DB row", "one side"], ["Machine row", "supported"], ["Inverted rows", "bodyweight"]]],
  [/hand.release|push.up/, [["Push-ups", "standard"], ["Incline push-ups", "easier"], ["Knee push-ups", "easier"], ["DB bench press", "loaded"]]],
  [/shoulder press|overhead press|ohp/, [["Machine shoulder press", "stable"], ["Landmine press", "shoulder friendly"], ["Arnold press", "DBs"], ["Pike push-ups", "bodyweight"]]],
  [/incline|chest press|bench|db press/, [["Incline machine press", "stable"], ["Flat DB press", "DBs"], ["Smith machine incline press", "stable"], ["Push-ups", "bodyweight"], ["Landmine press", "shoulder friendly"]]],
  [/fly|pec deck/, [["Pec deck machine", "machine"], ["Cable fly", "cables"], ["DB fly", "DBs"]]],
  [/lateral raise/, [["Cable lateral raise", "cables"], ["Machine lateral raise", "machine"], ["Lean-away DB lateral raise", "one side"]]],
  [/rear delt|face pull/, [["Face pulls", "cables"], ["Reverse pec deck", "machine"], ["Cable rear delt fly", "cables"], ["Band pull-aparts", "garage"]]],
  [/hammer/, [["Rope hammer curl", "cables"], ["Cross-body hammer curl", "DBs"], ["Bicep curl", "DBs"]]],
  [/curl/, [["Cable curl", "cables"], ["Incline DB curl", "stretch"], ["Preacher curl", "strict"], ["Hammer curls", "DBs"]]],
  [/tricep|pushdown|skull|dip/, [["Tricep rope pushdown", "cables"], ["Straight-bar pushdown", "cables"], ["Overhead tricep extension", "cable or DB"], ["Skull crushers", "EZ bar"], ["Close-grip push-ups", "bodyweight"]]],
  [/leg raise|knee raise/, [["Captain's chair knee raise", "supported"], ["Lying leg raise", "floor"], ["Reverse crunch", "easier"], ["Hollow body hold", "floor"]]],
  [/dragon flag/, [["Lying leg raise", "easier"], ["Reverse crunch", "easier"], ["Hollow body hold", "floor"]]],
  [/carry/, [["Suitcase carry", "one side"], ["Farmer's carry", "both hands"], ["Dead hang", "grip"]]],
  [/handstand|kick.up|wall walk/, [["Pike hold on a box", "wrist friendly"], ["Wall walks", "builds up"], ["Plank to pike", "core"]]],
  [/plank|hollow/, [["Dead bug", "easy on the back"], ["Plank", "floor"], ["Hollow body hold", "floor"], ["Pallof press", "anti-rotation"]]],
];
const altsFor = (text) => { const t = text.toLowerCase(); const hit = ALTS.find(([re]) => re.test(t)); return hit ? hit[1] : []; };
/* keeps the sets x reps from the original line when you swap */
const withTail = (orig, name) => { const m = orig.match(/\s\d[^,]*/); return `${name}${m ? m[0] : ""}`; };
/* blocks where a weight belongs, so the app nudges you to log it */
const isLiftBlock = (label) => !/skill|prep|warm|finish|after|stretch|power|plyo|jump|ankle|cool|daily|once per|bolc|session|pick one|holds|dynamic|flow|progress|core/i.test(label || "");

/* ───────── how-to demos ─────────
   first choice: an animated gif from ExerciseDB (below).
   backup: real start/finish photos from free-exercise-db on GitHub. */
const IMG_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
const MEDIA = [
  [/hex bar|trap bar/, "Trap_Bar_Deadlift"],
  [/single.leg rdl/, "Kettlebell_One-Legged_Deadlift"],
  [/\brdl|romanian/, "Romanian_Deadlift"],
  [/pull.through/, "Pull_Through"],
  [/back extension|hyperextension/, "Hyperextensions_Back_Extensions"],
  [/single.leg hip thrust|single.leg glute/, "Single_Leg_Glute_Bridge"],
  [/hip thrust|glute bridge/, "Barbell_Hip_Thrust"],
  [/kickback/, "Glute_Kickback"],
  [/bulgarian|split squat/, "Split_Squat_with_Dumbbells"],
  [/reverse lunge|lunge/, "Dumbbell_Rear_Lunge"],
  [/step.up/, "Dumbbell_Step_Ups"],
  [/leg press calf/, "Calf_Press_On_The_Leg_Press_Machine"],
  [/leg press/, "Leg_Press"],
  [/hack squat/, "Hack_Squat"],
  [/goblet/, "Goblet_Squat"],
  [/smith machine squat/, "Smith_Machine_Squat"],
  [/lying leg curl/, "Lying_Leg_Curls"],
  [/ball leg curl/, "Ball_Leg_Curl"],
  [/nordic|glute.ham/, "Natural_Glute_Ham_Raise"],
  [/leg curl/, "Seated_Leg_Curl"],
  [/leg extension/, "Leg_Extensions"],
  [/seated calf/, "Seated_Calf_Raise"],
  [/calf/, "Standing_Calf_Raises"],
  [/box jump/, "Front_Box_Jump"],
  [/broad jump|long jump/, "Standing_Long_Jump"],
  [/kettlebell swing/, "One-Arm_Kettlebell_Swings"],
  [/jump squat/, "Freehand_Jump_Squat"],
  [/slam/, "Overhead_Slam"],
  [/scapular/, "Scapular_Pull-Up"],
  [/band.assisted pull|assisted pull/, "Band_Assisted_Pull-Up"],
  [/dead hang/, null],
  [/pull.up|pullup|chin.up/, "Pullups"],
  [/close.grip lat pulldown/, "Close-Grip_Front_Lat_Pulldown"],
  [/wide.grip lat pulldown/, "Wide-Grip_Lat_Pulldown"],
  [/single.arm cable pulldown/, "One_Arm_Lat_Pulldown"],
  [/straight.arm/, "Straight-Arm_Pulldown"],
  [/pulldown/, "Full_Range-Of-Motion_Lat_Pulldown"],
  [/inverted row/, "Inverted_Row"],
  [/single.arm db row/, "One-Arm_Dumbbell_Row"],
  [/chest.supported row|machine row/, "Leverage_Iso_Row"],
  [/row/, "Seated_Cable_Rows"],
  [/pike push/, null],
  [/incline push/, "Incline_Push-Up"],
  [/close.grip push/, "Close-Grip_Push-Up_off_of_a_Dumbbell"],
  [/hand.release|push.up|pushup/, "Pushups"],
  [/machine shoulder/, "Leverage_Shoulder_Press"],
  [/arnold/, "Arnold_Dumbbell_Press"],
  [/shoulder press|overhead press/, "Dumbbell_Shoulder_Press"],
  [/incline machine press/, "Leverage_Incline_Chest_Press"],
  [/smith machine incline/, "Smith_Machine_Incline_Bench_Press"],
  [/chest press/, "Leverage_Chest_Press"],
  [/flat db press|db bench/, "Dumbbell_Bench_Press"],
  [/incline/, "Incline_Dumbbell_Press"],
  [/face pull/, "Face_Pull"],
  [/reverse pec deck/, "Reverse_Machine_Flyes"],
  [/cable rear delt/, "Cable_Rear_Delt_Fly"],
  [/pull.apart/, "Band_Pull_Apart"],
  [/rear delt/, "Seated_Bent-Over_Rear_Delt_Raise"],
  [/cable fly/, "Flat_Bench_Cable_Flyes"],
  [/db fly/, "Dumbbell_Flyes"],
  [/fly|pec deck/, "Butterfly"],
  [/cable lateral/, "Cable_Seated_Lateral_Raise"],
  [/lateral raise/, "Side_Lateral_Raise"],
  [/rope hammer/, "Cable_Hammer_Curls_-_Rope_Attachment"],
  [/cross.body hammer/, "Cross_Body_Hammer_Curl"],
  [/hammer/, "Hammer_Curls"],
  [/cable curl/, "Standing_Biceps_Cable_Curl"],
  [/incline db curl/, "Alternate_Incline_Dumbbell_Curl"],
  [/preacher/, "Preacher_Curl"],
  [/leg curl/, "Seated_Leg_Curl"],
  [/curl/, "Dumbbell_Bicep_Curl"],
  [/overhead tricep/, "Cable_Rope_Overhead_Triceps_Extension"],
  [/rope pushdown/, "Triceps_Pushdown_-_Rope_Attachment"],
  [/pushdown/, "Triceps_Pushdown"],
  [/skull/, "EZ-Bar_Skullcrusher"],
  [/bench dip/, "Bench_Dips"],
  [/\bdips?\b/, "Parallel_Bar_Dip"],
  [/hanging leg raise|knee raise/, "Hanging_Leg_Raise"],
  [/lying leg raise/, "Flat_Bench_Lying_Leg_Raise"],
  [/reverse crunch/, "Reverse_Crunch"],
  [/dead bug/, "Dead_Bug"],
  [/pallof/, "Pallof_Press"],
  [/hollow/, null],
  [/l.sit/, null],
  [/dragon flag/, null],
  [/wall walk/, null],
  [/kick.up/, null],
  [/handstand/, null],
  [/plank/, "Plank"],
  [/farmer/, "Farmers_Walk"],
  [/sprint.drag|sled/, "Sled_Drag_-_Harness"],
];
const mediaFor = (text) => { const t = text.toLowerCase(); const hit = MEDIA.find(([re]) => re.test(t)); return hit ? hit[1] : null; };

/* short form cues, in plain words */
const CUES = [
  [/hex bar/, "Stand in the middle, hips back, chest proud. Push the floor away, then stand tall. Don't round your back."],
  [/single.leg rdl/, "Soft knee, hinge until you feel the hamstring, hips stay square to the floor."],
  [/\brdl/, "Bar slides down your thighs. Hips go back, back stays flat, stop when your hamstrings stop you."],
  [/hip thrust/, "Upper back on the bench, chin tucked, ribs down. Drive through heels and squeeze at the top for a second."],
  [/bulgarian/, "Back foot on the bench. Lean slightly forward for glutes. Front heel stays down."],
  [/leg press/, "Lower until your knees are near your chest without your low back peeling off the pad."],
  [/hack squat/, "Back flat on the pad, go as deep as you can control, push through the whole foot."],
  [/leg curl/, "Hips pinned down, curl all the way, lower slowly."],
  [/leg extension/, "Pause at the top, lower slow. No swinging."],
  [/calf/, "Full stretch at the bottom, pause, then all the way up."],
  [/box jump/, "Swing the arms, land soft and quiet on the box, step down. Never jump down."],
  [/broad jump/, "Swing, jump out not up, land soft with knees tracking over toes. Stick it."],
  [/dragon flag/, "Grab behind your head, body stiff like a plank, lower as slow as you can. Tuck the knees until you can hold it straight."],
  [/negative/, "Start with chin over the bar. Lower as slowly as you can, all the way to a dead hang."],
  [/^pull.ups?\b/, "Start from a dead hang, pull your chest toward the bar, chin over. Lower all the way down, no kipping."],
  [/band.assisted pull/, "Pull your elbows down to your ribs. Chin over the bar, full hang at the bottom."],
  [/pulldown/, "Chest up, pull to your collarbone, elbows down and in. Control it back up."],
  [/inverted row/, "Body straight like a plank, pull chest to the bar."],
  [/row/, "Chest stays on the pad. Pull elbows back, squeeze the shoulder blades, don't shrug."],
  [/incline|chest press/, "Shoulder blades pinned back and down. Lower to the upper chest, press up and slightly in."],
  [/shoulder press/, "Ribs down, don't arch. Press straight up, biceps end by your ears."],
  [/rear delt/, "Hinge forward, arms wide, move from the back of the shoulder, not the traps."],
  [/fly|pec deck/, "Slight bend in the elbows, open wide for a stretch, hug it back together."],
  [/lateral raise/, "Lead with the elbows, stop at shoulder height, lower slowly. Light is fine."],
  [/hammer/, "Palms face each other, elbows glued to your sides."],
  [/curl/, "Elbows stay put, no swinging, lower all the way down."],
  [/overhead tricep/, "Elbows point up and stay close, stretch deep behind your head."],
  [/pushdown/, "Elbows pinned at your sides, spread the rope at the bottom."],
  [/hand.release/, "Chest to the floor, lift hands for a second, then push back up in one straight line."],
  [/farmer/, "Heavy, tall, ribs down, short quick steps. Don't let the weights pull your shoulders down."],
  [/lying leg raise/, "Low back pressed down, legs straight, lower slow and stop before the back lifts."],
  [/sprint.drag/, "Sprint, drag, shuffle, carry, sprint. Smooth transitions first, then chase the time."],
  [/hanging leg raise/, "Dead hang, no swinging. Curl the hips up, lower slow."],
  [/pike push/, "Hips high, head goes forward of your hands so you make a triangle. Elbows back, not flared."],
  [/\bdips?\b/, "Shoulders down away from ears, lower until elbows hit 90, press up."],
  [/scapular/, "Hang, then pull your shoulder blades down without bending your elbows."],
  [/dead hang/, "Relax into it but keep a little tension so shoulders aren't at your ears."],
  [/hollow/, "Low back glued to the floor. Arms and legs long, only as low as you can keep the back down."],
  [/l.sit/, "Push the floor away hard, shoulders down, knees tucked to your chest."],
  [/plank/, "Squeeze glutes, ribs down, straight line from head to heels."],
  [/dead bug/, "Low back flat, move opposite arm and leg slowly, exhale as they reach."],
  [/wall walk/, "Start in a push-up with feet on the wall, walk hands in and feet up. Only as high as you control."],
  [/handstand/, "Belly to the wall, hands a few inches away. Push tall through the shoulders, squeeze everything."],
  [/kick.up/, "Hands down, lunge, kick one leg up softly. Aim to stack hips over shoulders, not over-kick."],
  [/wrist/, "Circles, palms flat and rock forward and back, backs of hands on the floor. Go gently."],
];
const cueFor = (text) => { const t = text.toLowerCase(); const hit = CUES.find(([re]) => re.test(t)); return hit ? hit[1] : null; };

/* ───────── GIFs: ExerciseDB V1 by AscendAPI (free, non-commercial, credit required) ─────────
   looked up the first time you open an exercise, then remembered on this phone. */
/* each rule: [which of your exercises, searches to try, words the gif's name MUST have, words it must NOT have].
   a gif only shows if its name passes, otherwise you get the real photos. wrong gifs never show. */
const EDB_RULES = [
  [/hex bar|trap bar/, ["trap bar deadlift"], [/trap bar/, /deadlift/], []],
  [/single.leg rdl/, ["single leg deadlift", "one leg deadlift"], [/(single|one).?leg/, /deadlift/], []],
  [/\brdl|romanian/, ["romanian deadlift"], [/romanian deadlift/], [/single|one leg/]],
  [/hip thrust/, ["barbell hip thrust", "barbell glute bridge"], [/barbell|lever|smith/, /hip thrust|glute bridge/], [/knee|band|single|one leg/]],
  [/glute bridge/, ["glute bridge"], [/glute bridge/], [/single|one leg/]],
  [/bulgarian|split squat/, ["bulgarian split squat", "split squat"], [/split squat/], []],
  [/single-leg leg press/, ["one leg leg press"], [/leg press/], [/calf/]],
  [/leg press calf/, ["calf press leg press"], [/calf/], []],
  [/leg press/, ["leg press"], [/leg press/], [/calf|one leg|single/]],
  [/hack squat/, ["hack squat"], [/hack squat/], [/reverse/]],
  [/seated leg curl/, ["seated leg curl"], [/seated leg curl/], []],
  [/lying leg curl/, ["lying leg curl"], [/lying leg curl/], []],
  [/leg curl/, ["seated leg curl", "lying leg curl"], [/leg curl/], []],
  [/leg extension/, ["leg extension"], [/leg extension/], [/one leg|single/]],
  [/seated calf/, ["seated calf raise"], [/seated calf/], []],
  [/calf/, ["standing calf raise", "calf raise"], [/calf raise/], [/seated|donkey|one leg|single/]],
  [/box jump/, ["box jump"], [/box jump/], []],
  [/broad jump|long jump/, ["standing long jump", "broad jump"], [/long jump|broad jump/], []],
  [/band.assisted pull/, ["band assisted pull-up"], [/assisted/, /pull.?up/], []],
  [/assisted pull-up machine/, ["assisted pull-up"], [/assisted/, /pull.?up/], [/band/]],
  [/scapular/, ["scapula pull-up"], [/scapula/], []],
  [/negative|^pull.ups?\b/, ["pull-up", "pull up"], [/pull.?up/], [/assisted|band|kneeling|scapula|rear|close|wide|one arm|archer|jump/]],
  [/close.grip lat pulldown/, ["close grip lat pulldown"], [/pulldown/, /close/], [/one arm|single/]],
  [/wide.grip lat pulldown/, ["wide grip lat pulldown"], [/pulldown/, /wide/], [/behind|rear/]],
  [/straight.arm/, ["straight arm pulldown"], [/straight arm/], []],
  [/pulldown/, ["lat pulldown"], [/pulldown/], [/one arm|single|behind|straight/]],
  [/chest.supported row/, ["incline row", "chest supported row"], [/incline row|chest supported|t.?bar/], []],
  [/inverted row/, ["inverted row"], [/inverted row/], []],
  [/seated cable row/, ["seated cable row", "seated row"], [/seated.*row|cable row/], [/one arm|high/]],
  [/single.arm db row/, ["one arm dumbbell row"], [/one arm|single arm/, /row/], [/upright/]],
  [/pike push/, ["pike push up"], [/pike/, /push/], []],
  [/incline push/, ["incline push-up"], [/incline push/], [/close|wide|depth/]],
  [/hand.release|push.ups?\b/, ["hand release push up", "push-up"], [/push.?up/], [/incline|decline|knee|diamond|clap|wide|close|pike|one arm|archer|plyo|wall|medicine/]],
  [/incline db press|incline dumbbell|incline/, ["incline dumbbell press", "incline dumbbell bench press"], [/incline/, /press/, /dumbbell/], [/fly|twist|hammer|one arm/]],
  [/chest press/, ["lever chest press", "chest press"], [/chest press/], [/incline|decline|cable|one arm/]],
  [/shoulder press/, ["dumbbell seated shoulder press", "dumbbell shoulder press"], [/shoulder press/, /dumbbell/], [/one arm|single|standing/]],
  [/pec fly|pec deck/, ["lever seated fly", "pec deck fly"], [/fly|pec deck/], [/rear|reverse|incline|decline|cable/]],
  [/cable fly/, ["cable fly"], [/cable/, /fly/], [/rear|reverse/]],
  [/cable lateral/, ["cable lateral raise"], [/cable/, /lateral raise/], []],
  [/lateral raise/, ["dumbbell lateral raise"], [/lateral raise/], [/rear|lying|incline|one arm|cable|band/]],
  [/face pull/, ["face pull"], [/face pull/], []],
  [/rear delt/, ["dumbbell rear delt fly", "rear delt fly"], [/rear|reverse fly/], [/row|lying|incline/]],
  [/hammer/, ["dumbbell hammer curl"], [/hammer curl/], [/cable|rope|incline|preacher|cross/]],
  [/cable curl/, ["cable curl"], [/cable/, /curl/], [/leg|wrist|hammer|overhead/]],
  [/preacher/, ["preacher curl"], [/preacher/], []],
  [/bicep curl|^curl/, ["dumbbell biceps curl", "dumbbell curl"], [/dumbbell/, /curl/], [/hammer|leg|wrist|preacher|concentration|incline|reverse|one arm|zottman|cross/]],
  [/overhead tricep/, ["cable overhead triceps extension"], [/overhead/, /tricep/], [/one arm|kneeling/]],
  [/pushdown/, ["cable pushdown rope", "cable pushdown"], [/pushdown/], [/one arm|reverse|incline/]],
  [/skull/, ["lying triceps extension"], [/lying/, /tricep/], [/one arm|cable/]],
  [/bench dip/, ["bench dip"], [/bench dip/], []],
  [/\bdips?\b/, ["chest dip", "triceps dip"], [/\bdip/], [/bench|assisted|machine/]],
  [/hanging leg raise|knee raise/, ["hanging leg raise"], [/hanging/, /leg raise|knee raise/], [/oblique|twist|straddle/]],
  [/lying leg raise/, ["lying leg raise"], [/lying leg raise|leg raise/], [/hanging|side|oblique/]],
  [/reverse crunch/, ["reverse crunch"], [/reverse crunch/], []],
  [/dragon flag/, ["dragon flag"], [/dragon flag/], []],
  [/hollow/, ["hollow hold"], [/hollow/], []],
  [/l.sit/, ["l-sit"], [/l.?sit/], []],
  [/plank/, ["front plank"], [/plank/], [/side|jack|walk|up.?down/]],
  [/dead bug/, ["dead bug"], [/dead bug/], []],
  [/dead hang/, ["dead hang"], [/hang/], [/clean|snatch|leg raise|knee|pike/]],
  [/wall walk/, ["wall walk"], [/wall walk/], []],
  [/handstand|kick.up/, ["handstand"], [/handstand/], [/push/]],
  [/farmer/, ["farmers walk"], [/farmer/], []],
  [/suitcase/, ["suitcase carry"], [/suitcase/], []],
  [/sled|sprint.drag/, ["sled"], [/sled/], []],
  [/kettlebell swing/, ["kettlebell swing"], [/swing/], []],
  [/goblet/, ["goblet squat"], [/goblet/], []],
  [/step.up/, ["dumbbell step-up"], [/step.?up/], []],
  [/lunge/, ["dumbbell rear lunge", "lunge"], [/lunge/], [/jump|side|walking/]],
];
const STOP = new Set(["x", "and", "the", "with", "or", "on", "a", "each", "leg", "sec", "min", "reps", "rep", "failure", "near", "left", "slow", "heavy"]);
/* anything you typed yourself: every main word of its name has to be in the gif's name */
const edbRule = (text) => {
  const t = text.toLowerCase();
  const hit = EDB_RULES.find(([re]) => re.test(t));
  if (hit) return { queries: hit[1], must: hit[2], not: hit[3] };
  const name = t.split(/\s\d/)[0].replace(/,.*$/, "").trim();
  const words = name.split(/[^a-z]+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/s$/, ""));
  return { queries: [name], must: words.map((w) => new RegExp(w)), not: [] };
};
async function edbSearch(query) {
  const path = `exercises/search?search=${encodeURIComponent(query)}`;
  /* same-site proxy first (vercel.json), then the library directly */
  for (const base of ["/edb/", "https://oss.exercisedb.dev/api/v1/"]) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 7000);
      const res = await fetch(base + path, { signal: ctl.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const j = await res.json();
      if (j && Array.isArray(j.data)) return j.data;
    } catch (e) { /* try the next route */ }
  }
  return null;
}
async function edbLookup(text) {
  const { queries, must, not } = edbRule(text);
  let reached = false;
  const seen = new Map();
  for (const q of queries.slice(0, 2)) {
    const rows = await edbSearch(q);
    if (!rows) continue;
    reached = true;
    rows.forEach((x) => {
      const n = (x.name || "").toLowerCase();
      if (x.gifUrl && must.every((re) => re.test(n)) && !not.some((re) => re.test(n)) && !seen.has(x.exerciseId)) {
        seen.set(x.exerciseId, { id: x.exerciseId, name: x.name, url: x.gifUrl });
      }
    });
    if (seen.size) break;
  }
  if (!reached) return null;
  /* plainest name first: "dumbbell lateral raise" beats "dumbbell lateral raise v. 2 (female)" */
  return [...seen.values()].sort((a, b) => a.name.length - b.name.length).slice(0, 6);
}

function Demo({ text, color, gif, onGif }) {
  const photo = mediaFor(text);
  const cue = cueFor(text);
  const name = text.split(/\s\d/)[0].replace(/,.*$/, "");
  const q = encodeURIComponent(`${name} proper form`);
  const [view, setView] = useState("gif");
  const [loading, setLoading] = useState(false);
  const [apiFail, setApiFail] = useState(false);
  const [imgFail, setImgFail] = useState(false);
  const fresh = gif && (gif.list.length || Date.now() - gif.at < 3600000);

  useEffect(() => {
    if (fresh) return;
    let live = true;
    setLoading(true);
    edbLookup(text).then((list) => {
      if (!live) return;
      setLoading(false);
      /* only remember real answers. a failed connection tries again next time */
      if (list) onGif({ list, i: 0, at: Date.now() });
      else setApiFail(true);
    });
    return () => { live = false; };
  }, [text]);

  const pickGif = gif && gif.list.length ? gif.list[Math.min(gif.i || 0, gif.list.length - 1)] : null;
  const showGif = pickGif && (view === "gif" || !photo);
  const noImg = () => setImgFail(true);
  const blocked = !pickGif && ((photo && imgFail) || (!photo && apiFail));

  return (
    <div className="demo">
      {showGif ? (
        <div className="demo-frame gif" key={pickGif.id}>
          <img src={pickGif.url} alt={`${pickGif.name}, animated`} onError={noImg} />
        </div>
      ) : photo && !imgFail ? (
        <div className="demo-frame">
          <img src={`${IMG_BASE}${photo}/0.jpg`} alt={`${name}, start`} onError={noImg} />
          <img src={`${IMG_BASE}${photo}/1.jpg`} alt={`${name}, finish`} className="flip" onError={noImg} />
        </div>
      ) : null}
      {loading && !pickGif && <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>loading the gif…</div>}
      {blocked && (
        <div style={{ fontSize: 12.5, color: C.ink2, marginTop: 6, lineHeight: 1.6, background: C.cardAlt, borderRadius: 18, padding: "10px 12px" }}>
          the gif can't load here. open the app on your phone to see it, or watch the video below.
        </div>
      )}
      {pickGif && (
        <div style={{ fontSize: 13, color: C.ink2, marginTop: 8, lineHeight: 1.6, display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
          {showGif && <span style={{ color: C.muted }}>{pickGif.name}</span>}
          {showGif && gif.list.length > 1 && (
            <button className="linkish" onClick={() => onGif({ ...gif, i: ((gif.i || 0) + 1) % gif.list.length })}>not quite it? next match</button>
          )}
          {photo && <button className="linkish" onClick={() => setView(showGif ? "photo" : "gif")}>{showGif ? "see real photos" : "back to the gif"}</button>}
        </div>
      )}
      <div style={{ padding: "10px 2px 2px" }}>
        {cue && <div style={{ fontFamily: SERIF, fontSize: 15, lineHeight: 1.55, color: C.ink }}>{cue}</div>}
        <a href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noreferrer"
          style={{ display: "inline-block", marginTop: 8, fontSize: 13, color: C.ink2 }}>watch a video of it</a>
        {showGif && (
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
            gif from ExerciseDB by <a href="https://ascendapi.com" target="_blank" rel="noreferrer">AscendAPI</a>
          </div>
        )}
      </div>
    </div>
  );
}

const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];
const DOW = ["s","m","t","w","t","f","s"];
const pad = (n) => String(n).padStart(2, "0");
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => { const [y, m, dd] = k.split("-").map(Number); return new Date(y, m - 1, dd); };
let uidc = 0;
const uid = () => `${Date.now().toString(36)}${(uidc++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/* ───────────────────────── library ─────────────────────────
   ordering rule inside every session:
   skill / power first while fresh → heaviest compound → secondary
   compound → isolation → core → carries (grip last) → conditioning → stretch
─────────────────────────────────────────────────────────────── */
const RAW = {
  /* the plan, exactly as written. main lifts only, calisthenics lives in the finishers */
  upper: [
    ["upper A", "lat + pull-up focus", [
      ["pull-ups", ["Pull-ups 2 x near failure", "Pull-up negatives 3 x 1, 3-5 sec down"]],
      ["lifts", [
        "Close-grip lat pulldown 1 x failure, 4-8 reps",
        "Chest-supported row 1 x failure, 4-8 reps",
        "Incline DB press 2 x 6-10, 1-2 reps left",
        "Pec fly 2 x failure, 4-8 reps",
        "Lateral raises 1 x failure, 10-20 reps",
        "Bicep curl 1 x failure, 4-8 reps",
        "Tricep rope pushdown 1 x failure, 4-8 reps",
        "Rear delt fly 1 x failure, 10-20 reps"]]]],
    ["upper B", "press + push-ups", [
      ["push-ups", ["Hand-release push-ups 2 x near failure"]],
      ["lifts", [
        "Incline DB press 1 x 6-10, 1-2 reps left",
        "Seated DB shoulder press 1 x 6-10, 1-2 reps left",
        "Pec fly 1 x failure, 4-8 reps",
        "Wide-grip lat pulldown 1 x failure, 4-8 reps",
        "Chest-supported row 1 x failure, 4-8 reps",
        "Lateral raises 1 x failure, 10-20 reps",
        "Hammer curls 1 x failure, 4-8 reps",
        "Overhead tricep extension 1 x failure, 4-8 reps",
        "Rear delt fly 1 x failure, 10-20 reps"]]]],
    ["upper C", "pull strength + carries", [
      ["pull-ups", ["Pull-ups 1 x near failure", "Pull-up negatives 3-5 x 1, 3-5 sec down"]],
      ["lifts", [
        "Lat pulldown 1 x failure, 4-8 reps, medium grip",
        "Chest-supported row 1 x failure, 4-8 reps",
        "Machine chest press 1 x 6-10, 1-2 reps left",
        "Pec fly 1 x failure, 4-8 reps",
        "Lateral raises 1 x failure, 10-20 reps",
        "Bicep curl 1 x failure, 4-8 reps",
        "Tricep rope pushdown 1 x failure, 4-8 reps",
        "Rear delt fly 1 x failure, 10-20 reps",
        "Farmer's carry 2 rounds, heavy"]],
      ["last 6-8 weeks before BOLC", ["Sprint-drag-carry 1 practice round"]]]],
  ],
  lower: [
    ["lower A", "strength, power, hamstrings", [
      ["jumps first, fresh", ["Box jump 3 x 3, step down, full rest"]],
      ["lifts", [
        "Hex bar deadlift 3 x 3-5, 1-2 reps left",
        "Barbell RDL 1 x 6-8, 1-2 reps left",
        "Seated leg curl 2 x failure, 4-8 reps",
        "Hack squat 1 x 6-10, 1-2 reps left",
        "Barbell hip thrust 1 x 6-10, 1-2 reps left",
        "Calf raise 2 x failure, 4-8 reps"]],
      ["core", ["Hanging leg raise 2 x failure"]]]],
    ["lower B", "glutes + single leg", [
      ["jumps first, fresh", ["Broad jump 3 x 3, land soft, full rest"]],
      ["lifts", [
        "Barbell hip thrust 2 x 6-10, 1-2 reps left",
        "Bulgarian split squat 2 x 6-10 each leg, 1-2 reps left",
        "Leg press 1 x 8-12, 1-2 reps left",
        "Single-leg RDL 1 x 8 each leg, 1-2 reps left",
        "Seated leg curl 2 x failure, 4-8 reps",
        "Leg extension 1 x failure, 4-8 reps",
        "Calf raise 2 x failure, 4-8 reps"]],
      ["core", ["Dragon flag negatives 3 slow lowering reps"]]]],
  ],
  calisthenics: [
    ["calisthenics A", "upper body", [
      ["finisher", ["Pike push-ups 3 x 6-10", "Dips 3 x 6-10, bench or bars", "Inverted rows 3 x 8-12", "Scapular pull-ups 2 x 8", "Dead hang 2 x max"]]]],
    ["calisthenics B", "core + control", [
      ["finisher", ["Hollow body hold 3 x 20-30 sec", "L-sit tuck hold 3 x 10-20 sec", "Lying leg raise 2 x 10-15, slow", "Plank 2 x 45-60 sec", "Dead bug 2 x 10 each side"]]]],
    ["calisthenics C", "handstand", [
      ["finisher", ["Wrist prep 2 min", "Wall walks 3-4 reps", "Chest-to-wall handstand hold 3 x 20-45 sec", "Kick-up practice 5 min", "Hollow body hold 2 x 30 sec"]]]],
  ],
  legs: [
    ["glute focus", "upper glute + medius", [
      ["warm up", ["5 min easy walk or bike", "Banded lateral walks 2 x 15 steps each way, wake the medius up", "Bodyweight hip thrust 1 x 20"]],
      ["heavy first", ["Barbell hip thrust 4 x 8-10, pause 1 sec at the top", "Bulgarian split squat 3 x 10 each, torso leaned slightly forward"]],
      ["then volume", ["45° back extension, glute focus 3 x 12-15, round the upper back slightly", "Cable kickbacks 3 x 12 each, no lower back arch", "Hip abduction machine 4 x 15-20, lean forward for upper glute"]],
      ["core", ["Weighted Russian twist or cable woodchop 3 x 12 each side"]],
      ["carry, grip last", ["Farmer's carry 3 x 40 yd, heavy, ribs down"]],
      ["finish", ["Stairmaster 20 min", "Couch stretch 2 x 45 sec each", "90/90 hip switch x 10", "Deep squat hold 2 x 45 sec", "Infrared sauna 10 min"]]]],
    ["power + hex bar", "plyos then the heaviest hinge", [
      ["ankle prep", ["Knee-to-wall 2 x 10 each, heel stays down", "Ankle circles 10 each direction", "Calf and soleus stretch 30 sec each"]],
      ["plyos, lowest to highest intensity", ["Pogo hops 3 x 10, stiff ankles, quick ground contact", "Box jump 3 x 3, step down every rep", "Broad jump 3 x 3, full rest, land soft", "Bounds 3 x 20 meters", "Stop the second landings get sloppy. Plyos never go after the lifting."]],
      ["heavy first", ["Hex bar deadlift 4 x 4-5, 2-3 min rest, this is the priority lift", "Barbell hip thrust 3 x 8"]],
      ["then volume", ["DB RDL 3 x 10, moderate, the hex bar is your heavy hinge", "Hip abduction 3 x 15-20"]],
      ["core", ["Weighted plank 2 x 45 sec, plate on upper back"]],
      ["finish", ["Stairmaster 15 min", "Couch stretch, 90/90 switch, deep squat hold", "Infrared sauna 10 min"]]]],
    ["quad focus", "front of the leg", [
      ["warm up", ["5 min bike", "Bodyweight squats 2 x 15, sink into the bottom"]],
      ["heavy first", ["Goblet or front-racked squat 4 x 8-10", "Leg press 3 x 10-12, feet lower on the plate"]],
      ["then unilateral", ["Walking lunges 3 x 12 each leg", "Bulgarian split squat 2 x 10 each"]],
      ["isolation last", ["Leg extension 3 x 15, slow lower, pause at the top"]],
      ["core", ["Cable crunch 3 x 12-15", "Dead bug 2 x 10 each side"]],
      ["finish", ["Stairmaster 15 min", "Couch stretch 2 x 60 sec each", "Deep squat hold 2 x 45 sec", "Infrared sauna 10 min"]]]],
    ["hamstring + hinge", "posterior chain", [
      ["warm up", ["5 min easy", "Bodyweight good mornings 2 x 12, feel the hinge"]],
      ["heavy first", ["Hex bar deadlift 3 x 6-8, moderate", "Barbell RDL 4 x 8-10, chase the stretch not the weight"]],
      ["then volume", ["Barbell hip thrust 3 x 10", "Seated leg curl 3 x 12-15", "Lying leg curl 3 x 12", "45° back extension 3 x 15"]],
      ["core", ["Weighted hanging leg raise 3 x 8-10"]],
      ["finish", ["Incline walk 15 min", "Seated forward fold 3 x 60 sec", "Half split 2 x 60 sec each", "Infrared sauna 10 min"]]]],
    ["athletic / single leg", "balance, lateral power, transfer", [
      ["prep", ["Knee-to-wall 2 x 10 each", "Leg swings 10 each direction, each leg"]],
      ["power first", ["Lateral bounds 3 x 8 each side, stick every landing", "Skater jumps 3 x 8 each side"]],
      ["strength", ["Rear-foot-elevated split squat 4 x 8 each", "Step-ups to a bench 3 x 10 each, drive through the heel, no push off the back foot", "Single-leg RDL 3 x 10 each, slow, hips square"]],
      ["then volume", ["Lateral lunge 3 x 10 each", "Banded lateral walks 3 x 15 steps each way", "Single-leg calf raise 2 x 15 each"]],
      ["core", ["Pallof press 3 x 12 each side"]],
      ["finish", ["90/90 hip switch, couch stretch, deep squat hold", "Infrared sauna 10 min"]]]],
  ],
  push: [
    ["power push", "explosive first, then heavy", [
      ["skill first", ["Wrist prep 2 min", "Wall kick-up practice, 8-10 attempts, low stakes"]],
      ["power while fresh", ["Med ball chest throw 3 x 5, or explosive push-ups 3 x 5 with hands leaving the floor"]],
      ["heavy first", ["Barbell bench 5 x 4-6, 2 min rest, this is the priority lift", "Standing overhead press 4 x 5-6"]],
      ["then volume", ["Weighted dips or close-grip bench 3 x 6-8", "Lateral raises 3 x 12-15, slow lower"]],
      ["core", ["Pallof press 3 x 12 each side"]],
      ["finish", ["Child's pose 60 sec", "Bench chest opener 2 x 30 sec", "Wrist stretches 30 sec each"]],
      ["once per block", ["Max hand-release push-ups, done BEFORE the bench so the number is honest. Log it."]]]],
    ["arm + shoulder focus", "the toned-arm session", [
      ["skill first", ["Wrist prep 2 min", "Freestanding kick-up practice, 5 min"]],
      ["compound first", ["Seated DB shoulder press 4 x 10-12", "Close-grip push-ups 3 x AMRAP-2"]],
      ["delts", ["Lateral raises 4 x 15, light, slow lower, zero swinging", "Cable lateral raise 3 x 15 each arm, constant tension"]],
      ["triceps", ["Overhead tricep extension 4 x 10-12, long head, this shapes the back of the arm", "Tricep rope pushdown 4 x 12-15, spread the rope at the bottom"]],
      ["core", ["Cable crunch 3 x 12-15"]],
      ["finish", ["Chest opener 2 x 30 sec", "Wrist flexor and extensor 30 sec each", "Overhead tricep stretch 30 sec each"]]]],
    ["chest focus", "volume, pump", [
      ["skill first", ["Wrist prep 2 min", "Wall walks 4 reps"]],
      ["heavy first", ["Barbell bench 4 x 8-10", "Incline DB press 4 x 10-12"]],
      ["then volume", ["Dips 3 x 8-10", "Cable chest fly 3 x 12-15, squeeze and hold 1 sec", "Lateral raises 3 x 15", "Tricep pushdown 3 x 12"]],
      ["core", ["Weighted decline crunch 3 x 12-15"]],
      ["finish", ["Child's pose 60 sec", "Doorway pec stretch 2 x 45 sec each arm"]]]],
    ["calisthenic push", "garage, no barbell", [
      ["wrist prep", ["Wrist circles, palm and finger stretches, 3 min. Never skip this one."]],
      ["skill while fresh", ["Wall walks 5 reps", "Chest-to-wall handstand hold 3 x 30-45 sec", "Kick-up practice away from the wall, 5 min"]],
      ["hardest first", ["Pike push-ups 4 x 6-10, feet elevated if you can", "Push-ups 4 x AMRAP-2, vary hand width each set"]],
      ["then bands", ["Band overhead press 3 x 12", "Band chest press 3 x 12-15", "Band tricep pushdown 3 x 15", "Diamond push-ups 2 x AMRAP-2"]],
      ["core", ["Hollow body hold 3 x 30 sec", "Weighted crunch 3 x 15"]]]],
  ],
  pull: [
    ["pull-up builder", "the one that gets you the first rep", [
      ["prep", ["Band pull-aparts 2 x 15", "Dead hang 2 x 20-30 sec, shoulders active not shrugged", "Scapular pulls 2 x 8, pull the shoulder blades down without bending the elbows"]],
      ["hardest thing first, while fresh", ["Top-of-bar hold 3 x max, step up so your chin clears the bar and hold. This builds the top of the pull-up faster than anything else.", "Negatives 5 x 1, step up, lower for 8-10 seconds, fight the whole way", "Band-assisted pull-ups 3 x 5, thinnest band you can manage", "Once per block only: one honest unassisted attempt, right here while you're fresh"]],
      ["heavy pulling", ["Bent-over rows 4 x 6-8", "Lat pulldown 4 x 6-8, heavier than usual, pull to the collarbone"]],
      ["then volume", ["Single-arm lat pulldown 3 x 10-12 each", "Straight-arm pulldown 3 x 12-15, this teaches the lats to fire in the pull-up path", "Face pulls 3 x 15-20"]],
      ["core", ["Weighted hanging leg raise 3 x 8-10, done before the carries while grip is fresh"]],
      ["carry, grip last", ["Suitcase carry 3 x 30 yd each side"]],
      ["finish", ["Doorway pec stretch 2 x 30 sec each", "Thread the needle 2 x 30 sec each", "Dead hang 30 sec, let the shoulders decompress"]]]],
    ["back width + thickness", "the taper", [
      ["prep", ["Band pull-aparts 2 x 15", "Scapular pulls 2 x 8"]],
      ["skill", ["Negatives 4 x 1, 8-10 sec lower"]],
      ["heavy first", ["Lat pulldown, wide grip 4 x 10-12", "Chest-supported row 4 x 10-12, pause at the chest"]],
      ["then volume", ["Single-arm DB row 3 x 10-12 each", "Straight-arm pulldown 3 x 12-15", "Face pulls 3 x 15-20", "Shrugs 3 x 12-15"]],
      ["core", ["Cable crunch 3 x 12-15", "Dead bug 2 x 10 each side"]],
      ["finish", ["Pec stretch, thread the needle, dead hang 30 sec"]]]],
    ["arm focus pull", "biceps emphasis", [
      ["prep", ["Band pull-aparts 2 x 15", "Dead hang 2 x 30 sec"]],
      ["skill", ["Negatives 3 x 1, slow"]],
      ["back first", ["Lat pulldown 3 x 10-12", "Seated cable row 3 x 10-12", "Face pulls 3 x 15-20"]],
      ["biceps, heaviest first", ["Barbell or DB curl 4 x 10-12, no swinging", "Hammer curls 4 x 12, this builds the outer arm thickness", "Incline DB curl 3 x 12, stretch position, this is the one people skip", "Cable curl 3 x 15, burnout"]],
      ["core", ["Weighted crunch 3 x 15"]],
      ["finish", ["Bicep and forearm stretch against a wall 30 sec each", "Dead hang 30 sec"]]]],
    ["grip + posterior", "ruck and deadlift transfer", [
      ["prep", ["Band pull-aparts 2 x 15", "Scapular pulls 2 x 8"]],
      ["heavy first", ["Hex bar deadlift 3 x 5, moderate, focus on the lockout", "Bent-over rows 4 x 8"]],
      ["then volume", ["Lat pulldown 3 x 10", "Face pulls 3 x 20", "Bicep curls 3 x 12"]],
      ["core", ["Pallof press 3 x 12 each side", "Weighted plank 2 x 45 sec"]],
      ["carries, grip last", ["Farmer's carry 3 x 40 yd heavy", "Suitcase carry 2 x 30 yd each side", "Dead hang 2 x max, finish on grip"]]]],
  ],
  cardio: [
    ["speed intervals", "400s", [
      ["warm up", ["10 min easy", "Leg swings, A-skips, 2 x 20 sec strides"]],
      ["session", ["6 x 400m hard, 90 sec walk between", "Aim for the same pace on all six. If six is dropping off, do five."]],
      ["cool down", ["5 min easy", "Plank 2 x 60 sec, unweighted, this is the AFT version"]]]],
    ["strides", "speed without the wreckage", [
      ["session", ["20 min easy", "8 x 20 sec near-sprint, full walk-back recovery", "Cool down 5 min"]],
      ["core after", ["Hollow body hold 3 x 30 sec", "Pallof press 3 x 12 each"]]]],
    ["tempo run", "comfortably hard", [
      ["session", ["10 min easy warm up", "20 min at a pace you could hold but couldn't chat through", "10 min easy cool down"]],
      ["core after", ["Plank 2 x 60 sec", "Dead bug 2 x 10 each"]]]],
    ["easy run", "most days, no rules", [
      ["session", ["Go out. Come back. Conversational pace.", "Log the time and duration, that's it."]]]],
    ["long easy", "endurance base", [
      ["session", ["45-70 min easy", "Walk breaks allowed, they ruin nothing"]],
      ["after", ["Couch stretch and calf stretch 60 sec each side"]]]],
    ["incline walk / stairs", "low impact", [
      ["session", ["Stairmaster 25-30 min steady, hands off the rails", "Or treadmill incline 12%, 3.0 mph, 30 min"]],
      ["core after", ["Weighted crunch 3 x 15", "Pallof press 3 x 12 each"]]]],
    ["sprint-drag-carry", "AFT event practice", [
      ["warm up", ["10 min thoroughly, this one is all-out from the first step"]],
      ["session", ["50m shuttle: sprint, sled drag, lateral shuffle, farmer's carry, sprint", "3-4 rounds, full recovery between", "First few times, chase clean transitions before you chase the clock"]]]],
  ],
  ruck: [
    ["steady ruck", "the default", [
      ["session", ["20-25 lbs, 3 miles, walking only, brisk", "Ribs down, shoulders back, do not lean forward into the load"]],
      ["after", ["Couch stretch and calf stretch 60 sec each side"]]]],
    ["long ruck", "once a month", [
      ["session", ["20-25 lbs, 4-6 miles, walking only", "Bring water, Florida heat is not a joke", "Slow the pace, this one is about time under load"]],
      ["after", ["Full lower body stretch, 10 min minimum"]]]],
    ["ruck run intervals", "only after 3 solid blocks of walking", [
      ["session", ["20-25 lbs, 2-3 miles total", "Run 2 min, walk 3 min, repeat", "Stop the running the moment form gets sloppy"]],
      ["after", ["Couch stretch, calf stretch, ankle mobility"]]]],
    ["speed ruck", "fast walk, timed", [
      ["session", ["20-25 lbs, 2-3 miles, no running", "Push the walking pace, aim under 15 min/mile", "Time it and beat it next block"]],
      ["after", ["Calf and hip flexor stretch"]]]],
    ["hill ruck", "glutes and grit", [
      ["session", ["20-25 lbs, biggest hill or bridge you can find", "Up and down repeats, 20-30 min", "Short stride uphill, controlled downhill"]],
      ["after", ["Quad and calf stretch, they will need it"]]]],
  ],
  mobility: [
    ["flexibility deep session", "45-60 min, where range actually comes from", [
      ["warm up", ["5 min easy movement. Never stretch cold, you get nothing and risk something."]],
      ["dynamic first", ["90/90 hip switch 3 x 8 slow", "Band shoulder dislocates 2 x 10, widen the grip as it opens", "Deep squat rocks 2 x 10", "Cat-cow 10 slow"]],
      ["long holds, hips", ["Couch stretch 2 x 90 sec each side", "90/90 end-range hold 60 sec each position", "Seated forward fold 3 x 60 sec, breathe into it", "Half split 2 x 60 sec each", "Frog stretch 60 sec"]],
      ["long holds, shoulders", ["Doorway pec stretch 3 x 45 sec each arm", "Puppy pose 2 x 60 sec", "Thread the needle 2 x 45 sec each", "Wrist flexor, extensor, finger stretches 30 sec each"]],
      ["ankles", ["Deep squat hold 3 x 60 sec, heels down, elbows pushing knees out", "Kneeling ankle rock 2 x 45 sec each"]],
      ["finish", ["5 min lying still, breathing slow. This is the part that makes the holds stick."]]]],
    ["yoga + handstand skills", "garage session", [
      ["prep", ["Wrist circles, palm and finger stretches 3 min", "Knee-to-wall 2 x 10 each", "Cat-cow 10, downward dog 3 x 20 sec"]],
      ["skill while fresh", ["Wall walks 4 reps", "Chest-to-wall handstand hold 3 x 30-45 sec", "Kick-up practice away from the wall, one leg leads, 5 min", "Hollow body hold 3 x 30 sec. A handstand is a vertical hollow body."]],
      ["pull", ["Band-assisted pull-ups 3 x 5", "Inverted rows on the bar 3 x 8-10"]],
      ["flow last", ["Yoga video 30-40 min as the wind-down, hip openers and shoulder mobility"]]]],
    ["hips + hamstrings", "20 min, targeted", [
      ["dynamic first", ["90/90 hip switch 2 x 8", "Leg swings 10 each direction"]],
      ["holds", ["Couch stretch 3 x 60 sec each", "Seated forward fold 3 x 60 sec", "Frog stretch 2 x 60 sec", "Figure-4 stretch 2 x 45 sec each", "Deep squat hold 3 x 60 sec"]]]],
    ["shoulders, t-spine, wrists", "20 min, handstand prep", [
      ["dynamic first", ["Band dislocates 3 x 10", "Wall angels 2 x 10 slow", "Cat-cow 10"]],
      ["holds", ["Doorway pec stretch 3 x 45 sec each", "Thoracic extension over a foam roller 2 x 60 sec", "Puppy pose 2 x 60 sec", "Wrist flexor, extensor, finger stretches 45 sec each"]]]],
  ],
};

/* added to existing libraries without touching anything already there */
const ADD_RUCK = [
  ["weekly ruck", "stairmaster, once a rotation", [
    ["session", ["Stairmaster with your ruck on, your usual weight, a steady pace you can hold the whole time", "Hands off the rails. Stand tall, ribs down, don't lean into the machine.", "Log it in the run tab as stairmaster ruck"]],
    ["progress one thing at a time", ["Add 5 min OR 5 lb, never both in the same week", "About once a month, ruck outdoors on flat ground instead so you practice pace. BOLC rucks aren't on stairs."]],
    ["after", ["Calf and hip flexor stretch 60 sec each side"]]]],
];
const ADD_CARDIO = [
  ["hard run", "one per rotation, after upper C", [
    ["warm up", ["10 min easy", "Leg swings, A-skips, 2 x 20 sec strides"]],
    ["pick one", ["Intervals: 6 x 400m hard, 90 sec walk between. Same pace on all of them.", "Or tempo: 20 min at a pace you could hold but couldn't chat through"]],
    ["cool down", ["5-10 min easy"]]]],
];

function seedLib() {
  const out = {};
  Object.keys(RAW).forEach((cat) => { out[cat] = RAW[cat].map(buildWorkout); });
  return out;
}
function buildWorkout([name, tag, blocks]) {
  return {
    id: uid(), name, tag,
    blocks: blocks.map(([label, items]) => ({ id: uid(), label, items: items.map((t) => ({ id: uid(), text: t })) })),
  };
}

/* ───────────────────────── app ───────────────────────── */
export default function ErinsAthleteBuild() {
  const today = new Date();
  const todayKey = keyOf(today);

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("today");
  const [data, setData] = useState(null);
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [openDay, setOpenDay] = useState(todayKey);
  const [expanded, setExpanded] = useState(null); /* null = auto-open the up-next session */
  const [slotView, setSlotView] = useState(null);
  const [libCat, setLibCat] = useState("upper");
  const [editing, setEditing] = useState(null);
  const [calDay, setCalDay] = useState(null);
  const [toast, setToast] = useState("");
  const [weighIn, setWeighIn] = useState(null);
  const [swapFor, setSwapFor] = useState(null);
  const [demoFor, setDemoFor] = useState(null);
  const [reorderFor, setReorderFor] = useState(null);
  const [swapText, setSwapText] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [fC, setFC] = useState("");
  const [logShown, setLogShown] = useState(30);
  const [fF, setFF] = useState("");
  const [wVal, setWVal] = useState("");
  const [wReps, setWReps] = useState("");
  const [bwVal, setBwVal] = useState("");

  const [cType, setCType] = useState("easy");
  const [cDate, setCDate] = useState(todayKey);
  const [cDur, setCDur] = useState("");
  const [cDist, setCDist] = useState("");
  const [cNote, setCNote] = useState("");
  const nowTod = () => { const h = new Date().getHours(); return h < 11 ? "morning" : h < 14 ? "midday" : h < 18 ? "afternoon" : "evening"; };
  const [cTod, setCTod] = useState(nowTod());
  const [qType, setQType] = useState("easy");
  const [qDur, setQDur] = useState("");
  const [qTod, setQTod] = useState(nowTod());

  const [fName, setFName] = useState("");
  const [fCal, setFCal] = useState("");
  const [fPro, setFPro] = useState("");

  useEffect(() => {
    (async () => {
      let d = null;
      try {
        const res = await store.get("erins-athlete-build");
        if (res && res.value) d = JSON.parse(res.value);
      } catch (e) { /* first run */ }
      if (!d || !d.lib) {
        d = { lib: seedLib(), plan: {}, sessions: {}, checks: {}, cardio: [], habits: {}, food: {}, lifts: {}, bw: {}, startDate: todayKey };
      }
      if (!d.lifts) d.lifts = {};
      if (!d.bw) d.bw = {};
      // days used to hold one session; they hold a list now
      Object.keys(d.sessions || {}).forEach((k) => {
        if (d.sessions[k] && !Array.isArray(d.sessions[k])) d.sessions[k] = [d.sessions[k]];
      });
      /* upper/lower update: adds the new sessions and the rotation.
         nothing you logged, edited or built gets removed. */
      CATS.forEach((cat) => { if (!d.lib[cat]) d.lib[cat] = (RAW[cat] || []).map(buildWorkout); });
      const addMissing = (cat, list) => {
        const have = new Set(d.lib[cat].map((w) => w.name));
        const extra = list.filter((w) => !have.has(w[0])).map(buildWorkout);
        d.lib[cat] = [...extra, ...d.lib[cat]];
      };
      if (!d.rotation) {
        addMissing("ruck", ADD_RUCK);
        addMissing("cardio", ADD_CARDIO);
        d.rotation = ROTATION.map((r) => ({ slot: r.slot, wid: (d.lib[r.slot].find((w) => w.name === r.name) || d.lib[r.slot][0])?.id }));
        d.rotStart = todayKey;
      }
      /* plan v3: the five rotation sessions match the written plan exactly.
         ids stay the same so the rotation and your logs keep working. */
      if (!d.planV || d.planV < 3) {
        ["upper", "lower"].forEach((cat) => {
          RAW[cat].forEach((spec) => {
            const fresh = buildWorkout(spec);
            const i = d.lib[cat].findIndex((w) => w.name === spec[0]);
            if (i >= 0) d.lib[cat][i] = { ...fresh, id: d.lib[cat][i].id };
            else d.lib[cat].push(fresh);
          });
        });
        d.planV = 3;
      }
      /* v4: you can do pull-ups now. rename the band-assisted sets, keep ids + history */
      if (d.planV === 3) {
        (d.lib.upper || []).forEach((w) => {
          w.blocks.forEach((b) => {
            b.items = b.items.map((it) => (/^band.assisted pull-ups/i.test(it.text) ? { ...it, text: it.text.replace(/^band.assisted pull-ups/i, "Pull-ups") } : it));
            const iP = b.items.findIndex((it) => /^pull-ups\s/i.test(it.text));
            const iN = b.items.findIndex((it) => /^pull-up negatives/i.test(it.text));
            if (iP > -1 && iN > -1 && iN < iP) { const [p] = b.items.splice(iP, 1); b.items.splice(iN, 0, p); }
          });
        });
        d.planV = 4;
      }
      setData(d);
      setLoading(false);
    })();
  }, []);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2600); };
  const save = async (next) => {
    setData(next);
    try { await store.set("erins-athlete-build", JSON.stringify(next)); }
    catch (e) { flash("that didn't save, try again"); }
  };

  if (loading || !data) {
    return <div style={{ background: C.bg, minHeight: "100%", padding: 40, fontFamily: F, color: C.muted, fontSize: 14 }}>loading…</div>;
  }

  /* ── helpers ── */
  const sessionsOn = (k) => data.sessions[k] || [];
  /* walk the rotation forward from its start, one logged session at a time */
  const rot = data.rotation || [];
  const rotStart = data.rotStart || todayKey;
  const rotWalk = (() => {
    const at = {}; let idx = 0; let movedToday = false;
    if (!rot.length) return { at, base: 0 };
    for (let d = parseKey(rotStart); keyOf(d) <= todayKey; d.setDate(d.getDate() + 1)) {
      const k = keyOf(d);
      at[k] = idx;
      const ss = sessionsOn(k);
      const hit = ss.map((x) => rot.findIndex((r) => r.wid === x.variantId)).filter((i) => i >= 0).pop();
      let moved = false;
      if (hit !== undefined) { idx = (hit + 1) % rot.length; moved = true; }
      else if (ss.some((x) => x.slotType === rot[idx].slot)) { idx = (idx + 1) % rot.length; moved = true; }
      else if (rot[idx].slot === "ruck" && (data.cardio || []).some((e) => e.date === k && RUCKS.has(e.type))) { idx = (idx + 1) % rot.length; moved = true; }
      if (k === todayKey) movedToday = moved;
    }
    /* if today's session isn't logged yet, tomorrow assumes you'll do it */
    const base = movedToday ? idx : ((at[todayKey] ?? idx) + 1) % rot.length;
    return { at, base };
  })();
  const rotIdx = (k) => {
    if (!rot.length || k < rotStart) return null;
    if (k <= todayKey) return rotWalk.at[k] ?? null;
    const ahead = Math.round((parseKey(k) - parseKey(todayKey)) / 86400000);
    return (rotWalk.base + ahead - 1) % rot.length;
  };
  const rotName = (i) => (i == null ? null : findWorkout(rot[i].wid)?.name || ROTATION[i]?.name || SLOTS[rot[i].slot].label);
  const plannedSlot = (k) => { if (data.plan[k]) return data.plan[k]; const i = rotIdx(k); return i == null ? "rest" : rot[i].slot; };
  const findWorkout = (id) => { for (const cat of CATS) { const f = data.lib[cat].find((w) => w.id === id); if (f) return f; } return null; };
  const getChecks = (k, wid) => data.checks[`${k}::${wid}`] || {};
  const toggleCheck = (k, wid, itemId) => {
    const cur = { ...getChecks(k, wid) };
    if (cur[itemId]) delete cur[itemId]; else cur[itemId] = true;
    save({ ...data, checks: { ...data.checks, [`${k}::${wid}`]: cur } });
  };
  /* strips the sets-and-reps tail so the same lift shares one history
     across every session it appears in */
  const exKey = (t) => {
    const head = t.split(/[0-9,(]/)[0];
    const clean = (head && head.trim().length > 2 ? head : t).toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
    return clean || t.toLowerCase();
  };
  const addLift = (k, name, val, reps) => {
    const wt = parseFloat(val);
    if (!wt || wt <= 0) { flash("add a number first"); return; }
    const hist = data.lifts[k] || [];
    save({ ...data, lifts: { ...data.lifts, [k]: [...hist, { date: openDay, weight: wt, reps: parseInt(reps, 10) || null, name }] } });
  };
  /* saves a set, checks the exercise off, and tells you if it was progress */
  const logSet = (key, name, val, reps, wid, itemId, last, best) => {
    const wt = parseFloat(val) || 0;
    const r = parseInt(reps, 10) || null;
    if (wt <= 0 && !r) { flash("add a weight or your reps"); return; }
    const hist = data.lifts[key] || [];
    const checks = { ...getChecks(openDay, wid), [itemId]: true };
    save({ ...data, lifts: { ...data.lifts, [key]: [...hist, { date: openDay, weight: wt, reps: r, name }] }, checks: { ...data.checks, [`${openDay}::${wid}`]: checks } });
    setWeighIn(null); setWVal(""); setWReps("");
    if (best != null && wt > best) flash(`new best: ${wt} lb`);
    else if (last && wt > last.weight) flash(`+${+(wt - last.weight).toFixed(1)} lb from last time`);
    else if (last && wt === last.weight && r && last.reps && r > last.reps) flash(`+${r - last.reps} rep${r - last.reps > 1 ? "s" : ""} from last time`);
    else flash("logged");
  };
  /* moves an exercise up or down, crossing into the next section at the edges. saves to the plan. */
  const moveItem = (cat, wid, itemId, dir) => {
    save({ ...data, lib: { ...data.lib, [cat]: data.lib[cat].map((w) => {
      if (w.id !== wid) return w;
      const blocks = w.blocks.map((b) => ({ ...b, items: [...b.items] }));
      const bi = blocks.findIndex((b) => b.items.some((it) => it.id === itemId));
      if (bi < 0) return w;
      const ii = blocks[bi].items.findIndex((it) => it.id === itemId);
      const [item] = blocks[bi].items.splice(ii, 1);
      if (dir < 0) {
        if (ii > 0) blocks[bi].items.splice(ii - 1, 0, item);
        else if (bi > 0) blocks[bi - 1].items.push(item);
        else blocks[bi].items.unshift(item);
      } else {
        if (ii < blocks[bi].items.length) blocks[bi].items.splice(ii + 1, 0, item);
        else if (bi < blocks.length - 1) blocks[bi + 1].items.unshift(item);
        else blocks[bi].items.push(item);
      }
      return { ...w, blocks: blocks.filter((b) => b.items.length) };
    }) } });
  };
  const healthFor = (k) => (data.health || {})[k] || null;
  const syncHealth = async () => {
    let txt = "";
    try { txt = await navigator.clipboard.readText(); } catch (e) { flash("tap paste when your phone asks"); return; }
    const h = parseHealth(txt);
    if (!h) { flash(`run your "${SHORTCUT_NAME}" shortcut first, then tap sync`); return; }
    const k = h.date || todayKey;
    save({ ...data, health: { ...(data.health || {}), [k]: { ...(healthFor(k) || {}), ...(h.steps != null ? { steps: h.steps } : {}), ...(h.dist != null ? { dist: h.dist } : {}), at: Date.now() } } });
    flash(`synced ${h.steps != null ? `${h.steps.toLocaleString()} steps` : ""}${h.steps != null && h.dist != null ? ", " : ""}${h.dist != null ? `${h.dist} mi` : ""}`);
  };
  const swapsFor = (k, wid) => (data.swaps || {})[`${k}::${wid}`] || {};
  const setSwap = (k, wid, itemId, text) => {
    const cur = { ...swapsFor(k, wid) };
    if (text == null) delete cur[itemId]; else cur[itemId] = text;
    save({ ...data, swaps: { ...(data.swaps || {}), [`${k}::${wid}`]: cur } });
  };
  const keepSwap = (cat, wid, itemId, text) => {
    const cur = { ...swapsFor(openDay, wid) }; delete cur[itemId];
    save({
      ...data,
      swaps: { ...(data.swaps || {}), [`${openDay}::${wid}`]: cur },
      lib: { ...data.lib, [cat]: data.lib[cat].map((w) => (w.id !== wid ? w : { ...w, blocks: w.blocks.map((b) => ({ ...b, items: b.items.map((it) => (it.id === itemId ? { ...it, text } : it)) })) })) },
    });
    flash("saved to the plan");
  };
  const habitsFor = (k) => data.habits[k] || { waterOz: 0, sauna: false, stretch: false, sleep: false };
  const setHabit = (k, patch) => save({ ...data, habits: { ...data.habits, [k]: { ...habitsFor(k), ...patch } } });
  const foodFor = (k) => data.food[k] || [];
  const toggleSession = (k, slotType, variantId) => {
    const cur = sessionsOn(k);
    const has = cur.some((s) => s.variantId === variantId);
    const next = has ? cur.filter((s) => s.variantId !== variantId) : [...cur, { slotType, variantId }];
    const all = { ...data.sessions };
    if (next.length) all[k] = next; else delete all[k];
    save({ ...data, sessions: all });
  };
  const liftsOn = (k) => {
    const out = [];
    Object.keys(data.lifts).forEach((key) => data.lifts[key].forEach((e) => { if (e.date === k) out.push({ ...e, key }); }));
    return out;
  };

  /* ── styles ── */
  const card = { background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 24, padding: 20, marginBottom: 16, boxShadow: `4px 4px 0 ${C.pink}` };
  const eyebrow = { fontSize: 17, fontFamily: SERIF, fontStyle: "italic", color: C.pinkDeep, marginBottom: 12, fontWeight: 500 };
  const input = { background: C.cardAlt, border: `1px solid ${C.line}`, color: C.ink, fontFamily: F, fontSize: 14, padding: "12px 14px", borderRadius: 18, width: "100%", outline: "none", boxSizing: "border-box" };
  const lbl = { fontSize: 14, fontFamily: SERIF, fontStyle: "italic", color: C.muted, display: "block", marginBottom: 7 };
  const pill = (on, col = C.ink) => ({
    background: on ? col : "transparent", color: on ? C.card : C.ink2,
    border: `1px solid ${on ? col : C.line}`, padding: "9px 16px", fontFamily: F, fontSize: 13,
    borderRadius: 999, cursor: "pointer", fontWeight: on ? 500 : 400,
  });
  const solid = (col) => ({ background: col, color: C.card, border: "none", padding: "13px 24px", fontFamily: F, fontSize: 14, borderRadius: 999, cursor: "pointer", fontWeight: 600, boxShadow: `0 3px 0 ${C.pink}` });
  const ghost = { background: C.card, color: C.ink2, border: `1.5px solid ${C.line}`, padding: "10px 18px", fontFamily: F, fontSize: 13, borderRadius: 999, cursor: "pointer" };
  const updateWorkout = (cat, wid, fn) => save({ ...data, lib: { ...data.lib, [cat]: data.lib[cat].map((w) => (w.id === wid ? fn(w) : w)) } });

  /* ─────────── today ─────────── */
  /* one exercise line: check it, see how, swap it, log the weight */
  const renderItem = (w, it, liftish, col, cat) => {
    const checks = getChecks(openDay, w.id);
    const on = !!checks[it.id];
    const sw = swapsFor(openDay, w.id)[it.id];
    const skipped = sw === "SKIP";
    const shownText = sw && !skipped ? sw : it.text;
    const ek = exKey(shownText);
    const hist = data.lifts[ek] || [];
    const prior = hist.filter((x) => x.date < openDay);
    const todays = hist.filter((x) => x.date === openDay);
    const best = hist.length ? Math.max(...hist.map((x) => x.weight)) : null;
    const last = prior.length ? prior[prior.length - 1] : null;
    
    const isW = weighIn === it.id;
    const isS = swapFor === it.id;
    const dKey = `${w.id}::${it.id}`;
    const isD = demoFor === dKey;
    const openWeigh = () => { setWeighIn(it.id); setSwapFor(null); setWVal(last && last.weight ? String(last.weight) : ""); setWReps(""); };
    const tapCheck = () => toggleCheck(openDay, w.id, it.id);
    
    return (
      <div key={it.id} style={{ padding: "9px 0", opacity: skipped ? 0.5 : 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div onClick={tapCheck} style={{
            width: 24, height: 24, borderRadius: 999, flexShrink: 0, marginTop: -1, cursor: "pointer",
            border: `1.5px solid ${on ? col : C.muted}`,
            background: on ? col : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{on && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>♥</span>}</div>
          <div style={{ flex: 1 }}>
            <div onClick={() => setDemoFor(isD ? null : dKey)} role="button" aria-expanded={isD}
              style={{ fontSize: 14.5, color: on ? C.muted : C.ink, lineHeight: 1.5, textDecorationLine: on || skipped ? "line-through" : "none", textDecorationColor: col, cursor: "pointer" }}>
              {shownText}<span style={{ color: col, marginLeft: 6, fontFamily: SERIF, fontStyle: "italic", fontSize: 13 }}>{isD ? "close" : "how"}</span>
            </div>
            {sw && (
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
                {skipped ? "skipped today" : `swapped from ${it.text.split(/\s\d/)[0]}`} ·{" "}
                <span onClick={() => setSwap(openDay, w.id, it.id, null)} style={{ textDecoration: "underline", cursor: "pointer" }}>undo</span>
              </div>
            )}
            {!skipped && liftish && reorderFor !== w.id && (
              <div style={{ fontSize: 13, marginTop: 3, color: todays.length ? col : C.ink2 }}>
                {todays.length
                  ? `today ${todays.map((x) => `${fmtW(x.weight)}${x.reps ? ` × ${x.reps}` : ""}`).join(", ")} ✓`
                  : last ? `last time ${fmtW(last.weight)}${last.reps ? ` × ${last.reps}` : ""}`
                  : ""}
              </div>
            )}
          </div>
          {reorderFor === w.id ? (
            <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
              <button aria-label="move up" onClick={() => moveItem(cat, w.id, it.id, -1)} className="arrow">↑</button>
              <button aria-label="move down" onClick={() => moveItem(cat, w.id, it.id, 1)} className="arrow">↓</button>
            </div>
          ) : (
          <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
            <button onClick={() => { setSwapFor(isS ? null : it.id); setWeighIn(null); setSwapText(""); }}
              style={{ background: isS ? C.cardAlt : "transparent", border: `1px solid ${C.line}`, color: C.muted, fontFamily: F, fontSize: 13, padding: "4px 10px", borderRadius: 18, cursor: "pointer" }}>swap</button>
            {!skipped && (liftish || hist.length > 0) && (
              <button onClick={() => (isW ? setWeighIn(null) : openWeigh())}
                style={{ background: todays.length ? col : liftish ? C.cardAlt : "transparent", border: `1px solid ${todays.length ? col : C.line}`, color: todays.length ? C.card : liftish ? C.ink : C.muted, fontFamily: F, fontSize: 13, padding: "4px 11px", borderRadius: 18, cursor: "pointer", whiteSpace: "nowrap" }}>
                {todays.length ? fmtW(todays[todays.length - 1].weight) : "+ log"}
              </button>
            )}
          </div>
          )}
        </div>

        {isD && !skipped && (
          <div style={{ marginLeft: 32, marginTop: 10 }}>
            <Demo text={shownText} color={col} gif={(data.gifs || {})[ek]}
              onGif={(g) => setData((cur) => { const next = { ...cur, gifs: { ...(cur.gifs || {}), [ek]: g } }; store.set("erins-athlete-build", JSON.stringify(next)).catch(() => {}); return next; })} />
          </div>
        )}

        {isW && (
          <div style={{ marginLeft: 32, marginTop: 10, background: C.cardAlt, borderRadius: 18, padding: 13 }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 10, lineHeight: 1.6 }}>
              {last ? `last time ${fmtW(last.weight)}${last.reps ? ` × ${last.reps}` : ""}` : "no history yet"}
              {best ? ` · best ${best} lb` : ""}{hist.length ? ` · ${hist.length} entries` : ""}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="number" inputMode="decimal" value={wVal} onChange={(e) => setWVal(e.target.value)} placeholder="lb"
                style={{ ...input, background: C.card, padding: "10px 12px", fontSize: 13 }} />
              <input type="number" inputMode="numeric" value={wReps} onChange={(e) => setWReps(e.target.value)} placeholder="reps"
                style={{ ...input, background: C.card, padding: "10px 12px", fontSize: 13, width: 84, flexShrink: 0 }} />
              <button onClick={() => { logSet(ek, shownText, wVal, wReps, w.id, it.id, last, best); }}
                style={{ ...solid(col), padding: "10px 18px", fontSize: 13, flexShrink: 0 }}>save</button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 9, gap: 8 }}>
              <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>log your top set. bodyweight? leave lb empty, just reps.</div>
              {!on && <button onClick={() => { toggleCheck(openDay, w.id, it.id); setWeighIn(null); }} style={{ ...ghost, fontSize: 12.5, padding: "5px 10px", flexShrink: 0 }}>just check off</button>}
            </div>
          </div>
        )}

        {isS && (
          <div style={{ marginLeft: 32, marginTop: 10, background: C.cardAlt, borderRadius: 18, padding: 13 }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>swap for today only</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {altsFor(it.text).map(([nm, why]) => (
                <button key={nm} onClick={() => { setSwap(openDay, w.id, it.id, withTail(it.text, nm)); setSwapFor(null); }}
                  style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: "8px 12px", fontFamily: F, fontSize: 13, color: C.ink, cursor: "pointer", textAlign: "left" }}>
                  {nm}<div style={{ fontSize: 12.5, color: C.muted, marginTop: 1 }}>{why}</div>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input value={swapText} onChange={(e) => setSwapText(e.target.value)} placeholder="or type your own"
                style={{ ...input, background: C.card, padding: "10px 12px", fontSize: 13 }} />
              <button onClick={() => { if (!swapText.trim()) return; setSwap(openDay, w.id, it.id, withTail(it.text, swapText.trim())); setSwapFor(null); }}
                style={{ ...solid(col), padding: "10px 16px", fontSize: 13, flexShrink: 0 }}>use</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button onClick={() => { setSwap(openDay, w.id, it.id, "SKIP"); setSwapFor(null); }} style={{ ...ghost, fontSize: 13, padding: "7px 12px" }}>skip it today</button>
              {sw && !skipped && (
                <button onClick={() => { keepSwap(cat, w.id, it.id, sw); setSwapFor(null); }} style={{ ...ghost, fontSize: 13, padding: "7px 12px" }}>keep this swap in the plan</button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderToday = () => {
    const daySessions = sessionsOn(openDay);
    const activeSlot = slotView || daySessions[daySessions.length - 1]?.slotType || plannedSlot(openDay);
    const ri = rotIdx(openDay);
    const upNext = ri != null && !data.plan[openDay] ? rot[ri] : null;
    const upNextId = upNext && upNext.slot === activeSlot ? upNext.wid : null;
    const baseOptions = activeSlot === "rest" ? [] : data.lib[activeSlot] || [];
    const options = upNextId ? [...baseOptions.filter((w) => w.id === upNextId), ...baseOptions.filter((w) => w.id !== upNextId)] : baseOptions;
    const runPlan = ri != null ? ROTATION[ri] : null;
    const runsToday = data.cardio.filter((e) => e.date === openDay);
    const pillSlots = SLOTS[activeSlot].old ? [...DAY_SLOTS, activeSlot] : DAY_SLOTS;
    const logRun = () => {
      const dur = parseFloat(qDur);
      if (!dur || dur <= 0) { flash("how long were you out?"); return; }
      save({ ...data, cardio: [{ id: uid(), date: openDay, type: qType, duration: dur, distance: 0, note: "", tod: qTod }, ...data.cardio] });
      setQDur("");
    };
    const h = habitsFor(openDay);
    const meals = foodFor(openDay);
    const kcal = meals.reduce((s, m) => s + (m.cal || 0), 0);
    const pro = meals.reduce((s, m) => s + (m.pro || 0), 0);

    return (
      <div>
        <div style={{ ...card, paddingBottom: 22, background: TINT[activeSlot] || C.card, borderColor: "transparent" }}>
          <div style={eyebrow}>{openDay === todayKey ? "today" : parseKey(openDay).toDateString().toLowerCase()}</div>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 50, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1, color: SLOTS[activeSlot].color }}>
            {!daySessions.length && upNextId ? rotName(ri) : SLOTS[activeSlot].label}
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
            {daySessions.length
              ? `logged · ${daySessions.map((s) => (s.variantId === "REST" ? "rest" : findWorkout(s.variantId)?.name || "session")).join(" + ")}`
              : upNextId ? `next in your rotation, ${findWorkout(upNextId)?.tag || ""}` : "choose a session"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
            {pillSlots.map((s) => (
              <button key={s} onClick={() => { setSlotView(s === activeSlot ? null : s); setExpanded(null); }}
                style={{ ...pill(s === activeSlot, SLOTS[s].color), fontSize: 13, padding: "7px 14px" }}>{SLOTS[s].label}</button>
            ))}
          </div>
        </div>

        {activeSlot === "rest" ? (
          <div style={{ ...card, fontSize: 14, color: C.ink2, lineHeight: 1.7 }}>
            rest day. the rotation holds your place.
            <div style={{ marginTop: 16 }}>
              <button onClick={() => toggleSession(openDay, "rest", "REST")} style={solid(C.sage)}>
                {daySessions.some((s) => s.variantId === "REST") ? "rest logged ✓" : "mark rest day"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {(activeSlot === "upper" || activeSlot === "lower") && (
              <div style={{ ...card, background: C.cardAlt, fontSize: 13, color: C.ink2, lineHeight: 1.7, padding: 16 }}>
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: C.ink }}>how hard. </span>
                isolation: 1-2 sets to failure, 4-8 reps (laterals and rear delts 10-20). compounds: stop with 1-2 reps left.
                jumps: first, fresh, never tired. hit the top of the range on every set, then add weight next time.
              </div>
            )}
            <div style={{ ...eyebrow, marginLeft: 4 }}>choose your session</div>
            {options.map((w) => {
              const isOpen = expanded === w.id || (expanded === null && w.id === upNextId && !daySessions.length);
              const isLogged = daySessions.some((s) => s.variantId === w.id);
              const checks = getChecks(openDay, w.id);
              const total = w.blocks.reduce((s, b) => s + b.items.length, 0);
              const done = Object.keys(checks).length;
              return (
                <div key={w.id} style={{ ...card, padding: 0, borderColor: isLogged ? SLOTS[activeSlot].color : C.lineSoft, marginBottom: 10 }}>
                  <div onClick={() => setExpanded(isOpen ? "none" : w.id)} style={{ padding: 18, cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 18, background: SLOTS[activeSlot].color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.01em" }}>
                        {w.name}
                        {w.id === upNextId && <span style={{ fontSize: 14, color: SLOTS[activeSlot].color, marginLeft: 8, fontFamily: SERIF, fontStyle: "italic", fontWeight: 400 }}>up next</span>}
                      </div>
                      <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{w.tag}</div>
                    </div>
                    {done > 0 && <div style={{ fontSize: 13, color: SLOTS[activeSlot].color, fontWeight: 500 }}>{done}/{total}</div>}
                    <div style={{ color: C.muted, fontSize: 18, lineHeight: 1 }}>{isOpen ? "−" : "+"}</div>
                  </div>

                  {isOpen && (
                    <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${C.lineSoft}` }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, marginBottom: -6 }}>
                        <button className="linkish" style={{ fontSize: 12 }} onClick={() => setReorderFor(reorderFor === w.id ? null : w.id)}>
                          {reorderFor === w.id ? "done reordering" : "reorder"}
                        </button>
                      </div>
                      {w.blocks.map((b) => (
                        <div key={b.id} style={{ marginTop: 18 }}>
                          <div style={{ fontSize: 14, fontFamily: SERIF, fontStyle: "italic", color: SLOTS[activeSlot].color, marginBottom: 8, fontWeight: 500 }}>{b.label}</div>
                          {b.items.map((it) => renderItem(w, it, isLiftBlock(b.label), SLOTS[activeSlot].color, activeSlot))}
                        </div>
                      ))}
                      {activeSlot !== "calisthenics" && (() => {
                        const finList = data.lib.calisthenics || [];
                        const rIdx = rot.findIndex((r) => r.wid === w.id);
                        const presetName = rIdx >= 0 ? ROTATION[rIdx]?.fin : null;
                        const preset = presetName ? finList.find((f) => f.name === presetName) : null;
                        const pk = `${openDay}::${w.id}`;
                        const picked = (data.finisherPick || {})[pk];
                        const finId = picked === undefined ? preset?.id || "none" : picked;
                        const fin = finList.find((f) => f.id === finId);
                        const fcol = SLOTS.calisthenics.color;
                        const pick = (id) => save({ ...data, finisherPick: { ...(data.finisherPick || {}), [pk]: id } });
                        return (
                          <div className="finisher">
                            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                              <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 19, color: C.ink }}>calisthenics finisher</div>
                              <div style={{ fontSize: 13, color: C.muted }}>optional</div>
                            </div>
                            <div style={{ display: "flex", gap: 6, marginTop: 12, overflowX: "auto", paddingBottom: 2 }}>
                              {finList.map((f) => {
                                const onF = f.id === finId;
                                const short = f.name.replace(/^calisthenics\s*/i, "") || f.name;
                                return (
                                  <button key={f.id} onClick={() => pick(f.id)} className="chip"
                                    style={{ borderColor: onF ? fcol : C.line, background: onF ? fcol : "transparent", color: onF ? C.card : C.ink }}>
                                    <span style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1 }}>{short}</span>
                                    <span style={{ fontSize: 12.5, opacity: 0.8 }}>{f.tag}</span>
                                  </button>
                                );
                              })}
                              <button onClick={() => pick("none")} className="chip"
                                style={{ borderColor: finId === "none" ? C.ink2 : C.line, background: "transparent", color: finId === "none" ? C.ink : C.muted }}>
                                <span style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1, fontStyle: "italic" }}>skip</span>
                                <span style={{ fontSize: 12.5, opacity: 0.8 }}>not today</span>
                              </button>
                            </div>
                            {fin && (
                              <div style={{ marginTop: 10 }}>
                                {fin.blocks.map((fb) => fb.items.map((it) => renderItem(fin, it, false, fcol, "calisthenics")))}
                                {reorderFor === w.id && (
                                  <button className="linkish" style={{ fontSize: 13, marginTop: 6 }} onClick={() => setReorderFor(fin.id)}>reorder the finisher instead</button>
                                )}
                                {reorderFor === fin.id && (
                                  <button className="linkish" style={{ fontSize: 13, marginTop: 6 }} onClick={() => setReorderFor(null)}>done reordering</button>
                                )}
                              </div>
                            )}
                            <button onClick={() => {
                              const nw = { id: uid(), name: "my finisher", tag: "your own", blocks: [{ id: uid(), label: "finisher", items: [{ id: uid(), text: "" }] }] };
                              save({ ...data, lib: { ...data.lib, calisthenics: [...finList, nw] } });
                              setLibCat("calisthenics"); setEditing(nw.id); setTab("library");
                            }} style={{ ...ghost, fontSize: 13, padding: "7px 13px", marginTop: 10 }}>build your own finisher</button>
                          </div>
                        );
                      })()}
                      {(() => {
                        const sws = swapsFor(openDay, w.id);
                        const lifts = w.blocks.filter((b) => isLiftBlock(b.label)).flatMap((b) => b.items).filter((it) => sws[it.id] !== "SKIP");
                        const done = lifts.filter((it) => (data.lifts[exKey(sws[it.id] || it.text)] || []).some((x) => x.date === openDay)).length;
                        return lifts.length > 0 && (
                          <div style={{ marginTop: 18, fontSize: 13, color: done === lifts.length ? SLOTS[activeSlot].color : C.ink2 }}>
                            {done === lifts.length ? `all lifts logged` : `${done} of ${lifts.length} lifts logged`}
                          </div>
                        );
                      })()}
                      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        <button onClick={() => toggleSession(openDay, activeSlot, w.id)}
                          style={solid(isLogged ? C.sage : SLOTS[activeSlot].color)}>{isLogged ? "logged ✓ · tap to remove" : "log this session"}</button>
                        <button onClick={() => { setLibCat(activeSlot); setEditing(w.id); setTab("library"); }} style={ghost}>edit</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={() => {
              const nw = { id: uid(), name: `new ${SLOTS[activeSlot].label} session`, tag: "your own", blocks: [{ id: uid(), label: "work", items: [{ id: uid(), text: "" }] }] };
              save({ ...data, lib: { ...data.lib, [activeSlot]: [...data.lib[activeSlot], nw] } });
              setLibCat(activeSlot); setEditing(nw.id); setTab("library");
            }} style={{ ...ghost, width: "100%", padding: "15px", marginBottom: 14, borderStyle: "dashed" }}>
              + build your own {SLOTS[activeSlot].label} session
            </button>
          </>
        )}

        {daySessions.length > 0 && (
          <button onClick={() => { const s = { ...data.sessions }; delete s[openDay]; save({ ...data, sessions: s }); }} style={{ ...ghost, marginBottom: 14 }}>clear this day</button>
        )}

        <div style={card}>
          <div style={eyebrow}>run today</div>
          {runPlan ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em", color: C.sky }}>{runPlan.run}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{runPlan.why}</div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>log whatever you did</div>
          )}
          {runsToday.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {runsToday.map((e) => (
                <div key={e.id} style={{ fontSize: 13, color: C.ink2, padding: "3px 0" }}>
                  ✓ {typeLabel(e.type)} · {Math.round(e.duration)} min{e.tod ? ` · ${e.tod}` : ""}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
            {QUICK.map((v) => <button key={v} onClick={() => setQType(v)} style={{ ...pill(qType === v, C.sky), fontSize: 13, padding: "7px 13px" }}>{typeLabel(v)}</button>)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {TODS.map((t) => <button key={t} onClick={() => setQTod(t)} style={{ ...pill(qTod === t, C.ink2), fontSize: 13, padding: "7px 13px" }}>{t}</button>)}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input type="number" value={qDur} onChange={(e) => setQDur(e.target.value)} placeholder="minutes" style={input} />
            <button onClick={logRun} style={{ ...solid(C.sky), flexShrink: 0 }}>log run</button>
          </div>
        </div>

        <div style={card}>
          <div style={eyebrow}>daily</div>
          {(() => {
            const hk = healthFor(openDay);
            return (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 22, paddingBottom: 16, marginBottom: 16, borderBottom: `1px solid ${C.lineSoft}` }}>
                <div>
                  <div style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1 }}>{hk && hk.steps != null ? hk.steps.toLocaleString() : "–"}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>steps</div>
                </div>
                <div>
                  <div style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1 }}>{hk && hk.dist != null ? hk.dist : "–"}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>miles walked + run</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <button onClick={syncHealth} style={{ ...ghost, padding: "8px 14px", color: C.ink }}>sync from Health</button>
                  <a href={`shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`} style={{ fontSize: 12.5, color: C.muted }}>run shortcut</a>
                </div>
              </div>
            );
          })()}
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-0.02em" }}>{h.waterOz}</div>
            <div style={{ fontSize: 13, color: C.muted }}>oz water</div>
            {h.waterOz > 0 && (
              <button onClick={() => setHabit(openDay, { waterOz: 0 })} style={{ ...ghost, marginLeft: "auto", padding: "6px 12px", fontSize: 12 }}>reset</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {[8, 12, 16, 20, 32].map((n) => (
              <button key={n} onClick={() => setHabit(openDay, { waterOz: Math.max(0, h.waterOz + n) })}
                style={{ ...pill(false), fontSize: 13, padding: "9px 14px", flex: 1 }}>+{n}</button>
            ))}
            <button onClick={() => setHabit(openDay, { waterOz: Math.max(0, h.waterOz - 8) })} style={{ ...pill(false), fontSize: 13, padding: "9px 14px" }}>−8</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {[["stretch", "stretched"], ["sauna", "sauna"], ["sleep", "slept well"]].map(([k, l]) => (
              <button key={k} onClick={() => setHabit(openDay, { [k]: !h[k] })} style={{ ...pill(h[k], C.sage), fontSize: 13, padding: "11px 6px" }}>{l}</button>
            ))}
          </div>
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.lineSoft}`, display: "flex", alignItems: "flex-end", gap: 22 }}>
            <div>
              <div style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1 }}>{pro}<span style={{ fontSize: 16, color: C.muted }}> / {data.proteinGoal || 100}g</span></div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>protein</div>
            </div>
            <div>
              <div style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1 }}>{kcal}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>calories</div>
            </div>
            <button onClick={() => setTab("food")} style={{ ...ghost, marginLeft: "auto", padding: "8px 14px" }}>log food</button>
          </div>
        </div>
      </div>
    );
  };

  /* ─────────── calendar ─────────── */
  const renderMonth = () => {
    const cells = [];
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    const prefix = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`;
    const doneCount = Object.keys(data.sessions).filter((k) => k.startsWith(prefix)).reduce((a, k) => a + sessionsOn(k).filter((s) => s.slotType !== "rest").length, 0);

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 32, fontWeight: 400, letterSpacing: "-0.02em" }}>
            {MONTHS[cursor.getMonth()]} <span style={{ color: C.muted, fontWeight: 300 }}>{cursor.getFullYear()}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["‹", -1], ["›", 1]].map(([s, n]) => (
              <button key={s} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1))}
                style={{ background: C.card, border: `1px solid ${C.line}`, color: C.ink, width: 36, height: 36, borderRadius: 18, cursor: "pointer", fontSize: 17 }}>{s}</button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>{doneCount} sessions this month</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
          {DOW.map((d, i) => <div key={i} style={{ fontSize: 12.5, color: C.muted, textAlign: "center", paddingBottom: 6, letterSpacing: "0.1em" }}>{d}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const k = keyOf(d);
            const ss = sessionsOn(k);
            const logged = ss.length > 0;
            const shown = logged ? ss[0].slotType : plannedSlot(k);
            const col = SLOTS[shown].color;
            const pastBlank = !logged && k < todayKey && !data.plan[k];
            const ci = rotIdx(k);
            const planLabel = !data.plan[k] && ci != null ? rotName(ci) : SLOTS[shown].label;
            const isSel = calDay === k;
            return (
              <button key={i} onClick={() => setCalDay(isSel ? null : k)}
                style={{
                  background: logged ? TINT[ss[0].slotType] || C.pinkSoft : C.card,
                  border: `1.5px solid ${isSel ? C.ink : k === todayKey ? C.ink2 : C.lineSoft}`,
                  height: 56, padding: 6, cursor: "pointer", borderRadius: 18, textAlign: "left", overflow: "hidden", fontFamily: F, position: "relative",
                }}>
                <div style={{ fontSize: 12.5, color: logged ? C.ink : C.muted }}>{d.getDate()}</div>
                <div style={{ fontSize: 12.5, color: logged ? SLOTS[ss[0].slotType].color : col, marginTop: 3, fontWeight: 500, lineHeight: 1.2 }}>
                  {logged ? ss.map((s) => SLOTS[s.slotType].label).join(" + ") : pastBlank ? "" : planLabel}
                </div>
                {ss.length > 1 && (
                  <div style={{ position: "absolute", bottom: 5, right: 5, display: "flex", gap: 3 }}>
                    {ss.slice(1).map((s, j) => (
                      <div key={j} style={{ width: 6, height: 6, borderRadius: 18, background: C.card, border: `1px solid ${SLOTS[s.slotType].color}` }} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {calDay && (
          <div style={{ ...card, marginTop: 18 }}>
            <div style={eyebrow}>{parseKey(calDay).toDateString().toLowerCase()}</div>
            <div style={{ fontSize: 13, color: C.ink2, marginBottom: 14, lineHeight: 1.6 }}>set this day</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {DAY_SLOTS.map((s) => (
                <button key={s} onClick={() => save({ ...data, plan: { ...data.plan, [calDay]: s } })}
                  style={{ ...pill(plannedSlot(calDay) === s, SLOTS[s].color), fontSize: 13, padding: "8px 14px" }}>{SLOTS[s].label}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => { setOpenDay(calDay); setSlotView(null); setExpanded(null); setTab("today"); }} style={solid(C.ink)}>open this day</button>
              {data.plan[calDay] && (
                <button onClick={() => { const p = { ...data.plan }; delete p[calDay]; save({ ...data, plan: p }); }} style={ghost}>reset to rotation</button>
              )}
            </div>
          </div>
        )}

        <div style={{ ...card, marginTop: 18 }}>
          <div style={eyebrow}>the rotation</div>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
            {rot.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: i < rot.length - 1 ? `1px solid ${C.lineSoft}` : "none" }}>
                <div style={{ color: C.muted, width: 16, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <span style={{ color: SLOTS[r.slot].color, fontWeight: 500 }}>{rotName(i)}</span>
                  <span style={{ color: C.muted }}> · {ROTATION[i]?.run}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginTop: 14 }}>
            advances when you log a session. skipped days wait.
            one hard run per rotation, the rest easy. deload every 6-8 weeks: half the sets, nothing to failure.
          </div>
          <button onClick={() => { if (window.confirm("start the rotation over at upper A today? your logs stay.")) save({ ...data, rotStart: todayKey, sessions: data.sessions }); }}
            style={{ ...ghost, marginTop: 14 }}>start over at upper A today</button>
        </div>
      </div>
    );
  };

  /* ─────────── log ─────────── */
  const renderLog = () => {
    const days = Array.from(new Set([
      ...Object.keys(data.sessions),
      ...Object.keys(data.bw),
      ...data.cardio.map((e) => e.date),
      ...Object.keys(data.lifts).flatMap((k) => data.lifts[k].map((e) => e.date)),
    ])).sort().reverse();

    if (days.length === 0) {
      return <div style={{ ...card, fontSize: 14, color: C.muted, lineHeight: 1.7 }}>nothing logged yet.</div>;
    }

    const backup = async () => {
      const name = `athlete-build-backup-${todayKey}.json`;
      const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
      try {
        const file = new File([blob], name, { type: "application/json" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
      } catch (e) { if (e && e.name === "AbortError") return; }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      flash("backup saved");
    };

    return (
      <div>
        <button onClick={backup} style={{ ...ghost, marginBottom: 14 }}>save a backup of everything</button>
        <div style={{ ...eyebrow, marginLeft: 4 }}>everything you've done</div>
        {days.slice(0, 60).map((k) => {
          const ss = sessionsOn(k);
          const lifts = liftsOn(k);
          const cardioOn = data.cardio.filter((e) => e.date === k);
          const bw = data.bw[k];
          const headCol = ss.length ? SLOTS[ss[0].slotType].color : C.muted;
          return (
            <div key={k} style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: 18, background: headCol, flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: C.muted }}>{parseKey(k).toDateString().toLowerCase()}</div>
                <button onClick={() => { setOpenDay(k); setSlotView(null); setExpanded(null); setTab("today"); }}
                  style={{ ...ghost, marginLeft: "auto", padding: "6px 12px", fontSize: 12 }}>open</button>
              </div>

              {ss.length === 0 && <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em" }}>weights logged</div>}

              {ss.map((s, si) => {
                const w = s.variantId !== "REST" ? findWorkout(s.variantId) : null;
                const checks = w ? getChecks(k, w.id) : {};
                const totalItems = w ? w.blocks.reduce((a, b) => a + b.items.length, 0) : 0;
                return (
                  <div key={si} style={{ marginBottom: si < ss.length - 1 ? 12 : 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <div style={{ fontSize: 14, fontFamily: SERIF, fontStyle: "italic", color: SLOTS[s.slotType].color, fontWeight: 500 }}>
                        {SLOTS[s.slotType].label}
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.01em" }}>
                        {s.variantId === "REST" ? "rest day" : w?.name || "session"}
                      </div>
                    </div>
                    {w && totalItems > 0 && (
                      <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{Object.keys(checks).length} of {totalItems} checked off</div>
                    )}
                  </div>
                );
              })}

              {lifts.length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.lineSoft}` }}>
                  {lifts.map((e, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "5px 0" }}>
                      <div style={{ flex: 1, fontSize: 14, color: C.ink2 }}>{e.name || e.key}</div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: C.clay }}>{fmtW(e.weight)}{e.reps ? ` × ${e.reps}` : ""}</div>
                    </div>
                  ))}
                </div>
              )}

              {cardioOn.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.lineSoft}` }}>
                  {cardioOn.map((e) => (
                    <div key={e.id} style={{ fontSize: 13, color: C.sky }}>
                      {typeLabel(e.type)} · {Math.round(e.duration)} min{e.tod ? ` · ${e.tod}` : ""}{e.distance ? ` · ${e.distance} mi` : ""}{e.note ? ` · ${e.note}` : ""}
                    </div>
                  ))}
                </div>
              )}

              {bw && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.lineSoft}`, fontSize: 13, color: C.sage }}>
                  body weight {bw} lb
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  /* ─────────── cardio ─────────── */
  const renderCardio = () => {
    const prefix = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`;
    const me = data.cardio.filter((e) => e.date.startsWith(prefix));
    const totalMin = me.reduce((s, e) => s + e.duration, 0);
    const totalMi = me.reduce((s, e) => s + (e.distance || 0), 0);
    const daysOut = new Set(me.map((e) => e.date)).size;
    const paceOf = (e) => { if (!e.distance) return null; const p = e.duration / e.distance; return `${Math.floor(p)}:${pad(Math.round((p - Math.floor(p)) * 60))}/mi`; };
    const speedOf = (e) => (e.distance ? `${(e.distance / (e.duration / 60)).toFixed(1)} mph` : null);
    const add = () => {
      const dur = parseFloat(cDur);
      if (!dur || dur <= 0) { flash("how long were you out?"); return; }
      save({ ...data, cardio: [{ id: uid(), date: cDate, type: cType, duration: dur, distance: parseFloat(cDist) || 0, note: cNote.trim(), tod: cTod }, ...data.cardio] });
      setCDur(""); setCDist(""); setCNote("");
    };

    const wkStart = new Date(today); wkStart.setDate(wkStart.getDate() - 6);
    const wk = data.cardio.filter((e) => e.date >= keyOf(wkStart) && e.date <= todayKey);
    const mins = (list) => Math.round(list.reduce((a, e) => a + e.duration, 0));
    const wkEasy = wk.filter((e) => EASY.has(e.type));
    const wkHard = wk.filter((e) => HARD.has(e.type));
    const wkRuck = wk.filter((e) => RUCKS.has(e.type));
    const moEasy = mins(me.filter((e) => EASY.has(e.type)));
    const moHard = mins(me.filter((e) => HARD.has(e.type)));
    const moRun = moEasy + moHard;

    return (
      <div>
        {(() => {
          const days = [...Array(7)].map((_, i) => { const d = new Date(today); d.setDate(d.getDate() - (6 - i)); const k = keyOf(d); return { k, d, steps: (healthFor(k) || {}).steps || 0 }; });
          const max = Math.max(1, ...days.map((x) => x.steps));
          const had = days.filter((x) => x.steps);
          if (!had.length) return null;
          const avg = Math.round(had.reduce((a, x) => a + x.steps, 0) / had.length);
          return (
            <div style={card}>
              <div style={eyebrow}>steps, last 7 days</div>
              <div style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1 }}>{avg.toLocaleString()}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 5, marginBottom: 16 }}>daily average</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 70 }}>
                {days.map((x) => <div key={x.k} style={{ flex: 1, height: Math.max(2, (x.steps / max) * 70), background: x.steps ? C.sky : C.lineSoft, borderRadius: 4 }} />)}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 7 }}>
                {days.map((x) => <div key={x.k} style={{ flex: 1, textAlign: "center", fontSize: 12.5, color: C.muted }}>{DOW[x.d.getDay()]}</div>)}
              </div>
            </div>
          );
        })()}

        <div style={card}>
          <div style={eyebrow}>last 7 days</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[{ n: wkEasy.length, sub: `${mins(wkEasy)} min`, l: "easy runs" },
              { n: wkHard.length, sub: `${mins(wkHard)} min`, l: "hard runs" },
              { n: wkRuck.length, sub: wkRuck.length ? `${mins(wkRuck)} min` : "not yet", l: "rucks" }].map((x, i) => (
              <div key={i}>
                <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em" }}>{x.n}</div>
                <div style={{ fontSize: 13, color: C.ink2, marginTop: 2 }}>{x.sub}</div>
                <div style={{ fontSize: 14, fontFamily: SERIF, fontStyle: "italic", color: C.muted, marginTop: 5 }}>{x.l}</div>
              </div>
            ))}
          </div>
          {moRun > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 7 }}>{MONTHS[cursor.getMonth()]} running · easy {moEasy} min · hard {moHard} min</div>
              <div style={{ display: "flex", height: 8, borderRadius: 18, overflow: "hidden", background: C.cardAlt }}>
                <div style={{ width: `${(moEasy / moRun) * 100}%`, background: C.sky }} />
                <div style={{ width: `${(moHard / moRun) * 100}%`, background: C.clay }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
          {[{ n: daysOut, l: "days out" }, { n: totalMi ? totalMi.toFixed(1) : "0", l: "miles" },
            { n: totalMin >= 60 ? `${Math.floor(totalMin / 60)}h${Math.round(totalMin % 60)}` : `${Math.round(totalMin)}m`, l: "time" }].map((s, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.lineSoft}`, borderRadius: 18, padding: "18px 14px" }}>
              <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em" }}>{s.n}</div>
              <div style={{ fontSize: 14, fontFamily: SERIF, fontStyle: "italic", color: C.muted, marginTop: 5 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={eyebrow}>log it</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {TYPES.filter(([v]) => v !== "run" && v !== "ruckrun").map(([v, l]) => <button key={v} onClick={() => setCType(v)} style={{ ...pill(cType === v, C.sky), fontSize: 13, padding: "8px 14px" }}>{l}</button>)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {TODS.map((t) => <button key={t} onClick={() => setCTod(t)} style={{ ...pill(cTod === t, C.ink2), fontSize: 13, padding: "8px 14px" }}>{t}</button>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div><label style={lbl}>day</label><input type="date" value={cDate} onChange={(e) => setCDate(e.target.value)} style={input} /></div>
            <div><label style={lbl}>minutes</label><input type="number" value={cDur} onChange={(e) => setCDur(e.target.value)} placeholder="28" style={input} /></div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>miles · optional</label>
            <input type="number" step="0.01" value={cDist} onChange={(e) => setCDist(e.target.value)} placeholder="2.4" style={input} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>how it felt · optional</label>
            <input type="text" value={cNote} onChange={(e) => setCNote(e.target.value)} placeholder="hot, legs good" style={input} />
          </div>
          <button onClick={add} style={solid(C.sky)}>log it</button>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 14, lineHeight: 1.6 }}>
            miles optional. add them for pace.
          </div>
        </div>

        <div style={{ ...eyebrow, marginLeft: 4 }}>history</div>
        {data.cardio.length === 0 ? (
          <div style={{ ...card, fontSize: 14, color: C.muted }}>no runs logged yet.</div>
        ) : (
          <div style={{ ...card, padding: "6px 20px" }}>
            {data.cardio.slice(0, 30).map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
                <div style={{ fontSize: 13, color: C.muted, width: 44, flexShrink: 0 }}>{MONTHS[parseKey(e.date).getMonth()].slice(0, 3)} {parseKey(e.date).getDate()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: HARD.has(e.type) ? C.clay : RUCKS.has(e.type) ? C.butter : C.sky, fontWeight: 500 }}>
                    {typeLabel(e.type)} <span style={{ color: C.ink, fontWeight: 400 }}>· {Math.round(e.duration)} min</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
                    {[e.tod, paceOf(e) ? `${e.distance} mi · ${paceOf(e)} · ${speedOf(e)}` : null, e.note].filter(Boolean).join(" · ") || " "}
                  </div>
                </div>
                <button onClick={() => save({ ...data, cardio: data.cardio.filter((x) => x.id !== e.id) })}
                  style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 17 }} aria-label="remove">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* ─────────── food + body ─────────── */
  const renderFood = () => {
    const meals = foodFor(openDay);
    const kcal = meals.reduce((s, m) => s + (m.cal || 0), 0);
    const pro = meals.reduce((s, m) => s + (m.pro || 0), 0);
    const h = habitsFor(openDay);
    const last7 = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const k = keyOf(d);
      return { k, d, cal: foodFor(k).reduce((s, m) => s + (m.cal || 0), 0), w: (data.habits[k] || {}).waterOz || 0 };
    });
    const maxCal = Math.max(1, ...last7.map((x) => x.cal));
    const maxW = Math.max(64, ...last7.map((x) => x.w));

    const bwKeys = Object.keys(data.bw).sort();
    const bwPts = bwKeys.slice(-14).map((k) => ({ k, v: data.bw[k] }));
    const bwMin = bwPts.length ? Math.min(...bwPts.map((p) => p.v)) : 0;
    const bwMax = bwPts.length ? Math.max(...bwPts.map((p) => p.v)) : 1;
    const bwSpan = Math.max(1, bwMax - bwMin);

    const add = () => {
      if (!fName.trim()) { flash("what did you eat?"); return; }
      save({ ...data, food: { ...data.food, [openDay]: [...meals, { id: uid(), name: fName.trim(), cal: parseInt(fCal, 10) || 0, pro: parseInt(fPro, 10) || 0, c: parseInt(fC, 10) || 0, f: parseInt(fF, 10) || 0 }] } });
      setFName(""); setFCal(""); setFPro(""); setFC(""); setFF("");
    };
    const carbs = meals.reduce((a, m) => a + (m.c || 0), 0);
    const fat = meals.reduce((a, m) => a + (m.f || 0), 0);
    const goal = data.proteinGoal || 100;
    const shiftDay = (n) => { const d = parseKey(openDay); d.setDate(d.getDate() + n); const k = keyOf(d); if (k <= todayKey) setOpenDay(k); };
    const totals = (k) => foodFor(k).reduce((t, m) => ({ cal: t.cal + (m.cal || 0), pro: t.pro + (m.pro || 0), c: t.c + (m.c || 0), f: t.f + (m.f || 0), n: t.n + 1 }), { cal: 0, pro: 0, c: 0, f: 0, n: 0 });
    const pastDays = Object.keys(data.food).filter((k) => (data.food[k] || []).length).sort().reverse();
    const wk = last7.map((x) => ({ ...x, pro: totals(x.k).pro }));
    const logged7 = wk.filter((x) => x.pro > 0);
    const avg7 = logged7.length ? Math.round(logged7.reduce((a, x) => a + x.pro, 0) / logged7.length) : 0;
    const hit7 = wk.filter((x) => x.pro >= goal).length;
    const maxPro = Math.max(goal * 1.25, ...wk.map((x) => x.pro));
    const readPaste = (txt) => {
      const got = parseMacros(txt || "");
      if (!got.length) { flash("couldn't find numbers in that. try the copy-the-ask button"); setParsed(null); return; }
      setParsed(got.map((g) => ({ ...g, id: uid() })));
    };
    const fromClipboard = async () => {
      try { const t = await navigator.clipboard.readText(); setPasteText(t); readPaste(t); }
      catch (e) { flash("tap the box and paste instead"); }
    };
    const copyAsk = async () => {
      try { await navigator.clipboard.writeText(MACRO_PROMPT); flash("copied. paste it into your AI chat"); }
      catch (e) { flash("couldn't copy. it's written under the box"); }
    };
    const addParsed = () => {
      save({ ...data, food: { ...data.food, [openDay]: [...meals, ...parsed.map((p) => ({ id: uid(), name: p.name, cal: p.cal, pro: p.pro, c: p.c, f: p.f }))] } });
      flash(`added ${parsed.length} item${parsed.length > 1 ? "s" : ""}`);
      setParsed(null); setPasteText("");
    };
    const addBw = () => {
      const v = parseFloat(bwVal);
      if (!v || v <= 0) { flash("add a number first"); return; }
      save({ ...data, bw: { ...data.bw, [openDay]: v } });
      setBwVal("");
    };

    return (
      <div>
        <div style={{ ...card, paddingTop: 22, paddingBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button className="arrow" aria-label="previous day" onClick={() => shiftDay(-1)}>‹</button>
            <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 17, color: C.ink2 }}>
              {openDay === todayKey ? "today" : parseKey(openDay).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toLowerCase()}
            </div>
            <button className="arrow" aria-label="next day" onClick={() => shiftDay(1)} disabled={openDay >= todayKey} style={{ opacity: openDay >= todayKey ? 0.3 : 1 }}>›</button>
          </div>
          <div style={{ textAlign: "center", marginTop: 22 }}>
            <div style={{ fontFamily: SERIF, fontSize: 76, fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {pro}<span style={{ fontSize: 30, color: C.muted }}> / {goal}g</span>
            </div>
            <div style={{ fontSize: 13, color: C.ink2, marginTop: 8, letterSpacing: ".03em" }}>
              protein {pro >= goal ? "· done" : `· ${goal - pro}g to go`}
            </div>
            <div style={{ height: 4, background: C.lineSoft, marginTop: 16 }}>
              <div style={{ height: "100%", width: `${Math.min(100, (pro / goal) * 100)}%`, background: C.pinkDeep, transition: "width .3s" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", marginTop: 22, borderTop: `1px solid ${C.lineSoft}` }}>
            {[[kcal, "calories", ""], [carbs, "carbs", "g"], [fat, "fat", "g"]].map(([n, l, u], i) => (
              <div key={l} style={{ textAlign: "center", paddingTop: 16, borderLeft: i ? `1px solid ${C.lineSoft}` : "none" }}>
                <div style={{ fontFamily: SERIF, fontSize: 28, lineHeight: 1 }}>{n}{u}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 6, letterSpacing: ".03em" }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button className="linkish" style={{ fontSize: 13, color: C.muted }} onClick={() => {
              const v = parseInt(window.prompt("daily protein goal (g)", String(goal)), 10);
              if (v > 0) save({ ...data, proteinGoal: v });
            }}>change protein goal</button>
          </div>
        </div>

        {meals.length > 0 && (
          <div style={{ ...card, padding: "6px 20px" }}>
            {meals.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
                <div style={{ flex: 1, fontSize: 14 }}>{m.name}</div>
                <div style={{ fontSize: 13, color: C.ink2 }}>{m.cal}</div>
                {m.pro > 0 && <div style={{ fontSize: 13, color: C.clay }}>{m.pro}g</div>}
                {(m.c > 0 || m.f > 0) && <div style={{ fontSize: 13, color: C.muted }}>{m.c || 0}C {m.f || 0}F</div>}
                <button onClick={() => save({ ...data, food: { ...data.food, [openDay]: meals.filter((x) => x.id !== m.id) } })}
                  style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 17 }} aria-label="remove">×</button>
              </div>
            ))}
          </div>
        )}

        <div style={card}>
          <div style={eyebrow}>add from your AI</div>
          <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.6, marginBottom: 12 }}>
            paste your AI's macro breakdown. check it, then add.
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button onClick={fromClipboard} style={{ ...solid(C.pinkDeep), flex: 1 }}>paste from clipboard</button>
            <button onClick={copyAsk} style={{ ...ghost, flexShrink: 0 }}>copy the ask</button>
          </div>
          <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} onPaste={(e) => { const t = e.clipboardData.getData("text"); setTimeout(() => readPaste(t), 0); }}
            placeholder="or paste into this box" rows={3} style={{ ...input, resize: "vertical", lineHeight: 1.5 }} />
          {pasteText && !parsed && <button onClick={() => readPaste(pasteText)} style={{ ...ghost, marginTop: 10 }}>read it</button>}
          {parsed && (
            <div style={{ marginTop: 14 }}>
              {parsed.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
                  <input value={p.name} onChange={(e) => setParsed(parsed.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))}
                    style={{ ...input, padding: "8px 10px", fontSize: 13, flex: 1, minWidth: 0 }} />
                  <div style={{ fontSize: 13, color: C.ink2, textAlign: "right", flexShrink: 0, lineHeight: 1.4 }}>
                    {p.cal} cal · <span style={{ color: C.clay }}>{p.pro}g P</span>
                    {(p.c > 0 || p.f > 0) && <div style={{ color: C.muted }}>{p.c}C · {p.f}F</div>}
                  </div>
                  <button onClick={() => { const n = parsed.filter((x) => x.id !== p.id); setParsed(n.length ? n : null); }}
                    style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 17 }} aria-label="remove">×</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
                <button onClick={addParsed} style={solid(C.pinkDeep)}>add all</button>
                <button onClick={() => setParsed(null)} style={ghost}>cancel</button>
                <div style={{ fontSize: 13, color: C.muted, marginLeft: "auto" }}>
                  {parsed.reduce((a, p) => a + p.cal, 0)} cal · {parsed.reduce((a, p) => a + p.pro, 0)}g P
                </div>
              </div>
            </div>
          )}
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginTop: 12 }}>
            for the cleanest read, ask your AI for one line per food: food | calories | protein | carbs | fat. "copy the ask" copies that request.
          </div>
        </div>

        <div style={card}>
          <div style={eyebrow}>or add by hand</div>
          <div style={{ marginBottom: 10 }}>
            <input type="text" value={fName} onChange={(e) => setFName(e.target.value)} placeholder="greek yogurt bowl" style={input} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <input type="number" value={fCal} onChange={(e) => setFCal(e.target.value)} placeholder="calories" style={input} />
            <input type="number" value={fPro} onChange={(e) => setFPro(e.target.value)} placeholder="protein g" style={input} />
            <input type="number" value={fC} onChange={(e) => setFC(e.target.value)} placeholder="carbs g · optional" style={input} />
            <input type="number" value={fF} onChange={(e) => setFF(e.target.value)} placeholder="fat g · optional" style={input} />
          </div>
          <button onClick={add} style={solid(C.pinkDeep)}>add</button>
        </div>

        {/* protein, last 7 days */}
        <div style={card}>
          <div style={eyebrow}>protein, last 7 days</div>
          <div style={{ display: "flex", gap: 24, marginBottom: 18 }}>
            <div><div style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1 }}>{avg7}g</div><div style={{ fontSize: 13, color: C.muted, marginTop: 5 }}>daily average</div></div>
            <div><div style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1 }}>{hit7} / 7</div><div style={{ fontSize: 13, color: C.muted, marginTop: 5 }}>days at {goal}g+</div></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {wk.map((x) => <div key={x.k} style={{ flex: 1, textAlign: "center", fontSize: 12.5, color: C.muted, height: 16 }}>{x.pro || ""}</div>)}
          </div>
          <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: `${(goal / maxPro) * 80}px`, borderTop: `1px dashed ${C.pinkDeep}`, pointerEvents: "none" }} />
            {wk.map((x) => (
              <div key={x.k} onClick={() => setOpenDay(x.k)} style={{ flex: 1, cursor: "pointer", height: Math.max(2, (x.pro / maxPro) * 80),
                background: x.pro >= goal ? C.pinkDeep : x.pro ? C.pink : C.lineSoft, outline: x.k === openDay ? `1.5px solid ${C.ink2}` : "none", outlineOffset: 2, borderRadius: 8 }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 7 }}>
            {wk.map((x) => <div key={x.k} style={{ flex: 1, textAlign: "center", fontSize: 12.5, color: x.k === openDay ? C.ink : C.muted }}>{DOW[x.d.getDay()]}</div>)}
          </div>
        </div>

        {/* every day logged */}
        <div style={card}>
          <div style={eyebrow}>food log</div>
          {pastDays.length === 0 ? (
            <div style={{ fontSize: 13, color: C.muted }}>nothing logged yet.</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 0.8fr 0.8fr", fontSize: 12.5, color: C.muted, letterSpacing: ".03em", paddingBottom: 8, borderBottom: `1px solid ${C.line}` }}>
                <span>day</span><span style={{ textAlign: "right" }}>protein</span><span style={{ textAlign: "right" }}>cal</span><span style={{ textAlign: "right" }}>carbs</span><span style={{ textAlign: "right" }}>fat</span>
              </div>
              {pastDays.slice(0, logShown).map((k) => {
                const t = totals(k);
                const d = parseKey(k);
                return (
                  <button key={k} onClick={() => { setOpenDay(k); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 0.8fr 0.8fr", width: "100%", alignItems: "baseline", background: k === openDay ? C.pinkSoft : "transparent", border: "none", borderBottom: `1px solid ${C.lineSoft}`, padding: "12px 0", fontFamily: F, fontSize: 13, color: C.ink, cursor: "pointer", textAlign: "left" }}>
                    <span>{d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toLowerCase().replace(",", "")}</span>
                    <span style={{ textAlign: "right", fontWeight: 500 }}>
                      {t.pro >= goal && <span style={{ color: C.pinkDeep, marginRight: 5 }}>♥</span>}{t.pro}g
                    </span>
                    <span style={{ textAlign: "right", color: C.ink2 }}>{t.cal}</span>
                    <span style={{ textAlign: "right", color: C.ink2 }}>{t.c}g</span>
                    <span style={{ textAlign: "right", color: C.ink2 }}>{t.f}g</span>
                  </button>
                );
              })}
              {pastDays.length > logShown && (
                <button className="linkish" style={{ fontSize: 13, marginTop: 12 }} onClick={() => setLogShown(logShown + 30)}>show older days</button>
              )}
            </>
          )}
        </div>

        {/* water */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-0.02em" }}>{h.waterOz}</div>
            <div style={{ fontSize: 13, color: C.muted }}>oz water today</div>
            {h.waterOz > 0 && <button onClick={() => setHabit(openDay, { waterOz: 0 })} style={{ ...ghost, marginLeft: "auto", padding: "6px 12px", fontSize: 12 }}>reset</button>}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {[8, 12, 16, 20, 32].map((n) => (
              <button key={n} onClick={() => setHabit(openDay, { waterOz: Math.max(0, h.waterOz + n) })}
                style={{ ...pill(false), fontSize: 13, padding: "9px 14px", flex: 1 }}>+{n}</button>
            ))}
            <button onClick={() => setHabit(openDay, { waterOz: Math.max(0, h.waterOz - 8) })} style={{ ...pill(false), fontSize: 13, padding: "9px 14px" }}>−8</button>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            {last7.map((x) => (
              <div key={x.k} onClick={() => setOpenDay(x.k)} style={{ flex: 1, cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 5, height: 14 }}>{x.w || ""}</div>
                <div style={{ height: Math.max(3, (x.w / maxW) * 46), borderRadius: 18, background: C.sky, opacity: x.w ? 1 : 0.25 }} />
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6 }}>{DOW[x.d.getDay()]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* body weight */}
        <div style={card}>
          <div style={eyebrow}>body weight</div>
          <div style={{ display: "flex", gap: 8, marginBottom: bwPts.length ? 20 : 0 }}>
            <input type="number" step="0.1" value={bwVal} onChange={(e) => setBwVal(e.target.value)}
              placeholder={data.bw[openDay] ? `${data.bw[openDay]} logged` : "lb"} style={input} />
            <button onClick={addBw} style={{ ...solid(C.sage), flexShrink: 0 }}>save</button>
          </div>
          {bwPts.length > 1 && (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 70 }}>
                {bwPts.map((p) => (
                  <div key={p.k} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                    <div style={{ height: `${20 + ((p.v - bwMin) / bwSpan) * 70}%`, borderRadius: 18, background: p.k === openDay ? C.sage : C.blush, opacity: 0.9 }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 13, color: C.muted }}>
                <span>{bwPts[0].v} lb · {MONTHS[parseKey(bwPts[0].k).getMonth()].slice(0, 3)} {parseKey(bwPts[0].k).getDate()}</span>
                <span style={{ color: C.ink, fontWeight: 500 }}>{bwPts[bwPts.length - 1].v} lb now</span>
              </div>
            </>
          )}
          {bwPts.length === 1 && (
            <div style={{ fontSize: 13, color: C.muted }}>{bwPts[0].v} lb logged. add a few more and the trend shows up here.</div>
          )}
        </div>

        <div style={card}>
          <div style={eyebrow}>habits today</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {[["stretch", "stretched"], ["sauna", "sauna"], ["sleep", "slept well"]].map(([k, l]) => (
              <button key={k} onClick={() => setHabit(openDay, { [k]: !h[k] })} style={{ ...pill(h[k], C.sage), fontSize: 13, padding: "11px 6px" }}>{l}</button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ─────────── library ─────────── */
  const renderLibrary = () => (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
        {CATS.map((k) => (
          <button key={k} onClick={() => { setLibCat(k); setEditing(null); }} style={{ ...pill(libCat === k, SLOTS[k].color), fontSize: 13, padding: "8px 14px", opacity: SLOTS[k].old && libCat !== k ? 0.6 : 1 }}>{SLOTS[k].old ? `old ${SLOTS[k].label}` : SLOTS[k].label}</button>
        ))}
      </div>

      {data.lib[libCat].map((w) => {
        const isEd = editing === w.id;
        return (
          <div key={w.id} style={card}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                {isEd ? (
                  <>
                    <input value={w.name} onChange={(e) => updateWorkout(libCat, w.id, (x) => ({ ...x, name: e.target.value }))}
                      style={{ ...input, fontSize: 16, fontWeight: 500, marginBottom: 8 }} />
                    <input value={w.tag} onChange={(e) => updateWorkout(libCat, w.id, (x) => ({ ...x, tag: e.target.value }))}
                      style={{ ...input, fontSize: 13 }} placeholder="short description" />
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-0.01em" }}>{w.name}</div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{w.tag}</div>
                  </>
                )}
              </div>
              <button onClick={() => setEditing(isEd ? null : w.id)} style={{ ...pill(isEd, SLOTS[libCat].color), fontSize: 13, padding: "7px 14px", flexShrink: 0 }}>
                {isEd ? "done" : "edit"}
              </button>
            </div>

            {w.blocks.map((b, bi) => (
              <div key={b.id} style={{ marginTop: 16 }}>
                {isEd ? (
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <input value={b.label}
                      onChange={(e) => updateWorkout(libCat, w.id, (x) => ({ ...x, blocks: x.blocks.map((y) => (y.id === b.id ? { ...y, label: e.target.value } : y)) }))}
                      style={{ ...input, fontSize: 13, padding: "9px 12px" }} />
                    <button disabled={bi === 0} onClick={() => updateWorkout(libCat, w.id, (x) => {
                      const arr = [...x.blocks]; [arr[bi - 1], arr[bi]] = [arr[bi], arr[bi - 1]]; return { ...x, blocks: arr };
                    })} style={{ ...ghost, padding: "9px 12px", flexShrink: 0, opacity: bi === 0 ? 0.35 : 1 }}>↑</button>
                    <button onClick={() => updateWorkout(libCat, w.id, (x) => ({ ...x, blocks: x.blocks.filter((y) => y.id !== b.id) }))}
                      style={{ ...ghost, padding: "9px 13px", flexShrink: 0 }}>×</button>
                  </div>
                ) : (
                  <div style={{ fontSize: 14, fontFamily: SERIF, fontStyle: "italic", color: SLOTS[libCat].color, marginBottom: 9, fontWeight: 500 }}>{b.label}</div>
                )}

                {b.items.map((it, ii) => isEd ? (
                  <div key={it.id} style={{ display: "flex", gap: 6, marginBottom: 7 }}>
                    <input value={it.text}
                      onChange={(e) => updateWorkout(libCat, w.id, (x) => ({ ...x, blocks: x.blocks.map((y) => (y.id === b.id ? { ...y, items: y.items.map((z) => (z.id === it.id ? { ...z, text: e.target.value } : z)) } : y)) }))}
                      style={{ ...input, fontSize: 13, padding: "10px 12px" }} placeholder="exercise, sets x reps" />
                    <button disabled={ii === 0} onClick={() => updateWorkout(libCat, w.id, (x) => ({
                      ...x, blocks: x.blocks.map((y) => { if (y.id !== b.id) return y; const arr = [...y.items]; [arr[ii - 1], arr[ii]] = [arr[ii], arr[ii - 1]]; return { ...y, items: arr }; }),
                    }))} style={{ ...ghost, padding: "10px 12px", flexShrink: 0, opacity: ii === 0 ? 0.35 : 1 }}>↑</button>
                    <button onClick={() => updateWorkout(libCat, w.id, (x) => ({ ...x, blocks: x.blocks.map((y) => (y.id === b.id ? { ...y, items: y.items.filter((z) => z.id !== it.id) } : y)) }))}
                      style={{ ...ghost, padding: "10px 13px", flexShrink: 0 }}>×</button>
                  </div>
                ) : (
                  <div key={it.id} style={{ fontSize: 14, color: C.ink2, lineHeight: 1.6, paddingLeft: 14, position: "relative", marginBottom: 3 }}>
                    <span style={{ position: "absolute", left: 0, color: C.muted }}>·</span>{it.text}
                  </div>
                ))}

                {isEd && (
                  <button onClick={() => updateWorkout(libCat, w.id, (x) => ({ ...x, blocks: x.blocks.map((y) => (y.id === b.id ? { ...y, items: [...y.items, { id: uid(), text: "" }] } : y)) }))}
                    style={{ ...ghost, fontSize: 13, padding: "8px 14px", marginTop: 4 }}>+ exercise</button>
                )}
              </div>
            ))}

            {isEd && (
              <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
                <button onClick={() => updateWorkout(libCat, w.id, (x) => ({ ...x, blocks: [...x.blocks, { id: uid(), label: "new section", items: [{ id: uid(), text: "" }] }] }))}
                  style={ghost}>+ section</button>
                <button onClick={() => { save({ ...data, lib: { ...data.lib, [libCat]: data.lib[libCat].filter((x) => x.id !== w.id) } }); setEditing(null); }}
                  style={{ ...ghost, color: C.clay, borderColor: C.clay }}>delete</button>
              </div>
            )}
          </div>
        );
      })}

      <button onClick={() => {
        const nw = { id: uid(), name: "new session", tag: "your own", blocks: [{ id: uid(), label: "work", items: [{ id: uid(), text: "" }] }] };
        save({ ...data, lib: { ...data.lib, [libCat]: [...data.lib[libCat], nw] } });
        setEditing(nw.id);
      }} style={{ ...solid(C.ink), width: "100%" }}>+ build your own {SLOTS[libCat].label} session</button>
    </div>
  );

  /* ─────────── shell ─────────── */
  const TABS = [["today", "today"], ["month", "calendar"], ["log", "log"], ["cardio", "run"], ["food", "food"], ["library", "workouts"]];

  return (
    <div className="paper" style={{ backgroundColor: C.bg, minHeight: "100%", padding: "calc(26px + env(safe-area-inset-top, 0px)) 16px 60px", fontFamily: F, color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Fraunces:ital,opsz,wght@0,9..144,400..600;1,9..144,400..600&display=swap');
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        button:focus-visible, input:focus-visible, textarea:focus-visible, a:focus-visible { outline: 2px solid ${C.ink}; outline-offset: 2px; }
        input::placeholder, textarea::placeholder { color: ${C.muted}; }
        a { color: inherit; text-underline-offset: 3px; }
        .paper { position: relative; isolation: isolate; }
        .tabs button { background: none; border: none; padding: 7px 11px; margin: 0 1px 6px 0; font-family: ${F}; font-size: 14.5px; white-space: nowrap; flex-shrink: 0; color: ${C.ink2}; cursor: pointer; border-radius: 999px; }
        .tabs button[aria-current="page"] { background: ${C.pinkDeep}; color: #fff; font-weight: 600; }
        .paper { background-color: ${C.bg}; background-image:
          repeating-linear-gradient(0deg, rgba(255,193,214,.28) 0 14px, transparent 14px 28px),
          repeating-linear-gradient(90deg, rgba(255,193,214,.28) 0 14px, transparent 14px 28px); }
        * { font-variation-settings: "SOFT" 100, "WONK" 1; }
        .demo-frame { position: relative; width: 100%; max-width: 320px; aspect-ratio: 3 / 4; border-radius: 18px; overflow: hidden; background: ${C.cardAlt}; border: 1px solid ${C.line}; }
        .demo-frame img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .demo-frame .flip { animation: flip 2.6s steps(1, end) infinite; }
        .demo-frame.gif { aspect-ratio: 1 / 1; background: ${C.card}; }
        .demo-frame.gif img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; filter: none; mix-blend-mode: multiply; }
        .arrow { width: 34px; height: 30px; border: 1px solid ${C.line}; background: transparent; border-radius: 18px; color: ${C.ink}; font-size: 15px; cursor: pointer; }
        .linkish { background: none; border: none; padding: 0; font: inherit; color: ${C.ink2}; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
        @keyframes flip { 0% { opacity: 0 } 50% { opacity: 1 } }
        .chip { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; padding: 9px 13px 8px; border: 1px solid; border-radius: 18px; font-family: ${F}; cursor: pointer; min-width: 70px; flex-shrink: 0; text-align: left; }
        .finisher { margin-top: 22px; padding-top: 16px; border-top: 1px dashed ${C.line}; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
      `}</style>

      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <div style={{ marginBottom: 18, paddingLeft: 2 }}>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 42, fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1, color: C.pinkDeep }}>
            erin's training plan <span style={{ fontStyle: "normal", fontSize: 26, verticalAlign: "0.35em" }}>♡</span>
          </div>
          <div style={{ fontSize: 13, color: C.ink2, marginTop: 8 }}>
            {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toLowerCase()}
          </div>
        </div>

        <nav className="tabs" style={{ display: "flex", flexWrap: "nowrap", overflowX: "auto", marginBottom: 20, scrollbarWidth: "none" }}>
          {TABS.map(([v, l]) => (
            <button key={v} aria-current={tab === v ? "page" : undefined} onClick={() => { setTab(v); setCalDay(null); }}>{l}</button>
          ))}
        </nav>

        {!CAN_SAVE && (
          <div style={{ fontSize: 13, color: C.ink2, background: C.pinkSoft, padding: "10px 14px", borderRadius: 18, marginBottom: 14 }}>
            preview mode: changes aren't saved here. everything saves in the real app.
          </div>
        )}
        {toast && <div role="status" style={{ position: "sticky", top: 10, zIndex: 5, background: C.pinkDeep, color: "#fff", padding: "12px 18px", borderRadius: 999, fontSize: 13, marginBottom: 14 }}>{toast}</div>}

        {tab === "today" ? renderToday()
          : tab === "month" ? renderMonth()
          : tab === "log" ? renderLog()
          : tab === "cardio" ? renderCardio()
          : tab === "food" ? renderFood()
          : renderLibrary()}
      </div>
    </div>
  );
}
