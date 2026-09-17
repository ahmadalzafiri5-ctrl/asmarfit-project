import { useState, useEffect, useMemo } from "react";
import { Capacitor } from "@capacitor/core";
import { BarcodeScanner, BarcodeFormat } from "@capacitor-mlkit/barcode-scanning";
import {
  Home,
  UtensilsCrossed,
  Dumbbell,
  TrendingUp,
  TrendingDown,
  NotebookPen,
  Plus,
  Minus,
  ScanLine,
  Search,
  ChevronLeft,
  Flame,
  Droplets,
  Camera,
  Mic,
  Smile,
  Award,
  Timer,
  Check,
  Settings as SettingsIcon,
  Bell,
  LogOut,
  Barcode,
  Trash2,
  RotateCcw,
  Equal,
  X,
} from "lucide-react";

/* ---------------------------------------------------------
   AsmarFit — interactive mobile app prototype
   Tokens
   bg:#121214  surface:#1B1C1F  raised:#222327  border:#2C2D31
   text:#F3F1EC  dim:#8D8E93  gold:#E4A64C  teal:#47BFAE  coral:#E2694F
--------------------------------------------------------- */

// Backend proxy (USDA FoodData Central search + Open Food Facts barcode lookup).
// See backend/README.md. URL comes from VITE_API_BASE_URL (see .env /
// .env.production) so the Android build points at the hosted backend instead
// of localhost, which a phone can't reach. Falls back to local dev default.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const COLORS = {
  bg: "#121214",
  surface: "#1B1C1F",
  raised: "#222327",
  border: "#2C2D31",
  text: "#F3F1EC",
  dim: "#8D8E93",
  gold: "#E4A64C",
  teal: "#47BFAE",
  coral: "#E2694F",
};

const STR = {
  en: {
    tabs: { home: "Home", nutrition: "Nutrition", training: "Training", progress: "Progress", notes: "Notes" },
    greeting: "Good morning, Karim",
    kcalLeft: "left today",
    lastWorkout: "Last workout",
    currentWeight: "Current weight",
    todaysNote: "Today's note",
    quickLog: "Quick log",
    logFood: "Log food",
    logWeight: "Log weight",
    startWorkout: "Start workout",
    addNote: "Add note",
    protein: "Protein",
    carbs: "Carbs",
    fat: "Fat",
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snacks: "Snacks",
    add: "Add",
    searchPlaceholder: "Search food",
    activePlan: "Active plan",
    newPlan: "New plan",
    pushPullLegs: "Push / Pull / Legs",
    day: "Day",
    newPR: "New PR",
    volume: "Volume",
    exercises: "Exercises",
    viewLibrary: "Exercise library",
    lastTime: "Last time",
    weightTrend: "Weight trend",
    strengthCurve: "Strength — Bench Press",
    photoCompare: "Photo comparison",
    ranges: ["4W", "3M", "1Y", "All"],
    filters: ["All", "Training", "Nutrition", "Mood"],
    journalEmpty: "Nothing logged for this filter yet.",
    est1RM: "Est. 1RM",
    today: "Today",
    // Onboarding
    obWelcomeTitle: "Welcome to AsmarFit",
    obWelcomeSub: "Track it. Lift it. Own it.",
    obStart: "Get started",
    obGoalTitle: "What's your goal?",
    obGoalSub: "This sets your starting calorie target — you can change it anytime.",
    obGoalCut: "Lose weight",
    obGoalCutSub: "Calorie deficit, keep strength",
    obGoalMaintain: "Maintain",
    obGoalMaintainSub: "Stay steady, build habits",
    obGoalBulk: "Build muscle",
    obGoalBulkSub: "Calorie surplus, focus on volume",
    obStatsTitle: "A few numbers",
    obStatsSub: "Used to calculate your daily targets.",
    obWeight: "Current weight (kg)",
    obHeight: "Height (cm)",
    obTarget: "Target weight (kg)",
    obVisionTitle: "A quick reflection",
    obVisionSub: "Optional, but it helps to write it down.",
    obVision3Months: "How do you see yourself in 3 months?",
    obVision3MonthsPlaceholder: "e.g. Stronger, more energy, 5 kg lighter …",
    obVisionWhy: "Why is this important to you?",
    obVisionWhyPlaceholder: "e.g. For my health, to feel more confident …",
    obConfirmTitle: "You're all set",
    obConfirmSub: "Your personal daily target:",
    obYourVision: "Your vision",
    obFinish: "Enter AsmarFit",
    back: "Back",
    next: "Continue",
    // Workout flow
    setOf: "Set",
    reps: "Reps",
    weight: "Weight (kg)",
    completeSet: "Complete set",
    nextExercise: "Next exercise",
    finishWorkout: "Finish workout",
    resting: "Resting",
    skipRest: "Skip rest",
    workoutDone: "Workout complete",
    duration: "Duration",
    newRecords: "New records",
    done: "Done",
    // Food flow
    foodSearchTitle: "Add food",
    scanBarcode: "Scan barcode",
    addedToast: "Added",
    barcodeTitle: "Scan barcode",
    barcodeHint: "Align the barcode inside the frame",
    foundProduct: "Product found",
    addItem: "Add",
    per100g: "per 100 g",
    amount: "Amount",
    foodCatAll: "All",
    foodCatProtein: "Protein",
    foodCatCarb: "Carbs",
    foodCatLegume: "Legumes",
    foodCatFat: "Fats",
    foodCatVeg: "Veg",
    foodCatFruit: "Fruit",
    foodCatDairy: "Dairy",
    foodCatDrink: "Drinks",
    foodCatDish: "Dishes",
    noResults: "No food found — try a different search.",
    searchLoading: "Searching …",
    searchTypeMore: "Type at least 2 characters.",
    serverError: "Can't reach the server — is `npm run dev` running in the backend folder?",
    approxLabel: "Note",
    barcodeLoading: "Looking up product …",
    barcodeNotFound: "No product found for this barcode.",
    barcodeScanning: "Opening camera …",
    barcodeUnsupported: "This device has no camera for scanning.",
    barcodeModuleInstalling: "Preparing the scanner — try again in a moment.",
    barcodeWebOnly: "Barcode scanning is only available in the Android app.",
    scanAgain: "Scan again",
    // Exercise library
    libSearchPlaceholder: "Search exercises",
    muscleAll: "All",
    muscleChest: "Chest",
    muscleBack: "Back",
    muscleLegs: "Legs",
    muscleShoulders: "Shoulders",
    muscleArms: "Arms",
    muscleCore: "Core",
    addToDay: "Add",
    finishPicking: "Done",
    // Plan builder
    planBuilderTitle: "Build a plan",
    planNamePlaceholder: "Plan name (e.g. Push / Pull / Legs)",
    addDay: "Add day",
    dayNamePlaceholder: "Day name (e.g. Push)",
    addExerciseToDay: "Add exercise",
    tapToRemove: "Tap a tag to remove it",
    savePlan: "Save plan",
    planSaved: "Plan saved",
    noDaysYet: "Add your first training day above.",
    selectDayFirst: "Select a day, then add exercises to it.",
    // Notes
    newNote: "New note",
    notePlaceholder: "What happened today?",
    moodLabel: "Energy / mood",
    saveNote: "Save note",
    // Settings
    settingsTitle: "Settings & profile",
    units: "Units",
    reminders: "Reminders",
    remFood: "Log food",
    remWeigh: "Weigh-in",
    remTrain: "Training",
    language: "Language",
    replayOnboarding: "Show onboarding again",
    signOut: "Sign out",
  },
  de: {
    tabs: { home: "Start", nutrition: "Ernährung", training: "Training", progress: "Fortschritt", notes: "Notizen" },
    greeting: "Guten Morgen, Karim",
    kcalLeft: "übrig heute",
    lastWorkout: "Letztes Workout",
    currentWeight: "Aktuelles Gewicht",
    todaysNote: "Heutige Notiz",
    quickLog: "Schnell erfassen",
    logFood: "Essen loggen",
    logWeight: "Gewicht loggen",
    startWorkout: "Workout starten",
    addNote: "Notiz hinzufügen",
    protein: "Protein",
    carbs: "Kohlenhydrate",
    fat: "Fett",
    breakfast: "Frühstück",
    lunch: "Mittag",
    dinner: "Abend",
    snacks: "Snacks",
    add: "Hinzufügen",
    searchPlaceholder: "Lebensmittel suchen",
    activePlan: "Aktiver Plan",
    newPlan: "Neuer Plan",
    pushPullLegs: "Push / Pull / Legs",
    day: "Tag",
    newPR: "Neuer Rekord",
    volume: "Volumen",
    exercises: "Übungen",
    viewLibrary: "Übungsbibliothek",
    lastTime: "Letztes Mal",
    weightTrend: "Gewichtsverlauf",
    strengthCurve: "Kraft — Bankdrücken",
    photoCompare: "Fotovergleich",
    ranges: ["4W", "3M", "1J", "Alle"],
    filters: ["Alle", "Training", "Ernährung", "Stimmung"],
    journalEmpty: "Für diesen Filter noch nichts erfasst.",
    est1RM: "Gesch. 1RM",
    today: "Heute",
    // Onboarding
    obWelcomeTitle: "Willkommen bei AsmarFit",
    obWelcomeSub: "Dein Training. Deine Zahlen. Dein Fortschritt.",
    obStart: "Los geht's",
    obGoalTitle: "Was ist dein Ziel?",
    obGoalSub: "Das legt dein Start-Kalorienziel fest — du kannst es jederzeit ändern.",
    obGoalCut: "Abnehmen",
    obGoalCutSub: "Kaloriendefizit, Kraft erhalten",
    obGoalMaintain: "Halten",
    obGoalMaintainSub: "Gewicht stabil, Gewohnheiten aufbauen",
    obGoalBulk: "Muskeln aufbauen",
    obGoalBulkSub: "Kalorienüberschuss, Fokus auf Volumen",
    obStatsTitle: "Ein paar Zahlen",
    obStatsSub: "Damit berechnen wir deine Tagesziele.",
    obWeight: "Aktuelles Gewicht (kg)",
    obHeight: "Größe (cm)",
    obTarget: "Zielgewicht (kg)",
    obVisionTitle: "Eine kurze Reflexion",
    obVisionSub: "Optional, aber Aufschreiben hilft beim Dranbleiben.",
    obVision3Months: "Wie siehst du dich in 3 Monaten?",
    obVision3MonthsPlaceholder: "z. B. Stärker, mehr Energie, 5 kg leichter …",
    obVisionWhy: "Warum ist dir das wichtig?",
    obVisionWhyPlaceholder: "z. B. Für meine Gesundheit, um mich wohler zu fühlen …",
    obConfirmTitle: "Alles bereit",
    obConfirmSub: "Dein persönliches Tagesziel:",
    obYourVision: "Deine Vision",
    obFinish: "AsmarFit öffnen",
    back: "Zurück",
    next: "Weiter",
    // Workout flow
    setOf: "Satz",
    reps: "Wdh.",
    weight: "Gewicht (kg)",
    completeSet: "Satz abschließen",
    nextExercise: "Nächste Übung",
    finishWorkout: "Workout beenden",
    resting: "Pause",
    skipRest: "Pause überspringen",
    workoutDone: "Workout abgeschlossen",
    duration: "Dauer",
    newRecords: "Neue Rekorde",
    done: "Fertig",
    // Food flow
    foodSearchTitle: "Essen hinzufügen",
    scanBarcode: "Barcode scannen",
    addedToast: "Hinzugefügt",
    barcodeTitle: "Barcode scannen",
    barcodeHint: "Barcode im Rahmen ausrichten",
    foundProduct: "Produkt gefunden",
    addItem: "Hinzufügen",
    per100g: "pro 100 g",
    amount: "Menge",
    foodCatAll: "Alle",
    foodCatProtein: "Protein",
    foodCatCarb: "Kohlenhydrate",
    foodCatLegume: "Hülsenfrüchte",
    foodCatFat: "Fette",
    foodCatVeg: "Gemüse",
    foodCatFruit: "Obst",
    foodCatDairy: "Milchprodukte",
    foodCatDrink: "Getränke",
    foodCatDish: "Gerichte",
    noResults: "Kein Lebensmittel gefunden — andere Suche versuchen.",
    searchLoading: "Suche läuft …",
    searchTypeMore: "Mindestens 2 Zeichen eingeben.",
    serverError: "Server nicht erreichbar — läuft npm run dev im backend-Ordner?",
    approxLabel: "Hinweis",
    barcodeLoading: "Produkt wird gesucht …",
    barcodeNotFound: "Kein Produkt zu diesem Barcode gefunden.",
    barcodeScanning: "Kamera wird geöffnet …",
    barcodeUnsupported: "Dieses Gerät hat keine Kamera zum Scannen.",
    barcodeModuleInstalling: "Scanner wird vorbereitet — gleich nochmal versuchen.",
    barcodeWebOnly: "Barcode-Scan ist nur in der Android-App verfügbar.",
    scanAgain: "Erneut scannen",
    // Exercise library
    libSearchPlaceholder: "Übungen suchen",
    muscleAll: "Alle",
    muscleChest: "Brust",
    muscleBack: "Rücken",
    muscleLegs: "Beine",
    muscleShoulders: "Schultern",
    muscleArms: "Arme",
    muscleCore: "Rumpf",
    addToDay: "Hinzufügen",
    finishPicking: "Fertig",
    // Plan builder
    planBuilderTitle: "Plan erstellen",
    planNamePlaceholder: "Planname (z. B. Push / Pull / Legs)",
    addDay: "Tag hinzufügen",
    dayNamePlaceholder: "Tagname (z. B. Push)",
    addExerciseToDay: "Übung hinzufügen",
    tapToRemove: "Tag antippen, um ihn zu entfernen",
    savePlan: "Plan speichern",
    planSaved: "Plan gespeichert",
    noDaysYet: "Füge oben deinen ersten Trainingstag hinzu.",
    selectDayFirst: "Wähle einen Tag aus und füge ihm dann Übungen hinzu.",
    // Notes
    newNote: "Neue Notiz",
    notePlaceholder: "Was ist heute passiert?",
    moodLabel: "Energie / Stimmung",
    saveNote: "Notiz speichern",
    // Settings
    settingsTitle: "Einstellungen & Profil",
    units: "Einheiten",
    reminders: "Erinnerungen",
    remFood: "Essen loggen",
    remWeigh: "Wiegen",
    remTrain: "Training",
    language: "Sprache",
    replayOnboarding: "Onboarding erneut anzeigen",
    signOut: "Abmelden",
  },
};

