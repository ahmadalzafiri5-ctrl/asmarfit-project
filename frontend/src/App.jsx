import { useState, useEffect, useMemo, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Health } from "@capgo/capacitor-health";
import { BarcodeScanner, BarcodeFormat } from "@capacitor-mlkit/barcode-scanning";
// @zxing/* (the browser barcode fallback) is loaded lazily inside scanWeb()
// below — it's only needed on the barcode screen, and pulling it into the
// main bundle would add ~450kB gzip to every single page load.
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
  Link2,
  Star,
  RotateCcw,
  Equal,
  X,
  BookOpen,
  Frown,
  Meh,
  Laugh,
  Angry,
  MessageCircle,
  Send,
  GlassWater,
  Footprints,
} from "lucide-react";

/* ---------------------------------------------------------
   ASFIT — interactive mobile app prototype
   Light theme, green-accented (Yazio-inspired). Tokens
   bg:#FFFFFF  surface:#F6F7F8  raised:#EEF1F3  border:#E1E4E8
   text:#161A1D  dim:#68707A  gold:#00BF8F  teal:#2F80ED  coral:#E2694F
   ("gold" keeps its old name to avoid renaming ~150 call sites, but it's
   now the primary green brand accent, not an actual gold/orange.)
--------------------------------------------------------- */

// Backend proxy (USDA FoodData Central search + Open Food Facts barcode lookup).
// See backend/README.md. URL comes from VITE_API_BASE_URL (see .env /
// .env.production) so the Android build points at the hosted backend instead
// of localhost, which a phone can't reach. Falls back to local dev default.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

// Colours are CSS variables so the whole app can switch theme at runtime
// (see THEMES / applyTheme below — the palette follows the gender chosen in onboarding).
const COLORS = {
  bg: "var(--c-bg)",
  surface: "var(--c-surface)",
  raised: "var(--c-raised)",
  border: "var(--c-border)",
  text: "var(--c-text)",
  dim: "var(--c-dim)",
  gold: "var(--c-gold)",
  goldSoft: "var(--c-goldSoft)",
  teal: "var(--c-teal)",
  coral: "var(--c-coral)",
  coralSoft: "var(--c-coralSoft)",
};

const THEMES = {
  neutral: {
    light: { bg: "#FFFFFF", surface: "#F6F7F8", raised: "#EEF1F3", border: "#E1E4E8", text: "#161A1D", dim: "#68707A", gold: "#00BF8F", goldSoft: "rgba(0,191,143,0.14)", teal: "#2F80ED", coral: "#E2694F", coralSoft: "rgba(226,105,79,0.14)" },
    dark: { bg: "#111416", surface: "#1A1E21", raised: "#242A2E", border: "#2F363B", text: "#F1F4F5", dim: "#9AA5AC", gold: "#1FD1A2", goldSoft: "rgba(31,209,162,0.16)", teal: "#5B9DF5", coral: "#F0806A", coralSoft: "rgba(240,128,106,0.18)" },
  },
  female: {
    light: { bg: "#FFFFFF", surface: "#FDF4F8", raised: "#FBE8F0", border: "#F3D6E2", text: "#2B1A24", dim: "#8A6E7C", gold: "#E5548A", goldSoft: "rgba(229,84,138,0.13)", teal: "#9B6FE0", coral: "#F08A5D", coralSoft: "rgba(240,138,93,0.16)" },
    dark: { bg: "#171015", surface: "#22171E", raised: "#2D1F27", border: "#3D2A35", text: "#FAEFF4", dim: "#B79CAA", gold: "#F26AA0", goldSoft: "rgba(242,106,160,0.17)", teal: "#B08AF0", coral: "#F59B70", coralSoft: "rgba(245,155,112,0.18)" },
  },
  male: {
    light: { bg: "#FFFFFF", surface: "#F2F5FB", raised: "#E8EEF9", border: "#D6E0F0", text: "#0F1729", dim: "#5F6C86", gold: "#2563EB", goldSoft: "rgba(37,99,235,0.12)", teal: "#0E9F9A", coral: "#F0782E", coralSoft: "rgba(240,120,46,0.14)" },
    dark: { bg: "#0D1220", surface: "#151C2E", raised: "#1E2740", border: "#2A3550", text: "#EBF1FF", dim: "#94A1BE", gold: "#5B8DF6", goldSoft: "rgba(91,141,246,0.18)", teal: "#2CC4BE", coral: "#F58F4C", coralSoft: "rgba(245,143,76,0.18)" },
  },
};

let themeMode = "system";
try {
  themeMode = JSON.parse(localStorage.getItem("asfit.appearance") || "\"system\"");
} catch {
  themeMode = "system";
}

