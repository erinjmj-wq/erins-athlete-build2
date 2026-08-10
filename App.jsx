import React, { useState, useEffect } from "react";

/* ───────── storage: browser localStorage, same shape as before ───────── */
const store = {
  get: async (k) => { const v = localStorage.getItem(k); return v ? { key: k, value: v } : null; },
  set: async (k, v) => { localStorage.setItem(k, v); return { key: k, value: v }; },
};


/* ───────────────────────── palette ───────────────────────── */
const C = {
  bg: "#EFEAE4", card: "#FBF9F6", cardAlt: "#F5F1EC",
  line: "#E4DCD3", lineSoft: "#EFE8E0",
  ink: "#33302C", ink2: "#6B645C", muted: "#A79E94",
  clay: "#C0947F", sage: "#8E9B87", blush: "#DBB6AD",
  sky: "#94A7B4", butter: "#CDB289", lav: "#A9A2B5",
};
const F = "'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif";

const SLOTS = {
  push: { label: "push", color: C.clay },
  pull: { label: "pull", color: C.sage },
  legs: { label: "legs", color: C.blush },
  cardio: { label: "cardio", color: C.sky },
  ruck: { label: "ruck", color: C.butter },
  mobility: { label: "mobility", color: C.lav },
  rest: { label: "rest", color: C.muted },
};
const CATS = ["push", "pull", "legs", "cardio", "ruck", "mobility"];
const WEEK_A = ["push", "legs", "pull", "cardio", "push", "legs", "ruck"];
const WEEK_B = ["pull", "legs", "push", "cardio", "pull", "legs", "ruck"];

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