/* Today's active-plan exercises (used by the workout session demo) */
const EXERCISES = [
  { key: "bench", name: "Bench Press", nameDe: "Bankdrücken", sets: 4, reps: 6, lastWeight: 80, pr: true },
  { key: "incline", name: "Incline DB Press", nameDe: "Schrägbankdrücken (KH)", sets: 3, reps: 10, lastWeight: 32 },
  { key: "flye", name: "Cable Fly", nameDe: "Kabelzug-Fliegende", sets: 3, reps: 12, lastWeight: 18 },
  { key: "ohp2", name: "Overhead Press", nameDe: "Schulterdrücken", sets: 4, reps: 8, lastWeight: 50 },
];

/* Full exercise library, filterable by muscle group */
const EXERCISE_LIBRARY = [
  { key: "bench", name: "Bench Press", nameDe: "Bankdrücken", muscle: "chest", cue: "Shoulder blades pulled together", cueDe: "Schulterblätter zusammenziehen" },
  { key: "incline_db", name: "Incline DB Press", nameDe: "Schrägbankdrücken (KH)", muscle: "chest", cue: "30° bench, elbows at 45°", cueDe: "30° Bank, Ellbogen bei 45°" },
  { key: "cable_fly", name: "Cable Fly", nameDe: "Kabelzug-Fliegende", muscle: "chest", cue: "Slight elbow bend throughout", cueDe: "Ellbogen leicht gebeugt halten" },
  { key: "pushup", name: "Push-Up", nameDe: "Liegestütz", muscle: "chest", cue: "Body in one straight line", cueDe: "Körper bildet eine gerade Linie" },
  { key: "dips", name: "Dips", nameDe: "Dips", muscle: "chest", cue: "Lean forward for more chest", cueDe: "Nach vorne lehnen für mehr Brust" },
  { key: "deadlift", name: "Deadlift", nameDe: "Kreuzheben", muscle: "back", cue: "Bar stays close to the shins", cueDe: "Stange nah am Schienbein führen" },
  { key: "row", name: "Barbell Row", nameDe: "Langhantelrudern", muscle: "back", cue: "Pull to the lower ribs", cueDe: "Zur unteren Rippe ziehen" },
  { key: "latpull", name: "Lat Pulldown", nameDe: "Latzug", muscle: "back", cue: "Drive elbows down and back", cueDe: "Ellbogen nach unten-hinten ziehen" },
  { key: "pullup", name: "Pull-Up", nameDe: "Klimmzug", muscle: "back", cue: "Full hang at the bottom", cueDe: "Unten voll ausstrecken" },
  { key: "seatedrow", name: "Seated Cable Row", nameDe: "Rudern am Kabelzug", muscle: "back", cue: "Chest up, don't lean back too far", cueDe: "Brust raus, nicht zu weit zurücklehnen" },
  { key: "tbarrow", name: "T-Bar Row", nameDe: "T-Hantel-Rudern", muscle: "back", cue: "Squeeze shoulder blades at the top", cueDe: "Oben Schulterblätter zusammenziehen" },
  { key: "squat", name: "Squat", nameDe: "Kniebeuge", muscle: "legs", cue: "Knees track over the toes", cueDe: "Knie über die Zehenspitzen" },
  { key: "legpress", name: "Leg Press", nameDe: "Beinpresse", muscle: "legs", cue: "Don't lock the knees out", cueDe: "Knie nicht komplett durchdrücken" },
  { key: "rdl", name: "Romanian Deadlift", nameDe: "Rumänisches Kreuzheben", muscle: "legs", cue: "Hinge at the hips, soft knees", cueDe: "Hüfte nach hinten schieben, Knie leicht gebeugt" },
  { key: "legcurl", name: "Leg Curl", nameDe: "Beinbeuger", muscle: "legs", cue: "Controlled tempo, no swinging", cueDe: "Kontrolliertes Tempo, kein Schwung" },
  { key: "legext", name: "Leg Extension", nameDe: "Beinstrecker", muscle: "legs", cue: "Pause briefly at the top", cueDe: "Oben kurz halten" },
  { key: "lunge", name: "Walking Lunge", nameDe: "Ausfallschritt gehend", muscle: "legs", cue: "Front knee stays behind the toes", cueDe: "Vorderes Knie hinter den Zehen" },
  { key: "calfraise", name: "Calf Raise", nameDe: "Wadenheben", muscle: "legs", cue: "Full stretch at the bottom", cueDe: "Unten voll dehnen" },
  { key: "ohp", name: "Overhead Press", nameDe: "Schulterdrücken", muscle: "shoulders", cue: "Brace the core, press straight up", cueDe: "Rumpf anspannen, gerade nach oben drücken" },
  { key: "latraise", name: "Lateral Raise", nameDe: "Seitheben", muscle: "shoulders", cue: "Lead with the elbows", cueDe: "Mit den Ellbogen führen" },
  { key: "facepull", name: "Face Pull", nameDe: "Face Pull", muscle: "shoulders", cue: "Pull toward the forehead", cueDe: "Zur Stirn ziehen" },
  { key: "reardelt", name: "Rear Delt Fly", nameDe: "Reverse Butterfly", muscle: "shoulders", cue: "Slight bend, squeeze the back", cueDe: "Leicht gebeugt, Rücken anspannen" },
  { key: "curl", name: "Bicep Curl", nameDe: "Bizepscurl", muscle: "arms", cue: "Elbows stay pinned to the sides", cueDe: "Ellbogen am Körper fixiert" },
  { key: "hammer", name: "Hammer Curl", nameDe: "Hammercurl", muscle: "arms", cue: "Neutral grip throughout", cueDe: "Griff bleibt neutral" },
  { key: "pushdown", name: "Tricep Pushdown", nameDe: "Trizepsdrücken am Kabel", muscle: "arms", cue: "Elbows fixed at the sides", cueDe: "Ellbogen fixiert am Körper" },
  { key: "skullcrusher", name: "Skull Crusher", nameDe: "French Press", muscle: "arms", cue: "Upper arms stay vertical", cueDe: "Oberarme bleiben senkrecht" },
  { key: "preacher", name: "Preacher Curl", nameDe: "Scott-Curl", muscle: "arms", cue: "Don't fully lock out the elbow", cueDe: "Ellbogen nicht ganz durchstrecken" },
  { key: "plank", name: "Plank", nameDe: "Unterarmstütz", muscle: "core", cue: "Hips level, don't sag", cueDe: "Hüfte gerade, nicht durchhängen" },
  { key: "hanginglegraise", name: "Hanging Leg Raise", nameDe: "Hängendes Beinheben", muscle: "core", cue: "Curl the pelvis, avoid swinging", cueDe: "Becken einrollen, nicht schwingen" },
  { key: "cablecrunch", name: "Cable Crunch", nameDe: "Kabel-Crunch", muscle: "core", cue: "Round the spine, not the hips", cueDe: "Wirbelsäule runden, nicht die Hüfte" },
  { key: "russiantwist", name: "Russian Twist", nameDe: "Russian Twist", muscle: "core", cue: "Rotate from the ribs", cueDe: "Aus den Rippen heraus drehen" },
];

/* Food database — macros per 100 g, with a realistic default serving size in grams.
   Not exhaustive (a real app would query an external database like Open Food Facts
   or USDA FoodData Central), but broadened across cuisines for a richer demo. */