function applyTheme(gender, mode = themeMode) {
  themeMode = mode;
  const dark = mode === "dark" || (mode === "system" && typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const theme = (THEMES[gender] || THEMES.neutral)[dark ? "dark" : "light"];
  const root = document.documentElement;
  Object.entries(theme).forEach(([k, v]) => root.style.setProperty("--c-" + k, v));
  root.style.colorScheme = dark ? "dark" : "light";
  document.body && (document.body.style.background = theme.bg);
}

// Apply the saved theme before the first paint to avoid a colour flash.
try {
  const savedTheme = JSON.parse(localStorage.getItem("asfit.colorTheme") || '"auto"');
  applyTheme(savedTheme === "auto" ? JSON.parse(localStorage.getItem("asfit.profile") || "null")?.gender : savedTheme);
} catch {
  applyTheme(null);
}


const STR = {
  en: {
    tabs: { home: "Home", nutrition: "Nutrition", training: "Training", progress: "Progress", notes: "Notes" },
    greetingPrefix: "Good morning",
    greetingDay: "Hello",
    greetingEvening: "Good evening",
    kcalLeft: "left today",
    lastWorkout: "Last workout",
    currentWeight: "Current weight",
    todaysNote: "Today's note",
    noWorkoutsYet: "No workouts yet",
    noNoteToday: "No note yet",
    firstWeightEntry: "First entry",
    weeksLabel: "weeks",
    notLoggedYet: "Not logged yet",
    avgSession: "avg. session",
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
    obWelcomeTitle: "Welcome to ASFIT",
    obWelcomeSub: "Track it. Lift it. Own it.",
    obStart: "Get started",
    obGenderTitle: "What's your gender?",
    obGenderSub: "We need this to calculate your daily calorie target accurately.",
    obGenderFemale: "Female",
    obGenderMale: "Male",
    obGoalTitle: "What's your goal?",
    obGoalSub: "This sets your starting calorie target — you can change it anytime.",
    obGoalCut: "Lose weight",
    obGoalCutSub: "Calorie deficit, keep strength",
    obGoalMaintain: "Maintain weight",
    obGoalMaintainSub: "Stay steady, build habits",
    obGoalGain: "Gain weight",
    obGoalGainSub: "Calorie surplus, build up gradually",
    obGoalBulk: "Build muscle",
    obGoalBulkSub: "Calorie surplus, focus on volume",
    obGoalOther: "Something else",
    obGoalOtherSub: "Not sure yet — we'll figure it out",
    obReasonTitle: "Why do you want to reach this goal?",
    obReasonConfidence: "For my confidence",
    obReasonHealth: "For my health",
    obReasonFitness: "For my fitness",
    obReasonEvent: "For a special occasion",
    obReasonBurn: "To burn more calories",
    obReasonOther: "For another reason",
    obSkip: "Skip",
    obMoreTitle: "What else would you like to achieve?",
    obMoreEating: "Improve my eating habits",
    obMoreCook: "Learn to cook healthy",
    obMoreImmune: "Strengthen my immune system",
    obMoreSleep: "Sleep better and have more energy",
    obMoreFeel: "Feel better in my body",
    obMoreOther: "Something else",
    obExperienceTitle: "Have you tried to reach a similar goal before?",
    obExperienceNotReached: "Yes, but I haven't reached my goal yet.",
    obExperienceFailed: "I tried, but without success.",
    obExperienceCouldntKeep: "Yes, but I couldn't keep the results.",
    obExperienceNever: "I've never tried this before.",
    obStatsTitle: "A few numbers",
    obStatsSub: "Used to calculate your daily targets.",
    obNameLabel: "Your name",
    obNamePlaceholder: "e.g. Alex",
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
    obFinish: "Enter ASFIT",
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
    freeWorkout: "Free workout",
    freeWorkoutSub: "Pick your exercises and enter your own weights.",
    yourExercises: "Your exercises",
    noExercisesYet: "No exercises logged yet — start a workout.",
    bestLabel: "Best",
    addSet: "Add set",
    emptyWorkout: "Add your first exercise to begin.",
    discardWorkout: "Discard workout",
    discardWorkoutConfirm: "Tap again to discard — not saved",
    workoutRunning: "Workout in progress",
    workoutRunningSince: "Started at",
    resumeWorkout: "Resume",
    addExerciseBtn: "Add exercise",
    saveWeight: "Save",
    weightInputPlaceholder: "Weight in kg",
    needMoreWeights: "Log your weight regularly to see the trend.",
    exerciseProgress: "Exercise progress",
    exerciseProgressHint: "Log this exercise in at least two workouts.",
    noProgressYet: "Finish a workout to see your progress here.",
    muscleGlutes: "Glutes",
    muscleCardio: "Cardio",
    muscleFull: "Full body",
    waterTitle: "Water",
    waterGoalLabel: "Goal",
    waterAddGlass: "+ 250 ml",
    waterUndo: "Undo",
    assistantTitle: "ASFIT Assistant",
    assistantEntry: "Ask the assistant",
    assistantHello: "Hi! I'm your ASFIT assistant. Ask me about training, nutrition or how to use the app.",
    assistantPlaceholder: "Type your question …",
    assistantThinking: "Thinking …",
    assistantError: "Sorry, something went wrong. Please try again.",
    assistantNotConfigured: "The assistant isn't set up yet (missing API key on the server).",
    obBirthTitle: "When is your birthday?",
    obBirthSub: "We need your age to calculate your daily calorie target accurately.",
    obDay: "Day",
    obMonth: "Month",
    obYear: "Year",
    months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
    obTargetDateTitle: "By when do you want to reach your goal?",
    obTargetDateSub: "We use the date to set a realistic daily calorie target.",
    obPerWeek: "per week",
    obAmbitious: "That's very ambitious — a longer time frame is easier to keep up.",
    obAiScanTitle: "Track accurately anywhere with our AI",
    obAiScanSub: "Take a quick photo to log restaurant or takeaway meals and stay on track, whether you cook or eat out.",
    obAiScan2Title: "Good choice! You're on the fast track.",
    obAiScan2Sub: "With AI you get nutrition info instantly, which makes it easier to stay on course and see results.",
    obExample: "Example",
    stepsTitle: "Steps",
    stepsBurned: "burned",
    stepsConnect: "Connect Health Connect",
    stepsUnavailable: "Health Connect isn't available on this device — enter your steps manually.",
    stepsManualPlaceholder: "Steps today",
    stepsSave: "Save",
    stepsGoalEdit: "Set step goal",
    eatenLabel: "Eaten",
    burnedLabel: "Burned",
    goalLabel: "Goal",
    photoScanBtn: "Scan meal with AI photo",
    photoTitle: "AI photo scan",
    photoHint: "Take a photo of your meal — the AI estimates calories and macros.",
    photoTake: "Take photo",
    photoAnalyzing: "Analyzing your meal …",
    photoNoFood: "No food recognized — try another photo.",
    photoEstimate: "AI estimate — can be off, please check before logging.",
    photoAgain: "Try again",
    photoNotConfigured: "AI photo scan isn't set up yet (missing API key on the server).",
    minutesLabel: "Minutes",
    cardioHint: "Cardio: enter the duration",
    kcalBurnedLabel: "kcal burned",
    settingsTitle: "Settings",
    photoGallery: "Choose from gallery",
    recipeAskTitle: "Unsure about amounts? Ask the AI",
    recipeAskHello: "Ask me anything about this recipe — how much milk, substitutions, portion sizes …",
    exerciseBest: "Best",
    exerciseHistory: "Your entries",
    exerciseLogTitle: "Log an entry",
    exerciseSaved: "Saved",
    noHistory: "No entries yet",
    settingsPrivacy: "Privacy",
    settingsSupport: "Ask AI support",
    privacyTitle: "Privacy",
    privacySections: [{"h":"Your entries","p":"Profile, meals, workouts, weight and notes are currently kept on your device only."},{"h":"Food search and barcode","p":"Search terms and barcodes are forwarded through our server to USDA FoodData Central and Open Food Facts."},{"h":"AI photo scan and assistant","p":"For the photo scan, a downscaled image is sent to our server and from there to an AI service for analysis; our server does not store it. Questions you type to the assistant are handled the same way."},{"h":"Health data (steps)","p":"On request, ASFIT reads your daily steps from Health Connect to estimate calories burned. The values stay on your device. You can revoke access at any time in Health Connect."}],
    recordsTitle: "Records",
    recordsCardSub: "Your highest achievements — take the challenge",
    recordsAuto: "Your best lifts & sessions",
    recordsCustom: "My challenges",
    recordsAdd: "New challenge",
    recordName: "Name (e.g. Marathon, 100 m swim)",
    recordValue: "Result",
    recordUnit: "Unit (kg, km, min …)",
    recordLower: "Lower is better (time)",
    recordHigher: "Higher is better",
    recordReward: "My reward (optional)",
    recordCreate: "Create challenge",
    recordNewValue: "New result",
    recordsEmpty: "No records yet — train or create a challenge.",
    celebrateTitle: "New record!",
    celebrateSub: "You beat your best. Well done!",
    celebrateReward: "Your reward",
    celebrateClose: "Awesome!",
    exerciseMaxReps: "Most reps",
    exerciseChart: "Progress",
    cardioLongest: "Longest",
    motivationTitle: "Not this time — keep going!",
    motivationClose: "I'll be back stronger",
    motivations: ["No new record today, but you showed up. That counts more than perfect.","Plateaus are normal. Sleep, food and patience are what break them.","Every best result had weaker days before it. Try again tomorrow!","Small tweak: one more rep, a bit less rest, or a better night's sleep — progress has many forms."],
    recordRewardNow: "Reward for this record (optional)",
    recordBest: "Your best",
    recipesMine: "Mine",
    recipeCreateOwn: "Create own recipe",
    recipeCreateAi: "Create with AI",
    recipeAiPrompt: "What do you feel like? e.g. high-protein dinner, 600 kcal, no dairy",
    recipeAiGo: "Generate recipe",
    recipeAiBusy: "Cooking up a recipe …",
    recipeFormName: "Recipe name",
    recipeIngredientsHint: "Ingredients — one per line",
    recipeSave: "Save recipe",
    recipeDelete: "Delete recipe",
    recipeCancel: "Cancel",
    myMealsButton: "My meals & snacks",
    myMealsTitle: "My meals",
    myMealsHint: "Save what you eat often — then add it with one tap.",
    myMealName: "Name (e.g. my oat bowl)",
    myMealSave: "Save",
    myMealsEmpty: "Nothing saved yet.",
    saveMine: "Save to my meals",
    cheatTitle: "Cheat meal / cheat day",
    cheatNextNone: "Plan your next cheat meal or cheat day",
    cheatMeal: "Cheat meal",
    cheatDay: "Cheat day",
    cheatDate: "Date",
    cheatNote: "Note (e.g. pizza night)",
    cheatAdd: "Plan it",
    cheatToday: "Today",
    cheatTomorrow: "Tomorrow",
    cheatIn: "in",
    cheatDays: "days",
    cheatPast: "Past",
    cheatTip: "Enjoy it guilt-free — one cheat doesn't undo your progress.",
    cheatNext: "Next",
    myMealsPick: "Add to:",
    backupTitle: "Back up my data",
    backupExport: "Save as file",
    backupCopy: "Copy to clipboard",
    backupCopied: "Copied!",
    backupImport: "Restore from file",
    backupImported: "Data restored",
    backupBad: "This file is not a valid ASFIT backup.",
    setDisplay: "Display",
    setAppearance: "Brightness",
    setLight: "Light",
    setDark: "Dark",
    setSystem: "System",
    setColorTheme: "Colour scheme",
    setThemeAuto: "Automatic",
    setThemeNeutral: "Green",
    setThemeFemale: "Rose",
    setThemeMale: "Blue",
    setTextSize: "Text size",
    setSmall: "Small",
    setNormal: "Normal",
    setLarge: "Large",
    setDangerTitle: "Delete all data",
    setDangerText: "This removes every entry from this device. It cannot be undone — save a backup first.",
    setDangerConfirm: "Really delete ALL data on this device?",
    setVersion: "ASFIT version 1.0",
    connTitle: "Connections",
    connSettings: "Connections & health apps",
    connIntro: "Connect ASFIT to your phone's health store. Data from your watch and other apps flows in automatically.",
    connStatusOn: "Connected",
    connStatusOff: "Not connected",
    connConnect: "Connect",
    connSync: "Sync now",
    connLast: "Last sync",
    connNever: "never",
    connData: "What ASFIT reads",
    connSteps: "Steps",
    connWeight: "Body weight",
    connWorkouts: "Workouts (last 14 days)",
    connWebOnly: "Connecting only works in the installed app on your phone — not in the browser.",
    connOthersTitle: "Garmin, Fitbit, Samsung Health, Google Fit, Strava, Withings, Oura …",
    connOthersAndroid: "Turn on syncing with Health Connect inside these apps. ASFIT then reads their data from Health Connect — no extra login needed.",
    connOthersIos: "Turn on syncing with Apple Health inside these apps. ASFIT then reads their data from Apple Health — no extra login needed.",
    connOthersWeb: "Turn on syncing with Health Connect (Android) or Apple Health (iPhone) inside these apps. ASFIT then reads their data from there.",
    connIosNote: "iPhone: Apple Health is supported in the code, but the iPhone app itself still has to be built and published (needs a Mac).",
    connUnavailable: "Health Connect is not available on this device. Install or update it from the Play Store.",
    connImported: "from health app",
    connDenied: "Not allowed yet",
    libNoResults: "No exercises match. Try a different word or muscle group.",
    progressPhotosEmpty: "Add your first progress photo to see your transformation over time.",
    progressPhotosHint: "Add another photo later to compare before and after.",
    progressBefore: "Before",
    progressAfter: "After",
    progressDeletePhoto: "Delete this photo",
    progressDeleteConfirm: "Delete this progress photo? This can't be undone.",
    progressTapToCompare: "Tap a photo to compare it as \"after\"",
    progressAddFirst: "Add your first photo",
    progressAddAnother: "Add another photo",
    progressPhotoError: "This photo couldn't be loaded. Try a different one.",
    progressTapAgainDelete: "Tap again to delete",
    recipesTitle: "Recipes",
    recipesButton: "Browse recipes",
    ingredients: "Ingredients",
    perServing: "per serving",
    logRecipe: "Log this",
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
    barcodeWebPermissionDenied: "Camera access denied. Please allow camera access for this site in your browser settings.",
    barcodeWebUnsupported: "Your browser can't scan barcodes. Try updating it, or use the search instead.",
    cancelScan: "Cancel",
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
    greetingPrefix: "Guten Morgen",
    greetingDay: "Hallo",
    greetingEvening: "Guten Abend",
    kcalLeft: "übrig heute",
    lastWorkout: "Letztes Workout",
    currentWeight: "Aktuelles Gewicht",
    noWorkoutsYet: "Noch keine Workouts",
    noNoteToday: "Noch keine Notiz",
    firstWeightEntry: "Erster Eintrag",
    weeksLabel: "Wochen",
    notLoggedYet: "Noch nicht trainiert",
    avgSession: "Ø Sitzung",
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
    obWelcomeTitle: "Willkommen bei ASFIT",
    obWelcomeSub: "Dein Training. Deine Zahlen. Dein Fortschritt.",
    obStart: "Los geht's",
    obGenderTitle: "Was ist dein Geschlecht?",
    obGenderSub: "Wir benötigen dein Geschlecht, um dein tägliches Kalorienziel genau zu berechnen.",
    obGenderFemale: "Weiblich",
    obGenderMale: "Männlich",
    obGoalTitle: "Was ist dein Ziel?",
    obGoalSub: "Das legt dein Start-Kalorienziel fest — du kannst es jederzeit ändern.",
    obGoalCut: "Abnehmen",
    obGoalCutSub: "Kaloriendefizit, Kraft erhalten",
    obGoalMaintain: "Gewicht halten",
    obGoalMaintainSub: "Gewicht stabil, Gewohnheiten aufbauen",
    obGoalGain: "Zunehmen",
    obGoalGainSub: "Kalorienüberschuss, langsam aufbauen",
    obGoalBulk: "Muskeln aufbauen",
    obGoalBulkSub: "Kalorienüberschuss, Fokus auf Volumen",
    obGoalOther: "Etwas anderes",
    obGoalOtherSub: "Noch nicht sicher — finden wir gemeinsam heraus",
    obReasonTitle: "Warum möchtest du dieses Ziel erreichen?",
    obReasonConfidence: "Für mein Selbstbewusstsein",
    obReasonHealth: "Für meine Gesundheit",
    obReasonFitness: "Für meine Fitness",
    obReasonEvent: "Für einen speziellen Anlass",
    obReasonBurn: "Um mehr Kalorien zu verbrennen",
    obReasonOther: "Aus einem anderen Grund",
    obSkip: "Überspringen",
    obMoreTitle: "Was möchtest du darüber hinaus erreichen?",
    obMoreEating: "Mein Essverhalten verbessern",
    obMoreCook: "Lernen, gesund zu kochen",
    obMoreImmune: "Mein Immunsystem stärken",
    obMoreSleep: "Besser schlafen und mehr Energie haben",
    obMoreFeel: "Mich in meinem Körper wohlfühlen",
    obMoreOther: "Etwas anderes",
    obExperienceTitle: "Hast du das schon einmal versucht?",
    obExperienceNotReached: "Ja, aber ich habe mein Ziel noch nicht erreicht.",
    obExperienceFailed: "Ich habe es versucht, aber leider ohne Erfolg.",
    obExperienceCouldntKeep: "Ja, aber ich konnte das Ergebnis nicht halten.",
    obExperienceNever: "Ich habe es noch nie versucht.",
    obStatsTitle: "Ein paar Zahlen",
    obStatsSub: "Damit berechnen wir deine Tagesziele.",
    obNameLabel: "Dein Name",
    obNamePlaceholder: "z. B. Alex",
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
    obFinish: "ASFIT öffnen",
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
    freeWorkout: "Freies Workout",
    freeWorkoutSub: "Wähle deine Übungen und trage dein Gewicht selbst ein.",
    yourExercises: "Deine Übungen",
    noExercisesYet: "Noch keine Übungen — starte ein Workout.",
    bestLabel: "Bestwert",
    addSet: "Satz hinzufügen",
    emptyWorkout: "Füge deine erste Übung hinzu.",
    discardWorkout: "Workout verwerfen",
    discardWorkoutConfirm: "Nochmal tippen zum Verwerfen — wird nicht gespeichert",
    workoutRunning: "Workout läuft",
    workoutRunningSince: "Gestartet um",
    resumeWorkout: "Fortsetzen",
    addExerciseBtn: "Übung hinzufügen",
    saveWeight: "Speichern",
    weightInputPlaceholder: "Gewicht in kg",
    needMoreWeights: "Trage regelmäßig dein Gewicht ein, um den Verlauf zu sehen.",
    exerciseProgress: "Übungs-Fortschritt",
    exerciseProgressHint: "Trage diese Übung in mindestens zwei Workouts ein.",
    noProgressYet: "Beende ein Workout, dann siehst du hier deinen Fortschritt.",
    muscleGlutes: "Gesäß",
    muscleCardio: "Cardio",
    muscleFull: "Ganzkörper",
    waterTitle: "Wasser",
    waterGoalLabel: "Ziel",
    waterAddGlass: "+ 250 ml",
    waterUndo: "Zurück",
    assistantTitle: "ASFIT-Assistent",
    assistantEntry: "Assistent fragen",
    assistantHello: "Hallo! Ich bin dein ASFIT-Assistent. Frag mich zu Training, Ernährung oder zur Bedienung der App.",
    assistantPlaceholder: "Deine Frage …",
    assistantThinking: "Denke nach …",
    assistantError: "Da ist etwas schiefgelaufen. Bitte versuch es nochmal.",
    assistantNotConfigured: "Der Assistent ist noch nicht eingerichtet (API-Schlüssel auf dem Server fehlt).",
    obBirthTitle: "Wann ist dein Geburtstag?",
    obBirthSub: "Wir benötigen dein Alter, um dein tägliches Kalorienziel genau zu berechnen.",
    obDay: "Tag",
    obMonth: "Monat",
    obYear: "Jahr",
    months: ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
    obTargetDateTitle: "Bis wann möchtest du dein Ziel erreichen?",
    obTargetDateSub: "Mit dem Datum berechnen wir ein realistisches tägliches Kalorienziel.",
    obPerWeek: "pro Woche",
    obAmbitious: "Das ist sehr ehrgeizig — mit mehr Zeit hältst du es leichter durch.",
    obAiScanTitle: "Überall genau tracken mit unserer KI",
    obAiScanSub: "Mach schnell ein Foto, um Gerichte im Restaurant oder vom Lieferdienst zu erfassen — egal, ob du kochst oder unterwegs bist.",
    obAiScan2Title: "Gute Wahl! Du bist auf der Überholspur.",
    obAiScan2Sub: "Mit KI bekommst du sofort Nährwertinfos — so bleibst du leichter auf Kurs und siehst Ergebnisse.",
    obExample: "Beispiel",
    stepsTitle: "Schritte",
    stepsBurned: "verbrannt",
    stepsConnect: "Mit Health Connect verbinden",
    stepsUnavailable: "Health Connect ist auf diesem Gerät nicht verfügbar — trage deine Schritte manuell ein.",
    stepsManualPlaceholder: "Schritte heute",
    stepsSave: "Speichern",
    stepsGoalEdit: "Schritteziel festlegen",
    eatenLabel: "Gegessen",
    burnedLabel: "Verbrannt",
    goalLabel: "Ziel",
    photoScanBtn: "Essen per KI-Foto scannen",
    photoTitle: "KI-Foto-Scan",
    photoHint: "Mach ein Foto von deiner Mahlzeit — die KI schätzt Kalorien und Makros.",
    photoTake: "Foto aufnehmen",
    photoAnalyzing: "Mahlzeit wird analysiert …",
    photoNoFood: "Kein Essen erkannt — versuch ein anderes Foto.",
    photoEstimate: "KI-Schätzung — kann abweichen, bitte vor dem Loggen prüfen.",
    photoAgain: "Nochmal",
    photoNotConfigured: "Der KI-Foto-Scan ist noch nicht eingerichtet (API-Schlüssel auf dem Server fehlt).",
    minutesLabel: "Minuten",
    cardioHint: "Cardio: Dauer eintragen",
    kcalBurnedLabel: "kcal verbrannt",
    settingsTitle: "Einstellungen",
    photoGallery: "Aus Galerie wählen",
    recipeAskTitle: "Unsicher bei Mengen? Frag die KI",
    recipeAskHello: "Frag mich alles zu diesem Rezept — wie viel Milch, Alternativen, Portionsgrößen …",
    exerciseBest: "Bestwert",
    exerciseHistory: "Deine Einträge",
    exerciseLogTitle: "Eintrag speichern",
    exerciseSaved: "Gespeichert",
    noHistory: "Noch keine Einträge",
    settingsPrivacy: "Datenschutz",
    settingsSupport: "KI-Support fragen",
    privacyTitle: "Datenschutz",
    privacySections: [{"h":"Deine Eingaben","p":"Profil, Mahlzeiten, Workouts, Gewicht und Notizen werden derzeit nur auf deinem Gerät gehalten."},{"h":"Lebensmittelsuche und Barcode","p":"Suchbegriffe und Barcodes werden über unseren Server an USDA FoodData Central und Open Food Facts weitergeleitet."},{"h":"KI-Foto-Scan und Assistent","p":"Beim Foto-Scan wird das Bild verkleinert an unseren Server und von dort zur Analyse an einen KI-Dienst gesendet; unser Server speichert es nicht. Fragen an den Assistenten laufen genauso."},{"h":"Gesundheitsdaten (Schritte)","p":"Auf Wunsch liest ASFIT deine Tagesschritte aus Health Connect, um verbrannte Kalorien zu schätzen. Die Werte bleiben auf deinem Gerät. Du kannst den Zugriff jederzeit in Health Connect widerrufen."}],
    recordsTitle: "Rekorde",
    recordsCardSub: "Deine höchsten Leistungen — nimm die Herausforderung an",
    recordsAuto: "Deine Bestleistungen",
    recordsCustom: "Meine Herausforderungen",
    recordsAdd: "Neue Herausforderung",
    recordName: "Name (z. B. Marathon, 100 m Schwimmen)",
    recordValue: "Ergebnis",
    recordUnit: "Einheit (kg, km, min …)",
    recordLower: "Weniger ist besser (Zeit)",
    recordHigher: "Mehr ist besser",
    recordReward: "Meine Belohnung (optional)",
    recordCreate: "Herausforderung anlegen",
    recordNewValue: "Neues Ergebnis",
    recordsEmpty: "Noch keine Rekorde — trainiere oder lege eine Herausforderung an.",
    celebrateTitle: "Neuer Rekord!",
    celebrateSub: "Du hast deine Bestleistung geknackt. Stark!",
    celebrateReward: "Deine Belohnung",
    celebrateClose: "Mega!",
    exerciseMaxReps: "Meiste Wdh.",
    exerciseChart: "Fortschritt",
    cardioLongest: "Längste",
    motivationTitle: "Diesmal nicht — bleib dran!",
    motivationClose: "Ich komme stärker zurück",
    motivations: ["Heute kein neuer Rekord, aber du warst da. Das zählt mehr als perfekt.","Plateaus gehören dazu. Schlaf, Essen und Geduld holen dich raus.","Jede Bestleistung hatte vorher schwächere Tage. Morgen neuer Versuch!","Kleiner Tipp: eine Wiederholung mehr, etwas kürzere Pause oder eine bessere Nacht — Fortschritt hat viele Formen."],
    recordRewardNow: "Belohnung für diesen Rekord (optional)",
    recordBest: "Dein Bestwert",
    recipesMine: "Meine",
    recipeCreateOwn: "Eigenes Rezept erstellen",
    recipeCreateAi: "Mit KI erstellen",
    recipeAiPrompt: "Worauf hast du Lust? z. B. proteinreiches Abendessen, 600 kcal, ohne Milch",
    recipeAiGo: "Rezept erstellen",
    recipeAiBusy: "Rezept wird erstellt …",
    recipeFormName: "Rezeptname",
    recipeIngredientsHint: "Zutaten — eine pro Zeile",
    recipeSave: "Rezept speichern",
    recipeDelete: "Rezept löschen",
    recipeCancel: "Abbrechen",
    myMealsButton: "Meine Gerichte & Snacks",
    myMealsTitle: "Meine Gerichte",
    myMealsHint: "Speichere, was du oft isst — dann fügst du es mit einem Tipp hinzu.",
    myMealName: "Name (z. B. mein Haferbowl)",
    myMealSave: "Speichern",
    myMealsEmpty: "Noch nichts gespeichert.",
    saveMine: "In Meine Gerichte speichern",
    cheatTitle: "Cheat Meal / Cheat Day",
    cheatNextNone: "Plane dein nächstes Cheat Meal oder deinen Cheat Day",
    cheatMeal: "Cheat Meal",
    cheatDay: "Cheat Day",
    cheatDate: "Datum",
    cheatNote: "Notiz (z. B. Pizza-Abend)",
    cheatAdd: "Eintragen",
    cheatToday: "Heute",
    cheatTomorrow: "Morgen",
    cheatIn: "in",
    cheatDays: "Tagen",
    cheatPast: "Vorbei",
    cheatTip: "Genieß es ohne schlechtes Gewissen — ein Cheat macht deinen Fortschritt nicht kaputt.",
    cheatNext: "Nächster",
    myMealsPick: "Hinzufügen zu:",
    backupTitle: "Meine Daten sichern",
    backupExport: "Als Datei speichern",
    backupCopy: "In Zwischenablage kopieren",
    backupCopied: "Kopiert!",
    backupImport: "Aus Datei wiederherstellen",
    backupImported: "Daten wiederhergestellt",
    backupBad: "Diese Datei ist keine gültige ASFIT-Sicherung.",
    setDisplay: "Darstellung",
    setAppearance: "Helligkeit",
    setLight: "Hell",
    setDark: "Dunkel",
    setSystem: "System",
    setColorTheme: "Farbschema",
    setThemeAuto: "Automatisch",
    setThemeNeutral: "Grün",
    setThemeFemale: "Rosé",
    setThemeMale: "Blau",
    setTextSize: "Schriftgröße",
    setSmall: "Klein",
    setNormal: "Normal",
    setLarge: "Groß",
    setDangerTitle: "Alle Daten löschen",
    setDangerText: "Entfernt alle Einträge von diesem Gerät. Das kann nicht rückgängig gemacht werden — sichere vorher ein Backup.",
    setDangerConfirm: "Wirklich ALLE Daten auf diesem Gerät löschen?",
    setVersion: "ASFIT Version 1.0",
    connTitle: "Verbindungen",
    connSettings: "Verbindungen & Gesundheits-Apps",
    connIntro: "Verbinde ASFIT mit dem Gesundheitsspeicher deines Handys. Daten von deiner Uhr und anderen Apps kommen dann automatisch rein.",
    connStatusOn: "Verbunden",
    connStatusOff: "Nicht verbunden",
    connConnect: "Verbinden",
    connSync: "Jetzt synchronisieren",
    connLast: "Zuletzt synchronisiert",
    connNever: "noch nie",
    connData: "Was ASFIT liest",
    connSteps: "Schritte",
    connWeight: "Körpergewicht",
    connWorkouts: "Workouts (letzte 14 Tage)",
    connWebOnly: "Verbinden funktioniert nur in der installierten App auf dem Handy — nicht im Browser.",
    connOthersTitle: "Garmin, Fitbit, Samsung Health, Google Fit, Strava, Withings, Oura …",
    connOthersAndroid: "Schalte in diesen Apps die Synchronisierung mit Health Connect ein. ASFIT liest ihre Daten dann aus Health Connect — ohne extra Login.",
    connOthersIos: "Schalte in diesen Apps die Synchronisierung mit Apple Health ein. ASFIT liest ihre Daten dann aus Apple Health — ohne extra Login.",
    connOthersWeb: "Schalte in diesen Apps die Synchronisierung mit Health Connect (Android) oder Apple Health (iPhone) ein. ASFIT liest die Daten dann von dort.",
    connIosNote: "iPhone: Apple Health ist im Code vorbereitet, aber die iPhone-App selbst muss noch gebaut und veröffentlicht werden (dafür braucht man einen Mac).",
    connUnavailable: "Health Connect ist auf diesem Gerät nicht verfügbar. Installiere oder aktualisiere es im Play Store.",
    connImported: "aus Gesundheits-App",
    connDenied: "Noch nicht erlaubt",
    libNoResults: "Keine Übungen gefunden. Probiere ein anderes Wort oder eine andere Muskelgruppe.",
    progressPhotosEmpty: "Füge dein erstes Fortschrittsfoto hinzu, um deine Veränderung über die Zeit zu sehen.",
    progressPhotosHint: "Füge später ein weiteres Foto hinzu, um Vorher und Nachher zu vergleichen.",
    progressBefore: "Vorher",
    progressAfter: "Nachher",
    progressDeletePhoto: "Dieses Foto löschen",
    progressDeleteConfirm: "Dieses Fortschrittsfoto löschen? Das kann nicht rückgängig gemacht werden.",
    progressTapToCompare: "Tippe ein Foto an, um es als „Nachher“ zu vergleichen",
    progressAddFirst: "Erstes Foto hinzufügen",
    progressAddAnother: "Weiteres Foto hinzufügen",
    progressPhotoError: "Dieses Foto konnte nicht geladen werden. Probiere ein anderes.",
    progressTapAgainDelete: "Nochmal tippen zum Löschen",
    recipesTitle: "Rezepte",
    recipesButton: "Rezepte durchstöbern",
    ingredients: "Zutaten",
    perServing: "pro Portion",
    logRecipe: "Loggen",
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
    barcodeWebPermissionDenied: "Kein Kamerazugriff. Erlaube der Seite den Kamerazugriff in deinen Browser-Einstellungen.",
    barcodeWebUnsupported: "Dein Browser kann keine Barcodes scannen. Aktualisiere ihn oder nutze stattdessen die Suche.",
    cancelScan: "Abbrechen",
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

/* Extended exercise catalogue (own wording). Grouped by muscle group; the
   library screen filters on `muscle`. */
const EX = (key, name, nameDe, muscle, cue, cueDe) => ({ key, name, nameDe, muscle, cue, cueDe });
EXERCISE_LIBRARY.push(
  // Chest
  EX("decline_bench", "Decline Bench Press", "Negativbankdrücken", "chest", "Lower to the lower chest, control the bar", "Zur unteren Brust senken, Stange kontrollieren"),
  EX("incline_bench", "Incline Barbell Press", "Schrägbankdrücken (LH)", "chest", "Bar to the upper chest, elbows at 45°", "Stange zur oberen Brust, Ellbogen bei 45°"),
  EX("dumbbell_bench", "Dumbbell Bench Press", "Kurzhantel-Bankdrücken", "chest", "Deep stretch, press up and slightly in", "Tief dehnen, nach oben und leicht zusammen drücken"),
  EX("machine_chest_press", "Machine Chest Press", "Brustpresse (Maschine)", "chest", "Shoulder blades pinned to the pad", "Schulterblätter am Polster fixieren"),
  EX("pec_deck", "Pec Deck", "Butterfly (Maschine)", "chest", "Squeeze the chest at the front", "Vorne die Brust zusammenziehen"),
  EX("db_fly", "Dumbbell Fly", "Kurzhantel-Fliegende", "chest", "Slight elbow bend, wide arc", "Ellbogen leicht gebeugt, weiter Bogen"),
  EX("low_cable_fly", "Low-to-High Cable Fly", "Kabelzug von unten nach oben", "chest", "Sweep up to the chin, squeeze", "Bis zum Kinn hochführen, zusammendrücken"),
  EX("high_cable_fly", "High-to-Low Cable Fly", "Kabelzug von oben nach unten", "chest", "Pull down to the hips", "Zu den Hüften nach unten ziehen"),
  EX("svend_press", "Svend Press", "Svend Press", "chest", "Squeeze plates together while pressing", "Scheiben beim Drücken zusammenpressen"),
  EX("floor_press", "Floor Press", "Floor Press", "chest", "Elbows touch the floor, pause", "Ellbogen berühren den Boden, kurz halten"),
  EX("diamond_pushup", "Diamond Push-Up", "Diamant-Liegestütz", "chest", "Hands close, elbows tight", "Hände eng, Ellbogen nah am Körper"),
  EX("incline_pushup", "Incline Push-Up", "Erhöhter Liegestütz", "chest", "Hands on a bench, body straight", "Hände auf einer Bank, Körper gerade"),
  EX("decline_pushup", "Decline Push-Up", "Fußerhöhter Liegestütz", "chest", "Feet up, keep the core tight", "Füße erhöht, Rumpf anspannen"),
  EX("machine_dip", "Assisted Dip Machine", "Dip-Maschine (assistiert)", "chest", "Lean forward slightly", "Leicht nach vorne lehnen"),
  // Back
  EX("pendlay_row", "Pendlay Row", "Pendlay-Rudern", "back", "Bar from the floor each rep, flat back", "Stange jede Wiederholung vom Boden, gerader Rücken"),
  EX("db_row", "One-Arm Dumbbell Row", "Einarmiges Kurzhantelrudern", "back", "Pull the elbow toward the hip", "Ellbogen zur Hüfte ziehen"),
  EX("chest_supported_row", "Chest-Supported Row", "Brustgestütztes Rudern", "back", "No swinging, squeeze the shoulder blades", "Kein Schwung, Schulterblätter zusammenziehen"),
  EX("wide_cable_row", "Wide-Grip Cable Row", "Rudern breit am Kabel", "back", "Pull to the upper abs", "Zum oberen Bauch ziehen"),
  EX("machine_row", "Machine Row", "Rudermaschine", "back", "Chest on the pad, pull elbows back", "Brust am Polster, Ellbogen nach hinten"),
  EX("inverted_row", "Inverted Row", "Rudern liegend am Barren", "back", "Body straight, chest to the bar", "Körper gerade, Brust zur Stange"),
  EX("chinup", "Chin-Up", "Klimmzug im Untergriff", "back", "Chin over the bar, no kipping", "Kinn über die Stange, kein Schwung"),
  EX("wide_pullup", "Wide-Grip Pull-Up", "Breiter Klimmzug", "back", "Pull elbows down toward the ribs", "Ellbogen zu den Rippen ziehen"),
  EX("neutral_pulldown", "Neutral-Grip Pulldown", "Latzug mit neutralem Griff", "back", "Lean back slightly, pull to the chest", "Leicht zurücklehnen, zur Brust ziehen"),
  EX("close_pulldown", "Close-Grip Pulldown", "Enger Latzug", "back", "Elbows close to the body", "Ellbogen nah am Körper"),
  EX("straight_arm_pulldown", "Straight-Arm Pulldown", "Gestreckter Armzug am Kabel", "back", "Arms straight, drive with the lats", "Arme gestreckt, mit dem Latissimus ziehen"),
  EX("rack_pull", "Rack Pull", "Rack Pull", "back", "Lift from knee height, lock out hips", "Ab Kniehöhe ziehen, Hüfte strecken"),
  EX("sumo_deadlift", "Sumo Deadlift", "Sumo-Kreuzheben", "back", "Wide stance, knees out", "Breiter Stand, Knie nach außen"),
  EX("trapbar_deadlift", "Trap Bar Deadlift", "Kreuzheben mit Trap-Bar", "back", "Neutral grip, push the floor away", "Neutraler Griff, den Boden wegdrücken"),
  EX("good_morning", "Good Morning", "Good Morning", "back", "Hinge at the hips, soft knees", "Aus der Hüfte beugen, Knie leicht gebeugt"),
  EX("back_extension", "Back Extension", "Rückenstrecker", "back", "Rise to a straight line, don't overarch", "Bis zur Geraden aufrichten, nicht überstrecken"),
  EX("barbell_shrug", "Barbell Shrug", "Schulterzucken (LH)", "back", "Shrug straight up, hold briefly", "Gerade nach oben ziehen, kurz halten"),
  EX("db_shrug", "Dumbbell Shrug", "Schulterzucken (KH)", "back", "No rolling, straight up and down", "Nicht kreisen, gerade hoch und runter"),
  EX("meadows_row", "Meadows Row", "Meadows Row", "back", "Landmine setup, pull to the hip", "Landmine-Aufbau, zur Hüfte ziehen"),
  EX("db_pullover", "Dumbbell Pullover", "Kurzhantel-Pullover", "back", "Stretch overhead, ribs down", "Über Kopf dehnen, Rippen unten"),
  EX("hyperextension", "45° Hyperextension", "45°-Hyperextension", "back", "Hinge at the hips, squeeze the glutes", "Aus der Hüfte, Gesäß anspannen"),
  // Shoulders
  EX("db_shoulder_press", "Dumbbell Shoulder Press", "Schulterdrücken (KH)", "shoulders", "Press straight up, don't flare ribs", "Gerade nach oben, Rippen unten lassen"),
  EX("arnold_press", "Arnold Press", "Arnold Press", "shoulders", "Rotate palms as you press", "Handflächen beim Drücken drehen"),
  EX("machine_shoulder_press", "Machine Shoulder Press", "Schulterpresse (Maschine)", "shoulders", "Back against the pad", "Rücken am Polster"),
  EX("push_press", "Push Press", "Push Press", "shoulders", "Dip with the legs, drive the bar up", "Mit den Beinen eintauchen, Stange hochdrücken"),
  EX("cable_lateral", "Cable Lateral Raise", "Seitheben am Kabel", "shoulders", "Constant tension, lead with the elbow", "Dauerhafte Spannung, mit dem Ellbogen führen"),
  EX("front_raise", "Front Raise", "Frontheben", "shoulders", "Raise to eye level, no swinging", "Bis Augenhöhe, ohne Schwung"),
  EX("upright_row", "Upright Row", "Aufrechtes Rudern", "shoulders", "Elbows high, bar close to the body", "Ellbogen hoch, Stange nah am Körper"),
  EX("rear_delt_cable", "Rear Delt Cable Fly", "Reverse Fly am Kabel", "shoulders", "Arms wide, squeeze the rear delts", "Arme weit, hintere Schulter anspannen"),
  EX("reverse_pecdeck", "Reverse Pec Deck", "Reverse Butterfly (Maschine)", "shoulders", "Chest on the pad, pull wide", "Brust am Polster, weit nach hinten ziehen"),
  EX("pike_pushup", "Pike Push-Up", "Pike-Liegestütz", "shoulders", "Hips high, head between the arms", "Hüfte hoch, Kopf zwischen den Armen"),
  EX("handstand_pushup", "Handstand Push-Up", "Handstand-Liegestütz", "shoulders", "Tight core, full range if possible", "Rumpf fest, möglichst voller Weg"),
  EX("landmine_press", "Landmine Press", "Landmine Press", "shoulders", "Press up and forward, stay tall", "Nach oben und vorne drücken, aufrecht bleiben"),
  EX("y_raise", "Y Raise", "Y-Heben", "shoulders", "Thumbs up, lift into a Y shape", "Daumen hoch, in Y-Form anheben"),
  EX("band_pullapart", "Band Pull-Apart", "Band Pull-Apart", "shoulders", "Pull the band to the chest, arms straight", "Band zur Brust ziehen, Arme gestreckt"),
  EX("db_external_rotation", "External Rotation", "Außenrotation", "shoulders", "Elbow at the side, slow and light", "Ellbogen an der Seite, langsam und leicht"),
  // Arms
  EX("ez_curl", "EZ-Bar Curl", "SZ-Curl", "arms", "Elbows pinned, full squeeze", "Ellbogen fixiert, oben anspannen"),
  EX("incline_curl", "Incline Dumbbell Curl", "Schrägbank-Curl", "arms", "Deep stretch at the bottom", "Unten tief dehnen"),
  EX("concentration_curl", "Concentration Curl", "Konzentrationscurl", "arms", "Elbow against the inner thigh", "Ellbogen am Oberschenkel"),
  EX("cable_curl", "Cable Curl", "Kabelcurl", "arms", "Constant tension, slow negative", "Dauerspannung, langsam ablassen"),
  EX("spider_curl", "Spider Curl", "Spider Curl", "arms", "Chest on an incline bench, arms hanging", "Brust auf Schrägbank, Arme hängen"),
  EX("reverse_curl", "Reverse Curl", "Reverse Curl", "arms", "Overhand grip for forearms", "Obergriff für die Unterarme"),
  EX("zottman_curl", "Zottman Curl", "Zottman-Curl", "arms", "Curl up, rotate, lower slowly", "Hoch curlen, drehen, langsam ablassen"),
  EX("wrist_curl", "Wrist Curl", "Handgelenkcurl", "arms", "Forearms on knees, small controlled range", "Unterarme auf den Knien, kleine kontrollierte Bewegung"),
  EX("overhead_ext", "Overhead Triceps Extension", "Trizepsstrecken über Kopf", "arms", "Elbows close, stretch behind the head", "Ellbogen eng, hinter dem Kopf dehnen"),
  EX("rope_pushdown", "Rope Pushdown", "Trizepsdrücken mit Seil", "arms", "Spread the rope at the bottom", "Seil unten auseinanderziehen"),
  EX("tricep_kickback", "Triceps Kickback", "Trizeps-Kickback", "arms", "Upper arm parallel to the floor", "Oberarm parallel zum Boden"),
  EX("bench_dip", "Bench Dip", "Dips an der Bank", "arms", "Elbows back, shoulders down", "Ellbogen nach hinten, Schultern unten"),
  EX("close_grip_bench", "Close-Grip Bench Press", "Enges Bankdrücken", "arms", "Hands shoulder-width, elbows tucked", "Hände schulterbreit, Ellbogen eng"),
  EX("jm_press", "JM Press", "JM Press", "arms", "Between a press and a skull crusher", "Zwischen Bankdrücken und French Press"),
  EX("farmers_walk", "Farmer's Walk", "Farmer's Walk", "arms", "Heavy weights, tall posture, walk", "Schwere Gewichte, aufrecht gehen"),
  // Legs
  EX("front_squat", "Front Squat", "Frontkniebeuge", "legs", "Elbows high, upright torso", "Ellbogen hoch, aufrechter Oberkörper"),
  EX("goblet_squat", "Goblet Squat", "Goblet-Kniebeuge", "legs", "Weight at the chest, sit between the knees", "Gewicht an der Brust, zwischen die Knie setzen"),
  EX("bulgarian_split", "Bulgarian Split Squat", "Bulgarische Kniebeuge", "legs", "Rear foot on a bench, drop straight down", "Hinterer Fuß auf der Bank, gerade absenken"),
  EX("hack_squat", "Hack Squat", "Hackenschmidt-Kniebeuge", "legs", "Feet forward, deep and controlled", "Füße vorne, tief und kontrolliert"),
  EX("smith_squat", "Smith Machine Squat", "Kniebeuge an der Multipresse", "legs", "Feet slightly forward, brace the core", "Füße leicht vor, Rumpf anspannen"),
  EX("reverse_lunge", "Reverse Lunge", "Ausfallschritt rückwärts", "legs", "Step back, front heel stays down", "Schritt zurück, vordere Ferse am Boden"),
  EX("step_up", "Step-Up", "Step-Up", "legs", "Drive through the front heel", "Über die vordere Ferse hochdrücken"),
  EX("db_rdl", "Dumbbell Romanian Deadlift", "Rumänisches Kreuzheben (KH)", "legs", "Dumbbells slide along the legs", "Hanteln entlang der Beine führen"),
  EX("stiff_leg_dl", "Stiff-Leg Deadlift", "Gestrecktes Kreuzheben", "legs", "Nearly straight legs, feel the hamstrings", "Fast gestreckte Beine, Beinbeuger spüren"),
  EX("seated_legcurl", "Seated Leg Curl", "Sitzender Beinbeuger", "legs", "Pull the heels down and back", "Fersen nach unten und hinten ziehen"),
  EX("lying_legcurl", "Lying Leg Curl", "Liegender Beinbeuger", "legs", "Hips down, slow negative", "Hüfte unten, langsam ablassen"),
  EX("nordic_curl", "Nordic Hamstring Curl", "Nordic Curl", "legs", "Lower as slowly as possible", "So langsam wie möglich absenken"),
  EX("seated_calf", "Seated Calf Raise", "Wadenheben sitzend", "legs", "Full stretch, pause at the top", "Voll dehnen, oben kurz halten"),
  EX("legpress_calf", "Calf Press on Leg Press", "Wadenheben an der Beinpresse", "legs", "Only the ankles move", "Nur die Sprunggelenke bewegen"),
  EX("adductor", "Adductor Machine", "Adduktoren-Maschine", "legs", "Controlled squeeze, no bouncing", "Kontrolliert zusammenpressen, nicht wippen"),
  EX("abductor", "Abductor Machine", "Abduktoren-Maschine", "legs", "Push out, slow return", "Nach außen drücken, langsam zurück"),
  EX("wall_sit", "Wall Sit", "Wandsitzen", "legs", "Thighs parallel, hold", "Oberschenkel parallel, halten"),
  EX("pistol_squat", "Pistol Squat", "Pistol Squat", "legs", "One leg, hold a counterweight if needed", "Ein Bein, bei Bedarf Gegengewicht halten"),
  EX("jump_squat", "Jump Squat", "Sprungkniebeuge", "legs", "Explode up, land softly", "Explosiv hoch, weich landen"),
  EX("box_jump", "Box Jump", "Kastensprung", "legs", "Land softly, step down", "Weich landen, herunterschreiten"),
  EX("sissy_squat", "Sissy Squat", "Sissy Squat", "legs", "Knees forward, lean back", "Knie nach vorne, Oberkörper zurück"),
  EX("side_lunge", "Side Lunge", "Seitlicher Ausfallschritt", "legs", "Sit back into one hip", "In eine Hüfte zurücksetzen"),
  // Glutes
  EX("hip_thrust", "Hip Thrust", "Hip Thrust", "glutes", "Chin tucked, squeeze at the top", "Kinn angezogen, oben Gesäß anspannen"),
  EX("glute_bridge", "Glute Bridge", "Glute Bridge", "glutes", "Heels close, drive the hips up", "Fersen nah, Hüfte hochdrücken"),
  EX("single_leg_thrust", "Single-Leg Hip Thrust", "Einbeiniger Hip Thrust", "glutes", "Keep the hips level", "Hüfte waagerecht halten"),
  EX("cable_kickback", "Cable Glute Kickback", "Kabel-Kickback (Gesäß)", "glutes", "Kick back, don't arch the lower back", "Nach hinten treten, nicht ins Hohlkreuz"),
  EX("donkey_kick", "Donkey Kick", "Donkey Kick", "glutes", "Knee at 90°, push the heel up", "Knie 90°, Ferse nach oben drücken"),
  EX("fire_hydrant", "Fire Hydrant", "Fire Hydrant", "glutes", "Lift the knee out to the side", "Knie seitlich anheben"),
  EX("clamshell", "Clamshell", "Clamshell", "glutes", "Feet together, open the top knee", "Füße zusammen, oberes Knie öffnen"),
  EX("frog_pump", "Frog Pump", "Frog Pump", "glutes", "Soles together, quick pumping reps", "Fußsohlen zusammen, schnelle Wiederholungen"),
  EX("curtsy_lunge", "Curtsy Lunge", "Curtsy Lunge", "glutes", "Step behind and across", "Schritt hinter und über Kreuz"),
  EX("kb_swing", "Kettlebell Swing", "Kettlebell Swing", "glutes", "Hip snap, arms are just hooks", "Hüftschwung, Arme führen nur mit"),
  EX("good_morning_glute", "Banded Walk", "Seitschritte mit Band", "glutes", "Stay low, keep tension on the band", "Tief bleiben, Band gespannt halten"),
  // Core
  EX("crunch", "Crunch", "Crunch", "core", "Curl the ribs to the pelvis", "Rippen zum Becken rollen"),
  EX("bicycle_crunch", "Bicycle Crunch", "Fahrrad-Crunch", "core", "Slow rotation, elbow to opposite knee", "Langsam drehen, Ellbogen zum Gegenknie"),
  EX("lying_leg_raise", "Lying Leg Raise", "Beinheben liegend", "core", "Lower back stays on the floor", "Unterer Rücken bleibt am Boden"),
  EX("side_plank", "Side Plank", "Seitstütz", "core", "Body in one line, hips up", "Körper in einer Linie, Hüfte oben"),
  EX("ab_wheel", "Ab Wheel Rollout", "Ab-Wheel", "core", "Roll out only as far as you can control", "Nur so weit rollen, wie du kontrollierst"),
  EX("mountain_climber", "Mountain Climber", "Bergsteiger", "core", "Hips low, fast knees", "Hüfte tief, schnelle Knie"),
  EX("dead_bug", "Dead Bug", "Dead Bug", "core", "Back flat, opposite arm and leg", "Rücken flach, Gegenarm und -bein"),
  EX("bird_dog", "Bird Dog", "Bird Dog", "core", "Extend long, no hip rotation", "Lang strecken, Hüfte nicht drehen"),
  EX("pallof_press", "Pallof Press", "Pallof Press", "core", "Resist the rotation", "Der Drehung widerstehen"),
  EX("woodchop", "Cable Woodchop", "Holzhacker am Kabel", "core", "Rotate from the torso, arms straight", "Aus dem Rumpf drehen, Arme gestreckt"),
  EX("v_up", "V-Up", "V-Sit-Up", "core", "Reach hands to toes at the top", "Oben Hände zu den Zehen"),
  EX("situp", "Sit-Up", "Sit-Up", "core", "Controlled up and down", "Kontrolliert hoch und runter"),
  EX("decline_situp", "Decline Sit-Up", "Sit-Up auf der Schrägbank", "core", "Cross arms, don't yank the neck", "Arme kreuzen, nicht am Nacken ziehen"),
  EX("hollow_hold", "Hollow Body Hold", "Hollow Hold", "core", "Low back pressed down, legs low", "Unteren Rücken andrücken, Beine tief"),
  EX("flutter_kicks", "Flutter Kicks", "Flatterkicks", "core", "Small fast kicks, core tight", "Kleine schnelle Kicks, Rumpf fest"),
  EX("toes_to_bar", "Toes to Bar", "Toes to Bar", "core", "Control the swing, lift with the abs", "Schwung kontrollieren, mit dem Bauch heben"),
  EX("l_sit", "L-Sit", "L-Sit", "core", "Push the shoulders down, legs straight", "Schultern runterdrücken, Beine gestreckt"),
  EX("suitcase_carry", "Suitcase Carry", "Suitcase Carry", "core", "One weight, don't lean", "Ein Gewicht, nicht zur Seite lehnen"),
  EX("cable_crunch_kneel", "Kneeling Cable Crunch", "Kniender Kabel-Crunch", "core", "Round the spine, hips still", "Wirbelsäule runden, Hüfte ruhig"),
  // Cardio
  EX("running", "Running", "Laufen", "cardio", "Relaxed shoulders, steady breathing", "Schultern locker, gleichmäßig atmen"),
  EX("treadmill", "Treadmill", "Laufband", "cardio", "Don't hold the rails, land under the hips", "Nicht festhalten, unter der Hüfte landen"),
  EX("cycling", "Cycling", "Radfahren", "cardio", "Smooth pedal stroke", "Runder Tritt"),
  EX("rowing_machine", "Rowing Machine", "Rudergerät", "cardio", "Legs, then back, then arms", "Erst Beine, dann Rücken, dann Arme"),
  EX("elliptical", "Elliptical", "Crosstrainer", "cardio", "Stand tall, push and pull", "Aufrecht stehen, drücken und ziehen"),
  EX("stair_climber", "Stair Climber", "Stepper", "cardio", "Full steps, light hands", "Volle Schritte, Hände locker"),
  EX("jump_rope", "Jump Rope", "Seilspringen", "cardio", "Small jumps, wrists do the work", "Kleine Sprünge, Handgelenke drehen"),
  EX("swimming", "Swimming", "Schwimmen", "cardio", "Long strokes, rhythmic breathing", "Lange Züge, rhythmisch atmen"),
  EX("walking", "Walking", "Gehen", "cardio", "Brisk pace, tall posture", "Zügiges Tempo, aufrechte Haltung"),
  EX("hiking", "Hiking", "Wandern", "cardio", "Steady pace, use the whole foot", "Gleichmäßiges Tempo, ganzen Fuß abrollen"),
  EX("hiit", "HIIT", "HIIT", "cardio", "Short all-out intervals with rest", "Kurze volle Intervalle mit Pause"),
  EX("burpees", "Burpees", "Burpees", "cardio", "Chest to floor, explosive jump", "Brust zum Boden, explosiver Sprung"),
  EX("jumping_jacks", "Jumping Jacks", "Hampelmann", "cardio", "Soft landings, steady rhythm", "Weich landen, gleichmäßiger Rhythmus"),
  EX("battle_ropes", "Battle Ropes", "Battle Ropes", "cardio", "Hips back, fast alternating waves", "Hüfte zurück, schnelle Wechselwellen"),
  EX("sled_push", "Sled Push", "Schlittenschieben", "cardio", "Low body, drive with the legs", "Tiefer Körper, mit den Beinen drücken"),
  EX("boxing", "Boxing / Shadowboxing", "Boxen / Schattenboxen", "cardio", "Rotate the hips, guard up", "Hüfte drehen, Deckung oben"),
  EX("assault_bike", "Assault Bike", "Assault Bike", "cardio", "Push and pull with arms and legs", "Mit Armen und Beinen drücken und ziehen"),
  // Full body
  EX("power_clean", "Power Clean", "Umsetzen (Power Clean)", "full", "Explosive hip extension, catch high", "Explosive Hüftstreckung, hoch fangen"),
  EX("snatch", "Barbell Snatch", "Reißen", "full", "Wide grip, pull under the bar", "Breiter Griff, unter die Stange ziehen"),
  EX("clean_jerk", "Clean & Jerk", "Stoßen", "full", "Clean to the shoulders, then jerk overhead", "Umsetzen zur Schulter, dann überkopf stoßen"),
  EX("thruster", "Thruster", "Thruster", "full", "Squat straight into a press", "Kniebeuge direkt in Überkopfdrücken"),
  EX("turkish_getup", "Turkish Get-Up", "Türkischer Aufstieg", "full", "Eyes on the weight, move in steps", "Blick auf das Gewicht, in Schritten bewegen"),
  EX("clean_press", "Clean and Press", "Umsetzen und Drücken", "full", "Clean, reset, press overhead", "Umsetzen, sammeln, überkopf drücken"),
  EX("medball_slam", "Medicine Ball Slam", "Medizinball-Slam", "full", "Full extension, slam with intent", "Voll strecken, mit Kraft schmettern"),
  EX("man_maker", "Man Maker", "Man Maker", "full", "Push-up, row each side, then stand and press", "Liegestütz, Rudern je Seite, aufstehen und drücken"),
  EX("bear_crawl", "Bear Crawl", "Bärengang", "full", "Knees just off the floor, opposite limbs", "Knie knapp über dem Boden, Gegenglieder"),
  EX("kb_clean", "Kettlebell Clean", "Kettlebell Clean", "full", "Keep the bell close, soft catch", "Kettlebell nah halten, weich fangen")
);
EXERCISE_LIBRARY.sort((a, b) => ["chest", "back", "shoulders", "arms", "legs", "glutes", "core", "cardio", "full"].indexOf(a.muscle) - ["chest", "back", "shoulders", "arms", "legs", "glutes", "core", "cardio", "full"].indexOf(b.muscle));


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

/* Curated recipes — browsable and loggable as a meal in one tap. Category
   reuses the same keys as the meal sections (breakfast/lunch/dinner/snacks)
   so it shares translations with the rest of the app. */
const RECIPES = [
  {
    key: "scrambled_eggs",
    name: "Scrambled eggs",
    nameDe: "Rührei",
    category: "breakfast",
    kcal: 280,
    protein: 20,
    carbs: 3,
    fat: 21,
    ingredients: ["3 eggs", "1 tbsp butter", "Salt, pepper"],
    ingredientsDe: ["3 Eier", "1 EL Butter", "Salz, Pfeffer"],
  },
  {
    key: "overnight_oats",
    name: "Overnight oats",
    nameDe: "Overnight Oats",
    category: "breakfast",
    kcal: 420,
    protein: 24,
    carbs: 55,
    fat: 11,
    ingredients: ["60g oats", "200ml milk", "1 scoop whey protein", "1 banana"],
    ingredientsDe: ["60g Haferflocken", "200ml Milch", "1 Scoop Whey-Protein", "1 Banane"],
  },
  {
    key: "yogurt_berries",
    name: "Greek yogurt with berries",
    nameDe: "Griechischer Joghurt mit Beeren",
    category: "breakfast",
    kcal: 260,
    protein: 22,
    carbs: 24,
    fat: 8,
    ingredients: ["250g Greek yogurt", "100g mixed berries", "1 tbsp honey"],
    ingredientsDe: ["250g griechischer Joghurt", "100g Beerenmischung", "1 EL Honig"],
  },
  {
    key: "chicken_rice_broccoli",
    name: "Chicken, rice & broccoli",
    nameDe: "Hähnchen mit Reis und Brokkoli",
    category: "lunch",
    kcal: 560,
    protein: 48,
    carbs: 62,
    fat: 12,
    ingredients: ["200g chicken breast", "150g rice (cooked)", "200g broccoli", "1 tbsp olive oil"],
    ingredientsDe: ["200g Hähnchenbrust", "150g Reis (gekocht)", "200g Brokkoli", "1 EL Olivenöl"],
  },
  {
    key: "lentil_soup",
    name: "Lentil soup",
    nameDe: "Linsensuppe",
    category: "lunch",
    kcal: 340,
    protein: 18,
    carbs: 50,
    fat: 7,
    ingredients: ["150g red lentils", "1 onion", "1 carrot", "vegetable broth"],
    ingredientsDe: ["150g rote Linsen", "1 Zwiebel", "1 Karotte", "Gemüsebrühe"],
  },
  {
    key: "tuna_salad",
    name: "Tuna salad",
    nameDe: "Thunfischsalat",
    category: "lunch",
    kcal: 380,
    protein: 34,
    carbs: 10,
    fat: 22,
    ingredients: ["1 can tuna", "Mixed salad greens", "1/2 avocado", "Olive oil & lemon"],
    ingredientsDe: ["1 Dose Thunfisch", "Gemischter Blattsalat", "1/2 Avocado", "Olivenöl & Zitrone"],
  },
  {
    key: "salmon_sweet_potato",
    name: "Salmon with sweet potato",
    nameDe: "Lachs mit Süßkartoffel",
    category: "dinner",
    kcal: 520,
    protein: 38,
    carbs: 45,
    fat: 20,
    ingredients: ["180g salmon fillet", "250g sweet potato", "Steamed greens"],
    ingredientsDe: ["180g Lachsfilet", "250g Süßkartoffel", "Gedämpftes Gemüse"],
  },
  {
    key: "tofu_stirfry",
    name: "Veggie stir-fry with tofu",
    nameDe: "Gemüsepfanne mit Tofu",
    category: "dinner",
    kcal: 410,
    protein: 26,
    carbs: 35,
    fat: 18,
    ingredients: ["200g tofu", "Mixed vegetables", "1 tbsp soy sauce", "1 tbsp sesame oil"],
    ingredientsDe: ["200g Tofu", "Gemischtes Gemüse", "1 EL Sojasauce", "1 EL Sesamöl"],
  },
  {
    key: "wholewheat_pasta",
    name: "Whole wheat pasta with tomato sauce",
    nameDe: "Vollkornpasta mit Tomatensauce",
    category: "dinner",
    kcal: 480,
    protein: 18,
    carbs: 78,
    fat: 10,
    ingredients: ["100g whole wheat pasta", "Tomato sauce", "Parmesan", "Basil"],
    ingredientsDe: ["100g Vollkornpasta", "Tomatensauce", "Parmesan", "Basilikum"],
  },
  {
    key: "protein_shake",
    name: "Protein shake",
    nameDe: "Protein-Shake",
    category: "snacks",
    kcal: 180,
    protein: 28,
    carbs: 8,
    fat: 3,
    ingredients: ["1 scoop whey protein", "250ml milk or water", "Ice"],
    ingredientsDe: ["1 Scoop Whey-Protein", "250ml Milch oder Wasser", "Eis"],
  },
  {
    key: "cottage_pineapple",
    name: "Cottage cheese with pineapple",
    nameDe: "Hüttenkäse mit Ananas",
    category: "snacks",
    kcal: 200,
    protein: 22,
    carbs: 18,
    fat: 4,
    ingredients: ["200g cottage cheese", "100g pineapple"],
    ingredientsDe: ["200g Hüttenkäse", "100g Ananas"],
  },
  {
    key: "trail_mix",
    name: "Trail mix",
    nameDe: "Nussmix",
    category: "snacks",
    kcal: 220,
    protein: 7,
    carbs: 14,
    fat: 16,
    ingredients: ["15g almonds", "15g cashews", "10g raisins"],
    ingredientsDe: ["15g Mandeln", "15g Cashews", "10g Rosinen"],
  },
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

// Simple standard macro split (30% protein / 40% carbs / 30% fat) derived
// from the user's own kcal goal — not fake, just a deterministic default
// until the app offers a way to fine-tune macro targets individually.
function computeMacroTargets(kcalGoal) {
  return {
    protein: Math.round((kcalGoal * 0.3) / 4),
    carbs: Math.round((kcalGoal * 0.4) / 4),
    fat: Math.round((kcalGoal * 0.3) / 9),
  };
}

function sumMeals(meals, field) {
  return Object.values(meals).reduce((total, items) => total + items.reduce((s, it) => s + (it[field] || 0), 0), 0);
}

function ageFromBirth({ d, m, y }) {
  const now = new Date();
  let age = now.getFullYear() - Number(y);
  if (now.getMonth() + 1 < Number(m) || (now.getMonth() + 1 === Number(m) && now.getDate() < Number(d))) age -= 1;
  return Math.max(10, Math.min(100, age));
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Mifflin-St Jeor BMR x light-activity factor; the goal date turns the
// weight difference into a daily deficit/surplus (7700 kcal per kg).
function computeKcalGoal({ gender, age, height, weight, target, goal, targetDate }) {
  const w = weight || 70;
  const bmr = 10 * w + 6.25 * (height || 170) - 5 * (age || 30) + (gender === "female" ? -161 : 5);
  const tdee = bmr * 1.3;
  const days = targetDate ? Math.max(14, Math.ceil((new Date(targetDate).getTime() - Date.now()) / 86400000)) : 84;
  const diff = target && weight ? target - weight : 0;
  let adj = 0;
  if (goal === "cut") adj = -clamp(diff < 0 ? (Math.abs(diff) * 7700) / days : 400, 250, 1000);
  else if (goal === "gain" || goal === "bulk") adj = clamp(diff > 0 ? (diff * 7700) / days : 350, 200, 700);
  const floor = gender === "female" ? 1200 : 1500;
  return Math.round(Math.max(floor, tdee + adj) / 10) * 10;
}

// Rough MET values for the burn estimate (kcal = MET x kg x hours).
const MET_STRENGTH = 5;
const CARDIO_MET = { running: 9.8, treadmill: 9, cycling: 7.5, rowing_machine: 7, elliptical: 5, stair_climber: 8.8, jump_rope: 11, swimming: 6, walking: 3.5, hiking: 6, hiit: 8, burpees: 8, jumping_jacks: 7.5, battle_ropes: 9, sled_push: 8, boxing: 7.8, assault_bike: 9 };
const burnKcal = (met, weightKg, minutes) => Math.round((met * (weightKg || 70) * minutes) / 60);
const stepsKcal = (steps, weightKg) => Math.round(steps * 0.00057 * (weightKg || 70));

function formatDuration(totalSeconds) {
  if (totalSeconds == null) return "–:--";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: COLORS.dim, fontFamily: "Inter, sans-serif", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <span style={{ fontSize: 13, color: COLORS.text, fontFamily: "Sora, sans-serif", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
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

function AiScanIllustration({ t, kcal, carbs, fat, protein }) {
  const bubble = (label, value, unit, pos) => (
    <div style={{ position: "absolute", ...pos, background: COLORS.bg, border: `2px solid ${COLORS.gold}`, borderRadius: 14, padding: "6px 12px", textAlign: "center", boxShadow: "0 4px 14px rgba(0,0,0,0.08)" }}>
      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text }}>
        {value}
        {unit}
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: COLORS.dim }}>{label}</div>
    </div>
  );
  return (
    <div style={{ position: "relative", width: 260, height: 210, margin: "0 auto 22px" }}>
      <div style={{ position: "absolute", left: 60, top: 40, width: 140, height: 140, borderRadius: "50%", background: COLORS.goldSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <UtensilsCrossed size={52} color={COLORS.gold} />
      </div>
      {bubble("kcal", kcal, "", { left: 92, top: 0 })}
      {bubble(t.carbs, carbs, " g", { right: 0, top: 62 })}
      {bubble(t.fat, fat, " g", { left: 0, top: 96 })}
      {bubble(t.protein, protein, " g", { right: 14, bottom: 0 })}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: -18, fontFamily: "Inter, sans-serif", fontSize: 10.5, color: COLORS.dim }}>{t.obExample}</div>
    </div>
  );
}

function Onboarding({ t, lang, setLang, onFinish }) {
  // Shown once, before anything else — a returning-to-onboarding user (via
  // "replay onboarding" in Settings) has already picked a language, so this
  // doesn't need its own persisted flag; it just gates step 0.
  const [langChosen, setLangChosen] = useState(false);
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState(null);
  const [goal, setGoal] = useState(null);
  const [reason, setReason] = useState(null);
  const [moreGoals, setMoreGoals] = useState([]);
  const [experience, setExperience] = useState(null);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("84");
  const [height, setHeight] = useState("180");
  const [target, setTarget] = useState("80");
  const [birth, setBirth] = useState({ d: "1", m: "1", y: "2000" });
  const [targetDate, setTargetDate] = useState(() => new Date(Date.now() + 84 * 86400000).toISOString().slice(0, 10));
  const [vision3Months, setVision3Months] = useState("");
  const [visionWhy, setVisionWhy] = useState("");

  const toggleMoreGoal = (key) => {
    setMoreGoals((g) => (g.includes(key) ? g.filter((x) => x !== key) : [...g, key]));
  };

  const kcalGoal = useMemo(
    () => computeKcalGoal({ gender, age: ageFromBirth(birth), height: Number(height), weight: Number(weight), target: Number(target), goal, targetDate }),
    [gender, birth, height, weight, target, goal, targetDate]
  );
  const daysToGoal = Math.max(1, Math.ceil((new Date(targetDate).getTime() - Date.now()) / 86400000));
  const kgPerWeek = Math.abs(Number(target) - Number(weight)) / (daysToGoal / 7);
  const showsRate = ["cut", "gain", "bulk"].includes(goal) && Number(target) !== Number(weight);

  const LAST_STEP = 12;
  const canContinue = !((step === 1 && !gender) || (step === 3 && !goal) || (step === 7 && !name.trim()));

  // Language picker comes before everything else, including "Welcome" — a
  // brand-new visitor hasn't chosen DE/EN yet, so both language names are
  // shown together rather than relying on translated copy for this screen.
  if (!langChosen) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 24px 28px", justifyContent: "center" }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ width: 84, height: 84, borderRadius: 24, background: `linear-gradient(150deg, ${COLORS.gold}, ${COLORS.teal})`, margin: "0 auto 26px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Dumbbell size={34} color={COLORS.bg} />
          </div>
          <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text, margin: 0 }}>Sprache wählen · Choose your language</h2>
        </div>
        {[
          { key: "de", label: "Deutsch" },
          { key: "en", label: "English" },
        ].map((l) => (
          <div
            key={l.key}
            onClick={() => {
              setLang(l.key);
              setLangChosen(true);
            }}
            style={{ padding: 18, borderRadius: 16, marginBottom: 12, cursor: "pointer", textAlign: "center", background: COLORS.surface, border: `1.5px solid ${COLORS.border}` }}
          >
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 600, color: COLORS.text }}>{l.label}</div>
          </div>
        ))}
      </div>
    );
  }

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
          {Array.from({ length: LAST_STEP }, (_, i) => i + 1).map((i) => (
            <div key={i} style={{ height: 3, borderRadius: 2, flex: 1, background: i <= step ? COLORS.gold : COLORS.border }} />
          ))}
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {step === 0 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 84, height: 84, borderRadius: 24, background: `linear-gradient(150deg, ${COLORS.gold}, #009973)`, margin: "0 auto 26px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Dumbbell size={34} color={COLORS.bg} />
            </div>
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: COLORS.text, margin: "0 0 10px" }}>{t.obWelcomeTitle}</h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14.5, color: COLORS.dim, margin: 0 }}>{t.obWelcomeSub}</p>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 6px" }}>{t.obGenderTitle}</h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, margin: "0 0 22px" }}>{t.obGenderSub}</p>
            {[
              { key: "female", title: t.obGenderFemale },
              { key: "male", title: t.obGenderMale },
            ].map(({ key, title }) => (
              <div key={key} onClick={() => { setGender(key); applyTheme(key); }} style={{ padding: 18, borderRadius: 16, marginBottom: 12, cursor: "pointer", textAlign: "center", background: gender === key ? COLORS.goldSoft : COLORS.surface, border: `1.5px solid ${gender === key ? COLORS.gold : COLORS.border}` }}>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14.5, fontWeight: 600, color: COLORS.text }}>{title}</div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 6px" }}>{t.obBirthTitle}</h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, margin: "0 0 22px" }}>{t.obBirthSub}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.7fr 1.2fr", gap: 10 }}>
              {[
                { label: t.obDay, key: "d", options: Array.from({ length: 31 }, (_, i) => ({ v: i + 1, l: i + 1 })) },
                { label: t.obMonth, key: "m", options: t.months.map((l, i) => ({ v: i + 1, l })) },
                { label: t.obYear, key: "y", options: Array.from({ length: 90 }, (_, i) => new Date().getFullYear() - 10 - i).map((v) => ({ v, l: v })) },
              ].map((f) => (
                <div key={f.key}>
                  <div style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>{f.label}</div>
                  <select value={birth[f.key]} onChange={(e) => setBirth((bth) => ({ ...bth, [f.key]: e.target.value }))} style={{ ...numInputStyle, padding: "12px 8px" }}>
                    {f.options.map((o) => (
                      <option key={o.v} value={o.v}>
                        {o.l}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 6px" }}>{t.obGoalTitle}</h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, margin: "0 0 22px" }}>{t.obGoalSub}</p>
            {[
              { key: "cut", icon: TrendingDown, title: t.obGoalCut, sub: t.obGoalCutSub },
              { key: "maintain", icon: Equal, title: t.obGoalMaintain, sub: t.obGoalMaintainSub },
              { key: "gain", icon: TrendingUp, title: t.obGoalGain, sub: t.obGoalGainSub },
              { key: "bulk", icon: Dumbbell, title: t.obGoalBulk, sub: t.obGoalBulkSub },
              { key: "other", icon: Smile, title: t.obGoalOther, sub: t.obGoalOtherSub },
            ].map(({ key, icon: Icon, title, sub }) => (
              <div key={key} onClick={() => setGoal(key)} style={{ display: "flex", alignItems: "center", gap: 14, padding: 15, borderRadius: 16, marginBottom: 12, cursor: "pointer", background: goal === key ? COLORS.goldSoft : COLORS.surface, border: `1.5px solid ${goal === key ? COLORS.gold : COLORS.border}` }}>
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

        {step === 4 && (
          <div>
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 22px" }}>{t.obReasonTitle}</h2>
            {[
              { key: "confidence", title: t.obReasonConfidence },
              { key: "health", title: t.obReasonHealth },
              { key: "fitness", title: t.obReasonFitness },
              { key: "event", title: t.obReasonEvent },
              { key: "burn", title: t.obReasonBurn },
              { key: "other", title: t.obReasonOther },
            ].map(({ key, title }) => (
              <div key={key} onClick={() => setReason(key)} style={{ padding: 15, borderRadius: 16, marginBottom: 12, cursor: "pointer", background: reason === key ? COLORS.goldSoft : COLORS.surface, border: `1.5px solid ${reason === key ? COLORS.gold : COLORS.border}` }}>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14.5, fontWeight: 600, color: COLORS.text }}>{title}</div>
              </div>
            ))}
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 22px" }}>{t.obMoreTitle}</h2>
            {[
              { key: "eating", title: t.obMoreEating },
              { key: "cook", title: t.obMoreCook },
              { key: "immune", title: t.obMoreImmune },
              { key: "sleep", title: t.obMoreSleep },
              { key: "feel", title: t.obMoreFeel },
              { key: "other", title: t.obMoreOther },
            ].map(({ key, title }) => (
              <div
                key={key}
                onClick={() => toggleMoreGoal(key)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 15, borderRadius: 16, marginBottom: 12, cursor: "pointer", background: moreGoals.includes(key) ? COLORS.goldSoft : COLORS.surface, border: `1.5px solid ${moreGoals.includes(key) ? COLORS.gold : COLORS.border}` }}
              >
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14.5, fontWeight: 600, color: COLORS.text }}>{title}</div>
                <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${moreGoals.includes(key) ? COLORS.gold : COLORS.border}`, background: moreGoals.includes(key) ? COLORS.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {moreGoals.includes(key) && <Check size={12} color={COLORS.bg} />}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 6 && (
          <div>
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 22px" }}>{t.obExperienceTitle}</h2>
            {[
              { key: "notReached", title: t.obExperienceNotReached },
              { key: "failed", title: t.obExperienceFailed },
              { key: "couldntKeep", title: t.obExperienceCouldntKeep },
              { key: "never", title: t.obExperienceNever },
            ].map(({ key, title }) => (
              <div key={key} onClick={() => setExperience(key)} style={{ padding: 15, borderRadius: 16, marginBottom: 12, cursor: "pointer", background: experience === key ? COLORS.goldSoft : COLORS.surface, border: `1.5px solid ${experience === key ? COLORS.gold : COLORS.border}` }}>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14.5, fontWeight: 600, color: COLORS.text }}>{title}</div>
              </div>
            ))}
          </div>
        )}

        {step === 7 && (
          <div>
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 6px" }}>{t.obStatsTitle}</h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, margin: "0 0 22px" }}>{t.obStatsSub}</p>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginBottom: 6 }}>{t.obNameLabel}</div>
              <TextField value={name} onChange={setName} placeholder={t.obNamePlaceholder} />
            </div>
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

        {step === 8 && (
          <div>
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 6px" }}>{t.obTargetDateTitle}</h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, margin: "0 0 22px" }}>{t.obTargetDateSub}</p>
            <input type="date" value={targetDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => e.target.value && setTargetDate(e.target.value)} style={{ ...numInputStyle, padding: "14px 14px", fontSize: 15 }} />
            {showsRate && (
              <div style={{ marginTop: 18, fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 600, color: kgPerWeek > 1 ? COLORS.coral : COLORS.gold }}>
                {kgPerWeek.toFixed(2)} kg {t.obPerWeek}
              </div>
            )}
            {showsRate && kgPerWeek > 1 && <div style={{ marginTop: 6, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim }}>{t.obAmbitious}</div>}
          </div>
        )}

        {step === 9 && (
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

        {step === 10 && (
          <div style={{ textAlign: "center" }}>
            <AiScanIllustration t={t} kcal={718} carbs={59} fat={34} protein={44} />
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 21, fontWeight: 700, color: COLORS.text, margin: "0 0 10px" }}>{t.obAiScanTitle}</h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, margin: 0 }}>{t.obAiScanSub}</p>
          </div>
        )}

        {step === 11 && (
          <div style={{ textAlign: "center" }}>
            <AiScanIllustration t={t} kcal={433} carbs={40} fat={22} protein={25} />
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 21, fontWeight: 700, color: COLORS.text, margin: "0 0 10px" }}>{t.obAiScan2Title}</h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, margin: 0 }}>{t.obAiScan2Sub}</p>
          </div>
        )}

        {step === 12 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: COLORS.goldSoft, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
          disabled={!canContinue}
          onClick={() =>
            step === LAST_STEP
              ? onFinish({
                  name: name.trim(),
                  gender,
                  weight: Number(weight),
                  height: Number(height),
                  target: Number(target),
                  goal,
                  birth,
                  age: ageFromBirth(birth),
                  targetDate,
                  reason,
                  moreGoals,
                  experience,
                  kcalGoal,
                  macroTargets: computeMacroTargets(kcalGoal),
                  vision3Months: vision3Months.trim(),
                  visionWhy: visionWhy.trim(),
                })
              : setStep(step + 1)
          }
          style={{
            flex: 1,
            background: canContinue ? COLORS.gold : COLORS.raised,
            color: canContinue ? COLORS.bg : COLORS.dim,
            border: "none",
            borderRadius: 14,
            padding: "14px 18px",
            fontFamily: "Sora, sans-serif",
            fontWeight: 700,
            fontSize: 14.5,
            cursor: canContinue ? "pointer" : "default",
          }}
        >
          {step === 0 ? t.obStart : step === LAST_STEP ? t.obFinish : t.next}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Main tab screens ---------------- */

function WaterCard({ t, waterMl, goalMl, onAdd, onUndo }) {
  const pct = Math.min(100, (waterMl / goalMl) * 100);
  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <GlassWater size={17} color={COLORS.teal} />
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 600, color: COLORS.text }}>{t.waterTitle}</span>
        </div>
        <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.text, whiteSpace: "nowrap" }}>
          {(waterMl / 1000).toFixed(2).replace(/\.?0+$/, "")}
          <span style={{ color: COLORS.dim, fontWeight: 400 }}> / {(goalMl / 1000).toFixed(1)} L</span>
        </span>
      </div>
      <div style={{ height: 10, borderRadius: 5, background: COLORS.raised, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: COLORS.teal, borderRadius: 5, transition: "width .5s ease" }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onAdd} style={{ flex: 1, background: COLORS.teal, color: COLORS.bg, border: "none", borderRadius: 12, padding: "10px 12px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          {t.waterAddGlass}
        </button>
        <button onClick={onUndo} disabled={waterMl <= 0} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.dim, borderRadius: 12, padding: "10px 14px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 13, cursor: waterMl > 0 ? "pointer" : "default" }}>
          {t.waterUndo}
        </button>
      </div>
    </Card>
  );
}

function HomeScreen({ t, profile, meals, weightLog, workoutHistory, notes, waterMl, onAddWater, onUndoWater, onOpenAssistant, steps, stepsSource, stepsGoal, onSaveStepsGoal, onConnectSteps, onSaveSteps, onLogFood, onStartWorkout, onAddNote, onGoProgress, activeWorkout, onResumeWorkout }) {
  const kcalGoal = profile.kcalGoal;
  const kcalEaten = sumMeals(meals, "kcal");
  const todayStr = new Date().toDateString();
  const workoutKcalToday = workoutHistory.filter((wo) => new Date(wo.dateISO).toDateString() === todayStr).reduce((sum, wo) => sum + (wo.burnedKcal || 0), 0);
  const kcalBurned = workoutKcalToday + stepsKcal(steps, profile.weight);
  const proteinEaten = sumMeals(meals, "protein");
  const carbsEaten = sumMeals(meals, "carbs");
  const fatEaten = sumMeals(meals, "fat");

  const lastWorkout = workoutHistory.length ? workoutHistory[workoutHistory.length - 1] : null;

  const latestWeight = weightLog.length ? weightLog[weightLog.length - 1] : null;
  const firstWeight = weightLog.length ? weightLog[0] : null;
  const weeksBetween =
    firstWeight && latestWeight ? Math.round((new Date(latestWeight.dateISO) - new Date(firstWeight.dateISO)) / (7 * 24 * 3600 * 1000)) : 0;
  const weightDelta = firstWeight && latestWeight ? latestWeight.kg - firstWeight.kg : 0;

  const latestNote = notes.length ? notes[0] : null;

  return (
    <div style={{ padding: "4px 20px 24px" }}>
      <p style={{ color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 14, marginTop: -4, marginBottom: 22 }}>
        {new Date().getHours() < 11 ? t.greetingPrefix : new Date().getHours() < 17 ? t.greetingDay : t.greetingEvening}, {profile.name}
      </p>

      {activeWorkout && (
        <Card onClick={onResumeWorkout} style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: COLORS.goldSoft, border: `1px solid ${COLORS.gold}` }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: COLORS.gold, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Timer size={17} color={COLORS.bg} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.text }}>{t.workoutRunning}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 2 }}>
              {t.workoutRunningSince} {new Date(activeWorkout.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 700, color: COLORS.gold, flexShrink: 0 }}>{t.resumeWorkout}</span>
        </Card>
      )}

      <Card style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <Ring pct={kcalGoal ? (kcalEaten / (kcalGoal + kcalBurned)) * 100 : 0} size={132} stroke={11}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text, lineHeight: 1 }}>{Math.max(kcalGoal + kcalBurned - kcalEaten, 0)}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: COLORS.dim, marginTop: 4 }}>kcal {t.kcalLeft}</div>
          </div>
        </Ring>
        <div style={{ flex: 1, minWidth: 0 }}>
          <MacroBar label={t.protein} value={proteinEaten} target={profile.macroTargets.protein} color={COLORS.teal} />
          <MacroBar label={t.carbs} value={carbsEaten} target={profile.macroTargets.carbs} color={COLORS.gold} />
          <MacroBar label={t.fat} value={fatEaten} target={profile.macroTargets.fat} color={COLORS.coral} />
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "space-around", marginTop: -4, marginBottom: 16, fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim }}>
        {[
          [t.eatenLabel, kcalEaten],
          [t.burnedLabel, kcalBurned],
          [t.goalLabel, kcalGoal],
        ].map(([label, val]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text }}>{val}</div>
            {label}
          </div>
        ))}
      </div>

      <StepsCard t={t} steps={steps} source={stepsSource} weightKg={profile.weight} goal={stepsGoal} onSaveGoal={onSaveStepsGoal} onConnect={onConnectSteps} onSaveManual={onSaveSteps} />

      <WaterCard t={t} waterMl={waterMl} goalMl={Math.round(((profile.weight || 70) * 35) / 250) * 250} onAdd={onAddWater} onUndo={onUndoWater} />

      <Card onClick={onOpenAssistant} style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: COLORS.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <MessageCircle size={17} color={COLORS.gold} />
        </div>
        <span style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.text }}>{t.assistantEntry}</span>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Card>
          <Dumbbell size={17} color={COLORS.gold} />
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 10 }}>{t.lastWorkout}</div>
          {lastWorkout ? (
            <>
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 600, color: COLORS.text, marginTop: 2 }}>{formatDuration(lastWorkout.durationSec)}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 2 }}>{lastWorkout.volumeKg > 0 ? `${Math.round(lastWorkout.volumeKg)} kg` : `${lastWorkout.burnedKcal || 0} kcal`}</div>
            </>
          ) : (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim, marginTop: 2 }}>{t.noWorkoutsYet}</div>
          )}
        </Card>
        <Card>
          <TrendingUp size={17} color={COLORS.teal} />
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 10 }}>{t.currentWeight}</div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 600, color: COLORS.text, marginTop: 2 }}>{latestWeight ? `${latestWeight.kg} kg` : "–"}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.teal, marginTop: 2 }}>
            {weightLog.length > 1
              ? `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg${weeksBetween > 0 ? ` / ${weeksBetween} ${t.weeksLabel}` : ""}`
              : t.firstWeightEntry}
          </div>
        </Card>
      </div>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <NotebookPen size={16} color={COLORS.dim} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim }}>{t.todaysNote}</span>
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: latestNote ? COLORS.text : COLORS.dim }}>{latestNote ? latestNote.text : t.noNoteToday}</div>
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

function NutritionScreen({ t, meals, macroTargets, myMeals, cheats, onOpenFoodSearch, onOpenRecipes, onOpenMyMeals, onOpenCheats, onSaveMyMeal }) {
  const todayMs = new Date(new Date().toLocaleDateString("sv") + "T00:00").getTime();
  const nextCheat = [...cheats].map((c) => ({ ...c, diff: Math.round((new Date(c.date + "T00:00").getTime() - todayMs) / 86400000) })).filter((c) => c.diff >= 0).sort((a, b) => a.diff - b.diff)[0];
  const mealDefs = [
    { key: "breakfast", label: t.breakfast },
    { key: "lunch", label: t.lunch },
    { key: "dinner", label: t.dinner },
    { key: "snacks", label: t.snacks },
  ];
  return (
    <div style={{ padding: "0 20px 24px" }}>
      <Card style={{ marginBottom: 16 }}>
        <MacroBar label={t.protein} value={sumMeals(meals, "protein")} target={macroTargets.protein} color={COLORS.teal} />
        <MacroBar label={t.carbs} value={sumMeals(meals, "carbs")} target={macroTargets.carbs} color={COLORS.gold} />
        <MacroBar label={t.fat} value={sumMeals(meals, "fat")} target={macroTargets.fat} color={COLORS.coral} />
      </Card>

      <div onClick={() => onOpenFoodSearch("snacks")} style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "11px 14px", marginBottom: 12, cursor: "pointer" }}>
        <Search size={16} color={COLORS.dim} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, flex: 1 }}>{t.searchPlaceholder}</span>
        <ScanLine size={17} color={COLORS.gold} />
      </div>

      <div onClick={onOpenRecipes} style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", background: COLORS.raised, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 14px", marginBottom: 20, cursor: "pointer" }}>
        <BookOpen size={16} color={COLORS.gold} />
        <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.gold }}>{t.recipesButton}</span>
      </div>

      <div onClick={onOpenMyMeals} style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", background: COLORS.raised, border: "1px solid " + COLORS.border, borderRadius: 14, padding: "12px 14px", marginBottom: 12, cursor: "pointer" }}>
        <Star size={16} color={COLORS.gold} />
        <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.gold }}>{t.myMealsButton}</span>
      </div>

      <div onClick={onOpenCheats} style={{ display: "flex", alignItems: "center", gap: 12, background: COLORS.surface, border: "1px solid " + COLORS.border, borderRadius: 14, padding: "12px 14px", marginBottom: 20, cursor: "pointer" }}>
        <span style={{ fontSize: 22 }}>🍕</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>{t.cheatTitle}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 2 }}>
            {nextCheat ? (nextCheat.type === "day" ? t.cheatDay : t.cheatMeal) + " · " + (nextCheat.diff === 0 ? t.cheatToday : nextCheat.diff === 1 ? t.cheatTomorrow : t.cheatIn + " " + nextCheat.diff + " " + t.cheatDays) : t.cheatNextNone}
          </div>
        </div>
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
                  <span style={{ color: COLORS.dim, whiteSpace: "nowrap" }}>
                    {it.kcal} kcal
                    <span onClick={() => onSaveMyMeal(it)} title={t.saveMine} style={{ marginLeft: 10, cursor: "pointer", color: COLORS.gold, fontSize: 16 }}>
                      {myMeals.some((x) => x.name === it.name) ? "★" : "☆"}
                    </span>
                  </span>
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

function TrainingScreen({ t, lang, planName, personalBests, workoutHistory, onStartWorkout, onOpenPlanBuilder, onOpenLibrary, onOpenRecords, activeWorkout }) {
  const timed = workoutHistory.filter((w) => w.durationSec > 0);
  const avgSessionSec = timed.length ? Math.round(timed.reduce((s, w) => s + w.durationSec, 0) / timed.length) : null;
  const totalVolume = Math.round(workoutHistory.reduce((s, w) => s + w.volumeKg, 0));
  const trained = Object.keys(personalBests)
    .map((key) => ({ ex: EXERCISE_LIBRARY.find((e) => e.key === key), best: personalBests[key] }))
    .filter((x) => x.ex);
  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim }}>{t.activePlan}</span>
        <span onClick={onOpenPlanBuilder} style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.gold, cursor: "pointer" }}>
          + {t.newPlan}
        </span>
      </div>
      <Card style={{ marginBottom: 18, background: COLORS.raised }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 17, fontWeight: 700, color: COLORS.text }}>{planName || t.freeWorkout}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginTop: 3 }}>{t.freeWorkoutSub}</div>
          </div>
          <button onClick={onStartWorkout} style={{ background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 12, padding: "11px 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer", flexShrink: 0 }}>
            {activeWorkout ? t.resumeWorkout : t.startWorkout}
          </button>
        </div>
      </Card>

      <Card style={{ marginBottom: 18, cursor: "pointer" }}>
        <div onClick={onOpenRecords} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 26 }}>🏆</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text }}>{t.recordsTitle}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginTop: 2 }}>{t.recordsCardSub}</div>
          </div>
          <ChevronLeft size={16} color={COLORS.dim} style={{ transform: "rotate(180deg)", flexShrink: 0 }} />
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim }}>{t.yourExercises}</span>
        <span onClick={onOpenLibrary} style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.gold, cursor: "pointer" }}>
          {t.viewLibrary}
        </span>
      </div>
      <Card style={{ padding: 4, marginBottom: 18 }}>
        {trained.length === 0 ? (
          <div style={{ padding: 14, fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim }}>{t.noExercisesYet}</div>
        ) : (
          trained.map(({ ex, best }, i) => (
            <div key={ex.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 12px", borderBottom: i < trained.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text, fontWeight: 500 }}>{lang === "de" ? ex.nameDe : ex.name}</span>
              <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, color: COLORS.gold, fontWeight: 700 }}>
                {t.bestLabel}: {best} kg
              </span>
            </div>
          ))
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <Timer size={17} color={COLORS.teal} />
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text, marginTop: 8 }}>{formatDuration(avgSessionSec)}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 2 }}>{t.avgSession}</div>
        </Card>
        <Card>
          <Flame size={17} color={COLORS.coral} />
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text, marginTop: 8 }}>{totalVolume} kg</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 2 }}>{t.volume}</div>
        </Card>
      </div>
    </div>
  );
}

function LineChart({ points, color, height = 140, unit = "" }) {
  const w = 300;
  const padX = 24;
  const padTop = 26;
  const padBottom = 26;
  const n = points.length;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const coords = points.map((p, i) => [n === 1 ? w / 2 : padX + (i / (n - 1)) * (w - 2 * padX), padTop + (1 - (p - min) / range) * (height - padTop - padBottom)]);
  const path = coords.map(([x, y], i) => (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1)).join(" ");
  const areaPath = path + " L" + coords[n - 1][0] + "," + height + " L" + coords[0][0] + "," + height + " Z";
  const gradId = "fade-" + color.replace(/[^a-z0-9]/gi, "");
  const maxIdx = points.lastIndexOf(max);
  const minIdx = points.indexOf(min);
  const fmtV = (v) => (Math.round(v * 10) / 10).toString().replace(".", ",") + (unit ? " " + unit : "");
  const anchorFor = (x) => (x < 40 ? "start" : x > w - 40 ? "end" : "middle");
  const marker = (idx, c, above) => (
    <g key={idx + "-" + c}>
      <circle cx={coords[idx][0]} cy={coords[idx][1]} r={5.5} fill={COLORS.bg} stroke={c} strokeWidth={2.5} />
      <text x={coords[idx][0]} y={coords[idx][1] + (above ? -11 : 19)} textAnchor={anchorFor(coords[idx][0])} fontSize="11" fontWeight="700" fontFamily="Sora, sans-serif" fill={c}>
        {(above ? "▲ " : "▼ ") + fmtV(points[idx])}
      </text>
    </g>
  );
  return (
    <svg viewBox={"0 0 " + w + " " + height} width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {n > 1 && <path d={areaPath} fill={"url(#" + gradId + ")"} />}
      {n > 1 && <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
      {max !== min && marker(minIdx, COLORS.coral, false)}
      {marker(maxIdx, COLORS.gold, true)}
    </svg>
  );
}

function ProgressScreen({ t, lang, weightLog, workoutHistory, onAddWeight, photos, onAddPhoto, onDeletePhoto }) {
  const [range, setRange] = useState(3);
  const [slider, setSlider] = useState(50);
  const [compareId, setCompareId] = useState(null);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const sorted = [...photos].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const before = sorted[0] || null;
  const after = sorted.find((p) => p.id === compareId) || sorted[sorted.length - 1] || null;
  const fmtDate = (iso) => new Date(iso).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

  const [photoError, setPhotoError] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  useEffect(() => {
    if (confirmDeleteId === null) return undefined;
    const id = setTimeout(() => setConfirmDeleteId(null), 3000);
    return () => clearTimeout(id);
  }, [confirmDeleteId]);
  const pickPhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    try {
      const dataUrl = await downscaleImage(file, 640);
      onAddPhoto({ id: Date.now(), dateISO: new Date().toISOString(), dataUrl });
      // A photo you just added should always show up as "after" — otherwise
      // an earlier tap on an older thumbnail keeps overriding new uploads.
      setCompareId(null);
    } catch {
      setPhotoError(t.progressPhotoError);
    }
  };
  const [weightInput, setWeightInput] = useState("");
  const [exKey, setExKey] = useState(null);

  const rangeDays = [28, 90, 365, Infinity][range];
  const shownWeights = weightLog.filter((w) => rangeDays === Infinity || Date.now() - new Date(w.dateISO).getTime() <= rangeDays * 86400000);
  const latest = weightLog.length ? weightLog[weightLog.length - 1].kg : null;

  const trainedKeys = [...new Set(workoutHistory.flatMap((w) => (w.sets || []).map((s) => s.exerciseKey)))];
  const activeKey = exKey && trainedKeys.includes(exKey) ? exKey : trainedKeys[0];
  const exPoints = workoutHistory
    .map((w) => {
      const ws = (w.sets || []).filter((s) => s.exerciseKey === activeKey).map((s) => s.weight);
      return ws.length ? Math.max(...ws) : null;
    })
    .filter((v) => v !== null);
  const exBest = exPoints.length ? Math.max(...exPoints) : null;

  const saveWeight = () => {
    const kg = parseFloat(weightInput.replace(",", "."));
    if (kg > 0) {
      onAddWeight(kg);
      setWeightInput("");
    }
  };

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {t.ranges.map((r, i) => (
          <Chip key={r} label={r} active={range === i} onClick={() => setRange(i)} />
        ))}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 600, color: COLORS.text }}>{t.weightTrend}</span>
          {latest !== null && (
            <span style={{ fontFamily: "Sora, sans-serif", fontSize: 18, fontWeight: 700, color: COLORS.teal }}>
              {latest} <span style={{ fontSize: 12, color: COLORS.dim, fontWeight: 400 }}>kg</span>
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input type="number" inputMode="decimal" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} placeholder={t.weightInputPlaceholder} style={{ ...numInputStyle, flex: 1 }} />
          <button onClick={saveWeight} style={{ background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 10, padding: "0 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
            {t.saveWeight}
          </button>
        </div>
        {shownWeights.length >= 2 ? (
          <LineChart points={shownWeights.map((w) => w.kg)} color={COLORS.teal} unit="kg" />
        ) : (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim }}>{t.needMoreWeights}</div>
        )}
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 600, color: COLORS.text }}>{t.exerciseProgress}</span>
          {exBest !== null && (
            <span style={{ fontFamily: "Sora, sans-serif", fontSize: 18, fontWeight: 700, color: COLORS.gold }}>
              {exBest} <span style={{ fontSize: 12, color: COLORS.dim, fontWeight: 400 }}>kg</span>
            </span>
          )}
        </div>
        {trainedKeys.length === 0 ? (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim }}>{t.noProgressYet}</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, overflowX: "auto", paddingBottom: 2 }}>
              {trainedKeys.map((k) => {
                const ex = EXERCISE_LIBRARY.find((e) => e.key === k);
                return ex ? <Chip key={k} label={lang === "de" ? ex.nameDe : ex.name} active={k === activeKey} onClick={() => setExKey(k)} /> : null;
              })}
            </div>
            {exPoints.length >= 2 ? (
              <LineChart points={exPoints} color={COLORS.gold} unit="kg" />
            ) : (
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim }}>{t.exerciseProgressHint}</div>
            )}
          </>
        )}
      </Card>

      <Card>
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 600, color: COLORS.text }}>{t.photoCompare}</span>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={pickPhoto} style={{ display: "none" }} />
        <input ref={galleryRef} type="file" accept="image/*" onChange={pickPhoto} style={{ display: "none" }} />

        {!before ? (
          <div style={{ height: 220, borderRadius: 14, background: COLORS.raised, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px", gap: 10 }}>
            <Camera size={28} strokeWidth={1.4} color={COLORS.dim} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, lineHeight: 1.5 }}>{t.progressPhotosEmpty}</span>
          </div>
        ) : (
          <>
            <div style={{ position: "relative", height: 260, borderRadius: 14, overflow: "hidden", background: COLORS.raised }}>
              <img src={before.dataUrl} alt={t.progressBefore} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - slider}% 0 0)` }}>
                <img src={(after || before).dataUrl} alt={t.progressAfter} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ position: "absolute", top: 0, bottom: 0, left: `${slider}%`, width: 3, background: "#fff", transform: "translateX(-1.5px)", boxShadow: "0 0 8px rgba(0,0,0,0.5)" }} />
              <span style={{ position: "absolute", left: 10, top: 10, display: "flex", alignItems: "center", gap: 5, fontFamily: "Sora, sans-serif", fontSize: 11.5, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.55)", padding: "5px 10px", borderRadius: 9 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#8E97A3", flexShrink: 0 }} />
                {t.progressBefore} · {fmtDate(before.dateISO)}
              </span>
              {after && after.id !== before.id && (
                <span style={{ position: "absolute", right: 10, bottom: 10, display: "flex", alignItems: "center", gap: 5, fontFamily: "Sora, sans-serif", fontSize: 11.5, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.55)", padding: "5px 10px", borderRadius: 9 }}>
                  {t.progressAfter} · {fmtDate(after.dateISO)}
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.gold, flexShrink: 0 }} />
                </span>
              )}
            </div>
            <input type="range" min={0} max={100} value={slider} onChange={(e) => setSlider(Number(e.target.value))} style={{ width: "100%", marginTop: 12, accentColor: COLORS.gold }} />

            {sorted.length < 2 ? (
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 10 }}>{t.progressPhotosHint}</div>
            ) : (
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim, margin: "10px 0 8px" }}>{t.progressTapToCompare}</div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: sorted.length < 2 ? 12 : 0, overflowX: "auto", paddingBottom: 2 }}>
              {sorted.map((p) => {
                const isBefore = p.id === before.id;
                const isAfterSel = (after ? after.id : sorted[sorted.length - 1].id) === p.id;
                return (
                <div key={p.id} style={{ position: "relative", flexShrink: 0, marginTop: 22 }}>
                  {confirmDeleteId === p.id && (
                    <div style={{ position: "absolute", top: -24, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", fontFamily: "Sora, sans-serif", fontSize: 9.5, fontWeight: 700, color: "#fff", background: COLORS.coral, padding: "3px 7px", borderRadius: 7 }}>
                      {t.progressTapAgainDelete}
                    </div>
                  )}
                  <img
                    src={p.dataUrl}
                    onClick={() => {
                      setCompareId(p.id);
                      setConfirmDeleteId(null);
                    }}
                    style={{ width: 56, height: 72, objectFit: "cover", borderRadius: 10, cursor: "pointer", border: isAfterSel ? `2px solid ${COLORS.gold}` : isBefore ? "2px solid #8E97A3" : `2px solid ${COLORS.border}` }}
                  />
                  <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 4 }}>
                    {isBefore && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8E97A3" }} />}
                    {isAfterSel && <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.gold }} />}
                  </div>
                  <div
                    onClick={() => {
                      if (confirmDeleteId === p.id) {
                        setConfirmDeleteId(null);
                        onDeletePhoto(p.id);
                      } else {
                        setConfirmDeleteId(p.id);
                      }
                    }}
                    title={t.progressDeletePhoto}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: confirmDeleteId === p.id ? 24 : 20,
                      height: confirmDeleteId === p.id ? 24 : 20,
                      borderRadius: "50%",
                      background: COLORS.coral,
                      border: confirmDeleteId === p.id ? "2px solid #fff" : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      boxShadow: confirmDeleteId === p.id ? "0 0 0 2px " + COLORS.coral : "none",
                    }}
                  >
                    <X size={confirmDeleteId === p.id ? 14 : 12} color="#fff" />
                  </div>
                </div>
                );
              })}
            </div>
          </>
        )}

        {photoError && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.coral, marginTop: 12 }}>{photoError}</div>}

        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.dim, margin: "16px 0 8px" }}>
          {sorted.length === 0 ? t.progressAddFirst : t.progressAddAnother}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => cameraRef.current && cameraRef.current.click()}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 12, padding: "12px 10px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            <Camera size={16} /> {t.photoTake}
          </button>
          <button
            onClick={() => galleryRef.current && galleryRef.current.click()}
            style={{ flex: 1, background: COLORS.raised, border: `1px solid ${COLORS.border}`, color: COLORS.gold, borderRadius: 12, padding: "12px 10px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            {t.photoGallery}
          </button>
        </div>
      </Card>
    </div>
  );
}