function seedLib() {
  const out = {};
  CATS.forEach((cat) => {
    out[cat] = RAW[cat].map(([name, tag, blocks]) => ({
      id: uid(), name, tag,
      blocks: blocks.map(([label, items]) => ({ id: uid(), label, items: items.map((t) => ({ id: uid(), text: t })) })),
    }));
  });
  return out;
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
  const [expanded, setExpanded] = useState(null);
  const [slotView, setSlotView] = useState(null);
  const [libCat, setLibCat] = useState("legs");
  const [editing, setEditing] = useState(null);
  const [calDay, setCalDay] = useState(null);
  const [toast, setToast] = useState("");
  const [weighIn, setWeighIn] = useState(null);
  const [wVal, setWVal] = useState("");
  const [wReps, setWReps] = useState("");
  const [bwVal, setBwVal] = useState("");

  const [cType, setCType] = useState("run");
  const [cDate, setCDate] = useState(todayKey);
  const [cDur, setCDur] = useState("");
  const [cDist, setCDist] = useState("");
  const [cNote, setCNote] = useState("");

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
      setData(d);
      setLoading(false);
    })();
  }, []);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2400); };
  const save = async (next) => {
    setData(next);
    try { await store.set("erins-athlete-build", JSON.stringify(next)); }
    catch (e) { flash("that didn't save, try again"); }
  };

  if (loading || !data) {
    return <div style={{ background: C.bg, minHeight: "100%", padding: 40, fontFamily: F, color: C.muted, fontSize: 14 }}>opening your log…</div>;
  }

  /* ── helpers ── */
  const defaultSlot = (k) => {
    const start = parseKey(data.startDate || todayKey);
    const days = Math.round((parseKey(k) - start) / 86400000);
    const i = ((days % 14) + 14) % 14;
    return i < 7 ? WEEK_A[i] : WEEK_B[i - 7];
  };
  const plannedSlot = (k) => data.plan[k] || defaultSlot(k);
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
  const habitsFor = (k) => data.habits[k] || { waterOz: 0, sauna: false, stretch: false, sleep: false };
  const setHabit = (k, patch) => save({ ...data, habits: { ...data.habits, [k]: { ...habitsFor(k), ...patch } } });
  const foodFor = (k) => data.food[k] || [];
  const sessionsOn = (k) => data.sessions[k] || [];
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
  const card = { background: C.card, border: `1px solid ${C.lineSoft}`, borderRadius: 20, padding: 20, marginBottom: 14 };
  const eyebrow = { fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, marginBottom: 12, fontWeight: 500 };
  const input = { background: C.cardAlt, border: `1px solid ${C.line}`, color: C.ink, fontFamily: F, fontSize: 14, padding: "12px 14px", borderRadius: 14, width: "100%", outline: "none", boxSizing: "border-box" };
  const lbl = { fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, display: "block", marginBottom: 7 };
  const pill = (on, col = C.ink) => ({
    background: on ? col : "transparent", color: on ? C.card : C.ink2,
    border: `1px solid ${on ? col : C.line}`, padding: "9px 16px", fontFamily: F, fontSize: 13,
    borderRadius: 999, cursor: "pointer", fontWeight: on ? 500 : 400,
  });
  const solid = (col) => ({ background: col, color: C.card, border: "none", padding: "13px 24px", fontFamily: F, fontSize: 14, borderRadius: 999, cursor: "pointer", fontWeight: 500 });
  const ghost = { background: "transparent", color: C.muted, border: `1px solid ${C.line}`, padding: "10px 18px", fontFamily: F, fontSize: 13, borderRadius: 999, cursor: "pointer" };
  const updateWorkout = (cat, wid, fn) => save({ ...data, lib: { ...data.lib, [cat]: data.lib[cat].map((w) => (w.id === wid ? fn(w) : w)) } });

  /* ─────────── today ─────────── */
  const renderToday = () => {
    const daySessions = sessionsOn(openDay);
    const activeSlot = slotView || daySessions[daySessions.length - 1]?.slotType || plannedSlot(openDay);
    const options = activeSlot === "rest" ? [] : data.lib[activeSlot] || [];
    const h = habitsFor(openDay);
    const meals = foodFor(openDay);
    const kcal = meals.reduce((s, m) => s + (m.cal || 0), 0);
    const pro = meals.reduce((s, m) => s + (m.pro || 0), 0);

    return (
      <div>
        <div style={{ ...card, paddingBottom: 22 }}>
          <div style={eyebrow}>{openDay === todayKey ? "today" : parseKey(openDay).toDateString().toLowerCase()}</div>
          <div style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.05 }}>{SLOTS[activeSlot].label}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
            {daySessions.length
              ? `logged · ${daySessions.map((s) => (s.variantId === "REST" ? "rest" : findWorkout(s.variantId)?.name || "session")).join(" + ")}`
              : "pick your session, or change the day"}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
            you can log more than one. tap another day type and add it on top.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
            {Object.keys(SLOTS).map((s) => (
              <button key={s} onClick={() => { setSlotView(s === activeSlot ? null : s); setExpanded(null); }}
                style={{ ...pill(s === activeSlot, SLOTS[s].color), fontSize: 12, padding: "7px 14px" }}>{SLOTS[s].label}</button>
            ))}
          </div>
        </div>

        {activeSlot === "rest" ? (
          <div style={{ ...card, fontSize: 14, color: C.ink2, lineHeight: 1.7 }}>
            rest is training. walk if you want to, stretch if you feel like it, eat your protein. the rotation waits for you.
            <div style={{ marginTop: 16 }}>
              <button onClick={() => toggleSession(openDay, "rest", "REST")} style={solid(C.sage)}>
                {daySessions.some((s) => s.variantId === "REST") ? "rest logged ✓" : "mark rest day"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ ...eyebrow, marginLeft: 4 }}>choose your session</div>
            {options.map((w) => {
              const isOpen = expanded === w.id;
              const isLogged = daySessions.some((s) => s.variantId === w.id);
              const checks = getChecks(openDay, w.id);
              const total = w.blocks.reduce((s, b) => s + b.items.length, 0);
              const done = Object.keys(checks).length;
              return (
                <div key={w.id} style={{ ...card, padding: 0, borderColor: isLogged ? SLOTS[activeSlot].color : C.lineSoft, marginBottom: 10 }}>
                  <div onClick={() => setExpanded(isOpen ? null : w.id)} style={{ padding: 18, cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 999, background: SLOTS[activeSlot].color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.01em" }}>{w.name}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{w.tag}</div>
                    </div>
                    {done > 0 && <div style={{ fontSize: 12, color: SLOTS[activeSlot].color, fontWeight: 500 }}>{done}/{total}</div>}
                    <div style={{ color: C.muted, fontSize: 18, lineHeight: 1 }}>{isOpen ? "−" : "+"}</div>
                  </div>

                  {isOpen && (
                    <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${C.lineSoft}` }}>
                      {w.blocks.map((b) => (
                        <div key={b.id} style={{ marginTop: 18 }}>
                          <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: SLOTS[activeSlot].color, marginBottom: 8, fontWeight: 500 }}>{b.label}</div>
                          {b.items.map((it) => {
                            const on = !!checks[it.id];
                            const ek = exKey(it.text);
                            const hist = data.lifts[ek] || [];
                            const best = hist.length ? Math.max(...hist.map((x) => x.weight)) : null;
                            const last = hist.length ? hist[hist.length - 1] : null;
                            const isW = weighIn === it.id;
                            return (
                              <div key={it.id} style={{ padding: "9px 0" }}>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                  <div onClick={() => toggleCheck(openDay, w.id, it.id)} style={{
                                    width: 20, height: 20, borderRadius: 999, flexShrink: 0, marginTop: 1, cursor: "pointer",
                                    border: `1.5px solid ${on ? SLOTS[activeSlot].color : C.line}`,
                                    background: on ? SLOTS[activeSlot].color : "transparent",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                  }}>{on && <span style={{ color: C.card, fontSize: 11, lineHeight: 1 }}>✓</span>}</div>
                                  <div onClick={() => toggleCheck(openDay, w.id, it.id)}
                                    style={{ flex: 1, fontSize: 14, color: on ? C.muted : C.ink, lineHeight: 1.5, textDecoration: on ? "line-through" : "none", cursor: "pointer" }}>{it.text}</div>
                                  <button onClick={() => { setWeighIn(isW ? null : it.id); setWVal(""); setWReps(""); }}
                                    style={{ background: best ? C.cardAlt : "transparent", border: `1px solid ${C.line}`, color: best ? C.ink : C.muted, fontFamily: F, fontSize: 12, padding: "4px 11px", borderRadius: 999, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
                                    {best ? `${best} lb` : "+ lb"}
                                  </button>
                                </div>
                                {isW && (
                                  <div style={{ marginLeft: 32, marginTop: 10, background: C.cardAlt, borderRadius: 14, padding: 13 }}>
                                    {hist.length > 0 && (
                                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.6 }}>
                                        best {best} lb · last time {last.weight} lb{last.reps ? ` x ${last.reps}` : ""} on {MONTHS[parseKey(last.date).getMonth()].slice(0, 3)} {parseKey(last.date).getDate()} · {hist.length} entries
                                      </div>
                                    )}
                                    <div style={{ display: "flex", gap: 8 }}>
                                      <input type="number" value={wVal} onChange={(e) => setWVal(e.target.value)} placeholder="lb"
                                        style={{ ...input, background: C.card, padding: "10px 12px", fontSize: 13 }} />
                                      <input type="number" value={wReps} onChange={(e) => setWReps(e.target.value)} placeholder="reps"
                                        style={{ ...input, background: C.card, padding: "10px 12px", fontSize: 13, width: 84, flexShrink: 0 }} />
                                      <button onClick={() => { addLift(ek, it.text, wVal, wReps); setWeighIn(null); setWVal(""); setWReps(""); }}
                                        style={{ ...solid(SLOTS[activeSlot].color), padding: "10px 18px", fontSize: 13, flexShrink: 0 }}>save</button>
                                    </div>
                                    <div style={{ fontSize: 11, color: C.muted, marginTop: 9, lineHeight: 1.5 }}>
                                      every entry saves, not just your best. the pill shows your best, the log shows all of it.
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
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
          <div style={eyebrow}>daily</div>
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
              <button key={k} onClick={() => setHabit(openDay, { [k]: !h[k] })} style={{ ...pill(h[k], C.sage), fontSize: 12, padding: "11px 6px" }}>{l}</button>
            ))}
          </div>
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.lineSoft}`, display: "flex", alignItems: "flex-end", gap: 20 }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em" }}>{kcal}</div>
              <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginTop: 2 }}>calories</div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 500, color: C.clay, letterSpacing: "-0.02em" }}>{pro}g</div>
              <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginTop: 2 }}>protein</div>
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
          <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em" }}>
            {MONTHS[cursor.getMonth()]} <span style={{ color: C.muted, fontWeight: 300 }}>{cursor.getFullYear()}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["‹", -1], ["›", 1]].map(([s, n]) => (
              <button key={s} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1))}
                style={{ background: C.card, border: `1px solid ${C.line}`, color: C.ink, width: 36, height: 36, borderRadius: 999, cursor: "pointer", fontSize: 17 }}>{s}</button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>{doneCount} logged this month · tap any day to change it</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
          {DOW.map((d, i) => <div key={i} style={{ fontSize: 11, color: C.muted, textAlign: "center", paddingBottom: 6, letterSpacing: "0.1em" }}>{d}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const k = keyOf(d);
            const ss = sessionsOn(k);
            const logged = ss.length > 0;
            const shown = logged ? ss[0].slotType : plannedSlot(k);
            const col = SLOTS[shown].color;
            const isSel = calDay === k;
            return (
              <button key={i} onClick={() => setCalDay(isSel ? null : k)}
                style={{
                  background: logged ? col : C.card,
                  border: `1.5px solid ${isSel ? C.ink : k === todayKey ? C.ink2 : C.lineSoft}`,
                  height: 56, padding: 6, cursor: "pointer", borderRadius: 14, textAlign: "left", overflow: "hidden", fontFamily: F, position: "relative",
                }}>
                <div style={{ fontSize: 11, color: logged ? C.card : C.muted }}>{d.getDate()}</div>
                <div style={{ fontSize: 11, color: logged ? C.card : col, marginTop: 3, fontWeight: 500, lineHeight: 1.2 }}>
                  {logged ? ss.map((s) => SLOTS[s.slotType].label).join(" + ") : SLOTS[shown].label}
                </div>
                {ss.length > 1 && (
                  <div style={{ position: "absolute", bottom: 5, right: 5, display: "flex", gap: 3 }}>
                    {ss.slice(1).map((s, j) => (
                      <div key={j} style={{ width: 6, height: 6, borderRadius: 999, background: C.card, border: `1px solid ${SLOTS[s.slotType].color}` }} />
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
            <div style={{ fontSize: 13, color: C.ink2, marginBottom: 14, lineHeight: 1.6 }}>change what this day is. everything else stays put.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {Object.keys(SLOTS).map((s) => (
                <button key={s} onClick={() => save({ ...data, plan: { ...data.plan, [calDay]: s } })}
                  style={{ ...pill(plannedSlot(calDay) === s, SLOTS[s].color), fontSize: 12, padding: "8px 14px" }}>{SLOTS[s].label}</button>
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
          <div style={{ fontSize: 14, lineHeight: 2 }}>
            <div><span style={{ color: C.muted }}>week a</span> · push · legs · pull · cardio · push · legs · ruck</div>
            <div><span style={{ color: C.muted }}>week b</span> · pull · legs · push · cardio · pull · legs · ruck</div>
          </div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginTop: 14 }}>
            two weeks gives you 3 push, 3 pull, 4 legs, 2 rucks. the cardio day is the light day. change any day above and the rotation underneath keeps running, so you never lose your place.
          </div>
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
      return <div style={{ ...card, fontSize: 14, color: C.muted, lineHeight: 1.7 }}>nothing logged yet. finish a session and it shows up here with every weight you saved.</div>;
    }

    return (
      <div>
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
                <div style={{ width: 8, height: 8, borderRadius: 999, background: headCol, flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: C.muted }}>{parseKey(k).toDateString().toLowerCase()}</div>
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
                      <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: SLOTS[s.slotType].color, fontWeight: 500 }}>
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
                      <div style={{ fontSize: 15, fontWeight: 500, color: C.clay }}>{e.weight} lb{e.reps ? ` × ${e.reps}` : ""}</div>
                    </div>
                  ))}
                </div>
              )}

              {cardioOn.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.lineSoft}` }}>
                  {cardioOn.map((e) => (
                    <div key={e.id} style={{ fontSize: 13, color: C.sky }}>
                      {e.type} · {Math.round(e.duration)} min{e.distance ? ` · ${e.distance} mi` : ""}{e.note ? ` · ${e.note}` : ""}
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
  const TYPES = [["run", "run"], ["walk", "walk"], ["ruck", "ruck"], ["ruckrun", "ruck run"], ["stairs", "stairs"]];
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
      save({ ...data, cardio: [{ id: uid(), date: cDate, type: cType, duration: dur, distance: parseFloat(cDist) || 0, note: cNote.trim() }, ...data.cardio] });
      setCDur(""); setCDist(""); setCNote("");
    };

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
          {[{ n: daysOut, l: "days out" }, { n: totalMi ? totalMi.toFixed(1) : "0", l: "miles" },
            { n: totalMin >= 60 ? `${Math.floor(totalMin / 60)}h${Math.round(totalMin % 60)}` : `${Math.round(totalMin)}m`, l: "time" }].map((s, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.lineSoft}`, borderRadius: 18, padding: "18px 14px" }}>
              <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em" }}>{s.n}</div>
              <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginTop: 5 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={eyebrow}>log it</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {TYPES.map(([v, l]) => <button key={v} onClick={() => setCType(v)} style={{ ...pill(cType === v, C.sky), fontSize: 12, padding: "8px 14px" }}>{l}</button>)}
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
          <div style={{ fontSize: 12, color: C.muted, marginTop: 14, lineHeight: 1.6 }}>
            miles are optional on purpose. skip it and the run still counts. add it and you get pace and speed.
          </div>
        </div>

        <div style={{ ...eyebrow, marginLeft: 4 }}>history</div>
        {data.cardio.length === 0 ? (
          <div style={{ ...card, fontSize: 14, color: C.muted }}>nothing yet. go out and come back.</div>
        ) : (
          <div style={{ ...card, padding: "6px 20px" }}>
            {data.cardio.slice(0, 30).map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
                <div style={{ fontSize: 12, color: C.muted, width: 44, flexShrink: 0 }}>{MONTHS[parseKey(e.date).getMonth()].slice(0, 3)} {parseKey(e.date).getDate()}</div>
                <div style={{ fontSize: 13, color: C.sky, width: 62, flexShrink: 0, fontWeight: 500 }}>{TYPES.find((t) => t[0] === e.type)?.[1] || e.type}</div>
                <div style={{ fontSize: 13, width: 54, flexShrink: 0 }}>{Math.round(e.duration)} min</div>
                <div style={{ fontSize: 13, color: C.clay, flex: 1 }}>
                  {paceOf(e) ? `${e.distance} mi · ${paceOf(e)} · ${speedOf(e)}` : <span style={{ color: C.muted }}>{e.note || "—"}</span>}
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
      save({ ...data, food: { ...data.food, [openDay]: [...meals, { id: uid(), name: fName.trim(), cal: parseInt(fCal, 10) || 0, pro: parseInt(fPro, 10) || 0 }] } });
      setFName(""); setFCal(""); setFPro("");
    };
    const addBw = () => {
      const v = parseFloat(bwVal);
      if (!v || v <= 0) { flash("add a number first"); return; }
      save({ ...data, bw: { ...data.bw, [openDay]: v } });
      setBwVal("");
    };

    return (
      <div>
        <div style={{ ...card, textAlign: "center", paddingTop: 28, paddingBottom: 26 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted }}>
            {openDay === todayKey ? "today" : parseKey(openDay).toDateString().toLowerCase()}
          </div>
          <div style={{ fontSize: 52, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.1, marginTop: 8 }}>{kcal}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>calories</div>
          <div style={{ fontSize: 16, color: C.clay, marginTop: 12, fontWeight: 500 }}>{pro}g protein</div>
        </div>

        <div style={card}>
          <div style={eyebrow}>add something</div>
          <div style={{ marginBottom: 10 }}>
            <input type="text" value={fName} onChange={(e) => setFName(e.target.value)} placeholder="greek yogurt bowl" style={input} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <input type="number" value={fCal} onChange={(e) => setFCal(e.target.value)} placeholder="calories" style={input} />
            <input type="number" value={fPro} onChange={(e) => setFPro(e.target.value)} placeholder="protein g" style={input} />
          </div>
          <button onClick={add} style={solid(C.clay)}>add</button>
        </div>

        {meals.length > 0 && (
          <div style={{ ...card, padding: "6px 20px" }}>
            {meals.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
                <div style={{ flex: 1, fontSize: 14 }}>{m.name}</div>
                <div style={{ fontSize: 13, color: C.ink2 }}>{m.cal}</div>
                {m.pro > 0 && <div style={{ fontSize: 13, color: C.clay }}>{m.pro}g</div>}
                <button onClick={() => save({ ...data, food: { ...data.food, [openDay]: meals.filter((x) => x.id !== m.id) } })}
                  style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 17 }} aria-label="remove">×</button>
              </div>
            ))}
          </div>
        )}

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
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, height: 14 }}>{x.w || ""}</div>
                <div style={{ height: Math.max(3, (x.w / maxW) * 46), borderRadius: 6, background: C.sky, opacity: x.w ? 1 : 0.25 }} />
                <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{DOW[x.d.getDay()]}</div>
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
                    <div style={{ height: `${20 + ((p.v - bwMin) / bwSpan) * 70}%`, borderRadius: 6, background: p.k === openDay ? C.sage : C.blush, opacity: 0.9 }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12, color: C.muted }}>
                <span>{bwPts[0].v} lb · {MONTHS[parseKey(bwPts[0].k).getMonth()].slice(0, 3)} {parseKey(bwPts[0].k).getDate()}</span>
                <span style={{ color: C.ink, fontWeight: 500 }}>{bwPts[bwPts.length - 1].v} lb now</span>
              </div>
            </>
          )}
          {bwPts.length === 1 && (
            <div style={{ fontSize: 13, color: C.muted }}>{bwPts[0].v} lb logged. add a few more and the trend shows up here.</div>
          )}
        </div>

        {/* calories chart */}
        <div style={card}>
          <div style={eyebrow}>calories, last 7 days</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            {last7.map((x) => (
              <div key={x.k} onClick={() => setOpenDay(x.k)} style={{ flex: 1, cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, height: 14 }}>{x.cal || ""}</div>
                <div style={{ height: Math.max(4, (x.cal / maxCal) * 70), borderRadius: 8, background: x.k === openDay ? C.clay : C.blush, opacity: x.cal ? 1 : 0.35 }} />
                <div style={{ fontSize: 11, color: C.muted, marginTop: 7 }}>{DOW[x.d.getDay()]}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <div style={eyebrow}>habits today</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {[["stretch", "stretched"], ["sauna", "sauna"], ["sleep", "slept well"]].map(([k, l]) => (
              <button key={k} onClick={() => setHabit(openDay, { [k]: !h[k] })} style={{ ...pill(h[k], C.sage), fontSize: 12, padding: "11px 6px" }}>{l}</button>
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
          <button key={k} onClick={() => { setLibCat(k); setEditing(null); }} style={{ ...pill(libCat === k, SLOTS[k].color), fontSize: 12, padding: "8px 14px" }}>{SLOTS[k].label}</button>
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
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{w.tag}</div>
                  </>
                )}
              </div>
              <button onClick={() => setEditing(isEd ? null : w.id)} style={{ ...pill(isEd, SLOTS[libCat].color), fontSize: 12, padding: "7px 14px", flexShrink: 0 }}>
                {isEd ? "done" : "edit"}
              </button>
            </div>

            {w.blocks.map((b, bi) => (
              <div key={b.id} style={{ marginTop: 16 }}>
                {isEd ? (
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <input value={b.label}
                      onChange={(e) => updateWorkout(libCat, w.id, (x) => ({ ...x, blocks: x.blocks.map((y) => (y.id === b.id ? { ...y, label: e.target.value } : y)) }))}
                      style={{ ...input, fontSize: 12, padding: "9px 12px" }} />
                    <button disabled={bi === 0} onClick={() => updateWorkout(libCat, w.id, (x) => {
                      const arr = [...x.blocks]; [arr[bi - 1], arr[bi]] = [arr[bi], arr[bi - 1]]; return { ...x, blocks: arr };
                    })} style={{ ...ghost, padding: "9px 12px", flexShrink: 0, opacity: bi === 0 ? 0.35 : 1 }}>↑</button>
                    <button onClick={() => updateWorkout(libCat, w.id, (x) => ({ ...x, blocks: x.blocks.filter((y) => y.id !== b.id) }))}
                      style={{ ...ghost, padding: "9px 13px", flexShrink: 0 }}>×</button>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: SLOTS[libCat].color, marginBottom: 9, fontWeight: 500 }}>{b.label}</div>
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
                    style={{ ...ghost, fontSize: 12, padding: "8px 14px", marginTop: 4 }}>+ exercise</button>
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
  const TABS = [["today", "today"], ["month", "calendar"], ["log", "log"], ["cardio", "cardio"], ["food", "food"], ["library", "workouts"]];

  return (
    <div style={{ background: C.bg, minHeight: "100%", padding: "26px 16px 60px", fontFamily: F, color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        button:focus-visible, input:focus-visible { outline: 2px solid ${C.ink}; outline-offset: 2px; }
        input::placeholder { color: ${C.muted}; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <div style={{ marginBottom: 22, paddingLeft: 4 }}>
          <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1 }}>erin's athlete build</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 7 }}>strength · calisthenics · power · endurance</div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 22, flexWrap: "wrap" }}>
          {TABS.map(([v, l]) => (
            <button key={v} onClick={() => { setTab(v); setCalDay(null); }} style={{ ...pill(tab === v, C.ink), fontSize: 13 }}>{l}</button>
          ))}
        </div>

        {toast && <div style={{ background: C.clay, color: C.card, padding: "12px 18px", borderRadius: 14, fontSize: 13, marginBottom: 14 }}>{toast}</div>}

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