const FOOD_DB = [
  // Protein — meat, fish, eggs, plant protein
  { key: "chicken_breast", name: "Chicken breast", category: "protein", defaultGrams: 150, per100: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 } },
  { key: "chicken_thigh", name: "Chicken thigh", category: "protein", defaultGrams: 150, per100: { kcal: 209, protein: 26, carbs: 0, fat: 10.9 } },
  { key: "turkey", name: "Turkey breast", category: "protein", defaultGrams: 150, per100: { kcal: 135, protein: 30, carbs: 0, fat: 1 } },
  { key: "beef_mince", name: "Beef mince, 5% fat", category: "protein", defaultGrams: 150, per100: { kcal: 137, protein: 21, carbs: 0, fat: 5 } },
  { key: "beef_steak", name: "Beef steak, sirloin", category: "protein", defaultGrams: 150, per100: { kcal: 183, protein: 27, carbs: 0, fat: 8 } },
  { key: "lamb", name: "Lamb, roasted", category: "protein", defaultGrams: 150, per100: { kcal: 294, protein: 25, carbs: 0, fat: 21 } },
  { key: "duck", name: "Duck breast", category: "protein", defaultGrams: 150, per100: { kcal: 201, protein: 23, carbs: 0, fat: 12 } },
  { key: "salmon", name: "Salmon", category: "protein", defaultGrams: 150, per100: { kcal: 208, protein: 20, carbs: 0, fat: 13 } },
  { key: "tuna", name: "Tuna, canned in water", category: "protein", defaultGrams: 120, per100: { kcal: 116, protein: 26, carbs: 0, fat: 1 } },
  { key: "cod", name: "Cod", category: "protein", defaultGrams: 150, per100: { kcal: 82, protein: 18, carbs: 0, fat: 0.7 } },
  { key: "shrimp", name: "Shrimp", category: "protein", defaultGrams: 120, per100: { kcal: 99, protein: 24, carbs: 0.2, fat: 0.3 } },
  { key: "eggs", name: "Eggs, whole", category: "protein", defaultGrams: 100, per100: { kcal: 155, protein: 13, carbs: 1.1, fat: 11 } },
  { key: "egg_whites", name: "Egg whites", category: "protein", defaultGrams: 100, per100: { kcal: 52, protein: 11, carbs: 0.7, fat: 0.2 } },
  { key: "tofu", name: "Tofu", category: "protein", defaultGrams: 150, per100: { kcal: 76, protein: 8, carbs: 1.9, fat: 4.8 } },
  { key: "tempeh", name: "Tempeh", category: "protein", defaultGrams: 100, per100: { kcal: 192, protein: 20, carbs: 7.6, fat: 11 } },
  { key: "whey", name: "Whey protein powder", category: "protein", defaultGrams: 30, per100: { kcal: 380, protein: 75, carbs: 8, fat: 6 } },
  { key: "casein", name: "Casein protein powder", category: "protein", defaultGrams: 30, per100: { kcal: 360, protein: 70, carbs: 12, fat: 4 } },
  { key: "jerky", name: "Beef jerky", category: "protein", defaultGrams: 30, per100: { kcal: 410, protein: 33, carbs: 11, fat: 24 } },
  // Carbs — grains, bread, starches
  { key: "rice_white", name: "White rice, cooked", category: "carb", defaultGrams: 200, per100: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
  { key: "rice_basmati", name: "Basmati rice, cooked", category: "carb", defaultGrams: 200, per100: { kcal: 121, protein: 3.5, carbs: 25, fat: 0.4 } },
  { key: "rice_brown", name: "Brown rice, cooked", category: "carb", defaultGrams: 200, per100: { kcal: 123, protein: 2.7, carbs: 26, fat: 1 } },
  { key: "oats", name: "Oats, dry", category: "carb", defaultGrams: 60, per100: { kcal: 389, protein: 17, carbs: 66, fat: 7 } },
  { key: "quinoa", name: "Quinoa, cooked", category: "carb", defaultGrams: 200, per100: { kcal: 120, protein: 4.4, carbs: 21, fat: 1.9 } },
  { key: "pasta_wheat", name: "Whole wheat pasta, cooked", category: "carb", defaultGrams: 200, per100: { kcal: 124, protein: 5, carbs: 25, fat: 1.1 } },
  { key: "pasta_white", name: "Pasta, white, cooked", category: "carb", defaultGrams: 200, per100: { kcal: 131, protein: 5, carbs: 25, fat: 1.1 } },
  { key: "bulgur", name: "Bulgur, cooked", category: "carb", defaultGrams: 150, per100: { kcal: 83, protein: 3, carbs: 18, fat: 0.2 } },
  { key: "couscous", name: "Couscous, cooked", category: "carb", defaultGrams: 150, per100: { kcal: 112, protein: 3.8, carbs: 23, fat: 0.2 } },
  { key: "potato", name: "Potato, boiled", category: "carb", defaultGrams: 250, per100: { kcal: 87, protein: 2, carbs: 20, fat: 0.1 } },
  { key: "sweetpotato", name: "Sweet potato, boiled", category: "carb", defaultGrams: 200, per100: { kcal: 86, protein: 1.6, carbs: 20, fat: 0.1 } },
  { key: "bread_wg", name: "Bread, whole grain", category: "carb", defaultGrams: 60, per100: { kcal: 247, protein: 13, carbs: 41, fat: 3.4 } },
  { key: "bread_white", name: "Bread, white", category: "carb", defaultGrams: 60, per100: { kcal: 265, protein: 9, carbs: 49, fat: 3.2 } },
  { key: "pita", name: "Pita bread", category: "carb", defaultGrams: 80, per100: { kcal: 275, protein: 9, carbs: 55, fat: 1.2 } },
  { key: "naan", name: "Naan bread", category: "carb", defaultGrams: 90, per100: { kcal: 310, protein: 9, carbs: 50, fat: 8 } },
  { key: "tortilla", name: "Tortilla wrap", category: "carb", defaultGrams: 60, per100: { kcal: 310, protein: 8, carbs: 48, fat: 8 } },
  { key: "bagel", name: "Bagel", category: "carb", defaultGrams: 90, per100: { kcal: 250, protein: 10, carbs: 48, fat: 1.5 } },
  { key: "rice_noodles", name: "Rice noodles", category: "carb", defaultGrams: 200, per100: { kcal: 109, protein: 1.8, carbs: 25, fat: 0.2 } },
  // Legumes
  { key: "lentils", name: "Lentils, cooked", category: "legume", defaultGrams: 150, per100: { kcal: 116, protein: 9, carbs: 20, fat: 0.4 } },
  { key: "chickpeas", name: "Chickpeas, cooked", category: "legume", defaultGrams: 150, per100: { kcal: 164, protein: 9, carbs: 27, fat: 2.6 } },
  { key: "black_beans", name: "Black beans, cooked", category: "legume", defaultGrams: 150, per100: { kcal: 132, protein: 8.9, carbs: 24, fat: 0.5 } },
  { key: "kidney_beans", name: "Kidney beans, cooked", category: "legume", defaultGrams: 150, per100: { kcal: 127, protein: 8.7, carbs: 23, fat: 0.5 } },
  { key: "hummus", name: "Hummus", category: "legume", defaultGrams: 100, per100: { kcal: 166, protein: 8, carbs: 14, fat: 10 } },
  { key: "falafel", name: "Falafel", category: "legume", defaultGrams: 100, per100: { kcal: 333, protein: 13, carbs: 32, fat: 18 } },
  // Fats — nuts, oils, seeds
  { key: "almonds", name: "Almonds", category: "fat", defaultGrams: 30, per100: { kcal: 579, protein: 21, carbs: 22, fat: 50 } },
  { key: "walnuts", name: "Walnuts", category: "fat", defaultGrams: 30, per100: { kcal: 654, protein: 15, carbs: 14, fat: 65 } },
  { key: "cashews", name: "Cashews", category: "fat", defaultGrams: 30, per100: { kcal: 553, protein: 18, carbs: 30, fat: 44 } },
  { key: "peanuts", name: "Peanuts", category: "fat", defaultGrams: 30, per100: { kcal: 567, protein: 26, carbs: 16, fat: 49 } },
  { key: "peanutbutter", name: "Peanut butter", category: "fat", defaultGrams: 20, per100: { kcal: 588, protein: 25, carbs: 20, fat: 50 } },
  { key: "tahini", name: "Tahini", category: "fat", defaultGrams: 15, per100: { kcal: 595, protein: 17, carbs: 21, fat: 54 } },
  { key: "oliveoil", name: "Olive oil", category: "fat", defaultGrams: 10, per100: { kcal: 884, protein: 0, carbs: 0, fat: 100 } },
  { key: "coconutoil", name: "Coconut oil", category: "fat", defaultGrams: 10, per100: { kcal: 862, protein: 0, carbs: 0, fat: 100 } },
  { key: "butter", name: "Butter", category: "fat", defaultGrams: 10, per100: { kcal: 717, protein: 0.9, carbs: 0.1, fat: 81 } },
  { key: "avocado", name: "Avocado", category: "fat", defaultGrams: 100, per100: { kcal: 160, protein: 2, carbs: 9, fat: 15 } },
  { key: "chia", name: "Chia seeds", category: "fat", defaultGrams: 15, per100: { kcal: 486, protein: 17, carbs: 42, fat: 31 } },
  // Vegetables
  { key: "broccoli", name: "Broccoli", category: "veg", defaultGrams: 150, per100: { kcal: 34, protein: 2.8, carbs: 7, fat: 0.4 } },
  { key: "spinach", name: "Spinach", category: "veg", defaultGrams: 100, per100: { kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4 } },
  { key: "cucumber", name: "Cucumber", category: "veg", defaultGrams: 100, per100: { kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1 } },
  { key: "tomato", name: "Tomato", category: "veg", defaultGrams: 120, per100: { kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 } },
  { key: "bellpepper", name: "Bell pepper", category: "veg", defaultGrams: 100, per100: { kcal: 31, protein: 1, carbs: 6, fat: 0.3 } },
  { key: "carrot", name: "Carrot", category: "veg", defaultGrams: 100, per100: { kcal: 41, protein: 0.9, carbs: 10, fat: 0.2 } },
  { key: "zucchini", name: "Zucchini", category: "veg", defaultGrams: 150, per100: { kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3 } },
  { key: "cauliflower", name: "Cauliflower", category: "veg", defaultGrams: 150, per100: { kcal: 25, protein: 1.9, carbs: 5, fat: 0.3 } },
  { key: "eggplant", name: "Eggplant", category: "veg", defaultGrams: 150, per100: { kcal: 25, protein: 1, carbs: 6, fat: 0.2 } },
  { key: "onion", name: "Onion", category: "veg", defaultGrams: 50, per100: { kcal: 40, protein: 1.1, carbs: 9, fat: 0.1 } },
  { key: "mushrooms", name: "Mushrooms", category: "veg", defaultGrams: 100, per100: { kcal: 22, protein: 3.1, carbs: 3.3, fat: 0.3 } },
  { key: "corn", name: "Sweet corn", category: "veg", defaultGrams: 100, per100: { kcal: 96, protein: 3.4, carbs: 21, fat: 1.5 } },
  // Fruit
  { key: "banana", name: "Banana", category: "fruit", defaultGrams: 120, per100: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
  { key: "apple", name: "Apple", category: "fruit", defaultGrams: 150, per100: { kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 } },
  { key: "orange", name: "Orange", category: "fruit", defaultGrams: 150, per100: { kcal: 47, protein: 0.9, carbs: 12, fat: 0.1 } },
  { key: "grapes", name: "Grapes", category: "fruit", defaultGrams: 100, per100: { kcal: 69, protein: 0.7, carbs: 18, fat: 0.2 } },
  { key: "strawberries", name: "Strawberries", category: "fruit", defaultGrams: 150, per100: { kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3 } },
  { key: "blueberries", name: "Blueberries", category: "fruit", defaultGrams: 100, per100: { kcal: 57, protein: 0.7, carbs: 14, fat: 0.3 } },
  { key: "watermelon", name: "Watermelon", category: "fruit", defaultGrams: 200, per100: { kcal: 30, protein: 0.6, carbs: 8, fat: 0.2 } },
  { key: "mango", name: "Mango", category: "fruit", defaultGrams: 150, per100: { kcal: 60, protein: 0.8, carbs: 15, fat: 0.4 } },
  { key: "pineapple", name: "Pineapple", category: "fruit", defaultGrams: 150, per100: { kcal: 50, protein: 0.5, carbs: 13, fat: 0.1 } },
  { key: "dates", name: "Dates", category: "fruit", defaultGrams: 40, per100: { kcal: 282, protein: 2.5, carbs: 75, fat: 0.4 } },
  { key: "figs_dried", name: "Figs, dried", category: "fruit", defaultGrams: 30, per100: { kcal: 249, protein: 3.3, carbs: 64, fat: 0.9 } },
  { key: "pomegranate", name: "Pomegranate seeds", category: "fruit", defaultGrams: 100, per100: { kcal: 83, protein: 1.7, carbs: 19, fat: 1.2 } },
  { key: "kiwi", name: "Kiwi", category: "fruit", defaultGrams: 100, per100: { kcal: 61, protein: 1.1, carbs: 15, fat: 0.5 } },
  { key: "peach", name: "Peach", category: "fruit", defaultGrams: 150, per100: { kcal: 39, protein: 0.9, carbs: 10, fat: 0.3 } },
  // Dairy
  { key: "milk", name: "Milk, 1.5%", category: "dairy", defaultGrams: 250, per100: { kcal: 46, protein: 3.4, carbs: 5, fat: 1.5 } },
  { key: "milk_whole", name: "Milk, whole", category: "dairy", defaultGrams: 250, per100: { kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3 } },
  { key: "yogurt", name: "Greek yogurt, 2%", category: "dairy", defaultGrams: 200, per100: { kcal: 73, protein: 10, carbs: 4, fat: 2 } },
  { key: "skyr", name: "Skyr", category: "dairy", defaultGrams: 200, per100: { kcal: 63, protein: 11, carbs: 4, fat: 0.2 } },
  { key: "cottage", name: "Cottage cheese", category: "dairy", defaultGrams: 150, per100: { kcal: 98, protein: 11, carbs: 3.4, fat: 4.3 } },
  { key: "cheddar", name: "Cheddar cheese", category: "dairy", defaultGrams: 30, per100: { kcal: 403, protein: 25, carbs: 1.3, fat: 33 } },
  { key: "mozzarella", name: "Mozzarella", category: "dairy", defaultGrams: 50, per100: { kcal: 280, protein: 28, carbs: 3.1, fat: 17 } },
  { key: "parmesan", name: "Parmesan", category: "dairy", defaultGrams: 20, per100: { kcal: 431, protein: 38, carbs: 4.1, fat: 29 } },
  { key: "feta", name: "Feta cheese", category: "dairy", defaultGrams: 50, per100: { kcal: 264, protein: 14, carbs: 4, fat: 21 } },
  { key: "halloumi", name: "Halloumi", category: "dairy", defaultGrams: 80, per100: { kcal: 321, protein: 22, carbs: 2, fat: 25 } },
  { key: "cream_cheese", name: "Cream cheese", category: "dairy", defaultGrams: 30, per100: { kcal: 342, protein: 6, carbs: 4, fat: 34 } },
  // Drinks
  { key: "oj", name: "Orange juice", category: "drink", defaultGrams: 200, per100: { kcal: 45, protein: 0.7, carbs: 10, fat: 0.2 } },
  { key: "protein_shake", name: "Protein shake, ready-to-drink", category: "drink", defaultGrams: 330, per100: { kcal: 100, protein: 20, carbs: 3, fat: 1.5 } },
  { key: "cola", name: "Cola", category: "drink", defaultGrams: 330, per100: { kcal: 42, protein: 0, carbs: 10.6, fat: 0 } },
  { key: "beer", name: "Beer", category: "drink", defaultGrams: 330, per100: { kcal: 43, protein: 0.5, carbs: 3.6, fat: 0 } },
  { key: "coffee_black", name: "Black coffee", category: "drink", defaultGrams: 200, per100: { kcal: 1, protein: 0.1, carbs: 0, fat: 0 } },
  { key: "green_tea", name: "Green tea", category: "drink", defaultGrams: 200, per100: { kcal: 1, protein: 0, carbs: 0.2, fat: 0 } },
  // Dishes — prepared meals from around the world
  { key: "pizza", name: "Pizza Margherita", category: "dish", defaultGrams: 150, per100: { kcal: 266, protein: 11, carbs: 33, fat: 10 } },
  { key: "cheeseburger", name: "Cheeseburger", category: "dish", defaultGrams: 200, per100: { kcal: 295, protein: 17, carbs: 24, fat: 15 } },
  { key: "fries", name: "French fries", category: "dish", defaultGrams: 150, per100: { kcal: 312, protein: 3.4, carbs: 41, fat: 15 } },
  { key: "doener", name: "Döner kebab (in bread)", category: "dish", defaultGrams: 350, per100: { kcal: 250, protein: 13, carbs: 24, fat: 11 } },
  { key: "shawarma", name: "Shawarma", category: "dish", defaultGrams: 250, per100: { kcal: 220, protein: 18, carbs: 12, fat: 11 } },
  { key: "sushi", name: "Sushi rolls, mixed", category: "dish", defaultGrams: 200, per100: { kcal: 150, protein: 5, carbs: 28, fat: 2 } },
  { key: "padthai", name: "Pad Thai", category: "dish", defaultGrams: 300, per100: { kcal: 175, protein: 7, carbs: 22, fat: 6 } },
  { key: "friedrice", name: "Fried rice", category: "dish", defaultGrams: 250, per100: { kcal: 163, protein: 4, carbs: 23, fat: 6 } },
  { key: "butterchicken", name: "Butter chicken", category: "dish", defaultGrams: 250, per100: { kcal: 190, protein: 14, carbs: 6, fat: 12 } },
  { key: "currywurst", name: "Currywurst", category: "dish", defaultGrams: 200, per100: { kcal: 280, protein: 10, carbs: 13, fat: 22 } },
  { key: "schnitzel", name: "Schnitzel", category: "dish", defaultGrams: 200, per100: { kcal: 250, protein: 20, carbs: 12, fat: 13 } },
  { key: "bratwurst", name: "Bratwurst", category: "dish", defaultGrams: 150, per100: { kcal: 300, protein: 13, carbs: 2, fat: 27 } },
  { key: "spaetzle", name: "Käsespätzle", category: "dish", defaultGrams: 300, per100: { kcal: 220, protein: 8, carbs: 24, fat: 10 } },
  { key: "roesti", name: "Rösti", category: "dish", defaultGrams: 200, per100: { kcal: 210, protein: 3, carbs: 25, fat: 11 } },
  { key: "fondue", name: "Cheese fondue", category: "dish", defaultGrams: 150, per100: { kcal: 320, protein: 19, carbs: 6, fat: 25 } },
];

function scale(per100, grams) {
  const f = grams / 100;
  return {
    kcal: Math.round(per100.kcal * f),
    protein: Math.round(per100.protein * f * 10) / 10,
    carbs: Math.round(per100.carbs * f * 10) / 10,
    fat: Math.round(per100.fat * f * 10) / 10,
  };
}

function Ring({ pct, size = 168, stroke = 14, color = COLORS.gold, track = COLORS.raised, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [dash, setDash] = useState(c);
  useEffect(() => {
    const tm = setTimeout(() => setDash(c - (Math.min(100, pct) / 100) * c), 150);
    return () => clearTimeout(tm);
  }, [c, pct]);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dash}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

function MacroBar({ label, value, target, color }) {
  const pct = Math.min(100, (value / target) * 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: COLORS.dim, fontFamily: "Inter, sans-serif" }}>{label}</span>
        <span style={{ fontSize: 13, color: COLORS.text, fontFamily: "Sora, sans-serif", fontWeight: 600 }}>
          {Math.round(value)}
          <span style={{ color: COLORS.dim, fontWeight: 400 }}> / {target}g</span>
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: COLORS.raised, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width .6s ease" }} />
      </div>
    </div>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: 16, ...style }}>
      {children}
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 999,
        background: checked ? COLORS.gold : COLORS.raised,
        border: `1px solid ${COLORS.border}`,
        position: "relative",
        cursor: "pointer",
        transition: "background .2s ease",
        flexShrink: 0,
      }}
    >
      <div style={{ position: "absolute", top: 2, left: checked ? 20 : 2, width: 20, height: 20, borderRadius: "50%", background: checked ? COLORS.bg : COLORS.dim, transition: "left .2s ease" }} />
    </div>
  );
}