const MOODS = {
  1: { icon: Angry, color: "#E2694F" },
  2: { icon: Frown, color: "#F0954A" },
  3: { icon: Meh, color: "#E0B12F" },
  4: { icon: Smile, color: "#63C46A" },
  5: { icon: Laugh, color: COLORS.gold },
};

function MoodFace({ mood, size = 20 }) {
  const m = MOODS[mood] || MOODS[3];
  const Icon = m.icon;
  return <Icon size={size} color={m.color} />;
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
                <MoodFace mood={e.mood} size={20} />
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
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "14px 8px", borderRadius: 14, cursor: "pointer", background: category === c.type ? COLORS.goldSoft : COLORS.surface, border: `1.5px solid ${category === c.type ? COLORS.gold : COLORS.border}` }}
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
            style={{ width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: m === mood ? COLORS.goldSoft : COLORS.surface, border: `2px solid ${m === mood ? MOODS[m].color : COLORS.border}`, opacity: m === mood ? 1 : 0.6 }}
          >
            <MoodFace mood={m} size={26} />
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

const numInputStyle = {
  width: "100%",
  background: COLORS.raised,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "10px 12px",
  color: COLORS.text,
  fontFamily: "Inter, sans-serif",
  fontSize: 14,
  outline: "none",
};

function WorkoutSession({ t, lang, startedAt, entries, onChangeEntries, onFinish, onDiscard }) {
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const nameOf = (ex) => (lang === "de" ? ex.nameDe : ex.name);

  // Elapsed time is computed from a persisted wall-clock start, not a
  // running counter — so it keeps counting correctly even after the app
  // was backgrounded (music, another app) or fully closed and reopened.
  // This tick just re-renders once a second while the screen is visible.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsedSec = Math.max(0, Math.round((now - startedAt) / 1000));

  useEffect(() => {
    if (!confirmDiscard) return undefined;
    const id = setTimeout(() => setConfirmDiscard(false), 4000);
    return () => clearTimeout(id);
  }, [confirmDiscard]);

  const addExercise = (key) => {
    const isCardio = (EXERCISE_LIBRARY.find((x) => x.key === key) || {}).muscle === "cardio";
    onChangeEntries([...entries, isCardio ? { key, cardio: true, minutes: "" } : { key, sets: [{ weight: "", reps: "" }] }]);
    setPicking(false);
    setQuery("");
  };
  const updateSet = (ei, si, field, value) =>
    onChangeEntries(entries.map((en, i) => (i !== ei ? en : { ...en, sets: en.sets.map((s, j) => (j !== si ? s : { ...s, [field]: value })) })));
  const addSet = (ei) => onChangeEntries(entries.map((en, i) => (i !== ei ? en : { ...en, sets: [...en.sets, { ...en.sets[en.sets.length - 1] }] })));
  const removeSet = (ei, si) =>
    onChangeEntries(entries.map((en, i) => (i !== ei ? en : { ...en, sets: en.sets.filter((_, j) => j !== si) })).filter((en) => en.cardio || en.sets.length > 0));
  const updateMinutes = (ei, value) => onChangeEntries(entries.map((en, i) => (i !== ei ? en : { ...en, minutes: value })));
  const removeEntry = (ei) => onChangeEntries(entries.filter((_, i) => i !== ei));

  const setLog = [];
  const cardioLog = [];
  entries.forEach((en) => {
    if (en.cardio) {
      const mins = parseFloat(String(en.minutes).replace(",", "."));
      if (mins > 0) cardioLog.push({ exerciseKey: en.key, minutes: mins });
    }
  });
  entries.forEach((en) =>
    (en.sets || []).forEach((s) => {
      const w = parseFloat(String(s.weight).replace(",", "."));
      const r = parseInt(s.reps, 10);
      if (r > 0) setLog.push({ exerciseKey: en.key, weight: w > 0 ? w : 0, reps: r });
    })
  );
  const canFinish = setLog.length > 0 || cardioLog.length > 0;

  const finish = () =>
    onFinish({
      durationSec: elapsedSec,
      volumeKg: setLog.reduce((s, l) => s + l.weight * l.reps, 0),
      setLog,
      cardio: cardioLog,
    });

  if (picking) {
    const q = query.trim().toLowerCase();
    const list = EXERCISE_LIBRARY.filter((ex) => !q || ex.name.toLowerCase().includes(q) || ex.nameDe.toLowerCase().includes(q));
    return (
      <div style={{ padding: "0 20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "11px 14px", marginBottom: 14 }}>
          <Search size={16} color={COLORS.dim} />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.libSearchPlaceholder} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: COLORS.text, fontFamily: "Inter, sans-serif", fontSize: 13.5 }} />
        </div>
        <Card style={{ padding: 4, maxHeight: 520, overflowY: "auto", marginBottom: 14 }}>
          {list.map((ex, i) => (
            <div key={ex.key} onClick={() => addExercise(ex.key)} style={{ padding: "12px", cursor: "pointer", borderBottom: i < list.length - 1 ? `1px solid ${COLORS.border}` : "none", fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>
              {nameOf(ex)}
            </div>
          ))}
        </Card>
        <button onClick={() => setPicking(false)} style={{ width: "100%", background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.dim, borderRadius: 14, padding: "13px 18px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          {t.back}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.goldSoft, borderRadius: 999, padding: "8px 18px" }}>
          <Timer size={15} color={COLORS.gold} />
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.gold, fontVariantNumeric: "tabular-nums" }}>{formatDuration(elapsedSec)}</span>
        </div>
      </div>
      {entries.length === 0 && <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, marginTop: 0 }}>{t.emptyWorkout}</p>}

      {entries.map((en, ei) => {
        const ex = EXERCISE_LIBRARY.find((e) => e.key === en.key);
        return (
          <Card key={ei} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text }}>{ex ? nameOf(ex) : en.key}</span>
              {en.cardio && (
                <div onClick={() => removeEntry(ei)} style={{ cursor: "pointer", display: "flex" }}>
                  <X size={16} color={COLORS.dim} />
                </div>
              )}
            </div>
            {en.cardio && <input type="number" inputMode="decimal" min="0" value={en.minutes} onChange={(e) => updateMinutes(ei, e.target.value)} placeholder={t.minutesLabel} style={numInputStyle} />}
            {(en.sets || []).map((s, si) => (
              <div key={si} style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 24px", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, color: COLORS.dim }}>{si + 1}</span>
                <input type="number" inputMode="decimal" min="0" value={s.weight} onChange={(e) => updateSet(ei, si, "weight", e.target.value)} placeholder="kg" style={numInputStyle} />
                <input type="number" inputMode="numeric" min="0" value={s.reps} onChange={(e) => updateSet(ei, si, "reps", e.target.value)} placeholder={t.reps} style={numInputStyle} />
                <div onClick={() => removeSet(ei, si)} style={{ cursor: "pointer", display: "flex" }}>
                  <X size={16} color={COLORS.dim} />
                </div>
              </div>
            ))}
            {!en.cardio && (
              <div onClick={() => addSet(ei)} style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.gold, cursor: "pointer", marginTop: 4 }}>
                + {t.addSet}
              </div>
            )}
          </Card>
        );
      })}

      <div onClick={() => setPicking(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: COLORS.raised, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "13px 14px", marginBottom: 14, cursor: "pointer" }}>
        <Plus size={16} color={COLORS.gold} />
        <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 600, color: COLORS.gold }}>{t.addExerciseBtn}</span>
      </div>

      <button
        disabled={!canFinish}
        onClick={finish}
        style={{ width: "100%", background: canFinish ? COLORS.gold : COLORS.raised, color: canFinish ? COLORS.bg : COLORS.dim, border: "none", borderRadius: 14, padding: "15px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: canFinish ? "pointer" : "default" }}
      >
        {t.finishWorkout}
      </button>

      <div
        onClick={() => {
          if (confirmDiscard) onDiscard();
          else setConfirmDiscard(true);
        }}
        style={{ textAlign: "center", marginTop: 16, fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: confirmDiscard ? COLORS.coral : COLORS.dim, cursor: "pointer" }}
      >
        {confirmDiscard ? t.discardWorkoutConfirm : t.discardWorkout}
      </div>
    </div>
  );
}

function Celebration({ t, data, onClose }) {
  if (!data) return null;
  if (data.kind === "motivation") {
    return (
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(22,26,29,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.bg, borderRadius: 24, padding: "28px 24px", width: "100%", maxWidth: 340, textAlign: "center" }}>
          <div style={{ width: 84, height: 84, borderRadius: "50%", background: "rgba(226,105,79,0.14)", margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Frown size={46} color={COLORS.coral} />
          </div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 800, color: COLORS.text, marginBottom: 8 }}>{t.motivationTitle}</div>
          {data.lines.map((l, i) => (
            <div key={i} style={{ fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 600, color: COLORS.dim, marginBottom: 4 }}>{l}</div>
          ))}
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text, lineHeight: 1.5, marginTop: 10 }}>{data.message}</div>
          <button onClick={onClose} style={{ width: "100%", marginTop: 20, background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}>
            {t.motivationClose}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(22,26,29,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.bg, borderRadius: 24, padding: "28px 24px", width: "100%", maxWidth: 340, textAlign: "center" }}>
        <div style={{ fontSize: 30, letterSpacing: 6, marginBottom: 6 }}>🎉🏆🎉</div>
        <div style={{ width: 84, height: 84, borderRadius: "50%", background: COLORS.goldSoft, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Laugh size={46} color={COLORS.gold} />
        </div>
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 6 }}>{t.celebrateTitle}</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, marginBottom: 14 }}>{t.celebrateSub}</div>
        {data.lines.map((l, i) => (
          <div key={i} style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.gold, marginBottom: 4 }}>{l}</div>
        ))}
        {data.reward ? (
          <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 14, background: COLORS.surface, border: "1px solid " + COLORS.border }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim }}>{t.celebrateReward}</div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text, marginTop: 2 }}>🎁 {data.reward}</div>
          </div>
        ) : null}
        <button onClick={onClose} style={{ width: "100%", marginTop: 20, background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}>
          {t.celebrateClose}
        </button>
      </div>
    </div>
  );
}