function Stepper({ value, onChange, step = 1, suffix = "" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        onClick={() => onChange(Math.max(0, value - step))}
        style={{ width: 30, height: 30, borderRadius: 9, background: COLORS.raised, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        <Minus size={14} color={COLORS.text} />
      </div>
      <span style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 700, color: COLORS.text, minWidth: 52, textAlign: "center" }}>
        {value}
        {suffix}
      </span>
      <div
        onClick={() => onChange(value + step)}
        style={{ width: 30, height: 30, borderRadius: 9, background: COLORS.raised, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        <Plus size={14} color={COLORS.text} />
      </div>
    </div>
  );
}

function TextField({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      style={{ width: "100%", background: COLORS.raised, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 14px", color: COLORS.text, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none" }}
    />
  );
}

function TopBar({ title, lang, setLang, onBack, onSettings }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 8px", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {onBack && (
          <div onClick={onBack} style={{ cursor: "pointer", flexShrink: 0 }}>
            <ChevronLeft size={22} color={COLORS.text} />
          </div>
        )}
        <h1 style={{ fontFamily: "Sora, sans-serif", fontSize: 21, fontWeight: 700, color: COLORS.text, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {onSettings && (
          <div onClick={onSettings} style={{ width: 32, height: 32, borderRadius: 10, background: COLORS.surface, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <SettingsIcon size={15} color={COLORS.dim} />
          </div>
        )}
        <div onClick={() => setLang(lang === "en" ? "de" : "en")} style={{ display: "flex", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 999, padding: 3, cursor: "pointer", userSelect: "none" }}>
          {["de", "en"].map((l) => (
            <div key={l} style={{ padding: "5px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, fontFamily: "Sora, sans-serif", color: lang === l ? COLORS.bg : COLORS.dim, background: lang === l ? COLORS.gold : "transparent", transition: "all .2s ease" }}>
              {l.toUpperCase()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }) {
  return (
    <div onClick={onClick} style={{ padding: "7px 14px", borderRadius: 999, fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: active ? COLORS.gold : COLORS.surface, color: active ? COLORS.bg : COLORS.dim, border: `1px solid ${active ? COLORS.gold : COLORS.border}`, whiteSpace: "nowrap" }}>
      {label}
    </div>
  );
}

/* ---------------- Onboarding ---------------- */

function Onboarding({ t, lang, setLang, onFinish }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(null);
  const [weight, setWeight] = useState("84");
  const [height, setHeight] = useState("180");
  const [target, setTarget] = useState("80");
  const [vision3Months, setVision3Months] = useState("");
  const [visionWhy, setVisionWhy] = useState("");

  const kcalGoal = useMemo(() => {
    const base = 2200;
    if (goal === "cut") return base - 400;
    if (goal === "bulk") return base + 350;
    return base;
  }, [goal]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 0 0" }}>
        <div onClick={() => setLang(lang === "en" ? "de" : "en")} style={{ display: "flex", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 999, padding: 3, cursor: "pointer" }}>
          {["de", "en"].map((l) => (
            <div key={l} style={{ padding: "5px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, fontFamily: "Sora, sans-serif", color: lang === l ? COLORS.bg : COLORS.dim, background: lang === l ? COLORS.gold : "transparent" }}>
              {l.toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {step > 0 && (
        <div style={{ display: "flex", gap: 6, margin: "22px 0 4px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 3, borderRadius: 2, flex: 1, background: i <= step ? COLORS.gold : COLORS.border }} />
          ))}
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {step === 0 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 84, height: 84, borderRadius: 24, background: `linear-gradient(150deg, ${COLORS.gold}, #b9822f)`, margin: "0 auto 26px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Dumbbell size={34} color={COLORS.bg} />
            </div>
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: COLORS.text, margin: "0 0 10px" }}>{t.obWelcomeTitle}</h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14.5, color: COLORS.dim, margin: 0 }}>{t.obWelcomeSub}</p>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 6px" }}>{t.obGoalTitle}</h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, margin: "0 0 22px" }}>{t.obGoalSub}</p>
            {[
              { key: "cut", icon: TrendingDown, title: t.obGoalCut, sub: t.obGoalCutSub },
              { key: "maintain", icon: Equal, title: t.obGoalMaintain, sub: t.obGoalMaintainSub },
              { key: "bulk", icon: TrendingUp, title: t.obGoalBulk, sub: t.obGoalBulkSub },
            ].map(({ key, icon: Icon, title, sub }) => (
              <div key={key} onClick={() => setGoal(key)} style={{ display: "flex", alignItems: "center", gap: 14, padding: 15, borderRadius: 16, marginBottom: 12, cursor: "pointer", background: goal === key ? "rgba(228,166,76,0.12)" : COLORS.surface, border: `1.5px solid ${goal === key ? COLORS.gold : COLORS.border}` }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: COLORS.raised, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={19} color={goal === key ? COLORS.gold : COLORS.dim} />
                </div>
                <div>
                  <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14.5, fontWeight: 600, color: COLORS.text }}>{title}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 2 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 6px" }}>{t.obStatsTitle}</h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, margin: "0 0 22px" }}>{t.obStatsSub}</p>
            {[
              { label: t.obWeight, val: weight, set: setWeight },
              { label: t.obHeight, val: height, set: setHeight },
              { label: t.obTarget, val: target, set: setTarget },
            ].map((f, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginBottom: 6 }}>{f.label}</div>
                <TextField value={f.val} onChange={f.set} type="number" />
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 6px" }}>{t.obVisionTitle}</h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, margin: "0 0 22px" }}>{t.obVisionSub}</p>

            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginBottom: 6 }}>{t.obVision3Months}</div>
            <textarea
              value={vision3Months}
              onChange={(e) => setVision3Months(e.target.value)}
              placeholder={t.obVision3MonthsPlaceholder}
              rows={3}
              style={{ width: "100%", background: COLORS.raised, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 14, color: COLORS.text, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none", resize: "none", marginBottom: 18 }}
            />

            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginBottom: 6 }}>{t.obVisionWhy}</div>
            <textarea
              value={visionWhy}
              onChange={(e) => setVisionWhy(e.target.value)}
              placeholder={t.obVisionWhyPlaceholder}
              rows={3}
              style={{ width: "100%", background: COLORS.raised, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 14, color: COLORS.text, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none", resize: "none" }}
            />
          </div>
        )}

        {step === 4 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(228,166,76,0.14)", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check size={28} color={COLORS.gold} />
            </div>
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 8px" }}>{t.obConfirmTitle}</h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, margin: "0 0 16px" }}>{t.obConfirmSub}</p>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 42, fontWeight: 700, color: COLORS.gold }}>
              {kcalGoal}
              <span style={{ fontSize: 15, color: COLORS.dim, fontWeight: 500 }}> kcal</span>
            </div>
            {(vision3Months.trim() || visionWhy.trim()) && (
              <div style={{ textAlign: "left", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16, marginTop: 24 }}>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.dim, marginBottom: 10 }}>{t.obYourVision}</div>
                {vision3Months.trim() && (
                  <div style={{ marginBottom: visionWhy.trim() ? 12 : 0 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim, marginBottom: 3 }}>{t.obVision3Months}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.text }}>{vision3Months}</div>
                  </div>
                )}
                {visionWhy.trim() && (
                  <div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim, marginBottom: 3 }}>{t.obVisionWhy}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.text }}>{visionWhy}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} style={{ flex: "0 0 auto", background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.dim, borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            {t.back}
          </button>
        )}
        <button
          disabled={step === 1 && !goal}
          onClick={() => (step === 4 ? onFinish() : setStep(step + 1))}
          style={{ flex: 1, background: step === 1 && !goal ? COLORS.raised : COLORS.gold, color: step === 1 && !goal ? COLORS.dim : COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: step === 1 && !goal ? "default" : "pointer" }}
        >
          {step === 0 ? t.obStart : step === 4 ? t.obFinish : t.next}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Main tab screens ---------------- */

function HomeScreen({ t, onLogFood, onStartWorkout, onAddNote, onGoProgress }) {
  const kcalGoal = 2400,
    kcalEaten = 1847;
  return (
    <div style={{ padding: "4px 20px 24px" }}>
      <p style={{ color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 14, marginTop: -4, marginBottom: 22 }}>{t.greeting}</p>

      <Card style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 16 }}>
        <Ring pct={(kcalEaten / kcalGoal) * 100}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 28, fontWeight: 700, color: COLORS.text, lineHeight: 1 }}>{kcalGoal - kcalEaten}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: COLORS.dim, marginTop: 4 }}>kcal {t.kcalLeft}</div>
          </div>
        </Ring>
        <div style={{ flex: 1 }}>
          <MacroBar label={t.protein} value={132} target={180} color={COLORS.teal} />
          <MacroBar label={t.carbs} value={210} target={280} color={COLORS.gold} />
          <MacroBar label={t.fat} value={58} target={80} color={COLORS.coral} />
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Card>
          <Dumbbell size={17} color={COLORS.gold} />
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 10 }}>{t.lastWorkout}</div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 600, color: COLORS.text, marginTop: 2 }}>Push Day A</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 2 }}>9,240 kg</div>
        </Card>
        <Card>
          <TrendingUp size={17} color={COLORS.teal} />
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 10 }}>{t.currentWeight}</div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 600, color: COLORS.text, marginTop: 2 }}>82.4 kg</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.teal, marginTop: 2 }}>−0.6 kg / 4 weeks</div>
        </Card>
      </div>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <NotebookPen size={16} color={COLORS.dim} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim }}>{t.todaysNote}</span>
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>Energy felt high — slept 7.5h. Great pump on incline press.</div>
      </Card>

      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, marginBottom: 10 }}>{t.quickLog}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { icon: UtensilsCrossed, label: t.logFood, onClick: onLogFood },
          { icon: TrendingUp, label: t.logWeight, onClick: onGoProgress },
          { icon: Dumbbell, label: t.startWorkout, onClick: onStartWorkout },
          { icon: NotebookPen, label: t.addNote, onClick: onAddNote },
        ].map(({ icon: Icon, label, onClick }, i) => (
          <div key={i} onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: COLORS.surface, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={20} color={COLORS.gold} />
            </div>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: COLORS.dim, textAlign: "center" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NutritionScreen({ t, meals, onOpenFoodSearch }) {
  const mealDefs = [
    { key: "breakfast", label: t.breakfast },
    { key: "lunch", label: t.lunch },
    { key: "dinner", label: t.dinner },
    { key: "snacks", label: t.snacks },
  ];
  return (
    <div style={{ padding: "0 20px 24px" }}>
      <Card style={{ marginBottom: 16 }}>
        <MacroBar label={t.protein} value={132} target={180} color={COLORS.teal} />
        <MacroBar label={t.carbs} value={210} target={280} color={COLORS.gold} />
        <MacroBar label={t.fat} value={58} target={80} color={COLORS.coral} />
      </Card>

      <div onClick={() => onOpenFoodSearch("snacks")} style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "11px 14px", marginBottom: 20, cursor: "pointer" }}>
        <Search size={16} color={COLORS.dim} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, flex: 1 }}>{t.searchPlaceholder}</span>
        <ScanLine size={17} color={COLORS.gold} />
      </div>

      {mealDefs.map((m) => {
        const items = meals[m.key];
        const kcal = items.reduce((s, it) => s + it.kcal, 0);
        return (
          <div key={m.key} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 600, color: COLORS.text }}>{m.label}</span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim }}>{kcal > 0 ? `${kcal} kcal` : ""}</span>
            </div>
            <Card style={{ padding: 4 }}>
              {items.map((it, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderBottom: `1px solid ${COLORS.border}`, fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.text }}>
                  <span>
                    {it.name}
                    {it.grams ? <span style={{ color: COLORS.dim }}> · {it.grams}g</span> : null}
                  </span>
                  <span style={{ color: COLORS.dim }}>{it.kcal} kcal</span>
                </div>
              ))}
              <div onClick={() => onOpenFoodSearch(m.key)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", color: COLORS.gold, fontFamily: "Inter, sans-serif", fontSize: 13, cursor: "pointer" }}>
                <Plus size={14} /> {t.add}
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

function TrainingScreen({ t, planName, onStartWorkout, onOpenPlanBuilder, onOpenLibrary }) {
  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim }}>{t.activePlan}</span>
        <span onClick={onOpenPlanBuilder} style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.gold, cursor: "pointer" }}>
          + {t.newPlan}
        </span>
      </div>
      <Card style={{ marginBottom: 18, background: COLORS.raised }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 17, fontWeight: 700, color: COLORS.text }}>{planName}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginTop: 3 }}>
              {t.day} 1 · {EXERCISES.length} {t.exercises.toLowerCase()}
            </div>
          </div>
          <button onClick={onStartWorkout} style={{ background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 12, padding: "11px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
            {t.startWorkout}
          </button>
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim }}>{t.exercises}</span>
        <span onClick={onOpenLibrary} style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.gold, cursor: "pointer" }}>
          {t.viewLibrary}
        </span>
      </div>
      <Card style={{ padding: 4, marginBottom: 18 }}>
        {EXERCISES.map((ex, i) => (
          <div key={ex.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 12px", borderBottom: i < EXERCISES.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text, fontWeight: 500 }}>{ex.name}</span>
                {ex.pr && (
                  <span style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(228,166,76,0.14)", color: COLORS.gold, borderRadius: 999, padding: "2px 8px", fontSize: 10, fontFamily: "Sora, sans-serif", fontWeight: 700 }}>
                    <Award size={10} /> {t.newPR}
                  </span>
                )}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 2 }}>
                {t.lastTime}: {ex.lastWeight}kg × {ex.reps}
              </div>
            </div>
            <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, color: COLORS.dim }}>
              {ex.sets}×{ex.reps}
            </span>
          </div>
        ))}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <Timer size={17} color={COLORS.teal} />
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text, marginTop: 8 }}>1:47:12</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 2 }}>avg. session</div>
        </Card>
        <Card>
          <Flame size={17} color={COLORS.coral} />
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text, marginTop: 8 }}>9,240 kg</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 2 }}>{t.volume}</div>
        </Card>
      </div>
    </div>
  );
}