function RecordsScreen({ t, lang, personalBests, cardioBests, workoutHistory, customRecords, onCreate, onUpdate }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", unit: "km", value: "", lower: false, reward: "" });
  const [inputs, setInputs] = useState({});
  const nameOf = (key) => {
    const ex = EXERCISE_LIBRARY.find((e) => e.key === key);
    return ex ? (lang === "de" ? ex.nameDe : ex.name) : key;
  };
  const repsAt = (key, weight) => {
    const all = workoutHistory.flatMap((w) => (w.sets || []).filter((x) => x.exerciseKey === key && x.weight === weight).map((x) => x.reps));
    return all.length ? Math.max(...all) : null;
  };
  const strength = Object.keys(personalBests).map((k) => ({ key: k, best: personalBests[k] }));
  const cardio = Object.keys(cardioBests).map((k) => ({ key: k, best: cardioBests[k] }));
  const fmtNum = (v) => (Math.round(v * 100) / 100).toString().replace(".", ",");
  const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid " + COLORS.border };

  const create = () => {
    const v = parseFloat(String(form.value).replace(",", "."));
    if (!form.name.trim() || !(v > 0)) return;
    onCreate({ name: form.name.trim(), unit: form.unit.trim(), value: v, lower: form.lower, reward: form.reward.trim() });
    setForm({ name: "", unit: "km", value: "", lower: false, reward: "" });
    setAdding(false);
  };

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, marginBottom: 10 }}>{t.recordsAuto}</div>
      <Card style={{ marginBottom: 18 }}>
        {strength.length === 0 && cardio.length === 0 ? (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim }}>{t.recordsEmpty}</div>
        ) : (
          <>
            {strength.map((r) => (
              <div key={r.key} style={rowStyle}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>🏆 {nameOf(r.key)}</span>
                <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 700, color: COLORS.gold, textAlign: "right" }}>
                  {fmtNum(r.best)} kg{repsAt(r.key, r.best) ? " × " + repsAt(r.key, r.best) : ""}
                </span>
              </div>
            ))}
            {cardio.map((r) => (
              <div key={r.key} style={rowStyle}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>🏆 {nameOf(r.key)} · {t.cardioLongest}</span>
                <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 700, color: COLORS.gold }}>{fmtNum(r.best)} min</span>
              </div>
            ))}
          </>
        )}
      </Card>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim }}>{t.recordsCustom}</span>
        <span onClick={() => setAdding(!adding)} style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.gold, cursor: "pointer" }}>+ {t.recordsAdd}</span>
      </div>

      {adding && (
        <Card style={{ marginBottom: 12 }}>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.recordName} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input type="number" inputMode="decimal" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder={t.recordValue} style={{ ...numInputStyle, flex: 1, minWidth: 0 }} />
            <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder={t.recordUnit} style={{ ...numInputStyle, flex: 1, minWidth: 0 }} />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <Chip label={t.recordHigher} active={!form.lower} onClick={() => setForm({ ...form, lower: false })} />
            <Chip label={t.recordLower} active={form.lower} onClick={() => setForm({ ...form, lower: true })} />
          </div>
          <input value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} placeholder={t.recordReward} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", marginBottom: 10 }} />
          <button onClick={create} style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 12, padding: "12px 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {t.recordCreate}
          </button>
        </Card>
      )}

      {customRecords.map((r) => {
        const pts = r.history.map((h) => h.value);
        return (
          <Card key={r.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text }}>🏆 {r.name}</span>
              <span style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 700, color: COLORS.gold }}>{fmtNum(r.best)} {r.unit}</span>
            </div>
            {r.reward ? <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginBottom: 8 }}>🎁 {r.reward}</div> : null}
            {pts.length >= 2 && <LineChart points={pts} color={COLORS.gold} unit={r.unit} height={120} />}
            <input value={inputs["rw" + r.id] || ""} onChange={(e) => setInputs({ ...inputs, ["rw" + r.id]: e.target.value })} placeholder={t.recordRewardNow} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", marginTop: 10 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input type="number" inputMode="decimal" value={inputs[r.id] || ""} onChange={(e) => setInputs({ ...inputs, [r.id]: e.target.value })} placeholder={t.recordNewValue + " (" + r.unit + ")"} style={{ ...numInputStyle, flex: 1, minWidth: 0 }} />
              <button
                onClick={() => {
                  const v = parseFloat(String(inputs[r.id] || "").replace(",", "."));
                  if (v > 0) {
                    onUpdate(r.id, v, (inputs["rw" + r.id] || "").trim());
                    setInputs({ ...inputs, [r.id]: "", ["rw" + r.id]: "" });
                  }
                }}
                style={{ background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 10, padding: "0 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                {t.stepsSave}
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function WorkoutSummary({ t, lang, summary, onDone }) {
  const prExercises = (summary?.newBests || []).map(({ exerciseKey, weight, minutes }) => {
    const ex = EXERCISE_LIBRARY.find((e) => e.key === exerciseKey);
    return { key: exerciseKey, name: ex ? (lang === "de" ? ex.nameDe : ex.name) : exerciseKey, value: minutes ? minutes + " min" : weight + "kg" };
  });
  return (
    <div style={{ padding: "10px 20px 24px", textAlign: "center" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: COLORS.goldSoft, margin: "10px auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {prExercises.length > 0 ? <Laugh size={38} color={COLORS.gold} /> : <Award size={30} color={COLORS.gold} />}
      </div>
      {prExercises.length > 0 && <div style={{ fontSize: 26, marginTop: -8, marginBottom: 8 }}>🎉🏆🎉</div>}
      <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 24px" }}>{t.workoutDone}</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18, textAlign: "left" }}>
        <Card>
          <Timer size={17} color={COLORS.teal} />
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text, marginTop: 8 }}>{formatDuration(summary?.durationSec)}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 2 }}>{t.duration}</div>
        </Card>
        <Card>
          <Flame size={17} color={COLORS.coral} />
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text, marginTop: 8 }}>{Math.round(summary?.volumeKg || 0)} kg</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 2 }}>{t.volume}</div>
        </Card>
      </div>

      {summary?.burnedKcal > 0 && <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.coral, marginBottom: 18 }}>≈ {summary.burnedKcal} {t.kcalBurnedLabel}</div>}

      {summary?.motivation && (
        <Card style={{ textAlign: "left", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Frown size={28} color={COLORS.coral} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 700, color: COLORS.text, marginBottom: 3 }}>{t.motivationTitle}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim, lineHeight: 1.45 }}>{summary.motivation}</div>
            </div>
          </div>
        </Card>
      )}

      {prExercises.length > 0 && (
        <Card style={{ textAlign: "left", marginBottom: 20 }}>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, marginBottom: 10 }}>{t.newRecords}</div>
          {prExercises.map((ex) => (
            <div key={ex.key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.text }}>{ex.name}</span>
              <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 700, color: COLORS.gold }}>{ex.value}</span>
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

function FoodSearchScreen({ t, lang, onAdd, onOpenBarcode, onOpenPhoto, myMeals = [], onOpenMyMeals }) {
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
    onAdd({ name: selected.name, kcal: scaled.kcal, protein: scaled.protein, carbs: scaled.carbs, fat: scaled.fat, grams });
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

          <div onClick={onOpenPhoto} style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", background: COLORS.goldSoft, border: `1px solid ${COLORS.gold}`, borderRadius: 14, padding: "12px 14px", marginBottom: 12, cursor: "pointer" }}>
            <Camera size={16} color={COLORS.gold} />
            <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.gold }}>{t.photoScanBtn}</span>
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
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim }}>★ {t.myMealsTitle}</span>
                <span onClick={onOpenMyMeals} style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.gold, cursor: "pointer" }}>+ {t.myMealSave}</span>
              </div>
              {myMeals.length === 0 ? (
                <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginTop: 12 }}>{t.searchTypeMore}</div>
              ) : (
                <Card style={{ padding: 4, maxHeight: 300, overflowY: "auto" }}>
                  {myMeals.map((m, i) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        onAdd({ name: m.name, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat });
                        setToast(m.name);
                        setTimeout(() => setToast(null), 1400);
                      }}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderBottom: i < myMeals.length - 1 ? "1px solid " + COLORS.border : "none", cursor: "pointer" }}
                    >
                      <div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>{m.name}</div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim, marginTop: 2 }}>{m.kcal} kcal</div>
                      </div>
                      <div style={{ width: 30, height: 30, borderRadius: 9, background: COLORS.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Plus size={15} color={COLORS.gold} />
                      </div>
                    </div>
                  ))}
                </Card>
              )}
            </>
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
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: COLORS.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
const HEALTH_STORE_NAME = Capacitor.getPlatform() === "ios" ? "Apple Health" : "Health Connect";

function usePersisted(key, init) {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem("asfit." + key);
      if (raw !== null) return JSON.parse(raw);
    } catch {
      /* storage unavailable */
    }
    return init;
  });
  useEffect(() => {
    try {
      localStorage.setItem("asfit." + key, JSON.stringify(v));
    } catch {
      /* storage unavailable */
    }
  }, [key, v]);
  return [v, setV];
}

const todayStamp = () => new Date().toLocaleDateString("sv");

// Daily values (meals, water, steps) reset when the date changes.
function usePersistedDaily(key, init) {
  const [v, setV] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("asfit." + key));
      if (raw && raw.d === todayStamp()) return raw.v;
      if (raw && raw.d) {
        // Archive the previous day so history is never lost.
        const daily = JSON.parse(localStorage.getItem("asfit.daily") || "{}");
        daily[raw.d] = { ...(daily[raw.d] || {}), [key]: raw.v };
        localStorage.setItem("asfit.daily", JSON.stringify(daily));
      }
    } catch {
      /* storage unavailable */
    }
    return init;
  });
  useEffect(() => {
    try {
      localStorage.setItem("asfit." + key, JSON.stringify({ d: todayStamp(), v }));
    } catch {
      /* storage unavailable */
    }
  }, [key, v]);
  return [v, setV];
}

function BarcodeScanScreen({ t, onAdd, onDone }) {
  const [found, setFound] = useState(null);
  // idle | scanning | loading | notFound | error | unsupported | moduleInstalling | webPermissionDenied | webUnsupported
  const [status, setStatus] = useState("idle");
  const grams = 100;
  const scaled = found ? scale(found.per100, grams) : null;
  const videoRef = useRef(null);
  const controlsRef = useRef(null);

  const stopWebScan = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
  };
  useEffect(() => stopWebScan, []);

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

  // Browsers (iPhone Safari, desktop Chrome, …) have no ML Kit, so this uses
  // a plain JS decoder against the live camera feed via getUserMedia instead.
  // Less robust than the native scanner, but works anywhere with a camera.
  const scanWeb = async () => {
    setStatus("scanning");
    try {
      const [{ BrowserMultiFormatReader }, { BarcodeFormat: ZBarcodeFormat, DecodeHintType, NotFoundException }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [ZBarcodeFormat.EAN_13, ZBarcodeFormat.EAN_8, ZBarcodeFormat.UPC_A, ZBarcodeFormat.UPC_E, ZBarcodeFormat.CODE_128]);
      const reader = new BrowserMultiFormatReader(hints);
      const controls = await reader.decodeFromConstraints({ video: { facingMode: "environment" } }, videoRef.current, (result, err) => {
        if (result) {
          stopWebScan();
          lookupBarcode(result.getText());
        } else if (err && !(err instanceof NotFoundException)) {
          stopWebScan();
          setStatus("error");
        }
      });
      controlsRef.current = controls;
    } catch (err) {
      setStatus(err && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") ? "webPermissionDenied" : "webUnsupported");
    }
  };

  const errorText = {
    error: t.serverError,
    notFound: t.barcodeNotFound,
    unsupported: t.barcodeUnsupported,
    moduleInstalling: t.barcodeModuleInstalling,
    webPermissionDenied: t.barcodeWebPermissionDenied,
    webUnsupported: t.barcodeWebUnsupported,
  }[status];

  return (
    <div style={{ padding: "10px 20px 24px" }}>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim, marginTop: 0, marginBottom: 16 }}>{t.barcodeHint}</p>
      <div style={{ position: "relative", height: 220, borderRadius: 18, background: "linear-gradient(160deg,#1c1d20,#0e0f11)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, overflow: "hidden" }}>
        {!IS_NATIVE_APP && (
          <video ref={videoRef} muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: status === "scanning" ? "block" : "none" }} />
        )}
        {status !== "scanning" || IS_NATIVE_APP ? <Barcode size={48} strokeWidth={1.2} color={COLORS.dim} /> : null}
        {[
          { top: 14, left: 14, rotate: 0 },
          { top: 14, right: 14, rotate: 90 },
          { bottom: 14, left: 14, rotate: -90 },
          { bottom: 14, right: 14, rotate: 180 },
        ].map((pos, i) => (
          <div key={i} style={{ position: "absolute", width: 22, height: 22, borderTop: `3px solid ${COLORS.gold}`, borderLeft: `3px solid ${COLORS.gold}`, transform: `rotate(${pos.rotate}deg)`, ...pos }} />
        ))}
      </div>

      {status === "scanning" && !IS_NATIVE_APP ? (
        <>
          <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginBottom: 14 }}>{t.barcodeScanning}</div>
          <button
            onClick={() => {
              stopWebScan();
              setStatus("idle");
            }}
            style={{ width: "100%", background: COLORS.raised, border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            {t.cancelScan}
          </button>
        </>
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
              onAdd({ name: found.name, kcal: scaled.kcal, protein: scaled.protein, carbs: scaled.carbs, fat: scaled.fat, grams });
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
          <button onClick={IS_NATIVE_APP ? scanReal : scanWeb} style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {status === "idle" ? t.scanBarcode : t.scanAgain}
          </button>
        </>
      )}
    </div>
  );
}

/* ---------------- Assistant (support / questions) ---------------- */

function AssistantChat({ t, lang, context, hello, minHeight = 620 }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0 || busy) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(API_BASE + "/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, lang, context }),
      });
      if (res.status === 503) {
        setError(t.assistantNotConfigured);
      } else if (!res.ok) {
        setError(t.assistantError);
      } else {
        const data = await res.json();
        setMessages([...next, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setError(t.serverError);
    } finally {
      setBusy(false);
    }
  };

  const bubble = (m, i) => (
    <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
      <div
        style={{
          maxWidth: "86%",
          padding: "10px 14px",
          borderRadius: 16,
          fontFamily: "Inter, sans-serif",
          fontSize: 13.5,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          background: m.role === "user" ? COLORS.gold : COLORS.surface,
          color: m.role === "user" ? COLORS.bg : COLORS.text,
          border: m.role === "user" ? "none" : "1px solid " + COLORS.border,
        }}
      >
        {m.content}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight }}>
      <div style={{ flex: 1 }}>
        {bubble({ role: "assistant", content: hello }, "hello")}
        {messages.map(bubble)}
        {busy && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginBottom: 10 }}>{t.assistantThinking}</div>}
        {error && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.coral, marginBottom: 10 }}>{error}</div>}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, position: "sticky", bottom: 0, background: COLORS.bg, paddingTop: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t.assistantPlaceholder}
          style={{ ...numInputStyle, flex: 1, borderRadius: 14, padding: "12px 14px" }}
        />
        <button onClick={send} disabled={busy || !input.trim()} style={{ width: 46, borderRadius: 14, border: "none", background: busy || !input.trim() ? COLORS.raised : COLORS.gold, cursor: busy || !input.trim() ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Send size={18} color={busy || !input.trim() ? COLORS.dim : COLORS.bg} />
        </button>
      </div>
    </div>
  );
}

function AssistantScreen({ t, lang }) {
  return (
    <div style={{ padding: "0 20px 16px" }}>
      <AssistantChat t={t} lang={lang} hello={t.assistantHello} />
    </div>
  );
}

function PrivacyScreen({ t }) {
  return (
    <div style={{ padding: "0 20px 24px" }}>
      {t.privacySections.map((sec) => (
        <Card key={sec.h} style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14.5, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>{sec.h}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, lineHeight: 1.55 }}>{sec.p}</div>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- AI photo scan ---------------- */

// Shrinks the photo before upload so the request stays small and fast.
function downscaleImage(file, max = 1024) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const f = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * f);
      c.height = Math.round(img.height * f);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function PhotoScanScreen({ t, lang, onAdd, onDone }) {
  const [status, setStatus] = useState("idle"); // idle | analyzing | result | noFood | notConfigured | error
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);
  const galleryRef = useRef(null);

  const onPick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setStatus("analyzing");
    try {
      const dataUrl = await downscaleImage(file);
      setPreview(dataUrl);
      const res = await fetch(API_BASE + "/api/food/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl, lang }),
      });
      if (res.status === 503) return setStatus("notConfigured");
      if (!res.ok) throw new Error("http " + res.status);
      const data = await res.json();
      if (!data.isFood) return setStatus("noFood");
      setResult(data);
      setStatus("result");
    } catch {
      setStatus("error");
    }
  };

  const btn = { width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" };
  const msg = { textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginBottom: 14 };
  const total = result ? result.total : null;

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPick} style={{ display: "none" }} />
      <input ref={galleryRef} type="file" accept="image/*" onChange={onPick} style={{ display: "none" }} />

      {preview && status !== "idle" && <img src={preview} alt="" style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 16, marginBottom: 16 }} />}

      {status === "idle" && (
        <>
          <p style={{ ...msg, marginTop: 0, marginBottom: 20 }}>{t.photoHint}</p>
          <button onClick={() => fileRef.current && fileRef.current.click()} style={btn}>
            {t.photoTake}
          </button>
          <div onClick={() => galleryRef.current && galleryRef.current.click()} style={{ textAlign: "center", marginTop: 14, fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 600, color: COLORS.gold, cursor: "pointer" }}>{t.photoGallery}</div>
        </>
      )}

      {status === "analyzing" && <div style={{ ...msg, marginTop: 8 }}>{t.photoAnalyzing}</div>}

      {(status === "noFood" || status === "notConfigured" || status === "error") && (
        <>
          <div style={msg}>{status === "noFood" ? t.photoNoFood : status === "notConfigured" ? t.photoNotConfigured : t.serverError}</div>
          <button onClick={() => fileRef.current && fileRef.current.click()} style={btn}>
            {t.photoAgain}
          </button>
          <div onClick={() => galleryRef.current && galleryRef.current.click()} style={{ textAlign: "center", marginTop: 14, fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 600, color: COLORS.gold, cursor: "pointer" }}>{t.photoGallery}</div>
        </>
      )}

      {status === "result" && result && (
        <Card>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 17, fontWeight: 700, color: COLORS.text, marginBottom: 14 }}>{result.name || result.items[0].name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
            {[
              { label: "kcal", val: total.kcal, color: COLORS.text },
              { label: t.protein, val: total.protein + "g", color: COLORS.teal },
              { label: t.carbs, val: total.carbs + "g", color: COLORS.gold },
              { label: t.fat, val: total.fat + "g", color: COLORS.coral },
            ].map((x, i) => (
              <div key={i} style={{ background: COLORS.raised, borderRadius: 12, padding: "10px 4px", textAlign: "center" }}>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: x.color }}>{x.val}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: COLORS.dim, marginTop: 2 }}>{x.label}</div>
              </div>
            ))}
          </div>
          {result.items.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.text }}>
              <span>
                {it.name}
                <span style={{ color: COLORS.dim }}> · {it.grams}g</span>
              </span>
              <span style={{ color: COLORS.dim }}>{it.kcal} kcal</span>
            </div>
          ))}
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim, margin: "12px 0 16px" }}>{t.photoEstimate}</div>
          <button
            onClick={() => {
              onAdd({ name: result.name || result.items[0].name, kcal: total.kcal, protein: total.protein, carbs: total.carbs, fat: total.fat, grams: Math.round(total.grams) });
              onDone();
            }}
            style={btn}
          >
            {t.addItem}
          </button>
          <div onClick={() => setStatus("idle")} style={{ textAlign: "center", marginTop: 12, fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, cursor: "pointer" }}>
            {t.photoAgain}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Steps card ---------------- */

function StepsCard({ t, steps, source, weightKg, goal, onSaveGoal, onConnect, onSaveManual }) {
  const [input, setInput] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const pct = Math.min(100, (steps / goal) * 100);
  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Footprints size={17} color={COLORS.gold} />
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 600, color: COLORS.text }}>{t.stepsTitle}</span>
        </div>
        <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.text, whiteSpace: "nowrap" }}>
          {steps.toLocaleString("de-DE")}
          <span onClick={() => { setGoalInput(String(goal)); setEditingGoal(!editingGoal); }} style={{ color: COLORS.gold, fontWeight: 600, cursor: "pointer", textDecoration: "underline dotted" }}> / {goal.toLocaleString("de-DE")}</span>
        </span>
      </div>
      {editingGoal && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input type="number" inputMode="numeric" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder={t.stepsGoalEdit} style={{ ...numInputStyle, flex: 1 }} />
          <button
            onClick={() => {
              const v = parseInt(goalInput, 10);
              if (v >= 500 && v <= 100000) { onSaveGoal(v); setEditingGoal(false); }
            }}
            style={{ background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 10, padding: "0 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            {t.stepsSave}
          </button>
        </div>
      )}
      <div style={{ height: 10, borderRadius: 5, background: COLORS.raised, overflow: "hidden", marginBottom: 8 }}>
        <div style={{ height: "100%", width: pct + "%", background: COLORS.gold, borderRadius: 5, transition: "width .5s ease" }} />
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginBottom: source === "health" ? 0 : 10 }}>
        ≈ {stepsKcal(steps, weightKg)} kcal {t.stepsBurned}
      </div>
      {source === "connect" && (
        <button onClick={onConnect} style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 12, padding: "10px 12px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          {t.stepsConnect}
        </button>
      )}
      {(source === "manual" || source === "unavailable") && (
        <>
          {source === "unavailable" && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginBottom: 8 }}>{t.stepsUnavailable}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" inputMode="numeric" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.stepsManualPlaceholder} style={{ ...numInputStyle, flex: 1 }} />
            <button
              onClick={() => {
                const v = parseInt(input, 10);
                if (v >= 0) {
                  onSaveManual(v);
                  setInput("");
                }
              }}
              style={{ background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 10, padding: "0 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              {t.stepsSave}
            </button>
          </div>
        </>
      )}
    </Card>
  );
}

/* ---------------- Recipes ---------------- */

function MyMealsScreen({ t, myMeals, onSave, onDelete, onAddTo, initialSlot = "snacks" }) {
  const [slot, setSlot] = useState(initialSlot);
  const [toast, setToast] = useState(null);
  const slots = [
    { key: "breakfast", label: t.breakfast },
    { key: "lunch", label: t.lunch },
    { key: "dinner", label: t.dinner },
    { key: "snacks", label: t.snacks },
  ];
  const [f, setF] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
  const num = (v) => Math.max(0, Math.round(parseFloat(String(v).replace(",", ".")) || 0));
  const save = () => {
    if (!f.name.trim() || !(num(f.kcal) > 0)) return;
    onSave({ name: f.name.trim(), kcal: num(f.kcal), protein: num(f.protein), carbs: num(f.carbs), fat: num(f.fat) });
    setF({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
  };
  const field = (k, label) => (
    <input type="number" inputMode="decimal" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={label} style={{ ...numInputStyle, flex: 1, minWidth: 0 }} />
  );
  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim, marginBottom: 12 }}>{t.myMealsHint}</div>
      <Card style={{ marginBottom: 16 }}>
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={t.myMealName} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {field("kcal", "kcal")}
          {field("protein", t.protein + " g")}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {field("carbs", t.carbs + " g")}
          {field("fat", t.fat + " g")}
        </div>
        <button onClick={save} style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 12, padding: "12px 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          {t.myMealSave}
        </button>
      </Card>
      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, marginBottom: 8 }}>{t.myMealsPick}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, overflowX: "auto" }}>
        {slots.map((sl) => (
          <Chip key={sl.key} label={sl.label} active={slot === sl.key} onClick={() => setSlot(sl.key)} />
        ))}
      </div>
      <Card style={{ padding: 4 }}>
        {myMeals.length === 0 ? (
          <div style={{ padding: 12, fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim }}>{t.myMealsEmpty}</div>
        ) : (
          myMeals.map((m, i) => (
            <div
              key={m.id}
              onClick={() => {
                onAddTo(slot, { name: m.name, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat });
                setToast(m.name);
                setTimeout(() => setToast(null), 1400);
              }}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderBottom: i < myMeals.length - 1 ? "1px solid " + COLORS.border : "none", cursor: "pointer" }}
            >
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>{m.name}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim, marginTop: 2 }}>
                  {m.kcal} kcal · {m.protein}g P · {m.carbs}g C · {m.fat}g F
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: COLORS.goldSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={15} color={COLORS.gold} />
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(m.id);
                  }}
                  style={{ cursor: "pointer", padding: 6 }}
                >
                  <Trash2 size={16} color={COLORS.dim} />
                </div>
              </div>
            </div>
          ))
        )}
      </Card>
      {toast && (
        <div style={{ position: "fixed", left: 20, right: 20, bottom: 90, background: COLORS.gold, color: COLORS.bg, borderRadius: 12, padding: "11px 16px", display: "flex", alignItems: "center", gap: 8, fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, boxShadow: "0 10px 24px rgba(0,0,0,0.3)", zIndex: 50 }}>
          <Check size={15} /> {toast} — {t.addedToast}
        </div>
      )}
    </div>
  );
}