function LineChart({ points, color, height = 130 }) {
  const w = 300;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = height - ((p - min) / range) * (height - 20) - 10;
    return [x, y];
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${w},${height} L0,${height} Z`;
  const gradId = `fade-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r={4} fill={color} />
    </svg>
  );
}

function ProgressScreen({ t }) {
  const [range, setRange] = useState(0);
  const [slider, setSlider] = useState(50);
  const weight = [84.6, 84.1, 83.9, 83.4, 83.0, 82.7, 82.4];
  const strength = [72, 74, 74, 76, 78, 78, 80];

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {t.ranges.map((r, i) => (
          <Chip key={r} label={r} active={range === i} onClick={() => setRange(i)} />
        ))}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 600, color: COLORS.text }}>{t.weightTrend}</span>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 18, fontWeight: 700, color: COLORS.teal }}>
            82.4 <span style={{ fontSize: 12, color: COLORS.dim, fontWeight: 400 }}>kg</span>
          </span>
        </div>
        <LineChart points={weight} color={COLORS.teal} />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 600, color: COLORS.text }}>{t.strengthCurve}</span>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 18, fontWeight: 700, color: COLORS.gold }}>
            80 <span style={{ fontSize: 12, color: COLORS.dim, fontWeight: 400 }}>kg {t.est1RM}</span>
          </span>
        </div>
        <LineChart points={strength} color={COLORS.gold} />
      </Card>

      <Card>
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 600, color: COLORS.text, marginBottom: 12 }}>{t.photoCompare}</div>
        <div style={{ position: "relative", height: 220, borderRadius: 14, overflow: "hidden", background: COLORS.raised }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg,#2a2b30,#1b1c1f)", color: COLORS.dim }}>
            <Camera size={30} strokeWidth={1.4} />
          </div>
          <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - slider}% 0 0)`, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg,#3a2f22,#1b1c1f)" }}>
            <span style={{ fontFamily: "Sora, sans-serif", fontSize: 11, color: COLORS.gold, fontWeight: 700 }}>JAN 2026</span>
          </div>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${slider}%`, width: 2, background: COLORS.text, transform: "translateX(-1px)" }} />
        </div>
        <input type="range" min={0} max={100} value={slider} onChange={(e) => setSlider(Number(e.target.value))} style={{ width: "100%", marginTop: 12, accentColor: COLORS.gold }} />
      </Card>
    </div>
  );
}

function NotesScreen({ t, notes, filter, setFilter, onAddNote }) {
  const shown = filter === 0 ? notes : notes.filter((e) => e.type === filter);

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div onClick={onAddNote} style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 14px", marginBottom: 16, cursor: "pointer" }}>
        <Plus size={16} color={COLORS.gold} />
        <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 600, color: COLORS.gold }}>{t.newNote}</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {t.filters.map((f, i) => (
          <Chip key={f} label={f} active={filter === i} onClick={() => setFilter(i)} />
        ))}
      </div>

      {shown.length === 0 ? (
        <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13.5, marginTop: 40 }}>{t.journalEmpty}</div>
      ) : (
        shown.map((e) => (
          <Card key={e.id} style={{ marginBottom: 12, display: "flex", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: COLORS.raised, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <e.icon size={16} color={COLORS.gold} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.text }}>{e.date}</span>
                <div style={{ display: "flex", gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((m) => (
                    <div key={m} style={{ width: 5, height: 5, borderRadius: 999, background: m <= e.mood ? COLORS.teal : COLORS.border }} />
                  ))}
                </div>
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, lineHeight: 1.5 }}>{e.text}</div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

/* ---------------- Note composer ---------------- */

function NoteComposer({ t, onSave }) {
  const [category, setCategory] = useState(null);
  const [text, setText] = useState("");
  const [mood, setMood] = useState(3);

  const categories = [
    { type: 1, label: t.filters[1], icon: Dumbbell },
    { type: 2, label: t.filters[2], icon: UtensilsCrossed },
    { type: 3, label: t.filters[3], icon: Smile },
  ];

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {categories.map((c) => (
          <div
            key={c.type}
            onClick={() => setCategory(c.type)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "14px 8px", borderRadius: 14, cursor: "pointer", background: category === c.type ? "rgba(228,166,76,0.12)" : COLORS.surface, border: `1.5px solid ${category === c.type ? COLORS.gold : COLORS.border}` }}
          >
            <c.icon size={18} color={category === c.type ? COLORS.gold : COLORS.dim} />
            <span style={{ fontFamily: "Sora, sans-serif", fontSize: 11.5, fontWeight: 600, color: category === c.type ? COLORS.gold : COLORS.dim }}>{c.label}</span>
          </div>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t.notePlaceholder}
        rows={5}
        style={{ width: "100%", background: COLORS.raised, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 14, color: COLORS.text, fontFamily: "Inter, sans-serif", fontSize: 14, outline: "none", resize: "none", marginBottom: 20 }}
      />

      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, marginBottom: 10 }}>{t.moodLabel}</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 26 }}>
        {[1, 2, 3, 4, 5].map((m) => (
          <div
            key={m}
            onClick={() => setMood(m)}
            style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: m === mood ? COLORS.gold : COLORS.surface, border: `1px solid ${m === mood ? COLORS.gold : COLORS.border}`, fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: m === mood ? COLORS.bg : COLORS.dim }}
          >
            {m}
          </div>
        ))}
      </div>

      <button
        disabled={!category || !text.trim()}
        onClick={() =>
          onSave({
            type: category,
            text: text.trim(),
            mood,
            icon: categories.find((c) => c.type === category).icon,
          })
        }
        style={{ width: "100%", background: !category || !text.trim() ? COLORS.raised : COLORS.gold, color: !category || !text.trim() ? COLORS.dim : COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: !category || !text.trim() ? "default" : "pointer" }}
      >
        {t.saveNote}
      </button>
    </div>
  );
}

/* ---------------- Workout flow ---------------- */

function RestTimer({ t, seconds, total, onSkip }) {
  const pct = (seconds / total) * 100;
  return (
    <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, background: COLORS.raised, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: 16, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 12px 30px rgba(0,0,0,0.35)" }}>
      <Ring pct={100 - pct} size={52} stroke={5} color={COLORS.teal} track={COLORS.border}>
        <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 700, color: COLORS.text }}>{seconds}</span>
      </Ring>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.text }}>{t.resting}…</div>
      </div>
      <button onClick={onSkip} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 10, padding: "8px 12px", fontFamily: "Sora, sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        {t.skipRest}
      </button>
    </div>
  );
}

function WorkoutSession({ t, lang, onFinish }) {
  const [exIdx, setExIdx] = useState(0);
  const [completedSets, setCompletedSets] = useState(0);
  const [reps, setReps] = useState(EXERCISES[0].reps);
  const [weight, setWeight] = useState(EXERCISES[0].lastWeight);
  const [resting, setResting] = useState(false);
  const [restLeft, setRestLeft] = useState(90);
  const ex = EXERCISES[exIdx];
  const isLast = exIdx === EXERCISES.length - 1;
  const setsDone = completedSets >= ex.sets;

  useEffect(() => {
    if (!resting) return;
    if (restLeft <= 0) {
      setResting(false);
      return;
    }
    const id = setTimeout(() => setRestLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resting, restLeft]);

  const completeSet = () => {
    const next = completedSets + 1;
    setCompletedSets(next);
    if (next < ex.sets) {
      setRestLeft(90);
      setResting(true);
    }
  };

  const nextExercise = () => {
    const ni = exIdx + 1;
    setExIdx(ni);
    setCompletedSets(0);
    setReps(EXERCISES[ni].reps);
    setWeight(EXERCISES[ni].lastWeight);
    setResting(false);
  };

  return (
    <div style={{ position: "relative", padding: "0 20px 24px", minHeight: 500 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {EXERCISES.map((e, i) => (
          <div key={e.key} style={{ height: 3, borderRadius: 2, flex: 1, background: i < exIdx ? COLORS.gold : i === exIdx ? COLORS.teal : COLORS.border }} />
        ))}
      </div>

      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginBottom: 4 }}>
        {t.setOf} {Math.min(completedSets + 1, ex.sets)} / {ex.sets}
      </div>
      <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 24, fontWeight: 700, color: COLORS.text, margin: "0 0 20px" }}>{lang === "de" ? ex.nameDe : ex.name}</h2>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginBottom: 10 }}>{t.reps}</div>
        <Stepper value={reps} onChange={setReps} />
      </Card>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginBottom: 10 }}>{t.weight}</div>
        <Stepper value={weight} onChange={setWeight} step={2.5} suffix=" kg" />
      </Card>

      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {Array.from({ length: ex.sets }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < completedSets ? COLORS.gold : COLORS.raised }} />
        ))}
      </div>

      {!setsDone ? (
        <button onClick={completeSet} disabled={resting} style={{ width: "100%", background: resting ? COLORS.raised : COLORS.gold, color: resting ? COLORS.dim : COLORS.bg, border: "none", borderRadius: 14, padding: "15px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: resting ? "default" : "pointer" }}>
          {t.completeSet}
        </button>
      ) : (
        <button onClick={isLast ? onFinish : nextExercise} style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "15px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}>
          {isLast ? t.finishWorkout : t.nextExercise}
        </button>
      )}

      {resting && <RestTimer t={t} seconds={restLeft} total={90} onSkip={() => setResting(false)} />}
    </div>
  );
}

function WorkoutSummary({ t, onDone }) {
  const prExercises = EXERCISES.filter((e) => e.pr);
  return (
    <div style={{ padding: "10px 20px 24px", textAlign: "center" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(228,166,76,0.14)", margin: "10px auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Award size={30} color={COLORS.gold} />
      </div>
      <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 24px" }}>{t.workoutDone}</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18, textAlign: "left" }}>
        <Card>
          <Timer size={17} color={COLORS.teal} />
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text, marginTop: 8 }}>48:12</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 2 }}>{t.duration}</div>
        </Card>
        <Card>
          <Flame size={17} color={COLORS.coral} />
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text, marginTop: 8 }}>9,860 kg</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 2 }}>{t.volume}</div>
        </Card>
      </div>

      {prExercises.length > 0 && (
        <Card style={{ textAlign: "left", marginBottom: 20 }}>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, marginBottom: 10 }}>{t.newRecords}</div>
          {prExercises.map((ex) => (
            <div key={ex.key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.text }}>{ex.name}</span>
              <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 700, color: COLORS.gold }}>{ex.lastWeight + 2.5}kg</span>
            </div>
          ))}
        </Card>
      )}

      <button onClick={onDone} style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "15px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}>
        {t.done}
      </button>
    </div>
  );
}

/* ---------------- Food flow ---------------- */