function CheatScreen({ t, cheats, onAdd, onDelete }) {
  const [type, setType] = useState("meal");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const todayMs = new Date(new Date().toLocaleDateString("sv") + "T00:00").getTime();
  const rows = cheats
    .map((c) => ({ ...c, diff: Math.round((new Date(c.date + "T00:00").getTime() - todayMs) / 86400000) }))
    .sort((a, b) => (a.diff >= 0 && b.diff >= 0 ? a.diff - b.diff : b.diff - a.diff));
  const upcoming = rows.filter((r) => r.diff >= 0);
  const past = rows.filter((r) => r.diff < 0).slice(0, 5);
  const label = (r) => (r.diff === 0 ? t.cheatToday : r.diff === 1 ? t.cheatTomorrow : t.cheatIn + " " + r.diff + " " + t.cheatDays);
  const add = () => {
    if (!date) return;
    onAdd({ id: Date.now(), type, date, note: note.trim() });
    setDate("");
    setNote("");
  };
  const row = (r, dim) => (
    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderBottom: "1px solid " + COLORS.border, opacity: dim ? 0.55 : 1 }}>
      <div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>
          {r.type === "day" ? "🍕 " + t.cheatDay : "🍔 " + t.cheatMeal}
          {r.note ? <span style={{ color: COLORS.dim }}> · {r.note}</span> : null}
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim, marginTop: 2 }}>
          {new Date(r.date + "T00:00").toLocaleDateString()} · {dim ? t.cheatPast : label(r)}
        </div>
      </div>
      <div onClick={() => onDelete(r.id)} style={{ cursor: "pointer", padding: 6 }}>
        <Trash2 size={16} color={COLORS.dim} />
      </div>
    </div>
  );
  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim, marginBottom: 12 }}>{t.cheatTip}</div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <Chip label={t.cheatMeal} active={type === "meal"} onClick={() => setType("meal")} />
          <Chip label={t.cheatDay} active={type === "day"} onClick={() => setType("day")} />
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", marginBottom: 8 }} />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.cheatNote} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", marginBottom: 10 }} />
        <button onClick={add} style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 12, padding: "12px 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          {t.cheatAdd}
        </button>
      </Card>
      {(upcoming.length > 0 || past.length > 0) && (
        <Card style={{ padding: 0 }}>
          {upcoming.map((r) => row(r, false))}
          {past.map((r) => row(r, true))}
        </Card>
      )}
    </div>
  );
}

function RecipesScreen({ t, lang, onAdd, onDone, customRecipes = [], onSaveRecipe, onDeleteRecipe }) {
  const [cat, setCat] = useState("all");
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const [mode, setMode] = useState("list"); // list | form
  const emptyForm = { name: "", category: "lunch", kcal: "", protein: "", carbs: "", fat: "", ingredients: "" };
  const [form, setForm] = useState(emptyForm);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState(null);

  const categories = [
    { key: "all", label: t.foodCatAll },
    { key: "mine", label: t.recipesMine },
    { key: "breakfast", label: t.breakfast },
    { key: "lunch", label: t.lunch },
    { key: "dinner", label: t.dinner },
    { key: "snacks", label: t.snacks },
  ];

  const allRecipes = [...customRecipes, ...RECIPES];
  const results = allRecipes.filter((r) => cat === "all" || (cat === "mine" ? r.custom : r.category === cat));

  const confirmAdd = () => {
    const name = lang === "de" ? selected.nameDe : selected.name;
    onAdd({ name, kcal: selected.kcal, protein: selected.protein, carbs: selected.carbs, fat: selected.fat });
    setToast(name);
    setSelected(null);
    setTimeout(() => setToast(null), 1400);
  };

  const num = (v) => Math.max(0, Math.round(parseFloat(String(v).replace(",", ".")) || 0));

  const generate = async () => {
    const wish = aiPrompt.trim();
    if (!wish || aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch(API_BASE + "/api/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: wish, lang }),
      });
      if (res.status === 503) setAiError(t.assistantNotConfigured);
      else if (!res.ok) setAiError(t.assistantError);
      else {
        const r = await res.json();
        setForm({ name: r.name, category: r.category, kcal: String(r.kcal), protein: String(r.protein), carbs: String(r.carbs), fat: String(r.fat), ingredients: r.ingredients.join("\n") });
      }
    } catch {
      setAiError(t.serverError);
    } finally {
      setAiBusy(false);
    }
  };

  const saveForm = () => {
    const ingredients = form.ingredients.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!form.name.trim() || ingredients.length === 0) return;
    onSaveRecipe({
      key: "c" + Date.now(),
      name: form.name.trim(),
      nameDe: form.name.trim(),
      category: form.category,
      kcal: num(form.kcal),
      protein: num(form.protein),
      carbs: num(form.carbs),
      fat: num(form.fat),
      ingredients,
      ingredientsDe: ingredients,
      custom: true,
    });
    setForm(emptyForm);
    setAiPrompt("");
    setMode("list");
    setCat("mine");
  };

  const smallInput = (k, label) => (
    <input type="number" inputMode="decimal" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={label} style={{ ...numInputStyle, flex: 1, minWidth: 0 }} />
  );

  return (
    <div style={{ padding: "0 20px 24px", position: "relative" }}>
      {mode === "form" && !selected ? (
        <>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>✨ {t.recipeCreateAi}</div>
            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder={t.recipeAiPrompt} rows={2} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", resize: "vertical", marginBottom: 8, fontFamily: "Inter, sans-serif" }} />
            <button onClick={generate} disabled={aiBusy || !aiPrompt.trim()} style={{ width: "100%", background: aiBusy || !aiPrompt.trim() ? COLORS.raised : COLORS.gold, color: aiBusy || !aiPrompt.trim() ? COLORS.dim : COLORS.bg, border: "none", borderRadius: 12, padding: "11px 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13.5, cursor: aiBusy ? "default" : "pointer" }}>
              {aiBusy ? t.recipeAiBusy : t.recipeAiGo}
            </button>
            {aiError && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.coral, marginTop: 8 }}>{aiError}</div>}
          </Card>

          <Card>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.recipeFormName} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 8, marginBottom: 8, overflowX: "auto" }}>
              {categories.filter((c) => c.key !== "all" && c.key !== "mine").map((c) => (
                <Chip key={c.key} label={c.label} active={form.category === c.key} onClick={() => setForm({ ...form, category: c.key })} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              {smallInput("kcal", "kcal")}
              {smallInput("protein", t.protein + " g")}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              {smallInput("carbs", t.carbs + " g")}
              {smallInput("fat", t.fat + " g")}
            </div>
            <textarea value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} placeholder={t.recipeIngredientsHint} rows={5} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", resize: "vertical", marginBottom: 10, fontFamily: "Inter, sans-serif" }} />
            <button onClick={saveForm} style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 12, padding: "12px 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              {t.recipeSave}
            </button>
            <div onClick={() => setMode("list")} style={{ textAlign: "center", marginTop: 12, fontFamily: "Sora, sans-serif", fontSize: 13, color: COLORS.dim, cursor: "pointer" }}>{t.recipeCancel}</div>
          </Card>
        </>
      ) : !selected ? (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button onClick={() => setMode("form")} style={{ flex: 1, background: COLORS.goldSoft, border: "1px solid " + COLORS.gold, color: COLORS.gold, borderRadius: 12, padding: "10px 8px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>
              ✨ {t.recipeCreateAi}
            </button>
            <button onClick={() => setMode("form")} style={{ flex: 1, background: COLORS.raised, border: "1px solid " + COLORS.border, color: COLORS.gold, borderRadius: 12, padding: "10px 8px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>
              + {t.recipeCreateOwn}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
            {categories.map((c) => (
              <Chip key={c.key} label={c.label} active={cat === c.key} onClick={() => setCat(c.key)} />
            ))}
          </div>
          <Card style={{ padding: 4, maxHeight: 480, overflowY: "auto" }}>
            {results.length === 0 && <div style={{ padding: 12, fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim }}>{t.noResults}</div>}
            {results.map((r, i) => (
              <div
                key={r.key}
                onClick={() => setSelected(r)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderBottom: i < results.length - 1 ? "1px solid " + COLORS.border : "none", cursor: "pointer" }}
              >
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>{r.custom ? "★ " : ""}{lang === "de" ? r.nameDe : r.name}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim, marginTop: 2 }}>
                    {r.kcal} kcal {t.perServing}
                  </div>
                </div>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: COLORS.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Plus size={15} color={COLORS.gold} />
                </div>
              </div>
            ))}
          </Card>
        </>
      ) : (
        <>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 17, fontWeight: 700, color: COLORS.text }}>{lang === "de" ? selected.nameDe : selected.name}</div>
            <div onClick={() => setSelected(null)} style={{ cursor: "pointer" }}>
              <X size={18} color={COLORS.dim} />
            </div>
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginBottom: 20 }}>
            {selected.kcal} kcal {t.perServing}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 22 }}>
            {[
              { label: "kcal", val: selected.kcal, color: COLORS.text },
              { label: t.protein, val: selected.protein + "g", color: COLORS.teal },
              { label: t.carbs, val: selected.carbs + "g", color: COLORS.gold },
              { label: t.fat, val: selected.fat + "g", color: COLORS.coral },
            ].map((s, i) => (
              <div key={i} style={{ background: COLORS.raised, borderRadius: 12, padding: "10px 4px", textAlign: "center" }}>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: COLORS.dim, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, marginBottom: 10 }}>{t.ingredients}</div>
          <div style={{ marginBottom: 22 }}>
            {(lang === "de" ? selected.ingredientsDe : selected.ingredients).map((ing, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.text }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: COLORS.gold, flexShrink: 0 }} />
                {ing}
              </div>
            ))}
          </div>

          <button onClick={confirmAdd} style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {t.logRecipe}
          </button>
          {selected.custom && (
            <div
              onClick={() => {
                onDeleteRecipe(selected.key);
                setSelected(null);
              }}
              style={{ textAlign: "center", marginTop: 14, fontFamily: "Sora, sans-serif", fontSize: 13, color: COLORS.coral, cursor: "pointer" }}
            >
              {t.recipeDelete}
            </div>
          )}
        </Card>
        <Card style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <MessageCircle size={16} color={COLORS.gold} />
            <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>{t.recipeAskTitle}</span>
          </div>
          <AssistantChat
            key={selected.key}
            t={t}
            lang={lang}
            minHeight={180}
            hello={t.recipeAskHello}
            context={"Recipe: " + selected.name + ". Ingredients: " + selected.ingredients.join(", ") + ". Per serving: " + selected.kcal + " kcal, " + selected.protein + " g protein, " + selected.carbs + " g carbs, " + selected.fat + " g fat."}
          />
        </Card>
        </>
      )}

      {toast && (
        <div style={{ position: "absolute", left: 20, right: 20, bottom: 14, background: COLORS.gold, color: COLORS.bg, borderRadius: 12, padding: "11px 16px", display: "flex", alignItems: "center", gap: 8, fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, boxShadow: "0 10px 24px rgba(0,0,0,0.3)" }}>
          <Check size={15} /> {toast} — {t.addedToast}
        </div>
      )}
    </div>
  );
}

/* ---------------- Exercise library */
function ExerciseLibrary({ t, lang, mode, onAdd, onFinishPicking, personalBests = {}, workoutHistory = [], onQuickLog }) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("all");
  const [selected, setSelected] = useState(null);
  const [wInput, setWInput] = useState("");
  const [rInput, setRInput] = useState("");
  const [saved, setSaved] = useState(false);

  const muscles = [
    { key: "all", label: t.muscleAll },
    { key: "chest", label: t.muscleChest },
    { key: "back", label: t.muscleBack },
    { key: "legs", label: t.muscleLegs },
    { key: "shoulders", label: t.muscleShoulders },
    { key: "arms", label: t.muscleArms },
    { key: "core", label: t.muscleCore },
    { key: "glutes", label: t.muscleGlutes },
    { key: "cardio", label: t.muscleCardio },
    { key: "full", label: t.muscleFull },
  ];

  const nameOf = (ex) => (lang === "de" ? ex.nameDe : ex.name);
  const cueOf = (ex) => (lang === "de" ? ex.cueDe : ex.cue);
  // Search matches either language and tolerates simple English plurals, so
  // "biceps curls" still finds "Bicep Curl" even while the UI is in German.
  const matchesQuery = (ex) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const targets = [ex.name.toLowerCase(), ex.nameDe.toLowerCase()];
    if (targets.some((tgt) => tgt.includes(q))) return true;
    return q.split(/\s+/).filter(Boolean).every((tok) => {
      const alt = tok.length > 3 && tok.endsWith("s") ? tok.slice(0, -1) : tok;
      return targets.some((tgt) => tgt.includes(tok) || tgt.includes(alt));
    });
  };
  const results = EXERCISE_LIBRARY.filter((ex) => (muscle === "all" || ex.muscle === muscle) && matchesQuery(ex));

  if (selected && mode !== "pick") {
    const isCardio = selected.muscle === "cardio";
    const history = workoutHistory
      .map((w) => {
        if (isCardio) {
          const c = (w.cardio || []).filter((x) => x.exerciseKey === selected.key);
          return c.length ? { dateISO: w.dateISO, text: c.map((x) => x.minutes + " min").join(", ") } : null;
        }
        const ss = (w.sets || []).filter((x) => x.exerciseKey === selected.key);
        return ss.length ? { dateISO: w.dateISO, text: ss.map((x) => x.weight + " kg × " + x.reps).join(", ") } : null;
      })
      .filter(Boolean)
      .reverse()
      .slice(0, 6);
    const best = personalBests[selected.key];
    const chartPoints = workoutHistory
      .map((w) => {
        if (isCardio) {
          const c = (w.cardio || []).filter((x) => x.exerciseKey === selected.key).map((x) => x.minutes);
          return c.length ? c.reduce((a, b) => a + b, 0) : null;
        }
        const ws = (w.sets || []).filter((x) => x.exerciseKey === selected.key).map((x) => x.weight);
        return ws.length ? Math.max(...ws) : null;
      })
      .filter((v) => v !== null);
    const allReps = workoutHistory.flatMap((w) => (w.sets || []).filter((x) => x.exerciseKey === selected.key).map((x) => x.reps));
    const maxReps = allReps.length ? Math.max(...allReps) : null;
    const save = () => {
      if (isCardio) {
        const mins = parseFloat(String(wInput).replace(",", "."));
        if (!(mins > 0)) return;
        onQuickLog({ setLog: [], cardio: [{ exerciseKey: selected.key, minutes: mins }] });
      } else {
        const w = parseFloat(String(wInput).replace(",", "."));
        const r = parseInt(rInput, 10);
        if (!(r > 0)) return;
        onQuickLog({ setLog: [{ exerciseKey: selected.key, weight: w > 0 ? w : 0, reps: r }], cardio: [] });
      }
      setWInput("");
      setRInput("");
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    };
    return (
      <div style={{ padding: "0 20px 24px" }}>
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 18, fontWeight: 700, color: COLORS.text }}>{nameOf(selected)}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.gold, marginTop: 3 }}>{muscles.find((m) => m.key === selected.muscle)?.label}</div>
            </div>
            <div onClick={() => setSelected(null)} style={{ cursor: "pointer" }}>
              <X size={18} color={COLORS.dim} />
            </div>
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, margin: "12px 0" }}>{cueOf(selected)}</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {best ? <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.gold }}>🏆 {t.exerciseBest}: {best} kg</div> : null}
            {maxReps ? <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.teal }}>{t.exerciseMaxReps}: {maxReps}</div> : null}
          </div>
        </Card>

        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 12 }}>{t.exerciseLogTitle}</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input type="number" inputMode="decimal" min="0" value={wInput} onChange={(e) => setWInput(e.target.value)} placeholder={isCardio ? t.minutesLabel : "kg"} style={{ ...numInputStyle, flex: 1 }} />
            {!isCardio && <input type="number" inputMode="numeric" min="0" value={rInput} onChange={(e) => setRInput(e.target.value)} placeholder={t.reps} style={{ ...numInputStyle, flex: 1 }} />}
          </div>
          <button onClick={save} style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 12, padding: "12px 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {saved ? t.exerciseSaved : t.stepsSave}
          </button>
        </Card>

        {chartPoints.length >= 2 && (
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>{t.exerciseChart}</div>
            <LineChart points={chartPoints} color={COLORS.gold} unit={isCardio ? "min" : "kg"} />
          </Card>
        )}
        <Card>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>{t.exerciseHistory}</div>
          {history.length === 0 ? (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim }}>{t.noHistory}</div>
          ) : (
            history.map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.text }}>
                <span style={{ color: COLORS.dim, whiteSpace: "nowrap" }}>{new Date(h.dateISO).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB")}</span>
                <span style={{ textAlign: "right" }}>{h.text}</span>
              </div>
            ))
          )}
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.surface, border: "1px solid " + COLORS.border, borderRadius: 14, padding: "11px 14px", marginBottom: 14 }}>
        <Search size={16} color={COLORS.dim} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.libSearchPlaceholder} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: COLORS.text, fontFamily: "Inter, sans-serif", fontSize: 13.5 }} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {muscles.map((m) => (
          <Chip key={m.key} label={m.label} active={muscle === m.key} onClick={() => setMuscle(m.key)} />
        ))}
      </div>

      {results.length === 0 ? (
        <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginTop: 24, padding: "0 12px" }}>{t.libNoResults}</div>
      ) : (
      <Card style={{ padding: 4, marginBottom: mode === "pick" ? 16 : 0 }}>
        {results.map((ex, i) => (
          <div
            key={ex.key}
            onClick={mode === "pick" ? undefined : () => setSelected(ex)}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderBottom: i < results.length - 1 ? "1px solid " + COLORS.border : "none", cursor: mode === "pick" ? "default" : "pointer" }}
          >
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>{nameOf(ex)}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim, marginTop: 2 }}>{cueOf(ex)}</div>
            </div>
            {mode === "pick" ? (
              <div onClick={() => onAdd(ex)} style={{ width: 30, height: 30, borderRadius: 9, background: COLORS.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                <Plus size={15} color={COLORS.gold} />
              </div>
            ) : (
              <ChevronLeft size={16} color={COLORS.dim} style={{ transform: "rotate(180deg)", flexShrink: 0 }} />
            )}
          </div>
        ))}
      </Card>
      )}

      {mode === "pick" && results.length > 0 && (
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

function BackupCard({ t }) {
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);
  const collect = () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("asfit.")) data[k] = localStorage.getItem(k);
    }
    return JSON.stringify({ app: "asfit", version: 1, exportedAt: new Date().toISOString(), data });
  };
  const flash = (m) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2500);
  };
  const exportFile = () => {
    const blob = new Blob([collect()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "asfit-backup-" + new Date().toLocaleDateString("sv") + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(collect());
      flash(t.backupCopied);
    } catch {
      flash(t.serverError);
    }
  };
  const onImport = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.app !== "asfit" || typeof parsed.data !== "object") throw new Error("bad");
      Object.entries(parsed.data).forEach(([k, v]) => {
        if (k.startsWith("asfit.") && typeof v === "string") localStorage.setItem(k, v);
      });
      flash(t.backupImported);
      setTimeout(() => window.location.reload(), 700);
    } catch {
      flash(t.backupBad);
    }
  };
  const btn = { flex: 1, background: COLORS.raised, border: "1px solid " + COLORS.border, color: COLORS.gold, borderRadius: 10, padding: "10px 6px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" };
  return (
    <div style={{ padding: "13px 4px", borderTop: "1px solid " + COLORS.border }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text, marginBottom: 10 }}>{t.backupTitle}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={exportFile} style={btn}>{t.backupExport}</button>
        <button onClick={copy} style={btn}>{t.backupCopy}</button>
      </div>
      <button onClick={() => fileRef.current && fileRef.current.click()} style={{ ...btn, width: "100%", flex: "none" }}>{t.backupImport}</button>
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={onImport} style={{ display: "none" }} />
      {msg && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.gold, marginTop: 8 }}>{msg}</div>}
    </div>
  );
}

function ConnectionsScreen({ t, info, native, onConnect }) {
  const isIos = Capacitor.getPlatform() === "ios";
  const rows = [
    { key: "steps", label: t.connSteps },
    { key: "weight", label: t.connWeight },
    { key: "workouts", label: t.connWorkouts },
  ];
  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim, marginBottom: 14, lineHeight: 1.5 }}>{t.connIntro}</div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text, minWidth: 0 }}>{native ? HEALTH_STORE_NAME : "Health Connect / Apple Health"}</div>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, color: info.connected ? COLORS.gold : COLORS.dim }}>{info.connected ? "● " + t.connStatusOn : "○ " + t.connStatusOff}</span>
        </div>
        {!native && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginBottom: 12 }}>{t.connWebOnly}</div>}
        {native && info.unavailable && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.coral, marginBottom: 12 }}>{t.connUnavailable}</div>}
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.dim, marginBottom: 6 }}>{t.connData}</div>
        {rows.map((r) => {
          const on = info.granted.includes(r.key);
          return (
            <div key={r.key} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.text }}>
              <span>{r.label}</span>
              <span style={{ color: on ? COLORS.gold : COLORS.dim }}>{on ? "✓" : t.connDenied}</span>
            </div>
          );
        })}
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, margin: "10px 0 12px" }}>
          {t.connLast}: {info.lastSync ? new Date(info.lastSync).toLocaleString() : t.connNever}
        </div>
        <button
          onClick={onConnect}
          disabled={!native}
          style={{ width: "100%", background: native ? COLORS.gold : COLORS.raised, color: native ? COLORS.bg : COLORS.dim, border: "none", borderRadius: 12, padding: "12px 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: native ? "pointer" : "default" }}
        >
          {info.connected ? t.connSync : t.connConnect}
        </button>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>{t.connOthersTitle}</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim, lineHeight: 1.5 }}>{!native ? t.connOthersWeb : isIos ? t.connOthersIos : t.connOthersAndroid}</div>
      </Card>
      {!isIos && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, lineHeight: 1.5 }}>{t.connIosNote}</div>}
    </div>
  );
}

function SettingsScreen({ t, lang, setLang, units, setUnits, reminders, setReminders, profile, display, onReplayOnboarding, onOpenPrivacy, onOpenAssistant, onOpenConnections }) {
  const [confirmingDanger, setConfirmingDanger] = useState(false);
  useEffect(() => {
    if (!confirmingDanger) return undefined;
    const id = setTimeout(() => setConfirmingDanger(false), 4000);
    return () => clearTimeout(id);
  }, [confirmingDanger]);
  return (
    <div style={{ padding: "0 20px 24px" }}>
      <Card style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(150deg, ${COLORS.gold}, #009973)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 19, fontWeight: 700, color: COLORS.bg }}>{(profile.name || "?").charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 700, color: COLORS.text }}>{profile.name}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginTop: 2 }}>{profile.weight} kg · {profile.height} cm</div>
        </div>
      </Card>

      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, marginBottom: 10 }}>{t.setAppearance}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <Chip label={t.setLight} active={display.appearance === "light"} onClick={() => display.setAppearance("light")} />
        <Chip label={t.setDark} active={display.appearance === "dark"} onClick={() => display.setAppearance("dark")} />
        <Chip label={t.setSystem} active={display.appearance === "system"} onClick={() => display.setAppearance("system")} />
      </div>

      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, marginBottom: 10 }}>{t.setColorTheme}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <Chip label={t.setThemeAuto} active={display.colorTheme === "auto"} onClick={() => display.setColorTheme("auto")} />
        <Chip label={t.setThemeNeutral} active={display.colorTheme === "neutral"} onClick={() => display.setColorTheme("neutral")} />
        <Chip label={t.setThemeFemale} active={display.colorTheme === "female"} onClick={() => display.setColorTheme("female")} />
        <Chip label={t.setThemeMale} active={display.colorTheme === "male"} onClick={() => display.setColorTheme("male")} />
      </div>

      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, marginBottom: 10 }}>{t.setTextSize}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        <Chip label={t.setSmall} active={display.textSize === "s"} onClick={() => display.setTextSize("s")} />
        <Chip label={t.setNormal} active={display.textSize === "m"} onClick={() => display.setTextSize("m")} />
        <Chip label={t.setLarge} active={display.textSize === "l"} onClick={() => display.setTextSize("l")} />
      </div>

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

      <div onClick={onOpenConnections} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 4px", cursor: "pointer", borderTop: "1px solid " + COLORS.border }}>
        <Link2 size={16} color={COLORS.gold} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>{t.connSettings}</span>
      </div>
      <div onClick={onOpenAssistant} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 4px", cursor: "pointer", borderTop: "1px solid " + COLORS.border }}>
        <MessageCircle size={16} color={COLORS.gold} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>{t.settingsSupport}</span>
      </div>
      <div onClick={onOpenPrivacy} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 4px", cursor: "pointer", borderTop: "1px solid " + COLORS.border }}>
        <BookOpen size={16} color={COLORS.dim} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>{t.settingsPrivacy}</span>
      </div>
      <BackupCard t={t} />
      <div onClick={onReplayOnboarding} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 4px", cursor: "pointer", borderTop: `1px solid ${COLORS.border}` }}>
        <RotateCcw size={16} color={COLORS.dim} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>{t.replayOnboarding}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 4px", cursor: "pointer" }}>
        <LogOut size={16} color={COLORS.coral} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.coral }}>{t.signOut}</span>
      </div>
      <div style={{ padding: "13px 4px", borderTop: "1px solid " + COLORS.border }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.coral, fontWeight: 600 }}>{t.setDangerTitle}</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, margin: "4px 0 10px", lineHeight: 1.45 }}>{t.setDangerText}</div>
        <button
          onClick={() => {
            if (!confirmingDanger) {
              setConfirmingDanger(true);
              return;
            }
            setConfirmingDanger(false);
            Object.keys(localStorage).filter((k) => k.startsWith("asfit.")).forEach((k) => localStorage.removeItem(k));
            window.location.reload();
          }}
          style={{
            width: "100%",
            background: confirmingDanger ? COLORS.coral : COLORS.coralSoft,
            color: confirmingDanger ? "#fff" : COLORS.coral,
            border: "1px solid " + COLORS.coral,
            borderRadius: 10,
            padding: "10px 12px",
            fontFamily: "Sora, sans-serif",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {confirmingDanger ? t.setDangerConfirm : t.setDangerTitle}
        </button>
      </div>
      <div style={{ textAlign: "center", padding: "14px 0 4px", fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim }}>{t.setVersion}</div>
    </div>
  );
}