function FoodSearchScreen({ t, lang, onAdd, onOpenBarcode }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [grams, setGrams] = useState(100);
  const [toast, setToast] = useState(null);

  // Live text search against the backend proxy (USDA FoodData Central).
  // The category chips are hidden for now: the API has no category field,
  // so this is a plain text search — see backend/README.md.
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("tooShort"); // tooShort | loading | ok | error

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setStatus("tooShort");
      return;
    }
    setStatus("loading");
    const controller = new AbortController();
    const debounce = setTimeout(() => {
      fetch(`${API_BASE}/api/food/search?q=${encodeURIComponent(q)}&lang=${encodeURIComponent(lang)}`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setResults(Array.isArray(data.results) ? data.results : []);
          setStatus("ok");
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          setResults([]);
          setStatus("error");
        });
    }, 300);
    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [query, lang]);

  const scaled = selected ? scale(selected.per100, grams) : null;

  const confirmAdd = () => {
    onAdd({ name: selected.name, kcal: scaled.kcal, grams });
    setToast(selected.name);
    setSelected(null);
    setTimeout(() => setToast(null), 1400);
  };

  return (
    <div style={{ padding: "0 20px 24px", position: "relative" }}>
      {!selected ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "11px 14px", marginBottom: 12 }}>
            <Search size={16} color={COLORS.dim} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchPlaceholder} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: COLORS.text, fontFamily: "Inter, sans-serif", fontSize: 13.5 }} />
          </div>

          <div onClick={onOpenBarcode} style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", background: COLORS.raised, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 14px", marginBottom: 16, cursor: "pointer" }}>
            <Barcode size={16} color={COLORS.gold} />
            <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.gold }}>{t.scanBarcode}</span>
          </div>

          {status === "loading" ? (
            <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginTop: 24 }}>{t.searchLoading}</div>
          ) : status === "error" ? (
            <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginTop: 24 }}>{t.serverError}</div>
          ) : status === "tooShort" ? (
            <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginTop: 24 }}>{t.searchTypeMore}</div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginTop: 24 }}>{t.noResults}</div>
          ) : (
            <Card style={{ padding: 4, maxHeight: 380, overflowY: "auto" }}>
              {results.map((f, i) => (
                <div
                  key={f.fdcId ?? i}
                  onClick={() => {
                    setSelected(f);
                    setGrams(100);
                  }}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderBottom: i < results.length - 1 ? `1px solid ${COLORS.border}` : "none", cursor: "pointer" }}
                >
                  <div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>{f.name}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim, marginTop: 2 }}>
                      {f.per100.kcal} kcal {t.per100g}
                    </div>
                  </div>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(228,166,76,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Plus size={15} color={COLORS.gold} />
                  </div>
                </div>
              ))}
            </Card>
          )}
        </>
      ) : (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 17, fontWeight: 700, color: COLORS.text }}>{selected.name}</div>
            <div onClick={() => setSelected(null)} style={{ cursor: "pointer" }}>
              <X size={18} color={COLORS.dim} />
            </div>
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginBottom: selected.note ? 8 : 20 }}>
            {selected.per100.kcal} kcal {t.per100g}
          </div>
          {selected.note && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: COLORS.dim, marginBottom: 20, lineHeight: 1.45 }}>
              {t.approxLabel}: {selected.note}
            </div>
          )}

          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginBottom: 8 }}>{t.amount}</div>
          <div style={{ marginBottom: 20 }}>
            <Stepper value={grams} onChange={(v) => setGrams(Math.max(10, v))} step={10} suffix=" g" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 22 }}>
            {[
              { label: "kcal", val: scaled.kcal, color: COLORS.text },
              { label: t.protein, val: `${scaled.protein}g`, color: COLORS.teal },
              { label: t.carbs, val: `${scaled.carbs}g`, color: COLORS.gold },
              { label: t.fat, val: `${scaled.fat}g`, color: COLORS.coral },
            ].map((s, i) => (
              <div key={i} style={{ background: COLORS.raised, borderRadius: 12, padding: "10px 4px", textAlign: "center" }}>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: COLORS.dim, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <button onClick={confirmAdd} style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {t.addItem}
          </button>
        </Card>
      )}

      {toast && (
        <div style={{ position: "absolute", left: 20, right: 20, bottom: 14, background: COLORS.gold, color: COLORS.bg, borderRadius: 12, padding: "11px 16px", display: "flex", alignItems: "center", gap: 8, fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, boxShadow: "0 10px 24px rgba(0,0,0,0.3)" }}>
          <Check size={15} /> {toast} — {t.addedToast}
        </div>
      )}
    </div>
  );
}

// Real camera scanning only runs on the native Android app (Capacitor) — the
// PC browser has no access to Google's ML Kit scanner module, so it shows a
// hint instead of a scan button rather than faking a result.
const IS_NATIVE_APP = Capacitor.isNativePlatform();

function BarcodeScanScreen({ t, onAdd, onDone }) {
  const [found, setFound] = useState(null);
  // idle | scanning | loading | notFound | error | unsupported | moduleInstalling
  const [status, setStatus] = useState("idle");
  const grams = 100;
  const scaled = found ? scale(found.per100, grams) : null;

  const lookupBarcode = (code) => {
    setStatus("loading");
    fetch(`${API_BASE}/api/food/barcode/${code}`)
      .then((res) => {
        if (res.status === 404) return { notFound: true };
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.notFound || !data.result) {
          setStatus("notFound");
          return;
        }
        setFound(data.result);
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
  };

  // Opens Google ML Kit's ready-made full-screen scanner (no custom camera
  // preview needed, and per the plugin docs this convenience method needs no
  // camera permission prompt on Android — Play Services handles it).
  const scanReal = async () => {
    setStatus("scanning");
    try {
      const { supported } = await BarcodeScanner.isSupported();
      if (!supported) {
        setStatus("unsupported");
        return;
      }
      const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!available) {
        // Kicks off a background download of the on-device scanner model;
        // finishes async, so just ask the user to try again shortly.
        await BarcodeScanner.installGoogleBarcodeScannerModule();
        setStatus("moduleInstalling");
        return;
      }
      const { barcodes } = await BarcodeScanner.scan({
        formats: [BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE, BarcodeFormat.Code128],
      });
      const code = barcodes[0]?.rawValue;
      if (!code) {
        // User backed out of the camera view without scanning anything.
        setStatus("idle");
        return;
      }
      lookupBarcode(code);
    } catch (err) {
      setStatus("error");
    }
  };

  const errorText = {
    error: t.serverError,
    notFound: t.barcodeNotFound,
    unsupported: t.barcodeUnsupported,
    moduleInstalling: t.barcodeModuleInstalling,
  }[status];

  return (
    <div style={{ padding: "10px 20px 24px" }}>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim, marginTop: 0, marginBottom: 16 }}>{t.barcodeHint}</p>
      <div style={{ position: "relative", height: 220, borderRadius: 18, background: "linear-gradient(160deg,#1c1d20,#0e0f11)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, overflow: "hidden" }}>
        <Barcode size={48} strokeWidth={1.2} color={COLORS.dim} />
        {[
          { top: 14, left: 14, rotate: 0 },
          { top: 14, right: 14, rotate: 90 },
          { bottom: 14, left: 14, rotate: -90 },
          { bottom: 14, right: 14, rotate: 180 },
        ].map((pos, i) => (
          <div key={i} style={{ position: "absolute", width: 22, height: 22, borderTop: `3px solid ${COLORS.gold}`, borderLeft: `3px solid ${COLORS.gold}`, transform: `rotate(${pos.rotate}deg)`, ...pos }} />
        ))}
      </div>

      {!IS_NATIVE_APP ? (
        <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginTop: 8 }}>{t.barcodeWebOnly}</div>
      ) : status === "scanning" ? (
        <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginTop: 8 }}>{t.barcodeScanning}</div>
      ) : status === "loading" ? (
        <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginTop: 8 }}>{t.barcodeLoading}</div>
      ) : found ? (
        <Card>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginBottom: 6 }}>{t.foundProduct}</div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>{found.name}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginBottom: 16 }}>
            {scaled.kcal} kcal · {grams} g
          </div>
          <button
            onClick={() => {
              onAdd({ name: found.name, kcal: scaled.kcal, grams });
              onDone();
            }}
            style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "13px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            {t.addItem}
          </button>
        </Card>
      ) : (
        <>
          {errorText && (
            <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginBottom: 14 }}>
              {errorText}
            </div>
          )}
          <button onClick={scanReal} style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {status === "idle" ? t.scanBarcode : t.scanAgain}
          </button>
        </>
      )}
    </div>
  );
}

/* ---------------- Exercise library ---------------- */

function ExerciseLibrary({ t, lang, mode, onAdd, onFinishPicking }) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("all");

  const muscles = [
    { key: "all", label: t.muscleAll },
    { key: "chest", label: t.muscleChest },
    { key: "back", label: t.muscleBack },
    { key: "legs", label: t.muscleLegs },
    { key: "shoulders", label: t.muscleShoulders },
    { key: "arms", label: t.muscleArms },
    { key: "core", label: t.muscleCore },
  ];

  const nameOf = (ex) => (lang === "de" ? ex.nameDe : ex.name);
  const cueOf = (ex) => (lang === "de" ? ex.cueDe : ex.cue);
  const results = EXERCISE_LIBRARY.filter((ex) => (muscle === "all" || ex.muscle === muscle) && nameOf(ex).toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "11px 14px", marginBottom: 14 }}>
        <Search size={16} color={COLORS.dim} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.libSearchPlaceholder} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: COLORS.text, fontFamily: "Inter, sans-serif", fontSize: 13.5 }} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {muscles.map((m) => (
          <Chip key={m.key} label={m.label} active={muscle === m.key} onClick={() => setMuscle(m.key)} />
        ))}
      </div>

      <Card style={{ padding: 4, marginBottom: mode === "pick" ? 16 : 0 }}>
        {results.map((ex, i) => (
          <div key={ex.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderBottom: i < results.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>{nameOf(ex)}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim, marginTop: 2 }}>{cueOf(ex)}</div>
            </div>
            {mode === "pick" && (
              <div onClick={() => onAdd(ex)} style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(228,166,76,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                <Plus size={15} color={COLORS.gold} />
              </div>
            )}
          </div>
        ))}
      </Card>

      {mode === "pick" && (
        <button onClick={onFinishPicking} style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          {t.finishPicking}
        </button>
      )}
    </div>
  );
}

/* ---------------- Plan builder ---------------- */