/* ---------------- App shell ---------------- */

// Real device clock for the mock status bar (was a fixed "9:41" placeholder).
function StatusBarClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);
  return <span>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>;
}

function useIsPhone() {
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && window.innerWidth < 520);
  useEffect(() => {
    const on = () => setPhone(window.innerWidth < 520);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return phone;
}

export default function AsmarFitApp() {
  const isPhone = useIsPhone();
  const [onboarded, setOnboarded] = usePersisted("onboarded", false);
  const [tab, setTab] = useState("home");
  const [lang, setLang] = usePersisted("lang", "de");
  const [overlay, setOverlay] = useState(null);
  const [libraryReturnTo, setLibraryReturnTo] = useState("main");
  const [activeMealKey, setActiveMealKey] = useState("snacks");
  const [planName, setPlanName] = usePersisted("planName", null);
  const [units, setUnits] = usePersisted("units", "kg");
  const [reminders, setReminders] = usePersisted("reminders", { food: true, weigh: true, train: false });

  const [pbName, setPbName] = usePersisted("pbName", "");
  const [pbDays, setPbDays] = usePersisted("pbDays", []);
  const [pbSelectedDay, setPbSelectedDay] = useState(null);

  const [notesFilter, setNotesFilter] = useState(0);
  const [notes, setNotes] = usePersisted("notes", []);

  const [meals, setMeals] = usePersistedDaily("meals", { breakfast: [], lunch: [], dinner: [], snacks: [] });

  // Real user data, populated once onboarding finishes — no seeded demo
  // values, so every screen starts from an honest empty state.
  const [profile, setProfile] = usePersisted("profile", {
    name: "",
    weight: null,
    height: null,
    target: null,
    goal: null,
    kcalGoal: 2200,
    macroTargets: computeMacroTargets(2200),
    vision3Months: "",
    visionWhy: "",
  });
  const [appearance, setAppearance] = usePersisted("appearance", "system");
  const [colorTheme, setColorTheme] = usePersisted("colorTheme", "auto");
  const [textSize, setTextSize] = usePersisted("textSize", "m");
  useEffect(() => {
    const resolve = () => applyTheme(colorTheme === "auto" ? profile.gender : colorTheme, appearance);
    resolve();
    if (appearance !== "system" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", resolve);
    return () => mq.removeEventListener("change", resolve);
  }, [profile.gender, colorTheme, appearance]);
  useEffect(() => {
    document.documentElement.style.zoom = { s: "0.92", m: "1", l: "1.12" }[textSize] || "1";
  }, [textSize]);
  const [weightLog, setWeightLog] = usePersisted("weightLog", []);
  const weightLogRef = useRef([]);
  weightLogRef.current = weightLog;
  const [workoutHistory, setWorkoutHistory] = usePersisted("workoutHistory", []);
  const historyRef = useRef([]);
  historyRef.current = workoutHistory;
  const [personalBests, setPersonalBests] = usePersisted("personalBests", {});
  const [lastWorkoutSummary, setLastWorkoutSummary] = useState(null);
  const [cardioBests, setCardioBests] = usePersisted("cardioBests", {});
  // A workout in progress is persisted immediately (start time + entries so
  // far), so it keeps counting real elapsed time and survives the app being
  // backgrounded or fully closed — only "Workout beenden" or discarding it
  // clears this, not leaving the screen.
  const [activeWorkout, setActiveWorkout] = usePersisted("activeWorkout", null);
  const startOrResumeWorkout = () => {
    setActiveWorkout((w) => w || { startedAt: Date.now(), entries: [] });
    setOverlay("workout");
  };
  const [customRecords, setCustomRecords] = usePersisted("customRecords", []);
  const [progressPhotos, setProgressPhotos] = usePersisted("progressPhotos", []);
  const [myMeals, setMyMeals] = usePersisted("myMeals", []);
  const [customRecipes, setCustomRecipes] = usePersisted("customRecipes", []);
  const [cheats, setCheats] = usePersisted("cheats", []);
  const [celebrate, setCelebrate] = useState(null);
  const [waterMl, setWaterMl] = usePersistedDaily("water", 0);
  const [steps, setSteps] = usePersistedDaily("steps", 0);
  const [stepsGoal, setStepsGoal] = usePersisted("stepsGoal", 10000);
  // connect = native, not authorised yet | health = auto from Health Connect
  // manual = typed in (web) | unavailable = native but no Health Connect
  const [stepsSource, setStepsSource] = useState(IS_NATIVE_APP ? "connect" : "manual");

  const [healthInfo, setHealthInfo] = usePersisted("healthInfo", { connected: false, lastSync: null, granted: [], unavailable: false });
  const lastExtrasRef = useRef(0);

  // Pulls weight and workouts from the health store (steps are handled in refreshSteps).
  const syncExtras = async (granted) => {
    const now = new Date();
    if (granted.includes("weight")) {
      const from = new Date(now.getTime() - 30 * 86400000);
      const res = await Health.readSamples({ dataType: "weight", startDate: from.toISOString(), endDate: now.toISOString(), limit: 50, ascending: true });
      const log = weightLogRef.current;
      const lastMs = log.length ? Date.parse(log[log.length - 1].dateISO) : 0;
      const fresh = (res.samples || []).filter((x) => Date.parse(x.startDate) > lastMs + 1000 && x.value > 0);
      if (fresh.length) {
        const entries = fresh.map((x) => ({ dateISO: new Date(x.startDate).toISOString(), kg: Math.round(x.value * 10) / 10, imported: true }));
        setWeightLog((l) => [...l, ...entries]);
        setProfile((p) => ({ ...p, weight: entries[entries.length - 1].kg }));
      }
    }
    if (granted.includes("workouts")) {
      const from = new Date(now.getTime() - 14 * 86400000);
      const res = await Health.queryWorkouts({ startDate: from.toISOString(), endDate: now.toISOString(), limit: 50, ascending: true });
      const known = new Set(historyRef.current.map((w) => w.platformId).filter(Boolean));
      const fresh = (res.workouts || []).filter((w) => w.platformId && !known.has(w.platformId));
      if (fresh.length) {
        const entries = fresh.map((w) => ({
          id: Date.parse(w.startDate) || Date.now(),
          dateISO: new Date(w.startDate).toISOString(),
          durationSec: Math.round(w.duration || 0),
          volumeKg: 0,
          sets: [],
          cardio: [],
          burnedKcal: Math.round(w.totalEnergyBurned || 0),
          imported: true,
          platformId: w.platformId,
          source: w.sourceName || "",
          workoutType: w.workoutType,
        }));
        setWorkoutHistory((h) => [...h, ...entries.filter((e) => !h.some((x) => x.platformId === e.platformId))]);
      }
    }
  };

  const refreshSteps = async (askPermission) => {
    if (!IS_NATIVE_APP) return;
    try {
      const avail = await Health.isAvailable();
      if (!avail.available) {
        setHealthInfo((h) => ({ ...h, unavailable: true }));
        return setStepsSource("unavailable");
      }
      const wanted = ["steps", "weight", "workouts"];
      const status = askPermission ? await Health.requestAuthorization({ read: wanted }) : await Health.checkAuthorization({ read: wanted });
      if (!status.readAuthorized.includes("steps")) {
        setHealthInfo((h) => ({ ...h, connected: false, granted: status.readAuthorized || [], unavailable: false }));
        return setStepsSource("connect");
      }
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const res = await Health.queryAggregated({ dataType: "steps", startDate: start.toISOString(), endDate: new Date().toISOString(), bucket: "day", aggregation: "sum" });
      setSteps(Math.round(res.samples.reduce((sum, x) => sum + (x.value || 0), 0)));
      setStepsSource("health");
      let lastSync = healthInfo.lastSync;
      if (askPermission || Date.now() - lastExtrasRef.current > 10 * 60000) {
        try {
          await syncExtras(status.readAuthorized);
        } catch {
          /* weight/workouts are optional — steps keep working */
        }
        lastExtrasRef.current = Date.now();
        lastSync = new Date().toISOString();
      }
      setHealthInfo({ connected: true, lastSync, granted: status.readAuthorized, unavailable: false });
    } catch {
      setStepsSource("unavailable");
    }
  };

  useEffect(() => {
    if (!onboarded || !IS_NATIVE_APP) return;
    refreshSteps(false);
    const id = setInterval(() => refreshSteps(false), 60000);
    return () => clearInterval(id);
  }, [onboarded]);

  const t = useMemo(() => STR[lang], [lang]);

  const finishOnboarding = (data) => {
    setProfile(data);
    setWeightLog([{ dateISO: new Date().toISOString(), kg: data.weight }]);
    setOnboarded(true);
  };

  const quickLogExercise = ({ setLog, cardio }) => finishWorkout({ durationSec: 0, volumeKg: setLog.reduce((sum, l) => sum + l.weight * l.reps, 0), setLog, cardio }, false);

  const addWeight = (kg) => {
    setWeightLog((l) => [...l, { dateISO: new Date().toISOString(), kg }]);
    setProfile((p) => ({ ...p, weight: kg }));
  };

  const finishWorkout = (summary, showSummary = true) => {
    const newBests = [];
    const updatedBests = { ...personalBests };
    for (const s of summary.setLog) {
      const prevBest = updatedBests[s.exerciseKey] || 0;
      if (s.weight > prevBest) {
        updatedBests[s.exerciseKey] = s.weight;
        const existing = newBests.find((b) => b.exerciseKey === s.exerciseKey);
        if (existing) existing.weight = s.weight;
        else newBests.push({ exerciseKey: s.exerciseKey, weight: s.weight });
      }
    }
    setPersonalBests(updatedBests);
    const hadPrior = summary.setLog.some((x) => (personalBests[x.exerciseKey] || 0) > 0) || (summary.cardio || []).some((c) => (cardioBests[c.exerciseKey] || 0) > 0);
    const updatedCardio = { ...cardioBests };
    for (const c of summary.cardio || []) {
      if (c.minutes > (updatedCardio[c.exerciseKey] || 0)) {
        updatedCardio[c.exerciseKey] = c.minutes;
        const ex = newBests.find((b) => b.exerciseKey === c.exerciseKey);
        if (ex) ex.minutes = c.minutes;
        else newBests.push({ exerciseKey: c.exerciseKey, minutes: c.minutes });
      }
    }
    setCardioBests(updatedCardio);
    const stagnated = hadPrior && newBests.length === 0;
    const w = profile.weight || 70;
    const strengthMinutes = summary.setLog.length * 2.5; // ~2.5 min per set incl. rest
    const cardioKcal = (summary.cardio || []).reduce((sum, c) => sum + burnKcal(CARDIO_MET[c.exerciseKey] || 6, w, c.minutes), 0);
    const burnedKcal = burnKcal(MET_STRENGTH, w, strengthMinutes) + cardioKcal;
    setWorkoutHistory((h) => [...h, { id: Date.now(), dateISO: new Date().toISOString(), durationSec: summary.durationSec, volumeKg: summary.volumeKg, sets: summary.setLog, cardio: summary.cardio || [], burnedKcal }]);
    if (showSummary) {
      setLastWorkoutSummary({ durationSec: summary.durationSec, volumeKg: summary.volumeKg, newBests, burnedKcal, motivation: stagnated ? t.motivations[Math.floor(Math.random() * t.motivations.length)] : null });
      setOverlay("workoutSummary");
    } else if (stagnated) {
      setCelebrate({ kind: "motivation", lines: [], message: t.motivations[Math.floor(Math.random() * t.motivations.length)] });
    } else if (newBests.length) {
      setCelebrate({
        lines: newBests.map((b) => {
          const ex = EXERCISE_LIBRARY.find((e) => e.key === b.exerciseKey);
          const nm = ex ? (lang === "de" ? ex.nameDe : ex.name) : b.exerciseKey;
          return nm + ": " + (b.minutes ? b.minutes + " min" : b.weight + " kg");
        }),
      });
    }
  };

  const createCustomRecord = ({ name, unit, value, lower, reward }) => {
    setCustomRecords((r) => [...r, { id: Date.now(), name, unit, lower, reward, best: value, history: [{ value, dateISO: new Date().toISOString() }] }]);
  };

  const pickMotivation = () => t.motivations[Math.floor(Math.random() * t.motivations.length)];

  const updateCustomRecord = (id, value, reward) => {
    const rec = customRecords.find((r) => r.id === id);
    if (!rec) return;
    const better = rec.lower ? value < rec.best : value > rec.best;
    const newReward = reward || rec.reward || "";
    setCustomRecords((all) => all.map((r) => (r.id === id ? { ...r, best: better ? value : r.best, reward: better ? newReward : r.reward, history: [...r.history, { value, dateISO: new Date().toISOString() }] } : r)));
    if (better) setCelebrate({ lines: [rec.name + ": " + value + " " + rec.unit], reward: newReward });
    else setCelebrate({ kind: "motivation", lines: [rec.name + ": " + value + " " + rec.unit, t.recordBest + ": " + rec.best + " " + rec.unit], message: pickMotivation() });
  };

  const addMyMeal = (m) => setMyMeals((l) => (l.some((x) => x.name === m.name) ? l : [...l, { id: Date.now() + Math.random(), name: m.name, kcal: m.kcal, protein: m.protein || 0, carbs: m.carbs || 0, fat: m.fat || 0 }]));
  const saveRecipe = (r) => setCustomRecipes((l) => [r, ...l]);
  const deleteRecipe = (key) => setCustomRecipes((l) => l.filter((r) => r.key !== key));

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
    content = (
      <WorkoutSession
        t={t}
        lang={lang}
        startedAt={activeWorkout?.startedAt || Date.now()}
        entries={activeWorkout?.entries || []}
        onChangeEntries={(entries) => setActiveWorkout((w) => ({ startedAt: w?.startedAt || Date.now(), entries }))}
        onFinish={(summary) => {
          finishWorkout(summary);
          setActiveWorkout(null);
        }}
        onDiscard={() => {
          setActiveWorkout(null);
          setOverlay(null);
        }}
      />
    );
    topTitle = t.startWorkout;
    showBack = () => setOverlay(null);
  } else if (overlay === "workoutSummary") {
    content = <WorkoutSummary t={t} lang={lang} summary={lastWorkoutSummary} onDone={() => setOverlay(null)} />;
    topTitle = t.workoutDone;
    showBack = () => setOverlay(null);
  } else if (overlay === "foodSearch") {
    content = <FoodSearchScreen t={t} lang={lang} onAdd={addFoodItem} onOpenBarcode={() => setOverlay("barcode")} onOpenPhoto={() => setOverlay("photo")} myMeals={myMeals} onOpenMyMeals={() => setOverlay("myMeals")} />;
    topTitle = t.foodSearchTitle;
    showBack = () => setOverlay(null);
  } else if (overlay === "barcode") {
    content = <BarcodeScanScreen t={t} onAdd={addFoodItem} onDone={() => setOverlay(null)} />;
    topTitle = t.barcodeTitle;
    showBack = () => setOverlay("foodSearch");
  } else if (overlay === "photo") {
    content = <PhotoScanScreen t={t} lang={lang} onAdd={addFoodItem} onDone={() => setOverlay(null)} />;
    topTitle = t.photoTitle;
    showBack = () => setOverlay("foodSearch");
  } else if (overlay === "recipes") {
    content = <RecipesScreen t={t} lang={lang} onAdd={addFoodItem} onDone={() => setOverlay(null)} customRecipes={customRecipes} onSaveRecipe={saveRecipe} onDeleteRecipe={deleteRecipe} />;
    topTitle = t.recipesTitle;
    showBack = () => setOverlay(null);
  } else if (overlay === "connections") {
    content = <ConnectionsScreen t={t} info={healthInfo} native={IS_NATIVE_APP} onConnect={() => refreshSteps(true)} />;
    topTitle = t.connTitle;
    showBack = () => setOverlay("settings");
  } else if (overlay === "myMeals") {
    content = <MyMealsScreen t={t} myMeals={myMeals} initialSlot={activeMealKey} onAddTo={(k, food) => setMeals((m) => ({ ...m, [k]: [...m[k], food] }))} onSave={addMyMeal} onDelete={(id) => setMyMeals((l) => l.filter((x) => x.id !== id))} />;
    topTitle = t.myMealsTitle;
    showBack = () => setOverlay(null);
  } else if (overlay === "cheats") {
    content = <CheatScreen t={t} cheats={cheats} onAdd={(c) => setCheats((l) => [...l, c])} onDelete={(id) => setCheats((l) => l.filter((x) => x.id !== id))} />;
    topTitle = t.cheatTitle;
    showBack = () => setOverlay(null);
  } else if (overlay === "records") {
    content = <RecordsScreen t={t} lang={lang} personalBests={personalBests} cardioBests={cardioBests} workoutHistory={workoutHistory} customRecords={customRecords} onCreate={createCustomRecord} onUpdate={updateCustomRecord} />;
    topTitle = t.recordsTitle;
    showBack = () => setOverlay(null);
  } else if (overlay === "privacy") {
    content = <PrivacyScreen t={t} />;
    topTitle = t.privacyTitle;
    showBack = () => setOverlay("settings");
  } else if (overlay === "assistant") {
    content = <AssistantScreen t={t} lang={lang} />;
    topTitle = t.assistantTitle;
    showBack = () => setOverlay(null);
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
        personalBests={personalBests}
        workoutHistory={workoutHistory}
        onQuickLog={quickLogExercise}
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
        profile={profile}
        display={{ appearance, setAppearance, colorTheme, setColorTheme, textSize, setTextSize }}
        onOpenPrivacy={() => setOverlay("privacy")}
        onOpenAssistant={() => setOverlay("assistant")}
        onOpenConnections={() => setOverlay("connections")}
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
          profile={profile}
          meals={meals}
          weightLog={weightLog}
          workoutHistory={workoutHistory}
          notes={notes}
          waterMl={waterMl}
          onAddWater={() => setWaterMl((w) => w + 250)}
          onUndoWater={() => setWaterMl((w) => Math.max(0, w - 250))}
          onOpenAssistant={() => setOverlay("assistant")}
          steps={steps}
          stepsSource={stepsSource}
          onConnectSteps={() => refreshSteps(true)}
          onSaveSteps={(v) => setSteps(v)}
          stepsGoal={stepsGoal}
          onSaveStepsGoal={setStepsGoal}
          onLogFood={() => {
            setActiveMealKey("snacks");
            setOverlay("foodSearch");
          }}
          onStartWorkout={startOrResumeWorkout}
          onAddNote={() => setOverlay("noteComposer")}
          onGoProgress={() => setTab("progress")}
          activeWorkout={activeWorkout}
          onResumeWorkout={startOrResumeWorkout}
        />
      ),
      nutrition: (
        <NutritionScreen
          t={t}
          meals={meals}
          macroTargets={profile.macroTargets}
          onOpenFoodSearch={(key) => {
            setActiveMealKey(key);
            setOverlay("foodSearch");
          }}
          onOpenRecipes={() => {
            setActiveMealKey("snacks");
            setOverlay("recipes");
          }}
          myMeals={myMeals}
          cheats={cheats}
          onOpenMyMeals={() => setOverlay("myMeals")}
          onOpenCheats={() => setOverlay("cheats")}
          onSaveMyMeal={addMyMeal}
        />
      ),
      training: (
        <TrainingScreen
          t={t}
          lang={lang}
          planName={planName}
          personalBests={personalBests}
          workoutHistory={workoutHistory}
          onStartWorkout={startOrResumeWorkout}
          onOpenPlanBuilder={() => setOverlay("planBuilder")}
          onOpenRecords={() => setOverlay("records")}
          onOpenLibrary={() => {
            setLibraryReturnTo("main");
            setOverlay("exerciseLibrary");
          }}
          activeWorkout={activeWorkout}
        />
      ),
      progress: (
        <ProgressScreen
          t={t}
          lang={lang}
          weightLog={weightLog}
          workoutHistory={workoutHistory}
          onAddWeight={addWeight}
          photos={progressPhotos}
          onAddPhoto={(p) => setProgressPhotos((ph) => [...ph, p])}
          onDeletePhoto={(id) => setProgressPhotos((ph) => ph.filter((p) => p.id !== id))}
        />
      ),
      notes: <NotesScreen t={t} notes={notes} filter={notesFilter} setFilter={setNotesFilter} onAddNote={() => setOverlay("noteComposer")} />,
    };
    content = screens[tab];
    topTitle = t.tabs[tab];
    showBack = null;
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: isPhone ? 0 : "24px 12px", minHeight: "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        input[type="range"] { -webkit-appearance: none; height: 4px; border-radius: 2px; background: ${COLORS.raised}; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: ${COLORS.gold}; cursor: pointer; }
      `}</style>
      <div style={isPhone ? { width: "100%", height: "100dvh", display: "flex", flexDirection: "column", background: COLORS.bg, overflow: "hidden", fontFamily: "Inter, sans-serif", paddingTop: "env(safe-area-inset-top)" } : { width: 390, maxWidth: "100%", background: COLORS.bg, borderRadius: 40, border: "10px solid #0A0A0B", overflow: "hidden", boxShadow: "0 30px 60px rgba(0,0,0,0.45)", fontFamily: "Inter, sans-serif" }}>
        {!isPhone && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 26px 0", fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.text }}>
            <StatusBarClock />
            <Droplets size={13} color={COLORS.dim} />
          </div>
        )}

        {!onboarded ? (
          <div style={isPhone ? { flex: 1, minHeight: 0 } : { height: 720 }}>
            <Onboarding t={t} lang={lang} setLang={setLang} onFinish={finishOnboarding} />
          </div>
        ) : (
          <>
            <TopBar title={topTitle} lang={lang} setLang={setLang} onBack={showBack} onSettings={!showBack ? () => setOverlay("settings") : null} />
            <div style={isPhone ? { flex: 1, minHeight: 0, overflowY: "auto" } : { height: 700, overflowY: "auto" }}>{content}</div>
            <div style={{ display: "flex", justifyContent: "space-around", padding: isPhone ? "10px 6px calc(12px + env(safe-area-inset-bottom))" : "10px 6px 20px", borderTop: `1px solid ${COLORS.border}`, background: COLORS.bg }}>
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
        <Celebration t={t} data={celebrate} onClose={() => setCelebrate(null)} />
      </div>
    </div>
  );
}