function PlanBuilder({ t, lang, name, setName, days, setDays, selectedDay, setSelectedDay, onOpenLibraryForDay, onSave }) {
  const [dayInput, setDayInput] = useState("");
  const [saved, setSaved] = useState(false);

  const addDay = () => {
    if (!dayInput.trim()) return;
    const id = Date.now();
    setDays([...days, { id, name: dayInput.trim(), exercises: [] }]);
    setDayInput("");
    setSelectedDay(id);
  };

  const removeDay = (id) => {
    setDays(days.filter((d) => d.id !== id));
    if (selectedDay === id) setSelectedDay(null);
  };

  const removeExercise = (dayId, idx) => {
    setDays(days.map((d) => (d.id === dayId ? { ...d, exercises: d.exercises.filter((_, i) => i !== idx) } : d)));
  };

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ marginBottom: 16 }}>
        <TextField value={name} onChange={setName} placeholder={t.planNamePlaceholder} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <TextField value={dayInput} onChange={setDayInput} placeholder={t.dayNamePlaceholder} />
        </div>
        <button onClick={addDay} style={{ background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 12, padding: "0 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          {t.addDay}
        </button>
      </div>

      {days.length === 0 ? (
        <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginTop: 20, marginBottom: 20 }}>{t.noDaysYet}</div>
      ) : (
        <div style={{ marginBottom: 6 }}>
          {days.map((d) => (
            <Card key={d.id} onClick={() => setSelectedDay(d.id)} style={{ marginBottom: 10, cursor: "pointer", border: `1.5px solid ${selectedDay === d.id ? COLORS.gold : COLORS.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: d.exercises.length ? 10 : 0 }}>
                <span style={{ fontFamily: "Sora, sans-serif", fontSize: 14.5, fontWeight: 600, color: COLORS.text }}>{d.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDay(d.id);
                      onOpenLibraryForDay(d.id);
                    }}
                    style={{ fontFamily: "Sora, sans-serif", fontSize: 12, fontWeight: 600, color: COLORS.gold, cursor: "pointer" }}
                  >
                    + {t.addExerciseToDay}
                  </span>
                  <Trash2
                    size={15}
                    color={COLORS.dim}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDay(d.id);
                    }}
                    style={{ cursor: "pointer" }}
                  />
                </div>
              </div>
              {d.exercises.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {d.exercises.map((ex, i) => (
                    <span
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeExercise(d.id, i);
                      }}
                      title={t.tapToRemove}
                      style={{ background: COLORS.raised, color: COLORS.dim, borderRadius: 999, padding: "4px 10px", fontSize: 11.5, fontFamily: "Inter, sans-serif", cursor: "pointer" }}
                    >
                      {lang === "de" ? ex.nameDe : ex.name} ✕
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {days.length > 0 && (
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginBottom: 20 }}>{t.selectDayFirst}</div>
      )}

      <button
        disabled={!name.trim() || days.length === 0}
        onClick={() => {
          onSave(name.trim());
          setSaved(true);
          setTimeout(() => setSaved(false), 1200);
        }}
        style={{ width: "100%", background: !name.trim() || days.length === 0 ? COLORS.raised : COLORS.gold, color: !name.trim() || days.length === 0 ? COLORS.dim : COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: !name.trim() || days.length === 0 ? "default" : "pointer" }}
      >
        {saved ? t.planSaved : t.savePlan}
      </button>
    </div>
  );
}

/* ---------------- Settings ---------------- */

function SettingsScreen({ t, lang, setLang, units, setUnits, reminders, setReminders, onReplayOnboarding }) {
  return (
    <div style={{ padding: "0 20px 24px" }}>
      <Card style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(150deg, ${COLORS.gold}, #b9822f)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 19, fontWeight: 700, color: COLORS.bg }}>K</span>
        </div>
        <div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 700, color: COLORS.text }}>Karim</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginTop: 2 }}>82.4 kg · 180 cm</div>
        </div>
      </Card>

      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, marginBottom: 10 }}>{t.units}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        <Chip label="kg" active={units === "kg"} onClick={() => setUnits("kg")} />
        <Chip label="lbs" active={units === "lbs"} onClick={() => setUnits("lbs")} />
      </div>

      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, marginBottom: 10 }}>{t.reminders}</div>
      <Card style={{ padding: 4, marginBottom: 22 }}>
        {[
          { key: "food", label: t.remFood, icon: UtensilsCrossed },
          { key: "weigh", label: t.remWeigh, icon: TrendingUp },
          { key: "train", label: t.remTrain, icon: Dumbbell },
        ].map((r, i, arr) => (
          <div key={r.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <r.icon size={16} color={COLORS.dim} />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>{r.label}</span>
            </div>
            <Switch checked={reminders[r.key]} onChange={(v) => setReminders({ ...reminders, [r.key]: v })} />
          </div>
        ))}
      </Card>

      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, marginBottom: 10 }}>{t.language}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 26 }}>
        <Chip label="Deutsch" active={lang === "de"} onClick={() => setLang("de")} />
        <Chip label="English" active={lang === "en"} onClick={() => setLang("en")} />
      </div>

      <div onClick={onReplayOnboarding} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 4px", cursor: "pointer", borderTop: `1px solid ${COLORS.border}` }}>
        <RotateCcw size={16} color={COLORS.dim} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>{t.replayOnboarding}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 4px", cursor: "pointer" }}>
        <LogOut size={16} color={COLORS.coral} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.coral }}>{t.signOut}</span>
      </div>
    </div>
  );
}

/* ---------------- App shell ---------------- */

export default function AsmarFitApp() {
  const [onboarded, setOnboarded] = useState(false);
  const [tab, setTab] = useState("home");
  const [lang, setLang] = useState("de");
  const [overlay, setOverlay] = useState(null);
  const [libraryReturnTo, setLibraryReturnTo] = useState("main");
  const [activeMealKey, setActiveMealKey] = useState("snacks");
  const [planName, setPlanName] = useState(null);
  const [units, setUnits] = useState("kg");
  const [reminders, setReminders] = useState({ food: true, weigh: true, train: false });

  const [pbName, setPbName] = useState("");
  const [pbDays, setPbDays] = useState([]);
  const [pbSelectedDay, setPbSelectedDay] = useState(null);

  const [notesFilter, setNotesFilter] = useState(0);
  const [notes, setNotes] = useState([
    { id: 1, type: 1, date: "Sep 5", icon: Dumbbell, text: "Energy felt high — slept 7.5h. Great pump on incline press.", mood: 4 },
    { id: 2, type: 2, date: "Sep 4", icon: UtensilsCrossed, text: "Skipped the evening snack, stayed under target easily.", mood: 4 },
    { id: 3, type: 3, date: "Sep 3", icon: Mic, text: "Voice note · 0:42 — feeling a bit run down, dialing back volume tomorrow.", mood: 2 },
    { id: 4, type: 1, date: "Sep 2", icon: Dumbbell, text: "Leg day — new squat PR at 130kg for a triple.", mood: 5 },
  ]);

  const [meals, setMeals] = useState({
    breakfast: [{ name: "Oats, whey & banana", kcal: 512 }],
    lunch: [
      { name: "Chicken, rice & broccoli", kcal: 610 },
      { name: "Olive oil, 1 tbsp", kcal: 80 },
    ],
    dinner: [],
    snacks: [
      { name: "Greek yogurt & almonds", kcal: 380 },
      { name: "Protein bar", kcal: 265 },
    ],
  });

  const t = useMemo(() => STR[lang], [lang]);

  const addFoodItem = (food) => {
    setMeals((m) => ({ ...m, [activeMealKey]: [...m[activeMealKey], food] }));
  };

  const addExerciseToPbDay = (ex) => {
    setPbDays((days) => days.map((d) => (d.id === pbSelectedDay ? { ...d, exercises: [...d.exercises, ex] } : d)));
  };

  const addNoteEntry = (entry) => {
    setNotes((n) => [{ id: Date.now(), date: t.today, ...entry }, ...n]);
    setOverlay(null);
  };

  const nav = [
    { key: "home", icon: Home, label: t.tabs.home },
    { key: "nutrition", icon: UtensilsCrossed, label: t.tabs.nutrition },
    { key: "training", icon: Dumbbell, label: t.tabs.training },
    { key: "progress", icon: TrendingUp, label: t.tabs.progress },
    { key: "notes", icon: NotebookPen, label: t.tabs.notes },
  ];

  let content, topTitle, showBack, onSettingsBtn;

  if (overlay === "workout") {
    content = <WorkoutSession t={t} lang={lang} onFinish={() => setOverlay("workoutSummary")} />;
    topTitle = t.startWorkout;
    showBack = () => setOverlay(null);
  } else if (overlay === "workoutSummary") {
    content = <WorkoutSummary t={t} onDone={() => setOverlay(null)} />;
    topTitle = t.workoutDone;
    showBack = () => setOverlay(null);
  } else if (overlay === "foodSearch") {
    content = <FoodSearchScreen t={t} lang={lang} onAdd={addFoodItem} onOpenBarcode={() => setOverlay("barcode")} />;
    topTitle = t.foodSearchTitle;
    showBack = () => setOverlay(null);
  } else if (overlay === "barcode") {
    content = <BarcodeScanScreen t={t} onAdd={addFoodItem} onDone={() => setOverlay(null)} />;
    topTitle = t.barcodeTitle;
    showBack = () => setOverlay("foodSearch");
  } else if (overlay === "planBuilder") {
    content = (
      <PlanBuilder
        t={t}
        lang={lang}
        name={pbName}
        setName={setPbName}
        days={pbDays}
        setDays={setPbDays}
        selectedDay={pbSelectedDay}
        setSelectedDay={setPbSelectedDay}
        onOpenLibraryForDay={(dayId) => {
          setPbSelectedDay(dayId);
          setLibraryReturnTo("planBuilder");
          setOverlay("exerciseLibrary");
        }}
        onSave={(name) => {
          setPlanName(name);
          setTimeout(() => {
            setOverlay(null);
            setPbName("");
            setPbDays([]);
            setPbSelectedDay(null);
          }, 900);
        }}
      />
    );
    topTitle = t.planBuilderTitle;
    showBack = () => setOverlay(null);
  } else if (overlay === "exerciseLibrary") {
    const isPicking = libraryReturnTo === "planBuilder";
    content = (
      <ExerciseLibrary
        t={t}
        lang={lang}
        mode={isPicking ? "pick" : "browse"}
        onAdd={addExerciseToPbDay}
        onFinishPicking={() => setOverlay("planBuilder")}
      />
    );
    topTitle = t.viewLibrary;
    showBack = () => setOverlay(isPicking ? "planBuilder" : null);
  } else if (overlay === "noteComposer") {
    content = <NoteComposer t={t} onSave={addNoteEntry} />;
    topTitle = t.newNote;
    showBack = () => setOverlay(null);
  } else if (overlay === "settings") {
    content = (
      <SettingsScreen
        t={t}
        lang={lang}
        setLang={setLang}
        units={units}
        setUnits={setUnits}
        reminders={reminders}
        setReminders={setReminders}
        onReplayOnboarding={() => {
          setOverlay(null);
          setOnboarded(false);
        }}
      />
    );
    topTitle = t.settingsTitle;
    showBack = () => setOverlay(null);
  } else {
    const screens = {
      home: (
        <HomeScreen
          t={t}
          onLogFood={() => {
            setActiveMealKey("snacks");
            setOverlay("foodSearch");
          }}
          onStartWorkout={() => setOverlay("workout")}
          onAddNote={() => setOverlay("noteComposer")}
          onGoProgress={() => setTab("progress")}
        />
      ),
      nutrition: (
        <NutritionScreen
          t={t}
          meals={meals}
          onOpenFoodSearch={(key) => {
            setActiveMealKey(key);
            setOverlay("foodSearch");
          }}
        />
      ),
      training: (
        <TrainingScreen
          t={t}
          planName={planName || t.pushPullLegs}
          onStartWorkout={() => setOverlay("workout")}
          onOpenPlanBuilder={() => setOverlay("planBuilder")}
          onOpenLibrary={() => {
            setLibraryReturnTo("main");
            setOverlay("exerciseLibrary");
          }}
        />
      ),
      progress: <ProgressScreen t={t} />,
      notes: <NotesScreen t={t} notes={notes} filter={notesFilter} setFilter={setNotesFilter} onAddNote={() => setOverlay("noteComposer")} />,
    };
    content = screens[tab];
    topTitle = t.tabs[tab];
    showBack = null;
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "24px 12px", minHeight: "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        input[type="range"] { -webkit-appearance: none; height: 4px; border-radius: 2px; background: ${COLORS.raised}; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: ${COLORS.gold}; cursor: pointer; }
      `}</style>
      <div style={{ width: 390, maxWidth: "100%", background: COLORS.bg, borderRadius: 40, border: "10px solid #0A0A0B", overflow: "hidden", boxShadow: "0 30px 60px rgba(0,0,0,0.45)", fontFamily: "Inter, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 26px 0", fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.text }}>
          <span>9:41</span>
          <Droplets size={13} color={COLORS.dim} />
        </div>

        {!onboarded ? (
          <div style={{ height: 720 }}>
            <Onboarding t={t} lang={lang} setLang={setLang} onFinish={() => setOnboarded(true)} />
          </div>
        ) : (
          <>
            <TopBar title={topTitle} lang={lang} setLang={setLang} onBack={showBack} onSettings={!showBack ? () => setOverlay("settings") : null} />
            <div style={{ height: 700, overflowY: "auto" }}>{content}</div>
            <div style={{ display: "flex", justifyContent: "space-around", padding: "10px 6px 20px", borderTop: `1px solid ${COLORS.border}`, background: COLORS.bg }}>
              {nav.map(({ key, icon: Icon, label }) => {
                const active = tab === key && !overlay;
                return (
                  <div
                    key={key}
                    onClick={() => {
                      setOverlay(null);
                      setTab(key);
                    }}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", padding: "4px 8px" }}
                  >
                    <Icon size={20} color={active ? COLORS.gold : COLORS.dim} strokeWidth={active ? 2.3 : 1.8} />
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: active ? 600 : 400, color: active ? COLORS.gold : COLORS.dim }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
