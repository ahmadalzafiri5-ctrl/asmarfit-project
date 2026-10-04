import { useState, useEffect, useMemo, useRef, Children, cloneElement } from "react";
import { Capacitor } from "@capacitor/core";
import { searchBasics } from "./basics.js";
import { CHAINS, CAT_KEYS, itemsOf, suggest, sumLines, smallestMeal } from "./fastfood.js";
import { ExerciseAnimation } from "./exerciseAnim.jsx";
import { sceneFor } from "./exerciseScenes.js";
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
  Smile,
  Award,
  Timer,
  Check,
  Settings as SettingsIcon,
  Bell,
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
  User,
  Target,
  Palette,
  Shield,
  HelpCircle,
  Info,
  Share2,
  Database,
  ChevronDown,
  FileText,
  Landmark,
  Pause,
  Play,
  Pencil,
  Pill,
  Users,
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
    light: { bg: "#FFFFFF", surface: "#F6F7F8", raised: "#EEF1F3", border: "#E1E4E8", text: "#161A1D", dim: "#656D76", gold: "#008563", goldSoft: "rgba(0,133,99,0.14)", teal: "#2F80ED", coral: "#E2694F", coralSoft: "rgba(226,105,79,0.14)" },
    dark: { bg: "#111416", surface: "#1A1E21", raised: "#242A2E", border: "#2F363B", text: "#F1F4F5", dim: "#9AA5AC", gold: "#1FD1A2", goldSoft: "rgba(31,209,162,0.16)", teal: "#5B9DF5", coral: "#F0806A", coralSoft: "rgba(240,128,106,0.18)" },
  },
  female: {
    light: { bg: "#FFFFFF", surface: "#FDF4F8", raised: "#FBE8F0", border: "#F3D6E2", text: "#2B1A24", dim: "#7A616E", gold: "#C54877", goldSoft: "rgba(197,72,119,0.13)", teal: "#9B6FE0", coral: "#F08A5D", coralSoft: "rgba(240,138,93,0.16)" },
    dark: { bg: "#171015", surface: "#22171E", raised: "#2D1F27", border: "#3D2A35", text: "#FAEFF4", dim: "#B79CAA", gold: "#F26AA0", goldSoft: "rgba(242,106,160,0.17)", teal: "#B08AF0", coral: "#F59B70", coralSoft: "rgba(245,155,112,0.18)" },
  },
  male: {
    light: { bg: "#FFFFFF", surface: "#F2F5FB", raised: "#E8EEF9", border: "#D6E0F0", text: "#0F1729", dim: "#5C6982", gold: "#2563EB", goldSoft: "rgba(37,99,235,0.12)", teal: "#0E9F9A", coral: "#F0782E", coralSoft: "rgba(240,120,46,0.14)" },
    dark: { bg: "#0D1220", surface: "#151C2E", raised: "#1E2740", border: "#2A3550", text: "#EBF1FF", dim: "#94A1BE", gold: "#5B8DF6", goldSoft: "rgba(91,141,246,0.18)", teal: "#2CC4BE", coral: "#F58F4C", coralSoft: "rgba(245,143,76,0.18)" },
  },
  diverse: {
    light: { bg: "#FFFFFF", surface: "#F8F6F1", raised: "#F0EBDF", border: "#E2DAC8", text: "#171512", dim: "#6C6659", gold: "#956C09", goldSoft: "rgba(149,108,9,0.14)", teal: "#2B2B2B", coral: "#A63D40", coralSoft: "rgba(166,61,64,0.16)" },
    dark: { bg: "#0B0B0A", surface: "#161513", raised: "#201E1A", border: "#2E2B24", text: "#F5EFE0", dim: "#A79C87", gold: "#D4AF37", goldSoft: "rgba(212,175,55,0.18)", teal: "#B7AE9C", coral: "#E0726F", coralSoft: "rgba(224,114,111,0.18)" },
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
    startWorkout: "Start workout",
    protein: "Protein",
    carbs: "Carbs",
    fat: "Fat",
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snacks: "Snacks",
    add: "Add",
    searchPlaceholder: "Search food",
    searchWaking: "The server is waking up — the first search can take up to a minute …",
    searchMore: "Looking for more results …",
    searchShowingFor: "Showing results for",
    barcodeManualPh: "Or type the number under the barcode",
    barcodeManualGo: "Look up",
    workoutNothingToSave: "Nothing logged yet — finishing now just ends the workout without saving.",
    workoutLongTitle: "Is your workout still running?",
    workoutLongText: "Your workout has been running for",
    workoutLongEnd: "Finish workout",
    workoutLongKeep: "Still training",
    workoutLongBody: "Your workout is still running — do not forget to finish it.",
    copyYesterday: "↺ Yesterday",
    copyToToday: "→ Today",
    copiedToast: "Added to today",
    recentTitle: "Recently used",
    restTitle: "Rest",
    restOff: "Off",
    restSkip: "Skip",
    restDone: "Rest is over — next set!",
    lastTime: "Last time",
    restStart: "Start rest",
    workoutPause: "Pause workout",
    workoutResume: "Resume",
    workoutPaused: "Workout paused",
    editAmount: "Change amount",
    saveAmount: "Save",
    quickAddTitle: "Add calories directly",
    quickAddName: "Name (optional)",
    quickAddDefault: "Quick entry",
    chartTitle: "Calories",
    chartAvg: "Average per tracked day",
    chartGoal: "Goal",
    fiber: "Fiber",
    sugar: "Sugar",
    salt: "Salt",
    superset: "Superset",
    e1rm: "Estimated 1RM",
    chartProtein: "Avg protein",
    backupShare: "Save to Files / iCloud",
    backupDone: "Backup saved",
    backupDueTitle: "Time for a backup",
    backupDueText: "Your data only lives on this device. Save a copy to Files or iCloud.",
    diaryToday: "Today",
    diaryYesterday: "Yesterday",
    diaryNothing: "Nothing logged on this day.",
    activePlan: "Active plan",
    newPlan: "New plan",
    pushPullLegs: "Push / Pull / Legs",
    day: "Day",
    newPR: "New PR",
    volume: "Volume",
    exercises: "Exercises",
    exerciseSingular: "Exercise",
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
    obGenderDiverse: "Diverse",
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
    obNamePlaceholder: "",
    obWeight: "Current weight (kg)",
    obHeight: "Height (cm)",
    obTarget: "Target weight (kg)",
    obVisionTitle: "A quick reflection",
    obVisionSub: "Optional, but it helps to write it down.",
    obVision3Months: "How do you see yourself in 3 months?",
    obVision3MonthsPlaceholder: "",
    obVisionWhy: "Why is this important to you?",
    obVisionWhyPlaceholder: "",
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
    workoutRunning: "Workout in progress",
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
    waterCustomPh: "Amount in ml",
    waterAddBtn: "Add",
    waterGoalPh: "Daily goal in ml",
    waterSave: "Save",
    searchRetry: "Tap to retry",
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
    obStepsTitle: "How many steps a day?",
    obStepsSub: "A daily step goal, on top of your training. You can change this anytime in Settings.",
    obStepsSkip: "Skip for now",
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
    photoWaking: "The server is waking up — this can take up to a minute the first time …",
    photoEditHint: "Tap the amounts to adjust them",
    photoDishName: "Name",
    photoRemoveItem: "Remove",
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
    privacySections: [{"h":"Your entries","p":"Profile, meals, workouts, weight, notes and your profile picture are currently kept on your device only — never uploaded."},{"h":"Food search and barcode","p":"Search terms and barcodes are forwarded through our server to USDA FoodData Central and Open Food Facts."},{"h":"AI photo scan, assistant and recipes","p":"For the photo scan, a downscaled image is sent to our server and from there to an AI service for analysis. Assistant questions and recipe requests are handled the same way. Our server does not store any of it."},{"h":"Health data (steps)","p":"On request, ASFIT reads your daily steps from Health Connect to estimate calories burned. The values stay on your device. You can revoke access at any time in Health Connect."}],
    recordsTitle: "Records",
    recordsCardSub: "Your highest achievements — take the challenge",
    historyTitle: "History",
    streakCelebrateTitle: "days in a row!",
    streakMsg3: "Three days in a row — the start of a habit.",
    streakMsg7: "A full week! That's a real habit now.",
    streakMsg14: "Two weeks without a gap. Impressive.",
    streakMsg30: "30 days! You've made this part of your life.",
    streakMsg60: "60 days. Most people never get here.",
    streakMsg100: "100 days. Legendary.",
    streakBadges: "Milestones",
    streakLeft: "days to go",
    streakReached: "Reached",
    historyCardSub: "Calendar & streak — see what you tracked",
    streakDaysLabel: "day streak",
    streakBest: "Best streak",
    streakThisMonth: "This month",
    streakNone: "Log a meal today to start your streak",
    streakWeak: "Sprout is worn out – log something today and he gets strong again",
    streakLostTitle: "Your streak is gone",
    streakLostMsg: "{n} days in a row, then a day was missed. Sprout is worn out. No drama: log something today and he'll bounce back.",
    streakLostCta: "Start again today",
    streakLostLater: "Later",
    streakKeep: "Log something today to keep your streak alive",
    legendTracked: "Tracked",
    legendMissed: "Missed",
    dayNothing: "Nothing tracked on this day.",
    dayNotYet: "This day hasn't happened yet.",
    dayWorkouts: "Workouts",
    dayWater: "Water",
    daySteps: "Steps",
    dayTotal: "Total",
    dayToday: "Today",
    daysUnit: "days",
    recordsAuto: "Your best lifts & sessions",
    recordsCustom: "My challenges",
    recordsAdd: "New challenge",
    recordName: "Name",
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
    recipeAiPrompt: "What do you feel like?",
    recipeAiGo: "Generate recipe",
    recipeAiBusy: "Cooking up a recipe …",
    recipeFormName: "Recipe name",
    recipeIngredientsHint: "Ingredients — one per line",
    recipeSave: "Save recipe",
    recipeDelete: "Delete recipe",
    recipeCancel: "Cancel",
    recipeImageOwn: "Own photo",
    recipeImageRemove: "Remove image",
    myMealsButton: "My meals & snacks",
    myMealsTitle: "My meals",
    myMealsHint: "Save what you eat often — then add it with one tap.",
    myMealName: "Name",
    myMealSave: "Save",
    myMealsEmpty: "Nothing saved yet.",
    saveMine: "Save to my meals",
    delete: "Delete",
    dateLabel: "Date",
    cheatTitle: "Cheat meal / cheat day",
    cheatNextNone: "Plan your next cheat meal or cheat day",
    cheatMeal: "Cheat meal",
    cheatDay: "Cheat day",
    cheatDate: "Date",
    cheatNote: "Note",
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
    backupCopyFailed: "Couldn't copy — try \"Save as file\" instead.",
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
    setThemeDiverse: "Black & gold",
    setTextSize: "Text size",
    introSetting: "Start animation",
    introOn: "On",
    introOff: "Off",
    introHint: "Full version once a day, a quick one after that.",
    pantryTitle: "Pantry",
    pantryButton: "My pantry",
    pantryButtonSub: "Oats, pasta & co. always at hand",
    ffTitle: "Eating out",
    ffButton: "Eating out – protein first",
    ffButtonSub: "McDonald's, Subway, doner & co. matched to your calories",
    ffWhere: "Where are you going?",
    ffWhereSub: "Tap a place. ASFIT then finds the order with the most protein that fits your budget.",
    ffLast: "Last",
    ffItems: "items",
    ffOtherPlace: "Other place",
    ffHowMuch: "How much do you want to eat?",
    ffOver: "{n} kcal over your daily goal",
    ffFits: "Fits your daily goal",
    ffLeftToday: "Left today",
    ffLeftGoal: "What's left of your daily goal",
    ffProteinFirst: "Protein first",
    ffProteinFirstSub: "The highest-protein option comes first",
    ffCalc: "Work out my order",
    ffBackBudget: "Change budget",
    ffNothing: "Nothing sensible fits in {n} kcal here (the smallest meal is {m} kcal). Raise the budget.",
    ffBestProtein: "Most protein",
    ffBestRatio: "Protein per kcal",
    ffLowFat: "Lower fat",
    ffFitsIn: "Fits in {n} kcal",
    ffOf: "of",
    ffWater: "Water",
    ffFreeDrink: "drink, added automatically",
    ffAddItem: "Add an item",
    ffSum: "Total vs your budget",
    ffAfter: "Today after this",
    ffLogTo: "Log to",
    ffLog: "Log it",
    ffLogged: "Logged",
    ffOrderView: "Order view",
    ffOrderHint: "Show this at the counter or say it when you order.",
    ffCat_main: "Mains",
    ffCat_starter: "Starters",
    ffCat_salad: "Salads",
    ffCat_side: "Sides",
    ffCat_extra: "Extras",
    ffCat_dessert: "Desserts",
    ffCat_drink: "Drinks",
    ffDisclaimer: "Estimates for Europe (Oct 2026), not the chains' official figures. Portions and recipes may differ.",
    pantryIntro: "Create folders, for example Breakfast or Carbs, and save what you always buy. Then you log it with one tap, without searching.",
    pantryAddTo: "Entries go into the selected meal.",
    pantryEmpty: "Nothing in this folder yet.",
    pantryAddFoods: "+ Add foods",
    pantryAddAll: "Add all",
    pantryNewFolder: "New folder",
    pantryFolderName: "Folder name",
    pantryCreate: "Create",
    pantryEdit: "Edit",
    pantryDone: "Done",
    pantryRename: "Rename",
    pantryDeleteFolder: "Delete folder",
    pantryDeleteSure: "Really delete?",
    pantrySaveBtn: "Save to folder",
    pantrySaveTo: "Save to pantry",
    pantrySaved: "Saved in {f}",
    pantryPickHint: "Search for a food you buy often. It goes into this folder with the amount you enter.",
    pantryPickBanner: "Saving to",
    pantryChooseFolder: "Which folder?",
    pantryManage: "Manage",
    pantryItemOne: "food",
    pantryItemMany: "foods",
    importTitle: "Recipe from link or text",
    importHint: "Paste a link (Instagram, TikTok, recipe site) or the copied caption text. The app reads the ingredients and gets the nutrition values per serving.",
    importPlaceholder: "https://… or paste text",
    importGo: "Get nutrition values",
    importBusy: "Reading the recipe …",
    importFound: "Found",
    importPortions: "servings in the recipe",
    importEstimated: "values estimated, please double-check",
    importFromSource: "values from the source",
    importUnreadable: "This page can't be read automatically, for example Instagram behind a login. Copy the caption of the post and paste the text here.",
    importNoRecipe: "I can't find a recipe in this content.",
    importTooMany: "Too many requests, please try again in a minute.",
    recipeLogNow: "Log it right away",
    shareTypeEx: "Exercise",
    libHowTo: "Step by step",
    libAnim: "How it works",
    libAnimHint: "The figure shows the movement. Red = the muscles that work. Tap to pause.",
    libPause: "Pause",
    libPlay: "Play",
    libSlow: "Slow motion",
    libStartEnd: "Start and end position alternate. Tap to pause the animation.",
    libSource: "Pictures and instructions: free-exercise-db (public domain).",
    libFavs: "Favorites",
    libAddFav: "Add to favorites",
    libTargetMuscles: "Target muscles",
    libPrimary: "Primary muscles",
    libSecondary: "Secondary muscles",
    libFront: "Front",
    libBack: "Back",
    libYoutube: "Technique on YouTube",
    libBoard: "Leaderboard",
    shareTypePlan: "Training plan",
    shareTypeMeal: "Meal",
    shareTypeDay: "Nutrition day",
    shareTypeRecipe: "Recipe",
    shareTypePantry: "Pantry folder",
    shareTypeDuel: "Week duel",
    shareFrom: "{n} shares with you",
    sharePlanReplace: "This replaces your current training plan.",
    shareImport: "Import",
    shareDiscard: "Discard",
    shareImported: "Imported",
    shareCopied: "Link copied, now paste and send it",
    shareCodeHint: "If the link doesn't open: paste the code below into ASFIT (Settings, Friends & duel).",
    shareButton: "Share",
    shareDayLink: "Share day",
    sharePlanLink: "Share plan",
    shareRecipeBtn: "Share recipe",
    friendsTitle: "Friends & duel",
    friendsCardSub: "Share plans and compare the week with friends",
    friendsIntro: "Send a friend your week code. When they import it and send you theirs, you both see who did better in the last 7 days. No account needed, just a link or code.",
    friendsName: "Your name (how friends see you)",
    friendsShareMine: "Share my week code",
    friendsPaste: "Paste a friend's link or code",
    friendsImport: "Import",
    friendsBadCode: "That is not a valid ASFIT link or code.",
    friendsNone: "No friends yet. Send your code and ask your friend for theirs.",
    friendsRematch: "Rematch: send a fresh code",
    friendsRemove: "Remove",
    friendsAsOf: "As of: {d}",
    duelYou: "You",
    duelYouLead: "You lead",
    duelTheyLead: "{n} leads",
    duelTie: "Tie",
    duelTrainings: "Workouts",
    duelVolume: "Training volume",
    duelMinutes: "Training time",
    duelTracked: "Tracked days",
    duelStreak: "Streak (days)",
    duelSteps: "Steps per day",
    nutriLinkPlaceholder: "Paste a link or text",
    nutriLinkHint: "Instagram, TikTok, a recipe site or the copied caption. The app gets the nutrition values.",
    importGoShort: "Get",
    importPaste: "Paste",
    foodLinkTitle: "Link detected: get the nutrition values from the recipe",
    foodLinkSub: "Works with recipe sites and TikTok. For Instagram, copy the caption of the post and paste the text.",
    intakeTitle: "Intake log",
    intakeDisclaimer: "A plain diary for your own entries. No recommendation and no medical advice. Talk about anything you take, and your blood work, with a doctor. The data stays on your phone only.",
    intakeIntro: "Add what you take and log when you took or injected it. The app shows what is due and suggests the next injection site.",
    intakeNew: "New substance",
    intakeChange: "Edit",
    intakeName: "Name",
    intakeRoute: "Type",
    intakeDose: "Dose",
    intakeSchedule: "Schedule",
    intakeEvery: "Every X days",
    intakeEveryPre: "Every",
    intakeEveryPost: "days",
    intakeEveryN: "every {n} days",
    intakeWeekdaysLabel: "Weekdays",
    intakeNeeded: "As needed",
    intakeSave: "Save",
    intakeCancel: "Cancel",
    intakeTakeNow: "Taken now",
    intakeSite: "Injection site",
    intakeSuggest: "suggested next site (rotating the sites)",
    intakeNote: "Note (optional)",
    intakeLogged: "Logged",
    intakeLast: "Last",
    intakeNever: "never",
    intakeDueToday: "due today",
    intakeTomorrow: "due tomorrow",
    intakeOverdue: "{n} d overdue",
    intakeInDays: "in {n} days",
    intakeHistory: "History",
    intakeAll: "All",
    intakeEmptyHistory: "No entries yet.",
    intakeCardTitle: "Intake due",
    intakeCardOn: "Remind me on the home screen",
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
    setGroupAccount: "Account",
    setGroupApp: "App",
    setGroupData: "Data & privacy",
    setGroupHelp: "Help & info",
    setGroupLegal: "Legal",
    setTermsRow: "Terms of use",
    setImprintRow: "Legal notice",
    setProfileRow: "Edit profile",
    setGoalsRow: "My goals",
    setDisplayRow: "Appearance & language",
    setDataRow: "Backup & delete data",
    setHelpRow: "Help & FAQ",
    setShareRow: "Recommend ASFIT",
    setAboutRow: "About ASFIT",
    setAvatarChange: "Change photo",
    setAvatarRemove: "Remove photo",
    setName: "Name",
    setGender: "Gender",
    setBirth: "Birthday",
    setHeight: "Height (cm)",
    setSavedMsg: "Saved",
    setGoalType: "Goal",
    setTargetWeight: "Target weight (kg)",
    setTargetDate: "Target date",
    setKcal: "Calorie goal",
    setKcalAuto: "Automatic",
    setKcalManual: "Manual",
    setKcalHint: "Calculated from your body data, goal and target date.",
    setKcalManualHint: "Your own daily calorie goal (kcal).",
    setMacros: "Macro split",
    setSplitBalanced: "Balanced 30/40/30",
    setSplitProtein: "High protein 40/30/30",
    setSplitLowcarb: "Low carb 35/25/40",
    setMacroOrder: "Protein / Carbs / Fat in %",
    setStepsGoalLabel: "Step goal",
    setWaterGoal: "Water goal (ml)",
    setWaterDefault: "Default for your weight:",
    remTime: "Time",
    remNoteWeb: "Reminders work in the installed Android app.",
    remNoteNative: "You get a notification every day at the chosen time.",
    remFoodBody: "Time to log your meals 🍽️",
    remWeighBody: "Step on the scale and log your weight ⚖️",
    remTrainBody: "Time for your workout 💪",
    setAskAi: "Ask the AI assistant",
    setFaqTitle: "Frequently asked questions",
    setFaq: [{"q":"How do I log food?","a":"Open the Nutrition tab and tap the search bar. Search for a food, scan a barcode or use the AI photo scan. Pick the amount and tap Add."},{"q":"How does the AI photo scan work?","a":"Take or choose a photo of your meal. The AI estimates ingredients, calories and macros. You can edit names and amounts before logging — it is an estimate and can be off."},{"q":"How are my calories calculated?","a":"From your age, height, weight and gender (Mifflin-St Jeor) times an activity factor, adjusted for your goal and target date. You can set your own goal under Settings → My goals."},{"q":"Where is my data stored?","a":"On your device. Use Settings → Backup & delete data to save a backup file, so nothing is lost if you reinstall the app."},{"q":"How do workouts work?","a":"Start a workout in the Training tab. It keeps running — even if you close the app — until you finish or discard it."},{"q":"What are records and challenges?","a":"Training → Records shows your best lifts automatically. You can also create your own challenge, like a 5 km run, and set a reward for beating it."},{"q":"Why is the first search or AI answer slow?","a":"The free server goes to sleep when unused and needs up to a minute to wake up. After that it is fast again."},{"q":"How do I connect a smartwatch or other health apps?","a":"Settings → Connections & health apps. Turn on syncing with Health Connect in your watch or fitness app, then connect ASFIT there."}],
    setAboutVersion: "Version",
    setAboutData: "Data sources",
    setAboutDataText: "Nutrition data: USDA FoodData Central and Open Food Facts (© Open Food Facts contributors, ODbL).",
    setAboutAi: "AI",
    setAboutAiText: "Assistant, photo scan and recipes are powered by Claude from Anthropic. Recipe images are AI illustrations.",
    setAboutDisclaimer: "Please note",
    setAboutDisclaimerText: "ASFIT does not give medical advice. Calorie and nutrient values are estimates. Talk to a doctor before big changes to your diet or training.",
    setShareText: "I track my training and nutrition with ASFIT:",
    setShareCopied: "Link copied",
    setDataIntro: "Your data lives on this device. Save a backup regularly.",
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
    scanNext: "Scan next product",
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
    planNamePlaceholder: "Plan name",
    addDay: "Add day",
    dayNamePlaceholder: "Day name",
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
    startWorkout: "Workout starten",
    protein: "Protein",
    carbs: "Kohlenhydrate",
    fat: "Fett",
    breakfast: "Frühstück",
    lunch: "Mittag",
    dinner: "Abend",
    snacks: "Snacks",
    add: "Hinzufügen",
    searchPlaceholder: "Lebensmittel suchen",
    searchWaking: "Der Server wacht auf — die erste Suche kann bis zu einer Minute dauern …",
    searchMore: "Suche weitere Treffer …",
    searchShowingFor: "Ergebnisse für",
    barcodeManualPh: "Oder die Nummer unter dem Barcode eintippen",
    barcodeManualGo: "Suchen",
    workoutNothingToSave: "Noch nichts eingetragen — Beenden schließt das Workout ohne Speichern ab.",
    workoutLongTitle: "Läuft dein Workout noch?",
    workoutLongText: "Dein Workout läuft seit",
    workoutLongEnd: "Workout beenden",
    workoutLongKeep: "Ich trainiere noch",
    workoutLongBody: "Dein Workout läuft noch — vergiss nicht, es zu beenden.",
    copyYesterday: "↺ Gestern",
    copyToToday: "→ Heute",
    copiedToast: "Zu heute hinzugefügt",
    recentTitle: "Zuletzt verwendet",
    restTitle: "Pause",
    restOff: "Aus",
    restSkip: "Überspringen",
    restDone: "Pause vorbei — nächster Satz!",
    lastTime: "Letztes Mal",
    restStart: "Pause starten",
    workoutPause: "Workout pausieren",
    workoutResume: "Weiter",
    workoutPaused: "Workout pausiert",
    editAmount: "Menge ändern",
    saveAmount: "Speichern",
    quickAddTitle: "Kalorien direkt eintragen",
    quickAddName: "Name (optional)",
    quickAddDefault: "Schnell-Eintrag",
    chartTitle: "Kalorien",
    chartAvg: "Durchschnitt pro getracktem Tag",
    chartGoal: "Ziel",
    fiber: "Ballaststoffe",
    sugar: "Zucker",
    salt: "Salz",
    superset: "Superset",
    e1rm: "Geschätztes 1RM",
    chartProtein: "Ø Protein",
    backupShare: "In Dateien / iCloud sichern",
    backupDone: "Backup gespeichert",
    backupDueTitle: "Zeit für ein Backup",
    backupDueText: "Deine Daten liegen nur auf diesem Gerät. Sichere eine Kopie in Dateien oder iCloud.",
    diaryToday: "Heute",
    diaryYesterday: "Gestern",
    diaryNothing: "An diesem Tag wurde nichts eingetragen.",
    activePlan: "Aktiver Plan",
    newPlan: "Neuer Plan",
    pushPullLegs: "Push / Pull / Legs",
    day: "Tag",
    newPR: "Neuer Rekord",
    volume: "Volumen",
    exercises: "Übungen",
    exerciseSingular: "Übung",
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
    obGenderDiverse: "Divers",
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
    obNamePlaceholder: "",
    obWeight: "Aktuelles Gewicht (kg)",
    obHeight: "Größe (cm)",
    obTarget: "Zielgewicht (kg)",
    obVisionTitle: "Eine kurze Reflexion",
    obVisionSub: "Optional, aber Aufschreiben hilft beim Dranbleiben.",
    obVision3Months: "Wie siehst du dich in 3 Monaten?",
    obVision3MonthsPlaceholder: "",
    obVisionWhy: "Warum ist dir das wichtig?",
    obVisionWhyPlaceholder: "",
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
    workoutRunning: "Workout läuft",
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
    waterCustomPh: "Menge in ml",
    waterAddBtn: "Hinzufügen",
    waterGoalPh: "Tagesziel in ml",
    waterSave: "Speichern",
    searchRetry: "Tippen zum Wiederholen",
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
    obStepsTitle: "Wie viele Schritte am Tag?",
    obStepsSub: "Ein Tagesziel für Schritte, zusätzlich zum Training. Du kannst das jederzeit in den Einstellungen ändern.",
    obStepsSkip: "Später festlegen",
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
    photoWaking: "Der Server wacht gerade auf — beim ersten Mal kann das bis zu einer Minute dauern …",
    photoEditHint: "Tippe auf die Mengen, um sie anzupassen",
    photoDishName: "Name",
    photoRemoveItem: "Entfernen",
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
    privacySections: [{"h":"Deine Eingaben","p":"Profil, Mahlzeiten, Workouts, Gewicht, Notizen und dein Profilbild werden derzeit nur auf deinem Gerät gehalten — nie hochgeladen."},{"h":"Lebensmittelsuche und Barcode","p":"Suchbegriffe und Barcodes werden über unseren Server an USDA FoodData Central und Open Food Facts weitergeleitet."},{"h":"KI-Foto-Scan, Assistent und Rezepte","p":"Beim Foto-Scan wird das Bild verkleinert an unseren Server und von dort zur Analyse an einen KI-Dienst gesendet. Fragen an den Assistenten und Rezeptwünsche laufen genauso. Unser Server speichert nichts davon."},{"h":"Gesundheitsdaten (Schritte)","p":"Auf Wunsch liest ASFIT deine Tagesschritte aus Health Connect, um verbrannte Kalorien zu schätzen. Die Werte bleiben auf deinem Gerät. Du kannst den Zugriff jederzeit in Health Connect widerrufen."}],
    recordsTitle: "Rekorde",
    recordsCardSub: "Deine höchsten Leistungen — nimm die Herausforderung an",
    historyTitle: "Verlauf",
    streakCelebrateTitle: "Tage in Folge!",
    streakMsg3: "Drei Tage am Stück — der Anfang einer Gewohnheit.",
    streakMsg7: "Eine ganze Woche! Das ist jetzt eine echte Gewohnheit.",
    streakMsg14: "Zwei Wochen ohne Lücke. Stark.",
    streakMsg30: "30 Tage! Das gehört jetzt zu deinem Leben.",
    streakMsg60: "60 Tage. Da kommen die meisten nie hin.",
    streakMsg100: "100 Tage. Legendär.",
    streakBadges: "Meilensteine",
    streakLeft: "Tage noch",
    streakReached: "Erreicht",
    historyCardSub: "Kalender & Serie — sieh, was du getrackt hast",
    streakDaysLabel: "Tage in Folge",
    streakBest: "Beste Serie",
    streakThisMonth: "Diesen Monat",
    streakNone: "Trage heute eine Mahlzeit ein, um deine Serie zu starten",
    streakWeak: "Sprout ist erschöpft – trag heute etwas ein, dann wird er wieder stark",
    streakLostTitle: "Deine Serie ist gerissen",
    streakLostMsg: "{n} Tage am Stück, dann ist ein Tag ausgefallen. Sprout ist erschöpft. Kein Drama: Trag heute etwas ein, dann baut er sich wieder auf.",
    streakLostCta: "Heute neu starten",
    streakLostLater: "Später",
    streakKeep: "Trage heute etwas ein, damit deine Serie weiterläuft",
    legendTracked: "Getrackt",
    legendMissed: "Verpasst",
    dayNothing: "An diesem Tag wurde nichts getrackt.",
    dayNotYet: "Dieser Tag liegt noch in der Zukunft.",
    dayWorkouts: "Workouts",
    dayWater: "Wasser",
    daySteps: "Schritte",
    dayTotal: "Gesamt",
    dayToday: "Heute",
    daysUnit: "Tage",
    recordsAuto: "Deine Bestleistungen",
    recordsCustom: "Meine Herausforderungen",
    recordsAdd: "Neue Herausforderung",
    recordName: "Name",
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
    recipeAiPrompt: "Worauf hast du Lust?",
    recipeAiGo: "Rezept erstellen",
    recipeAiBusy: "Rezept wird erstellt …",
    recipeFormName: "Rezeptname",
    recipeIngredientsHint: "Zutaten — eine pro Zeile",
    recipeSave: "Rezept speichern",
    recipeDelete: "Rezept löschen",
    recipeCancel: "Abbrechen",
    recipeImageOwn: "Eigenes Foto",
    recipeImageRemove: "Bild entfernen",
    myMealsButton: "Meine Gerichte & Snacks",
    myMealsTitle: "Meine Gerichte",
    myMealsHint: "Speichere, was du oft isst — dann fügst du es mit einem Tipp hinzu.",
    myMealName: "Name",
    myMealSave: "Speichern",
    myMealsEmpty: "Noch nichts gespeichert.",
    saveMine: "In Meine Gerichte speichern",
    delete: "Löschen",
    dateLabel: "Datum",
    cheatTitle: "Cheat Meal / Cheat Day",
    cheatNextNone: "Plane dein nächstes Cheat Meal oder deinen Cheat Day",
    cheatMeal: "Cheat Meal",
    cheatDay: "Cheat Day",
    cheatDate: "Datum",
    cheatNote: "Notiz",
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
    backupCopyFailed: "Kopieren fehlgeschlagen — nutze stattdessen „Als Datei speichern“.",
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
    setThemeDiverse: "Schwarz-Gold",
    setTextSize: "Schriftgröße",
    introSetting: "Start-Animation",
    introOn: "An",
    introOff: "Aus",
    introHint: "Einmal täglich ganz, danach nur kurz.",
    pantryTitle: "Speisekammer",
    pantryButton: "Meine Speisekammer",
    pantryButtonSub: "Haferflocken, Nudeln & Co. immer griffbereit",
    ffTitle: "Unterwegs essen",
    ffButton: "Unterwegs essen – Eiweiß zuerst",
    ffButtonSub: "McDonald's, Subway, Döner & Co. passend zu deinen Kalorien",
    ffWhere: "Wohin fährst du?",
    ffWhereSub: "Tippe eine Kette an. ASFIT sucht dir danach die Bestellung mit dem meisten Eiweiß, die in dein Budget passt.",
    ffLast: "Zuletzt",
    ffItems: "Artikel",
    ffOtherPlace: "Anderer Ort",
    ffHowMuch: "Wie viel darf's sein?",
    ffOver: "Liegt {n} kcal über deinem Tagesziel",
    ffFits: "Passt in dein Tagesziel",
    ffLeftToday: "Übrig heute",
    ffLeftGoal: "Dein Rest bis zum Tagesziel",
    ffProteinFirst: "Eiweiß zuerst",
    ffProteinFirstSub: "Die proteinreichste Variante liegt vorn",
    ffCalc: "Vorschlag rechnen",
    ffBackBudget: "Budget ändern",
    ffNothing: "Mit {n} kcal findet sich hier nichts Sinnvolles (die kleinste Mahlzeit hat {m} kcal). Erhöhe das Budget.",
    ffBestProtein: "Meiste Eiweiß",
    ffBestRatio: "Eiweiß pro kcal",
    ffLowFat: "Wenig Fett",
    ffFitsIn: "Das passt in {n} kcal",
    ffOf: "von",
    ffWater: "Wasser",
    ffFreeDrink: "Getränk, automatisch dazu",
    ffAddItem: "Artikel dazunehmen",
    ffSum: "Summe gegen dein Budget",
    ffAfter: "Heute danach",
    ffLogTo: "Eintragen in",
    ffLog: "Eintragen",
    ffLogged: "Eingetragen",
    ffOrderView: "Bestellansicht",
    ffOrderHint: "Zeig das an der Kasse oder sag es beim Bestellen.",
    ffCat_main: "Hauptgerichte",
    ffCat_starter: "Vorspeisen",
    ffCat_salad: "Salate",
    ffCat_side: "Beilagen",
    ffCat_extra: "Extras",
    ffCat_dessert: "Desserts",
    ffCat_drink: "Getränke",
    ffDisclaimer: "Richtwerte für Europa (Stand Okt. 2026), nicht die offiziellen Angaben der Ketten. Portionen und Rezepte können abweichen.",
    pantryIntro: "Lege Ordner an, zum Beispiel Frühstück oder Carbs, und speichere dort, was du immer kaufst. Dann trackst du es mit einem Tipp, ohne zu suchen.",
    pantryAddTo: "Einträge landen in der gewählten Mahlzeit.",
    pantryEmpty: "Noch nichts in diesem Ordner.",
    pantryAddFoods: "+ Lebensmittel hinzufügen",
    pantryAddAll: "Alle hinzufügen",
    pantryNewFolder: "Neuer Ordner",
    pantryFolderName: "Name des Ordners",
    pantryCreate: "Anlegen",
    pantryEdit: "Bearbeiten",
    pantryDone: "Fertig",
    pantryRename: "Umbenennen",
    pantryDeleteFolder: "Ordner löschen",
    pantryDeleteSure: "Wirklich löschen?",
    pantrySaveBtn: "In Ordner speichern",
    pantrySaveTo: "In Speisekammer speichern",
    pantrySaved: "Gespeichert in {f}",
    pantryPickHint: "Suche ein Lebensmittel, das du oft kaufst. Es landet in diesem Ordner, mit der Menge, die du eingibst.",
    pantryPickBanner: "Speichern in",
    pantryChooseFolder: "In welchen Ordner?",
    pantryManage: "Verwalten",
    pantryItemOne: "Lebensmittel",
    pantryItemMany: "Lebensmittel",
    importTitle: "Rezept aus Link oder Text",
    importHint: "Füge einen Link (Instagram, TikTok, Rezeptseite) oder den kopierten Beschreibungstext ein. Die App liest die Zutaten und holt die Nährwerte pro Portion.",
    importPlaceholder: "https://… oder Text einfügen",
    importGo: "Nährwerte holen",
    importBusy: "Rezept wird gelesen …",
    importFound: "Erkannt",
    importPortions: "Portionen im Rezept",
    importEstimated: "Werte geschätzt, bitte kurz prüfen",
    importFromSource: "Werte laut Quelle",
    importUnreadable: "Diese Seite lässt sich nicht automatisch lesen, zum Beispiel Instagram mit Login. Kopiere die Beschreibung des Beitrags und füge den Text hier ein.",
    importNoRecipe: "Ich finde in diesem Inhalt kein Rezept.",
    importTooMany: "Zu viele Anfragen, versuche es in einer Minute noch einmal.",
    recipeLogNow: "Direkt ins Tagebuch",
    shareTypeEx: "Übung",
    libHowTo: "Schritt für Schritt",
    libAnim: "So geht's",
    libAnimHint: "Die Figur zeigt die Bewegung. Rot = die Muskeln, die arbeiten. Tippen hält an.",
    libPause: "Pause",
    libPlay: "Abspielen",
    libSlow: "Zeitlupe",
    libStartEnd: "Start und Ende im Wechsel. Tippen hält die Animation an.",
    libSource: "Bilder und englische Anleitung: free-exercise-db (gemeinfrei). Deutsche Schritte: ASFIT.",
    libFavs: "Favoriten",
    libAddFav: "Zu Favoriten hinzufügen",
    libTargetMuscles: "Zielmuskeln",
    libPrimary: "Hauptmuskeln",
    libSecondary: "Nebenmuskeln",
    libFront: "Vorne",
    libBack: "Hinten",
    libYoutube: "Technik auf YouTube",
    libBoard: "Rangliste",
    shareTypePlan: "Trainingsplan",
    shareTypeMeal: "Mahlzeit",
    shareTypeDay: "Ernährungstag",
    shareTypeRecipe: "Rezept",
    shareTypePantry: "Speisekammer-Ordner",
    shareTypeDuel: "Wochen-Duell",
    shareFrom: "{n} teilt mit dir",
    sharePlanReplace: "Ersetzt deinen aktuellen Trainingsplan.",
    shareImport: "Importieren",
    shareDiscard: "Verwerfen",
    shareImported: "Importiert",
    shareCopied: "Link kopiert, jetzt einfügen und senden",
    shareCodeHint: "Falls der Link nicht öffnet: den Code unten in ASFIT einfügen (Einstellungen, Freunde & Duell).",
    shareButton: "Teilen",
    shareDayLink: "Tag teilen",
    sharePlanLink: "Plan teilen",
    shareRecipeBtn: "Rezept teilen",
    friendsTitle: "Freunde & Duell",
    friendsCardSub: "Teile Pläne und vergleiche die Woche mit Freunden",
    friendsIntro: "Schick einem Freund deinen Wochen-Code. Importiert er ihn und schickt dir seinen, seht ihr beide, wer in den letzten 7 Tagen besser war. Läuft ohne Konto, nur über Link oder Code.",
    friendsName: "Dein Name (so sehen dich Freunde)",
    friendsShareMine: "Meinen Wochen-Code teilen",
    friendsPaste: "Link oder Code von einem Freund einfügen",
    friendsImport: "Importieren",
    friendsBadCode: "Das ist kein gültiger ASFIT-Link oder -Code.",
    friendsNone: "Noch keine Freunde. Schick deinen Code und lass dir den deines Freundes schicken.",
    friendsRematch: "Revanche: neuen Code senden",
    friendsRemove: "Entfernen",
    friendsAsOf: "Stand: {d}",
    duelYou: "Du",
    duelYouLead: "Du führst",
    duelTheyLead: "{n} führt",
    duelTie: "Gleichstand",
    duelTrainings: "Trainings",
    duelVolume: "Trainingsvolumen",
    duelMinutes: "Trainingszeit",
    duelTracked: "Getrackte Tage",
    duelStreak: "Serie (Tage)",
    duelSteps: "Schritte pro Tag",
    nutriLinkPlaceholder: "Link oder Text einfügen",
    nutriLinkHint: "Instagram, TikTok, Rezeptseite oder die kopierte Beschreibung. Die App holt die Nährwerte.",
    importGoShort: "Holen",
    importPaste: "Einfügen",
    foodLinkTitle: "Link erkannt: Nährwerte aus dem Rezept holen",
    foodLinkSub: "Funktioniert mit Rezeptseiten und TikTok. Bei Instagram kopierst du die Beschreibung des Beitrags und fügst den Text ein.",
    intakeTitle: "Einnahme-Tagebuch",
    intakeDisclaimer: "Reines Tagebuch für deine eigenen Einträge. Keine Empfehlung und keine medizinische Beratung. Sprich Einnahmen und Blutwerte mit einer Ärztin oder einem Arzt ab. Die Daten bleiben nur auf deinem Handy.",
    intakeIntro: "Lege an, was du nimmst, und trage ein, wann du es genommen oder gespritzt hast. Die App zeigt dir, was fällig ist, und schlägt die nächste Injektionsstelle vor.",
    intakeNew: "Neue Substanz",
    intakeChange: "Ändern",
    intakeName: "Name",
    intakeRoute: "Art",
    intakeDose: "Dosis",
    intakeSchedule: "Rhythmus",
    intakeEvery: "Alle X Tage",
    intakeEveryPre: "Alle",
    intakeEveryPost: "Tage",
    intakeEveryN: "alle {n} Tage",
    intakeWeekdaysLabel: "Wochentage",
    intakeNeeded: "Nach Bedarf",
    intakeSave: "Speichern",
    intakeCancel: "Abbrechen",
    intakeTakeNow: "Jetzt eingenommen",
    intakeSite: "Injektionsstelle",
    intakeSuggest: "Vorschlag für die nächste Stelle (Wechsel der Stellen)",
    intakeNote: "Notiz (optional)",
    intakeLogged: "Eingetragen",
    intakeLast: "Zuletzt",
    intakeNever: "noch nie",
    intakeDueToday: "heute fällig",
    intakeTomorrow: "morgen fällig",
    intakeOverdue: "seit {n} Tg. überfällig",
    intakeInDays: "in {n} Tagen",
    intakeHistory: "Verlauf",
    intakeAll: "Alle",
    intakeEmptyHistory: "Noch keine Einträge.",
    intakeCardTitle: "Einnahme fällig",
    intakeCardOn: "Auf der Startseite erinnern",
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
    setGroupAccount: "Konto",
    setGroupApp: "App",
    setGroupData: "Daten & Datenschutz",
    setGroupHelp: "Hilfe & Info",
    setGroupLegal: "Rechtliches",
    setTermsRow: "Nutzungsbedingungen",
    setImprintRow: "Impressum",
    setProfileRow: "Profil bearbeiten",
    setGoalsRow: "Meine Ziele",
    setDisplayRow: "Darstellung & Sprache",
    setDataRow: "Daten sichern & löschen",
    setHelpRow: "Hilfe & FAQ",
    setShareRow: "ASFIT weiterempfehlen",
    setAboutRow: "Über ASFIT",
    setAvatarChange: "Foto ändern",
    setAvatarRemove: "Foto entfernen",
    setName: "Name",
    setGender: "Geschlecht",
    setBirth: "Geburtstag",
    setHeight: "Größe (cm)",
    setSavedMsg: "Gespeichert",
    setGoalType: "Ziel",
    setTargetWeight: "Zielgewicht (kg)",
    setTargetDate: "Zieldatum",
    setKcal: "Kalorienziel",
    setKcalAuto: "Automatisch",
    setKcalManual: "Manuell",
    setKcalHint: "Berechnet aus deinen Körperdaten, deinem Ziel und dem Zieldatum.",
    setKcalManualHint: "Dein eigenes Tagesziel (kcal).",
    setMacros: "Makro-Verteilung",
    setSplitBalanced: "Ausgewogen 30/40/30",
    setSplitProtein: "Eiweißreich 40/30/30",
    setSplitLowcarb: "Low Carb 35/25/40",
    setMacroOrder: "Eiweiß / Kohlenhydrate / Fett in %",
    setStepsGoalLabel: "Schritteziel",
    setWaterGoal: "Wasserziel (ml)",
    setWaterDefault: "Standard für dein Gewicht:",
    remTime: "Uhrzeit",
    remNoteWeb: "Erinnerungen funktionieren in der installierten Android-App.",
    remNoteNative: "Du bekommst täglich zur gewählten Uhrzeit eine Benachrichtigung.",
    remFoodBody: "Zeit, dein Essen einzutragen 🍽️",
    remWeighBody: "Wiege dich und trage dein Gewicht ein ⚖️",
    remTrainBody: "Zeit fürs Training 💪",
    setAskAi: "KI-Assistenten fragen",
    setFaqTitle: "Häufige Fragen",
    setFaq: [{"q":"Wie logge ich Essen?","a":"Öffne den Tab Ernährung und tippe auf die Suchleiste. Suche ein Lebensmittel, scanne einen Barcode oder nutze den KI-Foto-Scan. Menge wählen und auf Hinzufügen tippen."},{"q":"Wie funktioniert der KI-Foto-Scan?","a":"Mach ein Foto deiner Mahlzeit oder wähle eins aus. Die KI schätzt Zutaten, Kalorien und Makros. Namen und Mengen kannst du vor dem Loggen ändern — es ist eine Schätzung und kann abweichen."},{"q":"Wie werden meine Kalorien berechnet?","a":"Aus Alter, Größe, Gewicht und Geschlecht (Mifflin-St Jeor) mal einem Aktivitätsfaktor, angepasst an dein Ziel und Zieldatum. Ein eigenes Ziel legst du unter Einstellungen → Meine Ziele fest."},{"q":"Wo werden meine Daten gespeichert?","a":"Auf deinem Gerät. Unter Einstellungen → Daten sichern & löschen speicherst du eine Sicherungsdatei, damit nichts verloren geht, wenn du die App neu installierst."},{"q":"Wie funktionieren Workouts?","a":"Starte ein Workout im Tab Training. Es läuft weiter — auch wenn du die App schließt — bis du es beendest oder verwirfst."},{"q":"Was sind Rekorde und Herausforderungen?","a":"Unter Training → Rekorde siehst du deine Bestleistungen automatisch. Du kannst auch eigene Herausforderungen anlegen, wie einen 5-km-Lauf, und eine Belohnung festlegen."},{"q":"Warum dauert die erste Suche oder KI-Antwort lange?","a":"Der kostenlose Server schläft, wenn ihn niemand nutzt, und braucht bis zu einer Minute zum Aufwachen. Danach ist er wieder schnell."},{"q":"Wie verbinde ich meine Smartwatch oder andere Gesundheits-Apps?","a":"Einstellungen → Verbindungen & Gesundheits-Apps. Schalte in deiner Uhr- oder Fitness-App die Synchronisierung mit Health Connect ein und verbinde dann ASFIT dort."}],
    setAboutVersion: "Version",
    setAboutData: "Datenquellen",
    setAboutDataText: "Nährwerte: USDA FoodData Central und Open Food Facts (© Open-Food-Facts-Mitwirkende, ODbL).",
    setAboutAi: "KI",
    setAboutAiText: "Assistent, Foto-Scan und Rezepte laufen mit Claude von Anthropic. Rezeptbilder sind KI-Illustrationen.",
    setAboutDisclaimer: "Hinweis",
    setAboutDisclaimerText: "ASFIT gibt keine medizinische Beratung. Kalorien- und Nährwertangaben sind Schätzwerte. Sprich vor größeren Änderungen bei Ernährung oder Training mit einer Ärztin oder einem Arzt.",
    setShareText: "Ich tracke mein Training und meine Ernährung mit ASFIT:",
    setShareCopied: "Link kopiert",
    setDataIntro: "Deine Daten liegen auf diesem Gerät. Sichere sie regelmäßig.",
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
    scanNext: "Nächstes Produkt scannen",
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
    planNamePlaceholder: "Planname",
    addDay: "Tag hinzufügen",
    dayNamePlaceholder: "Tagname",
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
  const opt = (v, d) => (v == null ? undefined : Math.round(v * f * d) / d);
  return {
    kcal: Math.round(per100.kcal * f),
    protein: Math.round(per100.protein * f * 10) / 10,
    carbs: Math.round(per100.carbs * f * 10) / 10,
    fat: Math.round(per100.fat * f * 10) / 10,
    // not every source reports these — undefined means "unknown", not zero
    fiber: opt(per100.fiber, 10),
    sugar: opt(per100.sugar, 10),
    salt: opt(per100.salt, 100),
  };
}

// "Ballaststoffe 2.6 g · Zucker 12 g · Salz 0.1 g" for whatever is known.
function MicroLine({ t, v, mb = 16 }) {
  const parts = v ? [["fiber", v.fiber], ["sugar", v.sugar], ["salt", v.salt]].filter(([, x]) => x != null) : [];
  if (!parts.length) return null;
  return <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginBottom: mb, lineHeight: 1.5 }}>{parts.map(([k, x]) => t[k] + " " + x + " g").join(" · ")}</div>;
}

// Simple standard macro split (30% protein / 40% carbs / 30% fat) derived
// from the user's own kcal goal — not fake, just a deterministic default
// until the app offers a way to fine-tune macro targets individually.
const MACRO_SPLITS = { balanced: [0.3, 0.4, 0.3], protein: [0.4, 0.3, 0.3], lowcarb: [0.35, 0.25, 0.4] };
function computeMacroTargets(kcalGoal, split = "balanced") {
  const [p, c, f] = MACRO_SPLITS[split] || MACRO_SPLITS.balanced;
  return {
    protein: Math.round((kcalGoal * p) / 4),
    carbs: Math.round((kcalGoal * c) / 4),
    fat: Math.round((kcalGoal * f) / 9),
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
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [target, setTarget] = useState("");
  const [birth, setBirth] = useState({ d: "1", m: "1", y: "2000" });
  const [targetDate, setTargetDate] = useState(() => new Date(Date.now() + 84 * 86400000).toISOString().slice(0, 10));
  const [vision3Months, setVision3Months] = useState("");
  const [visionWhy, setVisionWhy] = useState("");
  const [stepsGoal, setStepsGoal] = useState(10000);

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

  const LAST_STEP = 13;
  const statsValid = Number(weight) > 0 && Number(height) > 0 && Number(target) > 0;
  const canContinue = !((step === 1 && !gender) || (step === 3 && !goal) || (step === 7 && (!name.trim() || !statsValid)));

  // Language picker comes before everything else, including "Welcome" — a
  // brand-new visitor hasn't chosen DE/EN yet, so both language names are
  // shown together rather than relying on translated copy for this screen.
  if (!langChosen) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 24px 28px", justifyContent: "center" }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <img src="/icon-192.png" alt="ASFIT" style={{ width: 84, height: 84, borderRadius: 24, display: "block", margin: "0 auto 26px" }} />
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
            <img src="/icon-192.png" alt="ASFIT" style={{ width: 84, height: 84, borderRadius: 24, display: "block", margin: "0 auto 26px" }} />
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
              { key: "diverse", title: t.obGenderDiverse },
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
            <input type="date" value={targetDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => e.target.value && setTargetDate(e.target.value)} style={{ ...numInputStyle, padding: "14px 14px", fontSize: 15, colorScheme: "dark" }} />
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
            <Footprints size={40} color={COLORS.gold} style={{ marginBottom: 18 }} />
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 6px" }}>{t.obStepsTitle}</h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, margin: "0 0 26px" }}>{t.obStepsSub}</p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <Stepper value={stepsGoal} onChange={(v) => setStepsGoal(Math.max(2000, Math.min(30000, v)))} step={500} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {[6000, 8000, 10000, 12000].map((v) => (
                <div
                  key={v}
                  onClick={() => setStepsGoal(v)}
                  style={{ padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, background: stepsGoal === v ? COLORS.goldSoft : COLORS.raised, color: stepsGoal === v ? COLORS.gold : COLORS.dim, border: `1px solid ${stepsGoal === v ? COLORS.gold : COLORS.border}` }}
                >
                  {v.toLocaleString("de-DE")}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 13 && (
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
                  stepsGoal,
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
      {step === 12 && (
        <div onClick={() => setStep(step + 1)} style={{ textAlign: "center", marginTop: 14, fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.dim, cursor: "pointer" }}>
          {t.obStepsSkip}
        </div>
      )}
    </div>
  );
}

/* ---------------- Main tab screens ---------------- */

function WaterCard({ t, waterMl, goalMl, lastMl, onAdd, onUndo, onSaveGoal }) {
  const pct = Math.min(100, (waterMl / goalMl) * 100);
  const [custom, setCustom] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const customVal = parseInt(custom, 10);
  const customOk = customVal > 0 && customVal <= 5000;
  const chip = { flex: 1, background: COLORS.raised, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "9px 4px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 12.5, cursor: "pointer" };
  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <GlassWater size={17} color={COLORS.teal} />
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 600, color: COLORS.text }}>{t.waterTitle}</span>
        </div>
        <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.text, whiteSpace: "nowrap" }}>
          {(waterMl / 1000).toFixed(2).replace(/\.?0+$/, "")}
          <span onClick={() => { setGoalInput(String(goalMl)); setEditingGoal(!editingGoal); }} style={{ color: COLORS.teal, fontWeight: 600, cursor: "pointer", textDecoration: "underline dotted" }}> / {(goalMl / 1000).toFixed(2).replace(/\.?0+$/, "")} L</span>
        </span>
      </div>
      {editingGoal && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input type="number" inputMode="numeric" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder={t.waterGoalPh} style={{ ...numInputStyle, flex: 1 }} />
          <button
            onClick={() => {
              const v = parseInt(goalInput, 10);
              if (v >= 500 && v <= 10000) { onSaveGoal(v); setEditingGoal(false); }
            }}
            style={{ background: COLORS.teal, color: COLORS.bg, border: "none", borderRadius: 10, padding: "0 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            {t.waterSave}
          </button>
        </div>
      )}
      <div style={{ height: 10, borderRadius: 5, background: COLORS.raised, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: COLORS.teal, borderRadius: 5, transition: "width .5s ease" }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {[200, 250, 330, 500].map((ml) => (
          <button key={ml} onClick={() => onAdd(ml)} style={chip}>+ {ml}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="number"
          inputMode="numeric"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && customOk) { onAdd(customVal); setCustom(""); } }}
          placeholder={t.waterCustomPh}
          style={{ ...numInputStyle, flex: 1, minWidth: 0 }}
        />
        <button
          onClick={() => { if (customOk) { onAdd(customVal); setCustom(""); } }}
          disabled={!customOk}
          style={{ background: customOk ? COLORS.teal : COLORS.raised, color: customOk ? COLORS.bg : COLORS.dim, border: "none", borderRadius: 12, padding: "0 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13, cursor: customOk ? "pointer" : "default", whiteSpace: "nowrap" }}
        >
          {t.waterAddBtn}
        </button>
      </div>
      {waterMl > 0 && (
        <div style={{ textAlign: "right", marginTop: 8 }}>
          <span onClick={onUndo} style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, cursor: "pointer", textDecoration: "underline" }}>
            {t.waterUndo}{lastMl ? " (−" + lastMl + " ml)" : ""}
          </span>
        </div>
      )}
    </Card>
  );
}

function BackupReminder({ t, onOpen }) {
  return (
    <Card onClick={onOpen} style={{ marginBottom: 12, cursor: "pointer", border: "1px solid " + COLORS.gold, background: COLORS.goldSoft }}>
      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.text }}>{t.backupDueTitle}</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginTop: 3, lineHeight: 1.45 }}>{t.backupDueText}</div>
    </Card>
  );
}

function HomeScreen({ t, profile, meals, weightLog, workoutHistory, notes, waterMl, onAddWater, onUndoWater, lastWaterMl, onSaveWaterGoal, onOpenAssistant, steps, stepsSource, stepsGoal, onSaveStepsGoal, onConnectSteps, onSaveSteps, history, streak, onOpenHistory, backupDue, onOpenBackup, intakeDue = [], onOpenIntake }) {
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
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: -4, marginBottom: 22 }}>
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : null}
        <p style={{ color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 14, margin: 0 }}>
          {new Date().getHours() < 11 ? t.greetingPrefix : new Date().getHours() < 17 ? t.greetingDay : t.greetingEvening}, {profile.name}
        </p>
      </div>

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

      {backupDue && <BackupReminder t={t} onOpen={onOpenBackup} />}
      {intakeDue.length > 0 && (
        <Card onClick={onOpenIntake} style={{ marginBottom: 12, cursor: "pointer", border: "1px solid " + COLORS.gold, background: COLORS.goldSoft }}>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.text }}>{t.intakeCardTitle}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginTop: 3, lineHeight: 1.45 }}>
            {intakeDue.map((x) => x.name + (x.diff < 0 ? " (" + t.intakeOverdue.replace("{n}", -x.diff) + ")" : "")).join(" · ")}
          </div>
        </Card>
      )}
      <StreakCard t={t} streak={streak} history={history} onOpen={onOpenHistory} />
      <StepsCard t={t} steps={steps} source={stepsSource} weightKg={profile.weight} goal={stepsGoal} onSaveGoal={onSaveStepsGoal} onConnect={onConnectSteps} onSaveManual={onSaveSteps} />

      <WaterCard t={t} waterMl={waterMl} goalMl={profile.waterGoalMl || Math.round(((profile.weight || 70) * 35) / 250) * 250} lastMl={lastWaterMl} onAdd={onAddWater} onUndo={onUndoWater} onSaveGoal={onSaveWaterGoal} />

      <Card onClick={onOpenAssistant} style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: COLORS.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <MessageCircle size={17} color={COLORS.gold} />
        </div>
        <span style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.text }}>{t.assistantEntry}</span>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Card>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim }}>{t.lastWorkout}</div>
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
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim }}>{t.currentWeight}</div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 600, color: COLORS.text, marginTop: 2 }}>{latestWeight ? `${latestWeight.kg} kg` : "–"}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.teal, marginTop: 2 }}>
            {weightLog.length > 1
              ? `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg${weeksBetween > 0 ? ` / ${weeksBetween} ${t.weeksLabel}` : ""}`
              : t.firstWeightEntry}
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginBottom: 6 }}>{t.todaysNote}</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: latestNote ? COLORS.text : COLORS.dim }}>{latestNote ? latestNote.text : t.noNoteToday}</div>
      </Card>
    </div>
  );
}

function NutritionScreen({ t, lang, meals, macroTargets, myMeals, cheats, history, onOpenFoodSearch, onOpenRecipes, onOpenMyMeals, onOpenCheats, onSaveMyMeal, onDeleteItem, onCopyItems, onEditItem, pantry = [], onOpenPantry, onImportText, onShare, onOpenFastFood }) {
  const [linkText, setLinkText] = useState("");
  const todayMs = new Date(new Date().toLocaleDateString("sv") + "T00:00").getTime();
  const nextCheat = [...cheats].map((c) => ({ ...c, diff: Math.round((new Date(c.date + "T00:00").getTime() - todayMs) / 86400000) })).filter((c) => c.diff >= 0).sort((a, b) => a.diff - b.diff)[0];
  const mealDefs = [
    { key: "breakfast", label: t.breakfast },
    { key: "lunch", label: t.lunch },
    { key: "dinner", label: t.dinner },
    { key: "snacks", label: t.snacks },
  ];

  // Yazio-style day flip: browse any earlier day's diary right here, read-only,
  // without leaving the Nutrition tab. Resets to today whenever this screen
  // remounts (e.g. switching tabs and back) — that's the expected behaviour.
  const [viewDate, setViewDate] = useState(() => todayStamp());
  const dateInputRef = useRef(null);
  const today = todayStamp();
  const isToday = viewDate === today;
  const viewMeals = isToday ? meals : history?.[viewDate]?.meals || { breakfast: [], lunch: [], dinner: [], snacks: [] };
  const hasAnyItem = Object.values(viewMeals).some((a) => a.length > 0);
  const yesterdayMeals = history?.[dateKey(new Date(Date.now() - 86400000))]?.meals;
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(null); // { slot, idx, grams }
  const copy = (slot, items) => {
    onCopyItems(slot, items);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const shiftDay = (delta) => {
    const d = new Date(viewDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    const next = dateKey(d);
    if (next <= today) setViewDate(next);
  };
  const dateLabel = (() => {
    if (isToday) return t.diaryToday;
    const y = dateKey(new Date(Date.now() - 86400000));
    if (viewDate === y) return t.diaryYesterday;
    const locale = lang === "de" ? "de-DE" : "en-US";
    return new Date(viewDate + "T12:00:00").toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  })();

  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div onClick={() => shiftDay(-1)} style={{ width: 34, height: 34, borderRadius: 10, background: COLORS.raised, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          <ChevronLeft size={17} color={COLORS.text} />
        </div>
        <div onClick={() => dateInputRef.current?.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", position: "relative" }}>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 14.5, fontWeight: 700, color: COLORS.text, textTransform: "capitalize" }}>{dateLabel}</span>
          {!isToday && <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.gold, display: "inline-block" }} />}
          <input
            ref={dateInputRef}
            type="date"
            value={viewDate}
            max={today}
            onChange={(e) => e.target.value && setViewDate(e.target.value)}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", border: "none" }}
          />
        </div>
        <div onClick={() => !isToday && shiftDay(1)} style={{ width: 34, height: 34, borderRadius: 10, background: COLORS.raised, display: "flex", alignItems: "center", justifyContent: "center", cursor: isToday ? "default" : "pointer", opacity: isToday ? 0.3 : 1, flexShrink: 0 }}>
          <ChevronLeft size={17} color={COLORS.text} style={{ transform: "rotate(180deg)" }} />
        </div>
      </div>

      {copied && <div style={{ textAlign: "center", marginBottom: 12, fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.gold }}>✓ {t.copiedToast}</div>}
      <Card style={{ marginBottom: 16 }}>
        <MacroBar label={t.protein} value={sumMeals(viewMeals, "protein")} target={macroTargets.protein} color={COLORS.teal} />
        <MacroBar label={t.carbs} value={sumMeals(viewMeals, "carbs")} target={macroTargets.carbs} color={COLORS.gold} />
        <MacroBar label={t.fat} value={sumMeals(viewMeals, "fat")} target={macroTargets.fat} color={COLORS.coral} />
        {(() => {
          const fiber = sumMeals(viewMeals, "fiber");
          const sugar = sumMeals(viewMeals, "sugar");
          const salt = sumMeals(viewMeals, "salt");
          if (!(fiber > 0 || sugar > 0 || salt > 0)) return null;
          const r1 = (v) => Math.round(v * 10) / 10;
          return (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid " + COLORS.border, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim }}>
              <span>{t.fiber} <b style={{ color: COLORS.text }}>{r1(fiber)} g</b></span>
              <span>{t.sugar} <b style={{ color: COLORS.text }}>{r1(sugar)} g</b></span>
              <span>{t.salt} <b style={{ color: salt > 6 ? COLORS.coral : COLORS.text }}>{r1(salt)} g</b></span>
            </div>
          );
        })()}
      </Card>

      {isToday && (
        <>
          <div onClick={() => onOpenFoodSearch("snacks")} style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "11px 14px", marginBottom: 12, cursor: "pointer" }}>
            <Search size={16} color={COLORS.dim} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, flex: 1 }}>{t.searchPlaceholder}</span>
            <ScanLine size={17} color={COLORS.gold} />
          </div>

          <div onClick={onOpenRecipes} style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", background: COLORS.raised, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 14px", marginBottom: 12, cursor: "pointer" }}>
            <BookOpen size={16} color={COLORS.gold} />
            <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.gold }}>{t.recipesButton}</span>
          </div>

          <div style={{ background: COLORS.surface, border: "1px solid " + COLORS.border, borderRadius: 14, padding: "12px 14px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Link2 size={16} color={COLORS.gold} />
              <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>{t.importTitle}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && linkText.trim()) onImportText(linkText.trim()); }}
                placeholder={t.nutriLinkPlaceholder}
                style={{ ...numInputStyle, flex: 1, minWidth: 0 }}
              />
              {!linkText.trim() && navigator.clipboard && navigator.clipboard.readText ? (
                <button onClick={() => navigator.clipboard.readText().then((x) => setLinkText(String(x || "").slice(0, 8000))).catch(() => {})} style={{ background: COLORS.raised, color: COLORS.gold, border: "1px solid " + COLORS.border, borderRadius: 10, padding: "0 12px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {t.importPaste}
                </button>
              ) : (
                <button disabled={!linkText.trim()} onClick={() => onImportText(linkText.trim())} style={{ background: linkText.trim() ? COLORS.gold : COLORS.raised, color: linkText.trim() ? COLORS.bg : COLORS.dim, border: "none", borderRadius: 10, padding: "0 14px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {t.importGoShort}
                </button>
              )}
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim, marginTop: 8, lineHeight: 1.4 }}>{t.nutriLinkHint}</div>
          </div>

          <div onClick={onOpenPantry} style={{ display: "flex", alignItems: "center", gap: 12, background: COLORS.surface, border: "1px solid " + COLORS.border, borderRadius: 14, padding: "12px 14px", marginBottom: 12, cursor: "pointer" }}>
            <span style={{ fontSize: 22 }}>🥫</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>{t.pantryButton}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {pantry.length ? pantry.map((f) => f.emoji + " " + f.name).join(" · ") : t.pantryButtonSub}
              </div>
            </div>
            <ChevronLeft size={16} color={COLORS.dim} style={{ transform: "rotate(180deg)", flexShrink: 0 }} />
          </div>

          <div data-fastfood onClick={onOpenFastFood} style={{ display: "flex", alignItems: "center", gap: 12, background: COLORS.surface, border: "1px solid " + COLORS.border, borderRadius: 14, padding: "12px 14px", marginBottom: 12, cursor: "pointer" }}>
            <span style={{ fontSize: 22 }}>🍔</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>{t.ffButton}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.ffButtonSub}</div>
            </div>
            <ChevronLeft size={16} color={COLORS.dim} style={{ transform: "rotate(180deg)", flexShrink: 0 }} />
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
        </>
      )}

      {hasAnyItem && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <span onClick={() => onShare({ t: "day", m: Object.fromEntries(Object.entries(viewMeals).map(([k, arr]) => [k, arr.map(shFoodOut)])) }, t.shareTypeDay)} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.gold, cursor: "pointer" }}>
            <Share2 size={14} /> {t.shareDayLink}
          </span>
        </div>
      )}

      {!isToday && !hasAnyItem ? (
        <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginTop: 24, marginBottom: 20 }}>{t.diaryNothing}</div>
      ) : (
        mealDefs.map((m) => {
          const items = viewMeals[m.key];
          const kcal = items.reduce((s, it) => s + it.kcal, 0);
          if (!isToday && items.length === 0) return null;
          return (
            <div key={m.key} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 600, color: COLORS.text }}>{m.label}</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim }}>
                  {(() => {
                    // today: offer yesterday's same meal while this one is still empty;
                    // a past day: offer to copy this meal into today
                    const src = isToday ? yesterdayMeals?.[m.key] : items;
                    const canCopy = src && src.length > 0 && (isToday ? items.length === 0 : true);
                    return canCopy ? (
                      <span onClick={() => copy(m.key, src)} style={{ color: COLORS.gold, fontWeight: 600, cursor: "pointer", marginRight: kcal > 0 ? 10 : 0 }}>
                        {isToday ? t.copyYesterday : t.copyToToday}
                      </span>
                    ) : null;
                  })()}
                  {kcal > 0 ? `${kcal} kcal` : ""}
                  {items.length > 0 && (
                    <span onClick={() => onShare({ t: "meal", title: m.label, slot: m.key, f: items.map(shFoodOut) }, m.label)} title={t.shareButton} style={{ marginLeft: 10, cursor: "pointer", color: COLORS.gold, display: "inline-flex", verticalAlign: "middle" }}>
                      <Share2 size={14} />
                    </span>
                  )}
                </span>
              </div>
              <Card style={{ padding: 4 }}>
                {items.map((it, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: i < items.length - 1 || isToday ? `1px solid ${COLORS.border}` : "none", fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.text }}>
                    <span onClick={isToday && it.grams ? () => setEditing({ slot: m.key, idx: i, grams: it.grams }) : undefined} style={{ cursor: isToday && it.grams ? "pointer" : "default", minWidth: 0 }}>
                      {it.name}
                      {it.grams ? <span style={{ color: COLORS.dim }}> · {it.grams}{it.unit || "g"}</span> : null}
                    </span>
                    <span style={{ color: COLORS.dim, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center" }}>
                      {it.kcal} kcal
                      {isToday && (
                        <>
                          {it.grams ? (
                            <span onClick={() => setEditing({ slot: m.key, idx: i, grams: it.grams })} title={t.editAmount} style={{ marginLeft: 10, cursor: "pointer", color: COLORS.dim, display: "inline-flex" }}>
                              <Pencil size={13} />
                            </span>
                          ) : null}
                          <span onClick={() => onSaveMyMeal(it)} title={t.saveMine} style={{ marginLeft: 10, cursor: "pointer", color: COLORS.gold, fontSize: 16 }}>
                            {myMeals.some((x) => x.name === it.name) ? "★" : "☆"}
                          </span>
                          <span onClick={() => onDeleteItem(m.key, i)} title={t.delete} style={{ marginLeft: 8, cursor: "pointer", color: COLORS.dim, display: "inline-flex" }}>
                            <X size={14} />
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                ))}
                {isToday && (
                  <div onClick={() => onOpenFoodSearch(m.key)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", color: COLORS.gold, fontFamily: "Inter, sans-serif", fontSize: 13, cursor: "pointer" }}>
                    <Plus size={14} /> {t.add}
                  </div>
                )}
              </Card>
            </div>
          );
        })
      )}
      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: "fixed", inset: 0, background: "rgba(22,26,29,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.bg, borderRadius: 22, padding: "22px 20px", width: "100%", maxWidth: 330 }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 14 }}>{t.editAmount}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div onClick={() => setEditing((e) => ({ ...e, grams: Math.max(5, Math.round(e.grams) - 10) }))} style={{ width: 34, height: 34, borderRadius: 9, background: COLORS.raised, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Minus size={14} color={COLORS.text} />
              </div>
              <input type="number" inputMode="decimal" value={editing.grams || ""} onChange={(e) => setEditing((x) => ({ ...x, grams: Math.max(0, Math.min(5000, Number(e.target.value) || 0)) }))} style={{ ...numInputStyle, width: 100, textAlign: "center", fontWeight: 700 }} />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim }}>{viewMeals[editing.slot][editing.idx]?.unit || "g"}</span>
              <div onClick={() => setEditing((e) => ({ ...e, grams: Math.min(5000, Math.round(e.grams) + 10) }))} style={{ width: 34, height: 34, borderRadius: 9, background: COLORS.raised, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Plus size={14} color={COLORS.text} />
              </div>
            </div>
            <button
              disabled={!(editing.grams > 0)}
              onClick={() => { onEditItem(editing.slot, editing.idx, editing.grams); setEditing(null); }}
              style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 12, padding: "12px 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: editing.grams > 0 ? 1 : 0.5 }}
            >
              {t.saveAmount}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TrainingScreen({ t, lang, planName, planDays = [], personalBests, workoutHistory, onStartWorkout, onOpenPlanBuilder, onOpenLibrary, onOpenRecords, activeWorkout, onSharePlan, onOpenFriends }) {
  const timed = workoutHistory.filter((w) => w.durationSec > 0);
  const avgSessionSec = timed.length ? Math.round(timed.reduce((s, w) => s + w.durationSec, 0) / timed.length) : null;
  const totalVolume = Math.round(workoutHistory.reduce((s, w) => s + w.volumeKg, 0));
  const trained = Object.keys(personalBests)
    .map((key) => ({ ex: EXERCISE_LIBRARY.find((e) => e.key === key), best: personalBests[key] }))
    .filter((x) => x.ex);
  const [selectedDayId, setSelectedDayId] = useState(planDays[0]?.id ?? null);
  const hasPlanDays = planName && planDays.length > 0;
  const selectedDay = hasPlanDays ? planDays.find((d) => d.id === selectedDayId) || planDays[0] : null;
  const startFromCard = () => {
    if (!activeWorkout && selectedDay) {
      onStartWorkout(
        selectedDay.exercises.map((ex) => (ex.muscle === "cardio" ? { key: ex.key, cardio: true, minutes: "" } : { key: ex.key, sets: [] }))
      );
    } else {
      onStartWorkout();
    }
  };
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
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginTop: 3 }}>
              {selectedDay ? selectedDay.name + " · " + selectedDay.exercises.length + " " + (selectedDay.exercises.length === 1 ? t.exerciseSingular : t.exercises) : t.freeWorkoutSub}
            </div>
          </div>
          <button onClick={startFromCard} style={{ background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 12, padding: "11px 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer", flexShrink: 0 }}>
            {activeWorkout ? t.resumeWorkout : t.startWorkout}
          </button>
        </div>
        {hasPlanDays && planDays.length > 1 && (
          <div style={{ display: "flex", gap: 8, marginTop: 14, overflowX: "auto", paddingBottom: 2 }}>
            {planDays.map((d) => (
              <Chip key={d.id} label={d.name} active={(selectedDay && selectedDay.id) === d.id} onClick={() => setSelectedDayId(d.id)} />
            ))}
          </div>
        )}
        {hasPlanDays && (
          <div onClick={onSharePlan} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 12, fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.gold, cursor: "pointer" }}>
            <Share2 size={14} /> {t.sharePlanLink}
          </div>
        )}
      </Card>

      <Card style={{ marginBottom: 18, cursor: "pointer" }}>
        <div onClick={onOpenFriends} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 26 }}>⚔️</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text }}>{t.friendsTitle}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginTop: 2 }}>{t.friendsCardSub}</div>
          </div>
          <ChevronLeft size={16} color={COLORS.dim} style={{ transform: "rotate(180deg)", flexShrink: 0 }} />
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
  // The far left (oldest) and far right (newest) point don't automatically
  // get a label unless they happen to be the min/max — label them too, in a
  // plain neutral style, so both edges of the chart always show a value.
  const edgeLabel = (idx) => {
    const [x, y] = coords[idx];
    const above = y > 40;
    return (
      <g key={"edge-" + idx}>
        <circle cx={x} cy={y} r={3.5} fill={COLORS.bg} stroke={COLORS.dim} strokeWidth={2} />
        <text x={x} y={y + (above ? -10 : 17)} textAnchor={anchorFor(x)} fontSize="10.5" fontWeight="600" fontFamily="Inter, sans-serif" fill={COLORS.dim}>
          {fmtV(points[idx])}
        </text>
      </g>
    );
  };
  const firstIdx = 0;
  const lastIdx = n - 1;
  return (
    <svg viewBox={"0 0 " + w + " " + height} width="100%" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {n > 1 && <path d={areaPath} fill={"url(#" + gradId + ")"} />}
      {n > 1 && <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
      {n > 1 && firstIdx !== minIdx && firstIdx !== maxIdx && edgeLabel(firstIdx)}
      {n > 1 && lastIdx !== minIdx && lastIdx !== maxIdx && edgeLabel(lastIdx)}
      {max !== min && marker(minIdx, COLORS.coral, false)}
      {marker(maxIdx, COLORS.gold, true)}
    </svg>
  );
}

function ProgressScreen({ t, lang, weightLog, workoutHistory, onAddWeight, onDeleteWeight, photos, onAddPhoto, onDeletePhoto }) {
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

        {shownWeights.length > 0 && (
          <div style={{ marginTop: 14, maxHeight: 220, overflowY: "auto", borderTop: `1px solid ${COLORS.border}` }}>
            {[...shownWeights].reverse().map((w, i) => (
              <div key={w.dateISO + "-" + i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 2px", borderBottom: `1px solid ${COLORS.border}` }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim }}>
                  {fmtDate(w.dateISO)}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.text }}>{w.kg} kg</span>
                  <div onClick={() => onDeleteWeight(w.dateISO)} style={{ cursor: "pointer", padding: 4 }}>
                    <X size={14} color={COLORS.dim} />
                  </div>
                </div>
              </div>
            ))}
          </div>
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

// Icons are looked up from the note type at render time. They used to be saved inside
// the note, but a component can't be stored as JSON — after a reload the note came back
// with a broken icon and opening the Notes tab crashed the whole app to a blank screen.
const NOTE_ICONS = { 1: Dumbbell, 2: UtensilsCrossed, 3: Smile };

function NotesScreen({ t, lang, notes, filter, setFilter, onAddNote }) {
  const shown = filter === 0 ? notes : notes.filter((e) => e.type === filter);
  const noteDate = (e) => {
    if (!e.dateISO) return e.date;
    const d = new Date(e.dateISO);
    const k = dateKey(d);
    if (k === dateKey(new Date())) return t.diaryToday;
    if (k === dateKey(new Date(Date.now() - 86400000))) return t.diaryYesterday;
    return d.toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

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
              {(() => {
                const Icon = NOTE_ICONS[e.type] || NotebookPen;
                return <Icon size={16} color={COLORS.gold} />;
              })()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.text }}>{noteDate(e)}</span>
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

// Training time without paused periods: while paused the clock stands still.
const workoutElapsedMs = (aw, now) => Math.max(0, (aw.pausedAt || now) - aw.startedAt - (aw.pausedMs || 0));

// Visible on every screen while a workout runs, so the timer can't be forgotten.
function WorkoutBanner({ t, aw, onOpen }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div onClick={onOpen} style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 20px 10px", padding: "10px 14px", borderRadius: 14, background: COLORS.goldSoft, border: "1px solid " + COLORS.gold, cursor: "pointer" }}>
      <Timer size={16} color={COLORS.gold} />
      <span style={{ flex: 1, fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 700, color: COLORS.text }}>
        {aw.pausedAt ? t.workoutPaused : t.workoutRunning} · <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatDuration(Math.round(workoutElapsedMs(aw, now) / 1000))}</span>
      </span>
      <span style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 700, color: COLORS.gold }}>{t.resumeWorkout}</span>
    </div>
  );
}

// "Did you forget to stop it?" — asks once a workout has been running 2 h, whenever the
// app is open or comes back to the foreground; "still training" snoozes it for an hour.
function WorkoutLongPrompt({ t, aw, onEnd }) {
  const [open, setOpen] = useState(false);
  const snoozeUntil = useRef(0);
  const awRef = useRef(aw);
  awRef.current = aw;
  useEffect(() => {
    const check = () => {
      const a = awRef.current;
      if (!a.pausedAt && workoutElapsedMs(a, Date.now()) > 2 * 3600_000 && Date.now() > snoozeUntil.current) setOpen(true);
    };
    check();
    const id = setInterval(check, 30_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  if (!open) return null;
  const mins = Math.round(workoutElapsedMs(aw, Date.now()) / 60000);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(22,26,29,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: COLORS.bg, borderRadius: 24, padding: "26px 22px", width: "100%", maxWidth: 340, textAlign: "center" }}>
        <Timer size={34} color={COLORS.gold} />
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 19, fontWeight: 800, color: COLORS.text, margin: "10px 0 6px" }}>{t.workoutLongTitle}</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.dim, lineHeight: 1.5 }}>
          {t.workoutLongText} {Math.floor(mins / 60)}:{String(mins % 60).padStart(2, "0")} h.
        </div>
        <button onClick={() => { setOpen(false); onEnd(); }} style={{ width: "100%", marginTop: 18, background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "13px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          {t.workoutLongEnd}
        </button>
        <div onClick={() => { snoozeUntil.current = Date.now() + 3600_000; setOpen(false); }} style={{ marginTop: 14, fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, cursor: "pointer" }}>
          {t.workoutLongKeep}
        </div>
      </div>
    </div>
  );
}

// Epley estimate of the one-rep max from a set (only meaningful up to ~12 reps).
const estimate1RM = (w, r) => (w > 0 && r > 0 && r <= 12 ? Math.round((r === 1 ? w : w * (1 + r / 30)) * 2) / 2 : 0);

function WorkoutSession({ t, lang, startedAt, pausedAt = null, pausedMs = 0, onTogglePause, entries, onChangeEntries, onFinish, onDiscard, workoutHistory = [] }) {
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
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
  const elapsedSec = Math.round(workoutElapsedMs({ startedAt, pausedAt, pausedMs }, now) / 1000);

  // Rest timer between sets: ticking a set as done starts it. Counts down from a wall-clock
  // end time (so it stays right if the phone sleeps) and beeps/vibrates when it is over.
  const [restDefault, setRestDefault] = usePersisted("restDefault", 90);
  const [restEnd, setRestEnd] = useState(null);
  const [restDoneUntil, setRestDoneUntil] = useState(0);
  const audioRef = useRef(null);
  const unlockAudio = () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioRef.current = audioRef.current || new AC();
      audioRef.current.resume();
    } catch {
      /* no audio available */
    }
  };
  useEffect(() => {
    if (!restEnd || now < restEnd) return;
    setRestEnd(null);
    setRestDoneUntil(Date.now() + 8000);
    try {
      if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
      const ctx = audioRef.current;
      if (ctx) {
        [0, 0.28].forEach((d) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = 880;
          g.gain.value = 0.2;
          o.connect(g);
          g.connect(ctx.destination);
          o.start(ctx.currentTime + d);
          o.stop(ctx.currentTime + d + 0.2);
        });
      }
    } catch {
      /* sound is a nicety */
    }
  }, [now, restEnd]);
  const startRest = (sec) => {
    if (sec > 0) setRestEnd(Date.now() + sec * 1000);
  };
  const restLeft = restEnd ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0;

  // What you lifted the last time you trained this exercise.
  const lastSets = (key) => {
    for (let i = workoutHistory.length - 1; i >= 0; i--) {
      const ss = (workoutHistory[i].sets || []).filter((x) => x.exerciseKey === key);
      if (ss.length) return ss;
    }
    return null;
  };

  const addExercise = (key) => {
    const isCardio = (EXERCISE_LIBRARY.find((x) => x.key === key) || {}).muscle === "cardio";
    // Strength exercises start with no set yet — kg/Wdh only appear once you
    // tap "+ Satz hinzufügen" for the first set, instead of a pre-filled row.
    onChangeEntries([...entries, isCardio ? { key, cardio: true, minutes: "" } : { key, sets: [] }]);
    setPicking(false);
    setQuery("");
  };
  const updateSet = (ei, si, field, value) =>
    onChangeEntries(entries.map((en, i) => (i !== ei ? en : { ...en, sets: en.sets.map((s, j) => (j !== si ? s : { ...s, [field]: value })) })));
  const addSet = (ei) =>
    onChangeEntries(
      entries.map((en, i) => {
        if (i !== ei) return en;
        const prev = en.sets[en.sets.length - 1];
        const last = lastSets(en.key);
        // next set copies the previous one; the very first set starts from last time's numbers
        const fresh = prev ? { weight: prev.weight, reps: prev.reps } : last ? { weight: last[0].weight > 0 ? String(last[0].weight) : "", reps: String(last[0].reps) } : { weight: "", reps: "" };
        return { ...en, sets: [...en.sets, fresh] };
      })
    );
  const toggleDone = (ei, si) => {
    unlockAudio();
    const was = entries[ei].sets[si].done;
    updateSet(ei, si, "done", !was);
    // exercises linked as a superset only rest after the last exercise of the group
    if (!was) {
      if (!entries[ei + 1]?.ss) startRest(restDefault);
    } else setRestEnd(null);
  };
  const toggleSuperset = (ei) => onChangeEntries(entries.map((en, i) => (i !== ei ? en : { ...en, ss: !en.ss })));
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
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: pausedAt ? COLORS.raised : COLORS.goldSoft, borderRadius: 999, padding: "8px 18px", opacity: pausedAt ? 0.8 : 1 }}>
          <Timer size={15} color={pausedAt ? COLORS.dim : COLORS.gold} />
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: pausedAt ? COLORS.dim : COLORS.gold, fontVariantNumeric: "tabular-nums" }}>{formatDuration(elapsedSec)}</span>
        </div>
        <div onClick={onTogglePause} title={pausedAt ? t.workoutResume : t.workoutPause} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, cursor: "pointer", border: "1px solid " + (pausedAt ? COLORS.gold : COLORS.border), background: pausedAt ? COLORS.gold : COLORS.raised, color: pausedAt ? COLORS.bg : COLORS.dim, fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 700 }}>
          {pausedAt ? <Play size={14} /> : <Pause size={14} />}
          {pausedAt ? t.workoutResume : t.workoutPause}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginRight: 2 }}>{t.restTitle}</span>
        {[0, 60, 90, 120, 180].map((sec) => (
          <div key={sec} onClick={() => { unlockAudio(); setRestDefault(sec); if (!sec) setRestEnd(null); }} style={{ padding: "6px 11px", borderRadius: 999, cursor: "pointer", fontFamily: "Sora, sans-serif", fontSize: 12, fontWeight: 600, background: restDefault === sec ? COLORS.goldSoft : COLORS.raised, color: restDefault === sec ? COLORS.gold : COLORS.dim, border: "1px solid " + (restDefault === sec ? COLORS.gold : COLORS.border) }}>
            {sec === 0 ? t.restOff : sec + " s"}
          </div>
        ))}
        {restDefault > 0 && !restEnd && (
          <div onClick={() => { unlockAudio(); startRest(restDefault); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontFamily: "Sora, sans-serif", fontSize: 12, fontWeight: 700, background: COLORS.gold, color: COLORS.bg }}>
            <Play size={12} /> {t.restStart}
          </div>
        )}
      </div>
      {restEnd && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: COLORS.goldSoft, border: "1px solid " + COLORS.gold, borderRadius: 14, padding: "10px 14px", marginBottom: 14 }}>
          <Timer size={16} color={COLORS.gold} />
          <span style={{ flex: 1, fontFamily: "Sora, sans-serif", fontSize: 18, fontWeight: 800, color: COLORS.text, fontVariantNumeric: "tabular-nums" }}>{Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, "0")}</span>
          <span onClick={() => setRestEnd((e) => e + 30000)} style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 700, color: COLORS.gold, cursor: "pointer" }}>+30 s</span>
          <span onClick={() => setRestEnd(null)} style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.dim, cursor: "pointer" }}>{t.restSkip}</span>
        </div>
      )}
      {!restEnd && restDoneUntil > now && (
        <div style={{ textAlign: "center", background: COLORS.goldSoft, border: "1px solid " + COLORS.gold, borderRadius: 14, padding: "10px 14px", marginBottom: 14, fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 700, color: COLORS.gold }}>{t.restDone}</div>
      )}
      {entries.length === 0 && <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, marginTop: 0 }}>{t.emptyWorkout}</p>}

      {entries.map((en, ei) => {
        const ex = EXERCISE_LIBRARY.find((e) => e.key === en.key);
        return (
          <Card key={ei} style={{ marginBottom: 14, borderLeft: en.ss || entries[ei + 1]?.ss ? "3px solid " + COLORS.gold : undefined }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ flex: 1, fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text }}>{ex ? nameOf(ex) : en.key}</span>
              {ei > 0 && !en.cardio && !entries[ei - 1].cardio && (
                <span onClick={() => toggleSuperset(ei)} style={{ padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontFamily: "Sora, sans-serif", fontSize: 11.5, fontWeight: 700, background: en.ss ? COLORS.gold : COLORS.raised, color: en.ss ? COLORS.bg : COLORS.dim, border: "1px solid " + (en.ss ? COLORS.gold : COLORS.border) }}>
                  {t.superset}
                </span>
              )}
              {en.cardio && (
                <div onClick={() => removeEntry(ei)} style={{ cursor: "pointer", display: "flex" }}>
                  <X size={16} color={COLORS.dim} />
                </div>
              )}
            </div>
            {!en.cardio && lastSets(en.key) && (
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, margin: "-6px 0 10px" }}>
                {t.lastTime}: {lastSets(en.key).slice(0, 4).map((x) => (x.weight > 0 ? x.weight + " kg × " : "") + x.reps).join(" · ")}
              </div>
            )}
            {en.cardio && <input type="number" inputMode="decimal" min="0" value={en.minutes} onChange={(e) => updateMinutes(ei, e.target.value)} placeholder={t.minutesLabel} style={numInputStyle} />}
            {(en.sets || []).map((s, si) => (
              <div key={si} style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 30px 24px", gap: 8, alignItems: "center", marginBottom: 8, opacity: s.done ? 0.6 : 1 }}>
                <span style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, color: COLORS.dim }}>{si + 1}</span>
                <input type="number" inputMode="decimal" min="0" value={s.weight} onChange={(e) => updateSet(ei, si, "weight", e.target.value)} placeholder="kg" style={numInputStyle} />
                <input type="number" inputMode="numeric" min="0" value={s.reps} onChange={(e) => updateSet(ei, si, "reps", e.target.value)} placeholder={t.reps} style={numInputStyle} />
                <div onClick={() => toggleDone(ei, si)} style={{ width: 30, height: 30, borderRadius: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: s.done ? COLORS.gold : COLORS.raised, border: "1px solid " + (s.done ? COLORS.gold : COLORS.border) }}>
                  <Check size={15} color={s.done ? COLORS.bg : COLORS.dim} />
                </div>
                <div onClick={() => removeSet(ei, si)} style={{ cursor: "pointer", display: "flex" }}>
                  <X size={16} color={COLORS.dim} />
                </div>
              </div>
            ))}
            {!en.cardio && (() => {
              const best = Math.max(0, ...(en.sets || []).map((x) => estimate1RM(parseFloat(String(x.weight).replace(",", ".")), parseInt(x.reps, 10))));
              return best > 0 ? <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, margin: "2px 0 8px" }}>{t.e1rm}: <b style={{ color: COLORS.text }}>{best} kg</b></div> : null;
            })()}
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

      {/* Always tappable: with nothing valid logged (e.g. only weights, no reps) it just
          ends the workout instead of leaving the user stuck in a running session. */}
      <button
        onClick={canFinish ? finish : onDiscard}
        style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "15px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}
      >
        {t.finishWorkout}
      </button>
      {!canFinish && <div style={{ textAlign: "center", marginTop: 8, fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, lineHeight: 1.45 }}>{t.workoutNothingToSave}</div>}

      <div onClick={onDiscard} style={{ textAlign: "center", marginTop: 16, fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, cursor: "pointer" }}>
        {t.discardWorkout}
      </div>
    </div>
  );
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

function Confetti() {
  const pieces = useMemo(() => {
    const colors = ["#F5C242", "#E2694F", "#2E9E5B", "#3B82F6", "#A855F7", "#F472B6"];
    return Array.from({ length: 60 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      dur: 2.6 + Math.random() * 2.2,
      size: 6 + Math.random() * 7,
      rot: Math.random() * 360,
      color: colors[i % colors.length],
      round: i % 3 === 0,
    }));
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 1001 }}>
      <style>{"@keyframes asfitConfetti { 0% { transform: translateY(-8vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(108vh) rotate(720deg); opacity: 0.9; } }"}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{ position: "absolute", top: 0, left: p.left + "%", width: p.size, height: p.round ? p.size : p.size * 1.6, background: p.color, borderRadius: p.round ? "50%" : 2, transform: "rotate(" + p.rot + "deg)", animation: "asfitConfetti " + p.dur + "s " + p.delay + "s ease-in forwards", opacity: 0 }}
        />
      ))}
    </div>
  );
}

// The streak mascot "Sprout": strong on a long streak, friendly while it runs,
// worn out (pale, leaves hanging, dumbbell on the floor) once the streak is lost.
function Sprout({ mood = "ok", size = 64 }) {
  const weak = mood === "weak";
  const strong = mood === "strong";
  const body = weak ? "#B9A6A6" : "#E3262E";
  const dark = weak ? "#8F7E7F" : "#9E1219";
  const belly = weak ? "#DDD1D0" : "#F7B9A8";
  const leaf = weak ? "#A39D5C" : "#35B26B";
  const ink = "#2A1416";
  const arm = { fill: "none", stroke: body, strokeWidth: 13, strokeLinecap: "round" };
  const motion = weak ? "sproutSag 3.4s ease-in-out infinite" : strong ? "sproutBounce 1.2s ease-in-out infinite" : "sproutSway 3.2s ease-in-out infinite";
  const bell = (cx, cy, w, rot = 0) => (
    <g transform={`rotate(${rot} ${cx} ${cy})`}>
      <rect x={cx - w / 2} y={cy - 2.5} width={w} height="5" fill="#4A4A4F" />
      <rect x={cx - w / 2 - 5} y={cy - 9} width="6" height="18" rx="2" fill="#2E2E33" />
      <rect x={cx + w / 2 - 1} y={cy - 9} width="6" height="18" rx="2" fill="#2E2E33" />
    </g>
  );
  return (
    <svg viewBox="0 0 150 150" width={size} height={size} aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <style>{`
        @keyframes sproutBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes sproutSway { 0%,100% { transform: rotate(-1.5deg); } 50% { transform: rotate(1.5deg); } }
        @keyframes sproutSag { 0%,100% { transform: scale(1, 0.98); } 50% { transform: scale(1, 0.93); } }
        @keyframes sproutDrop { 0% { transform: translateY(0); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateY(18px); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .sprout-anim, .sprout-drop { animation: none !important; } }
      `}</style>
      <ellipse cx="75" cy="142" rx={weak ? 32 : 36} ry="6" fill="rgba(0,0,0,0.18)" />
      <g className="sprout-anim" style={{ transformBox: "fill-box", transformOrigin: "50% 100%", animation: motion }}>
        <ellipse cx="58" cy="136" rx="13" ry="6" fill={dark} />
        <ellipse cx="92" cy="136" rx="13" ry="6" fill={dark} />
        {strong ? (
          <>
            <path d="M36 100 Q10 96 16 66" style={arm} />
            <path d="M114 100 Q140 96 132 66" style={arm} />
          </>
        ) : weak ? (
          <>
            <path d="M36 104 Q30 122 36 134" style={arm} />
            <path d="M114 104 Q120 122 114 134" style={arm} />
          </>
        ) : (
          <>
            <path d="M36 102 Q26 116 30 128" style={arm} />
            <path d="M114 102 Q124 116 120 126" style={arm} />
          </>
        )}
        <ellipse cx="75" cy={weak ? 98 : 96} rx="44" ry={weak ? 40 : 42} fill={body} />
        <ellipse cx="75" cy="108" rx="28" ry="24" fill={belly} />
        <path d="M75 60 L75 46" stroke={leaf} strokeWidth="5" strokeLinecap="round" fill="none" />
        <g transform={weak ? "rotate(-30 75 48)" : undefined}>
          <path d="M75 48 C 58 24, 32 22, 22 32 C 30 52, 58 58, 75 48 Z" fill={leaf} />
        </g>
        <g transform={weak ? "rotate(30 75 48)" : undefined}>
          <path d="M75 48 C 92 24, 118 22, 128 32 C 120 52, 92 58, 75 48 Z" fill={leaf} />
        </g>
        <ellipse cx="60" cy="88" rx="9" ry="10" fill="#fff" />
        <ellipse cx="90" cy="88" rx="9" ry="10" fill="#fff" />
        <circle cx="61" cy={weak ? 92 : 90} r="4.6" fill={ink} />
        <circle cx="89" cy={weak ? 92 : 90} r="4.6" fill={ink} />
        {!weak && <circle cx="62.6" cy="87.6" r="1.6" fill="#fff" />}
        {!weak && <circle cx="90.6" cy="87.6" r="1.6" fill="#fff" />}
        {weak && (
          <>
            <path d="M51 88 A9 10 0 0 1 69 88 Z" fill={body} />
            <path d="M81 88 A9 10 0 0 1 99 88 Z" fill={body} />
            <path d="M51 88 L69 88 M81 88 L99 88" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
            <path d="M48 80 L68 72 M102 80 L82 72" stroke={ink} strokeWidth="4" strokeLinecap="round" />
            <path d="M62 119 Q75 107 88 119" stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none" />
            <path className="sprout-drop" d="M110 66 C 114 74, 118 78, 110 86 C 102 78, 106 74, 110 66 Z" fill="#7CC8F0" style={{ animation: "sproutDrop 2.4s ease-in infinite" }} />
          </>
        )}
        {strong && (
          <>
            <path d="M47 75 L68 81 M103 75 L82 81" stroke={ink} strokeWidth="4" strokeLinecap="round" />
            <path d="M58 108 Q75 130 92 108 Z" fill={ink} />
            <ellipse cx="75" cy="117" rx="7" ry="3.4" fill="#F27A8A" />
          </>
        )}
        {mood === "ok" && <path d="M62 108 Q75 121 88 108" stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none" />}
        {!weak && (
          <>
            <ellipse cx="46" cy="104" rx="7" ry="4.5" fill="#FF8A8A" opacity="0.45" />
            <ellipse cx="104" cy="104" rx="7" ry="4.5" fill="#FF8A8A" opacity="0.45" />
          </>
        )}
        {strong && (
          <>
            {bell(132, 58, 24)}
            <circle cx="16" cy="64" r="7.5" fill={body} />
            <circle cx="132" cy="64" r="7.5" fill={body} />
          </>
        )}
        {mood === "ok" && bell(122, 128, 20)}
        {weak && bell(128, 138, 18, 10)}
      </g>
    </svg>
  );
}

function Celebration({ t, data, onClose }) {
  if (!data) return null;
  if (data.kind === "lost") {
    return (
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(22,26,29,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.bg, borderRadius: 24, padding: "24px 24px 22px", width: "100%", maxWidth: 340, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
            <Sprout mood="weak" size={140} />
          </div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 800, color: COLORS.text, margin: "4px 0 8px" }}>{t.streakLostTitle}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.dim, lineHeight: 1.5 }}>{t.streakLostMsg.replace("{n}", data.days)}</div>
          <button
            onClick={() => {
              onClose();
              if (data.onStart) data.onStart();
            }}
            style={{ width: "100%", marginTop: 18, background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}
          >
            {t.streakLostCta}
          </button>
          <button onClick={onClose} style={{ width: "100%", marginTop: 8, background: "transparent", color: COLORS.dim, border: "none", padding: "10px 18px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
            {t.streakLostLater}
          </button>
        </div>
      </div>
    );
  }
  if (data.kind === "streak") {
    return (
      <>
        <Confetti />
        <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(22,26,29,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.bg, borderRadius: 24, padding: "28px 24px", width: "100%", maxWidth: 340, textAlign: "center" }}>
            <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 8 }}>🔥</div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 44, fontWeight: 800, color: COLORS.gold, lineHeight: 1 }}>{data.days}</div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 800, color: COLORS.text, margin: "6px 0 10px" }}>{t.streakCelebrateTitle}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.dim, lineHeight: 1.5 }}>{t["streakMsg" + data.days]}</div>
            <button onClick={onClose} style={{ width: "100%", marginTop: 20, background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}>
              {t.celebrateClose}
            </button>
          </div>
        </div>
      </>
    );
  }
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
    <>
    <Confetti />
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
    </>
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

function FoodSearchScreen({ t, lang, onAdd, onOpenBarcode, onOpenPhoto, myMeals = [], onOpenMyMeals, recentFoods = [], pantry = [], pantryFolder = null, onPantrySave, onPantryDone, onOpenPantry, onImportLink }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [pick, setPick] = useState(false); // folder chooser under the amount card
  const [shelf, setShelf] = useState(null); // pantry folder opened inline
  const [pantryToast, setPantryToast] = useState(null);
  useEffect(() => setPick(false), [selected]);
  const flashPantry = (msg) => {
    setPantryToast(msg);
    setTimeout(() => setPantryToast(null), 1600);
  };
  const [grams, setGrams] = useState(100);
  const [toast, setToast] = useState(null);
  const [retryTick, setRetryTick] = useState(0);
  const [quickName, setQuickName] = useState("");
  const [quickKcal, setQuickKcal] = useState("");

  // Live text search against the backend proxy (USDA FoodData Central).
  // The category chips are hidden for now: the API has no category field,
  // so this is a plain text search — see backend/README.md.
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("tooShort"); // tooShort | loading | ok | error
  const [corrected, setCorrected] = useState(null);
  const [slow, setSlow] = useState(false);
  // Common foods are answered instantly from the bundled list (typo-tolerant), so the
  // screen is never empty while the server is still waking up / searching.
  const local = useMemo(() => (query.trim().length >= 2 ? searchBasics(query.trim(), lang) : []), [query, lang]);
  useEffect(() => {
    if (status !== "loading") {
      setSlow(false);
      return undefined;
    }
    const id = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(id);
  }, [status]);

  const isLink = /^https?:\/\/\S+$/i.test(query.trim());
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || /^https?:\/\//i.test(q)) {
      setResults([]);
      setCorrected(null);
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
          setCorrected(data.corrected || null);
          setStatus("ok");
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          setResults([]);
          setStatus("error");
        });
    }, 250);
    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [query, lang, retryTick]);

  const listToShow = status === "ok" ? results : local;
  const unit = selected?.unit === "ml" ? "ml" : "g";
  const scaled = selected ? scale(selected.per100, grams) : null;

  const confirmAdd = () => {
    onAdd({ name: selected.name, kcal: scaled.kcal, protein: scaled.protein, carbs: scaled.carbs, fat: scaled.fat, fiber: scaled.fiber, sugar: scaled.sugar, salt: scaled.salt, grams, unit });
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

          {pantryFolder && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.goldSoft, border: "1px solid " + COLORS.gold, borderRadius: 14, padding: "11px 14px", marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>{pantryFolder.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim }}>{t.pantryPickBanner}</div>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.text }}>{pantryFolder.name}</div>
              </div>
              <span onClick={onPantryDone} style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 700, color: COLORS.gold, cursor: "pointer" }}>{t.pantryDone}</span>
            </div>
          )}

          {!pantryFolder && (
            <>
              <div onClick={onOpenPhoto} style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", background: COLORS.goldSoft, border: `1px solid ${COLORS.gold}`, borderRadius: 14, padding: "12px 14px", marginBottom: 12, cursor: "pointer" }}>
                <Camera size={16} color={COLORS.gold} />
                <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.gold }}>{t.photoScanBtn}</span>
              </div>

              <div onClick={onOpenBarcode} style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", background: COLORS.raised, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 14px", marginBottom: 16, cursor: "pointer" }}>
                <Barcode size={16} color={COLORS.gold} />
                <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.gold }}>{t.scanBarcode}</span>
              </div>
            </>
          )}

          {isLink && !pantryFolder ? (
            <div onClick={() => onImportLink(query.trim())} style={{ display: "flex", alignItems: "center", gap: 12, background: COLORS.goldSoft, border: "1px solid " + COLORS.gold, borderRadius: 14, padding: "14px 16px", cursor: "pointer" }}>
              <Link2 size={20} color={COLORS.gold} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.text }}>{t.foodLinkTitle}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 3, lineHeight: 1.4 }}>{t.foodLinkSub}</div>
              </div>
              <ChevronLeft size={16} color={COLORS.gold} style={{ transform: "rotate(180deg)", flexShrink: 0 }} />
            </div>
          ) : status === "tooShort" && pantryFolder ? (
            <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginTop: 16, lineHeight: 1.5 }}>{t.pantryPickHint}</div>
          ) : status === "tooShort" ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim }}>🥫 {t.pantryTitle}</span>
                <span onClick={onOpenPantry} style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.gold, cursor: "pointer" }}>{pantry.length ? t.pantryManage : "+ " + t.pantryNewFolder}</span>
              </div>
              {pantry.length === 0 ? (
                <div onClick={onOpenPantry} style={{ background: COLORS.surface, border: "1px dashed " + COLORS.border, borderRadius: 14, padding: "12px 14px", marginBottom: 16, cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, lineHeight: 1.45 }}>{t.pantryButtonSub}</div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                    {pantry.map((f) => (
                      <Chip key={f.id} label={f.emoji + " " + f.name} active={shelf === f.id} onClick={() => setShelf(shelf === f.id ? null : f.id)} />
                    ))}
                  </div>
                  {pantry.filter((f) => f.id === shelf).map((f) => (
                    <Card key={f.id} style={{ padding: 4, marginTop: 8 }}>
                      {f.items.length === 0 ? (
                        <div style={{ padding: 12, fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim }}>{t.pantryEmpty}</div>
                      ) : (
                        f.items.map((it, i) => {
                          const food = pantryFood(it, it.grams);
                          return (
                            <div
                              key={it.id}
                              onClick={() => {
                                onAdd(food);
                                setToast(it.name);
                                setTimeout(() => setToast(null), 1400);
                              }}
                              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 12px", borderBottom: i < f.items.length - 1 ? "1px solid " + COLORS.border : "none", cursor: "pointer" }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>{it.name}</div>
                                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim, marginTop: 2 }}>{it.grams}{food.unit} · {food.kcal} kcal</div>
                              </div>
                              <div style={{ width: 30, height: 30, borderRadius: 9, background: COLORS.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <Plus size={15} color={COLORS.gold} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </Card>
                  ))}
                </div>
              )}
              {recentFoods.length > 0 && (
                <>
                  <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, marginBottom: 8 }}>{t.recentTitle}</div>
                  <Card style={{ padding: 4, marginBottom: 16 }}>
                    {recentFoods.slice(0, 6).map((f, i, arr) => (
                      <div
                        key={f.name + i}
                        onClick={() => {
                          onAdd({ ...f });
                          setToast(f.name);
                          setTimeout(() => setToast(null), 1400);
                        }}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 12px", borderBottom: i < arr.length - 1 ? "1px solid " + COLORS.border : "none", cursor: "pointer" }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>{f.name}</div>
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim, marginTop: 2 }}>
                            {f.grams ? f.grams + (f.unit || "g") + " · " : ""}{f.kcal} kcal
                          </div>
                        </div>
                        <div style={{ width: 30, height: 30, borderRadius: 9, background: COLORS.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Plus size={15} color={COLORS.gold} />
                        </div>
                      </div>
                    ))}
                  </Card>
                </>
              )}
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, marginBottom: 8 }}>{t.quickAddTitle}</div>
              <Card style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={quickName} onChange={(e) => setQuickName(e.target.value)} placeholder={t.quickAddName} style={{ ...numInputStyle, flex: 1, minWidth: 0 }} />
                  <input type="number" inputMode="numeric" value={quickKcal} onChange={(e) => setQuickKcal(e.target.value)} placeholder="kcal" style={{ ...numInputStyle, width: 84 }} />
                  <button
                    disabled={!(Number(quickKcal) > 0)}
                    onClick={() => {
                      const name = quickName.trim() || t.quickAddDefault;
                      onAdd({ name, kcal: Math.round(Number(quickKcal)), protein: 0, carbs: 0, fat: 0 });
                      setToast(name);
                      setQuickName("");
                      setQuickKcal("");
                      setTimeout(() => setToast(null), 1400);
                    }}
                    style={{ background: Number(quickKcal) > 0 ? COLORS.gold : COLORS.raised, color: Number(quickKcal) > 0 ? COLORS.bg : COLORS.dim, border: "none", borderRadius: 10, padding: "0 14px", cursor: "pointer", display: "flex", alignItems: "center" }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </Card>
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
          ) : listToShow.length === 0 ? (
            status === "loading" ? (
              <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginTop: 24, lineHeight: 1.5 }}>{slow ? t.searchWaking : t.searchLoading}</div>
            ) : status === "error" ? (
              <div onClick={() => setRetryTick((n) => n + 1)} style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginTop: 24, cursor: "pointer" }}>{t.serverError}<div style={{ color: COLORS.gold, fontWeight: 600, marginTop: 6 }}>{t.searchRetry}</div></div>
            ) : (
              <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginTop: 24 }}>{t.noResults}</div>
            )
          ) : (
            <>
            {status === "ok" && corrected && (
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, margin: "0 2px 8px" }}>
                {t.searchShowingFor} <span style={{ color: COLORS.gold, fontWeight: 600 }}>{corrected}</span>
              </div>
            )}
            <Card style={{ padding: 4, maxHeight: 380, overflowY: "auto" }}>
              {listToShow.map((f, i) => (
                <div
                  key={(f.fdcId ?? f.barcode ?? "") + "-" + i}
                  onClick={() => {
                    setSelected(f);
                    setGrams(100);
                  }}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderBottom: i < listToShow.length - 1 ? `1px solid ${COLORS.border}` : "none", cursor: "pointer" }}
                >
                  <div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text }}>{f.name}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim, marginTop: 2 }}>
                      {f.per100.kcal} kcal {f.unit === "ml" ? "/ 100 ml" : t.per100g} · P {f.per100.protein} · C {f.per100.carbs} · F {f.per100.fat}
                      {f.brand ? " · " + String(f.brand).split(",")[0].slice(0, 24) : ""}
                    </div>
                  </div>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: COLORS.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Plus size={15} color={COLORS.gold} />
                  </div>
                </div>
              ))}
            </Card>
            {status === "loading" && <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 12.5, marginTop: 10 }}>{slow ? t.searchWaking : t.searchMore}</div>}
            {status === "error" && (
              <div onClick={() => setRetryTick((n) => n + 1)} style={{ textAlign: "center", color: COLORS.gold, fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, marginTop: 10, cursor: "pointer" }}>{t.serverError} · {t.searchRetry}</div>
            )}
            </>
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
            {selected.per100.kcal} kcal {unit === "ml" ? "/ 100 ml" : t.per100g}{selected.brand ? " · " + String(selected.brand).split(",")[0] : ""}
          </div>
          {selected.note && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: COLORS.dim, marginBottom: 20, lineHeight: 1.45 }}>
              {t.approxLabel}: {selected.note}
            </div>
          )}

          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginBottom: 8 }}>{t.amount}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div onClick={() => setGrams((g) => Math.max(5, Math.round(g) - 10))} style={{ width: 34, height: 34, borderRadius: 9, background: COLORS.raised, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <Minus size={14} color={COLORS.text} />
            </div>
            <input type="number" inputMode="decimal" value={grams || ""} onChange={(e) => setGrams(Math.max(0, Math.min(5000, Number(e.target.value) || 0)))} style={{ ...numInputStyle, width: 90, textAlign: "center", fontWeight: 700 }} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim }}>{unit}</span>
            <div onClick={() => setGrams((g) => Math.min(5000, Math.round(g) + 10))} style={{ width: 34, height: 34, borderRadius: 9, background: COLORS.raised, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <Plus size={14} color={COLORS.text} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {[50, 100, 150, 200, 250].map((g) => (
              <div key={g} onClick={() => setGrams(g)} style={{ flex: 1, textAlign: "center", padding: "7px 0", borderRadius: 10, fontFamily: "Sora, sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer", background: grams === g ? COLORS.goldSoft : COLORS.raised, color: grams === g ? COLORS.gold : COLORS.dim, border: `1px solid ${grams === g ? COLORS.gold : COLORS.border}` }}>{g}</div>
            ))}
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

          <MicroLine t={t} v={scaled} mb={18} />

          {pantryFolder ? (
            <button
              onClick={() => {
                onPantrySave(pantryFolder.id, { name: selected.name, per100: selected.per100, unit, grams }, null);
                flashPantry(selected.name + " → " + pantryFolder.emoji + " " + pantryFolder.name);
                setSelected(null);
                setQuery("");
              }}
              disabled={!(grams > 0)}
              style={{ width: "100%", opacity: grams > 0 ? 1 : 0.5, background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              {t.pantrySaveBtn}
            </button>
          ) : (
            <>
              <button onClick={confirmAdd} disabled={!(grams > 0)} style={{ width: "100%", opacity: grams > 0 ? 1 : 0.5, background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                {t.addItem}
              </button>
              <button onClick={() => setPick((p) => !p)} disabled={!(grams > 0)} style={{ width: "100%", marginTop: 8, background: "transparent", color: COLORS.gold, border: "1px solid " + COLORS.border, borderRadius: 14, padding: "12px 18px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
                🥫 {t.pantrySaveTo}
              </button>
              {pick && (
                <PantryPicker
                  t={t}
                  lang={lang}
                  pantry={pantry}
                  onSave={(id, newName) => {
                    const folderName = id ? (pantry.find((f) => f.id === id) || {}).name : newName;
                    onPantrySave(id, { name: selected.name, per100: selected.per100, unit, grams }, newName);
                    setPick(false);
                    flashPantry(t.pantrySaved.replace("{f}", folderName || ""));
                  }}
                />
              )}
            </>
          )}
        </Card>
      )}

      {pantryToast && (
        <div style={{ position: "absolute", left: 20, right: 20, bottom: 14, background: COLORS.gold, color: COLORS.bg, borderRadius: 12, padding: "11px 16px", display: "flex", alignItems: "center", gap: 8, fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, boxShadow: "0 10px 24px rgba(0,0,0,0.3)" }}>
          <Check size={15} /> {pantryToast}
        </div>
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

function archiveDay(daily, day, key, value) {
  daily[day] = { ...(daily[day] || {}), [key]: value };
  return daily;
}

// Daily values (meals, water, steps) reset when the date changes.
function usePersistedDaily(key, init) {
  const dayRef = useRef(todayStamp());
  const [v, setV] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("asfit." + key));
      if (raw && raw.d === todayStamp()) return raw.v;
      if (raw && raw.d) {
        // Archive the previous day so history is never lost.
        const daily = JSON.parse(localStorage.getItem("asfit.daily") || "{}");
        localStorage.setItem("asfit.daily", JSON.stringify(archiveDay(daily, raw.d, key, raw.v)));
      }
    } catch {
      /* storage unavailable */
    }
    return init;
  });
  const latest = useRef({ v, init });
  latest.current = { v, init };

  useEffect(() => {
    try {
      localStorage.setItem("asfit." + key, JSON.stringify({ d: dayRef.current, v }));
    } catch {
      /* storage unavailable */
    }
  }, [key, v]);

  // The check above only runs once, at mount — if the app is left open across
  // local midnight, a late-night entry would otherwise keep being written under
  // the day that was already current when the component mounted, forever (it
  // never gets archived, and today's totals stay inflated with yesterday's
  // data). Poll for the rollover instead, including on tab/app foreground.
  useEffect(() => {
    const check = () => {
      const now = todayStamp();
      if (now === dayRef.current) return;
      try {
        const daily = JSON.parse(localStorage.getItem("asfit.daily") || "{}");
        localStorage.setItem("asfit.daily", JSON.stringify(archiveDay(daily, dayRef.current, key, latest.current.v)));
      } catch {
        /* storage unavailable */
      }
      dayRef.current = now;
      setV(latest.current.init);
    };
    const id = setInterval(check, 30_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [key]);

  return [v, setV];
}

// ---------- History: calendar + streak ----------
const HIST_GREEN = "#2E9E5B";
const HIST_RED = "#D64545";

const dateKey = (d) => d.toLocaleDateString("sv");

// Archived days (asfit.daily) plus the live values for today.
function buildHistory(meals, waterMl, steps) {
  let daily = {};
  try {
    daily = JSON.parse(localStorage.getItem("asfit.daily") || "{}") || {};
  } catch {
    daily = {};
  }
  return { ...daily, [todayStamp()]: { ...(daily[todayStamp()] || {}), meals, water: waterMl, steps } };
}

const dayHasFood = (day) => Boolean(day && day.meals && Object.values(day.meals).some((a) => Array.isArray(a) && a.length > 0));

// current streak (today may still be open), best streak, first tracked day
function computeStreaks(history) {
  const keys = Object.keys(history).filter((k) => dayHasFood(history[k])).sort();
  if (!keys.length) return { current: 0, best: 0, first: null, trackedToday: false };
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const trackedToday = dayHasFood(history[dateKey(today)]);
  const cursor = new Date(today);
  if (!trackedToday) cursor.setDate(cursor.getDate() - 1);
  let current = 0;
  while (dayHasFood(history[dateKey(cursor)])) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  let best = 0;
  let run = 0;
  const walk = new Date(keys[0] + "T12:00:00");
  while (walk <= today) {
    if (dayHasFood(history[dateKey(walk)])) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    walk.setDate(walk.getDate() + 1);
  }
  return { current, best, first: keys[0], trackedToday };
}

function StreakCard({ t, streak, history, onOpen }) {
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dateKey(d);
    const tracked = dayHasFood(history[k]);
    const missed = !tracked && i > 0 && streak.first && k >= streak.first;
    week.push({ k, tracked, missed, isToday: i === 0 });
  }
  const mood = streak.current >= 7 ? "strong" : streak.current > 0 || !streak.first ? "ok" : "weak";
  return (
    <Card onClick={onOpen} style={{ marginBottom: 12, cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flexShrink: 0, width: 52 }}>
          <Sprout mood={mood} size={52} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text }}>
            {streak.current > 0 ? streak.current + " " + t.streakDaysLabel : t.historyTitle}
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 2 }}>
            {streak.current === 0 ? (streak.first ? t.streakWeak : t.streakNone) : !streak.trackedToday ? t.streakKeep : t.historyCardSub}
          </div>
        </div>
        <ChevronLeft size={16} color={COLORS.dim} style={{ transform: "rotate(180deg)", flexShrink: 0 }} />
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        {week.map((d) => (
          <div key={d.k} style={{ flex: 1, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: d.tracked ? HIST_GREEN : d.missed ? HIST_RED : COLORS.raised, border: d.isToday ? "2px solid " + COLORS.gold : "none", boxSizing: "border-box" }}>
            {d.tracked ? <Check size={13} color="#fff" /> : d.missed ? <X size={13} color="#fff" /> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

function HistoryScreen({ t, lang, history, streak, workoutHistory, kcalGoal }) {
  const now = new Date();
  const todayKey = dateKey(now);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState(todayKey);
  const [chartRange, setChartRange] = useState(14);
  const locale = lang === "de" ? "de-DE" : "en-US";

  const view = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const lead = (view.getDay() + 6) % 7; // Monday first
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d, 12));
  const weekdayNames = [0, 1, 2, 3, 4, 5, 6].map((i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: "short" }).slice(0, 2));

  const monthTracked = cells.filter((c) => c && dayHasFood(history[dateKey(c)])).length;
  const stat = (label, value, color) => (
    <div style={{ flex: 1, background: COLORS.raised, borderRadius: 14, padding: "12px 6px", textAlign: "center" }}>
      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: color || COLORS.text }}>{value}</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: COLORS.dim, marginTop: 2 }}>{label}</div>
    </div>
  );

  // last 14 days of calories (bars) against the goal
  const chartDays = Array.from({ length: chartRange }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (chartRange - 1 - i));
    const k = dateKey(d);
    const day = history[k];
    return { k, d, kcal: dayHasFood(day) ? Math.round(sumMeals(day.meals, "kcal")) : 0, protein: dayHasFood(day) ? sumMeals(day.meals, "protein") : 0 };
  });
  const trackedChart = chartDays.filter((c) => c.kcal > 0);
  const chartAvg = trackedChart.length ? Math.round(trackedChart.reduce((a, c) => a + c.kcal, 0) / trackedChart.length) : 0;
  const chartAvgProtein = trackedChart.length ? Math.round(trackedChart.reduce((a, c) => a + c.protein, 0) / trackedChart.length) : 0;
  const chartMax = Math.max(kcalGoal || 0, ...chartDays.map((c) => c.kcal), 1) * 1.1;

  const selDay = history[selected];
  const selDate = new Date(selected + "T12:00:00");
  const isFuture = selected > todayKey;
  const slots = ["breakfast", "lunch", "dinner", "snacks"];
  const totalKcal = selDay && selDay.meals ? sumMeals(selDay.meals, "kcal") : 0;
  const dayWorkouts = workoutHistory.filter((w) => dateKey(new Date(w.dateISO)) === selected);

  return (
    <div style={{ padding: "0 20px 28px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {stat(t.streakDaysLabel, (streak.current > 0 ? "🔥 " : "") + streak.current)}
        {stat(t.streakBest, streak.best)}
        {stat(t.streakThisMonth, monthTracked + " " + t.daysUnit, HIST_GREEN)}
      </div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div onClick={() => setMonthOffset((m) => m - 1)} style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ChevronLeft size={18} color={COLORS.text} />
          </div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text, textTransform: "capitalize" }}>
            {view.toLocaleDateString(locale, { month: "long", year: "numeric" })}
          </div>
          <div onClick={() => setMonthOffset((m) => Math.min(0, m + 1))} style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: monthOffset < 0 ? "pointer" : "default", opacity: monthOffset < 0 ? 1 : 0.25 }}>
            <ChevronLeft size={18} color={COLORS.text} style={{ transform: "rotate(180deg)" }} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
          {weekdayNames.map((w, i) => (
            <div key={i} style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 11, color: COLORS.dim }}>{w}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {cells.map((c, i) => {
            if (!c) return <div key={"e" + i} />;
            const k = dateKey(c);
            const tracked = dayHasFood(history[k]);
            const past = k < todayKey;
            const missed = !tracked && past && streak.first && k >= streak.first;
            const isSel = k === selected;
            return (
              <div
                key={k}
                onClick={() => setSelected(k)}
                style={{ aspectRatio: "1 / 1", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: tracked ? HIST_GREEN : missed ? HIST_RED : COLORS.raised, color: tracked || missed ? "#fff" : COLORS.dim, border: isSel ? "2px solid " + COLORS.gold : k === todayKey ? "2px solid " + COLORS.border : "2px solid transparent", boxSizing: "border-box", opacity: k > todayKey ? 0.45 : 1 }}
              >
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, lineHeight: 1 }}>{c.getDate()}</span>
                {tracked ? <Check size={13} color="#fff" style={{ marginTop: 2 }} /> : missed ? <X size={13} color="#fff" style={{ marginTop: 2 }} /> : <span style={{ height: 15 }} />}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center" }}>
          {[[HIST_GREEN, t.legendTracked], [HIST_RED, t.legendMissed]].map(([c, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c, display: "inline-block" }} />
              {l}
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim }}>{t.chartTitle}</span>
          <div style={{ display: "flex", gap: 6 }}>
            {[14, 30, 90].map((n) => (
              <span key={n} onClick={() => setChartRange(n)} style={{ padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontFamily: "Sora, sans-serif", fontSize: 11.5, fontWeight: 700, background: chartRange === n ? COLORS.goldSoft : COLORS.raised, color: chartRange === n ? COLORS.gold : COLORS.dim, border: "1px solid " + (chartRange === n ? COLORS.gold : COLORS.border) }}>
                {n} {lang === "de" ? "T" : "d"}
              </span>
            ))}
          </div>
        </div>
        <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: chartRange > 30 ? 1 : chartRange > 14 ? 2 : 4, height: 96 }}>
          {kcalGoal ? <div style={{ position: "absolute", left: 0, right: 0, bottom: (kcalGoal / chartMax) * 96, borderTop: "1.5px dashed " + COLORS.dim, opacity: 0.6 }} /> : null}
          {chartDays.map((c) => (
            <div key={c.k} onClick={() => setSelected(c.k)} style={{ flex: 1, height: Math.max(3, (c.kcal / chartMax) * 96), borderRadius: 4, cursor: "pointer", background: c.kcal === 0 ? COLORS.raised : kcalGoal && c.kcal > kcalGoal * 1.1 ? COLORS.coral : HIST_GREEN, outline: c.k === selected ? "2px solid " + COLORS.gold : "none" }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "Inter, sans-serif", fontSize: 10.5, color: COLORS.dim }}>
          <span>{chartDays[0].d.getDate()}.{chartDays[0].d.getMonth() + 1}.</span>
          <span>{chartDays[chartDays.length - 1].d.getDate()}.{chartDays[chartDays.length - 1].d.getMonth() + 1}.</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim }}>
          <span>{t.chartAvg}: <b style={{ color: COLORS.text }}>{chartAvg ? chartAvg.toLocaleString(locale) + " kcal" : "–"}</b></span>
          {kcalGoal ? <span>{t.chartGoal}: {kcalGoal.toLocaleString(locale)}</span> : null}
        </div>
        <div style={{ marginTop: 6, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim }}>
          {t.chartProtein}: <b style={{ color: COLORS.text }}>{chartAvgProtein ? chartAvgProtein + " g" : "–"}</b>
        </div>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, marginBottom: 10 }}>{t.streakBadges}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {STREAK_MILESTONES.map((m) => {
            const got = streak.best >= m;
            return (
              <div key={m} style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 12, background: got ? COLORS.goldSoft : COLORS.raised, border: "1px solid " + (got ? COLORS.gold : COLORS.border), opacity: got ? 1 : 0.6 }}>
                <div style={{ fontSize: 17 }}>{got ? "🔥" : "🔒"}</div>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 700, color: got ? COLORS.gold : COLORS.dim }}>{m}</div>
              </div>
            );
          })}
        </div>
        {(() => {
          const next = STREAK_MILESTONES.find((m) => m > streak.current);
          return next ? (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 10, textAlign: "center" }}>
              {next - streak.current} {t.streakLeft} → {next}
            </div>
          ) : null;
        })()}
      </Card>

      <Card>
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>
          {selected === todayKey ? t.dayToday + " · " : ""}
          {selDate.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
        </div>
        {isFuture ? (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim }}>{t.dayNotYet}</div>
        ) : !dayHasFood(selDay) && dayWorkouts.length === 0 ? (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim }}>{t.dayNothing}</div>
        ) : (
          <>
            {slots.map((slot) => {
              const items = (selDay && selDay.meals && selDay.meals[slot]) || [];
              if (!items.length) return null;
              return (
                <div key={slot} style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: "Sora, sans-serif", fontSize: 12, fontWeight: 600, color: COLORS.gold, marginBottom: 4 }}>{t[slot]}</div>
                  {items.map((it, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.text }}>
                      <span style={{ minWidth: 0 }}>
                        {it.name}
                        {it.grams ? <span style={{ color: COLORS.dim }}> · {it.grams}{it.unit || "g"}</span> : null}
                      </span>
                      <span style={{ color: COLORS.dim, whiteSpace: "nowrap" }}>{Math.round(it.kcal || 0)} kcal</span>
                    </div>
                  ))}
                </div>
              );
            })}
            {dayHasFood(selDay) && (
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid " + COLORS.border, paddingTop: 10, fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 700, color: COLORS.text }}>
                <span>{t.dayTotal}</span>
                <span>
                  {Math.round(totalKcal)}{kcalGoal ? " / " + kcalGoal : ""} kcal · P {Math.round(sumMeals(selDay.meals, "protein"))} · C {Math.round(sumMeals(selDay.meals, "carbs"))} · F {Math.round(sumMeals(selDay.meals, "fat"))}
                </span>
              </div>
            )}
            {dayWorkouts.length > 0 && (
              <div style={{ marginTop: 10, fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.text }}>
                <span style={{ fontFamily: "Sora, sans-serif", fontSize: 12, fontWeight: 600, color: COLORS.gold }}>{t.dayWorkouts}: </span>
                {dayWorkouts.map((w) => Math.round((w.durationSec || 0) / 60) + " min").join(", ")}
              </div>
            )}
          </>
        )}
        {!isFuture && selDay && (selDay.water > 0 || selDay.steps > 0) && (
          <div style={{ display: "flex", gap: 16, marginTop: 10, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim }}>
            {selDay.water > 0 && <span>💧 {t.dayWater}: {selDay.water} ml</span>}
            {selDay.steps > 0 && <span>👣 {t.daySteps}: {Number(selDay.steps).toLocaleString(locale)}</span>}
          </div>
        )}
      </Card>
    </div>
  );
}

function BarcodeScanScreen({ t, lang, onAdd, onDone, pantry = [], onPantrySave }) {
  const [found, setFound] = useState(null);
  const [pickP, setPickP] = useState(false);
  const [savedMsg, setSavedMsg] = useState(null);
  // idle | scanning | loading | notFound | error | unsupported | moduleInstalling | webPermissionDenied | webUnsupported
  const [status, setStatus] = useState("idle");
  const [grams, setGrams] = useState(100);
  const [manualCode, setManualCode] = useState("");
  const manualCodeOk = /^\d{6,14}$/.test(manualCode);
  const scaled = found ? scale(found.per100, grams) : null;
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const streamRef = useRef(null);
  const aliveRef = useRef(true);
  const runRef = useRef(0); // bumped on every start and on leaving, so a late camera answer can tell it is stale
  const pausedRef = useRef(false); // the camera keeps running, but reads are ignored while a result is shown
  const [camOn, setCamOn] = useState(false);

  const stopWebScan = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    setCamOn(false);
  };

  // After a miss the camera stays on: ignore reads for a moment so the message can be read, then listen again.
  const resumeSoon = () => setTimeout(() => { pausedRef.current = false; }, 1500);
  const resumeScan = () => {
    pausedRef.current = false;
    setFound(null);
    setStatus("scanning");
  };

  const lookupBarcode = (code) => {
    pausedRef.current = true;
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
          resumeSoon();
          return;
        }
        setFound(data.result);
        setGrams(100);
        setStatus("ok");
      })
      .catch(() => {
        setStatus("error");
        resumeSoon();
      });
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
    if (controlsRef.current) {
      resumeScan();
      return;
    }
    const run = ++runRef.current;
    const live = () => aliveRef.current && run === runRef.current;
    setStatus("scanning");
    pausedRef.current = false;
    try {
      // Open the camera first so the picture is there at once; the decoder loads while it warms up.
      const libP = Promise.all([import("@zxing/browser"), import("@zxing/library")]);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } });
      if (!live()) {
        stream.getTracks().forEach((tr) => tr.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play().catch(() => {});
      setCamOn(true);
      const [{ BrowserMultiFormatReader }, { BarcodeFormat: ZBarcodeFormat, DecodeHintType, NotFoundException }] = await libP;
      if (!live()) {
        stopWebScan();
        return;
      }
      const hints = new Map();
      // Food barcodes are EAN/UPC only; fewer formats + TRY_HARDER = faster, more reliable reads.
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [ZBarcodeFormat.EAN_13, ZBarcodeFormat.EAN_8, ZBarcodeFormat.UPC_A, ZBarcodeFormat.UPC_E]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      // Default is a ~640px camera image tried every 500 ms — too blurry/slow for thin
      // bars. Ask for HD and try ~12x per second.
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 80, delayBetweenScanSuccess: 400 });
      const controls = await reader.decodeFromStream(stream, video, (result, err) => {
        if (result) {
          if (pausedRef.current) return;
          lookupBarcode(result.getText());
        } else if (err && !(err instanceof NotFoundException)) {
          stopWebScan();
          setStatus("error");
        }
      });
      if (!live()) {
        controls.stop();
        stopWebScan();
        return;
      }
      controlsRef.current = controls;
      try {
        const track = stream.getVideoTracks()[0];
        await track?.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
      } catch {
        /* autofocus control isn't available on every phone */
      }
    } catch (err) {
      if (!live()) return;
      stopWebScan();
      setStatus(err && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") ? "webPermissionDenied" : "webUnsupported");
    }
  };

  // The camera opens as soon as the screen does — no extra tap.
  useEffect(() => {
    aliveRef.current = true;
    if (IS_NATIVE_APP) scanReal();
    else scanWeb();
    return () => {
      aliveRef.current = false;
      runRef.current++;
      stopWebScan();
    };
  }, []);

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
          <video ref={videoRef} muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: camOn ? "block" : "none" }} />
        )}
        {!camOn ? <Barcode size={48} strokeWidth={1.2} color={COLORS.dim} /> : null}
        {[
          { top: 14, left: 14, rotate: 0 },
          { top: 14, right: 14, rotate: 90 },
          { bottom: 14, left: 14, rotate: -90 },
          { bottom: 14, right: 14, rotate: 180 },
        ].map((pos, i) => (
          <div key={i} style={{ position: "absolute", width: 22, height: 22, borderTop: `3px solid ${COLORS.gold}`, borderLeft: `3px solid ${COLORS.gold}`, transform: `rotate(${pos.rotate}deg)`, ...pos }} />
        ))}
      </div>

      {status === "loading" ? (
        <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginTop: 8 }}>{t.barcodeLoading}</div>
      ) : found ? (
        <Card>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginBottom: 6 }}>{t.foundProduct}</div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>{found.name}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginBottom: 16 }}>{found.per100.kcal} kcal {t.per100g}</div>

          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginBottom: 8 }}>{t.amount}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div onClick={() => setGrams((g) => Math.max(5, Math.round(g) - 10))} style={{ width: 34, height: 34, borderRadius: 9, background: COLORS.raised, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <Minus size={14} color={COLORS.text} />
            </div>
            <input type="number" inputMode="decimal" value={grams || ""} onChange={(e) => setGrams(Math.max(0, Math.min(5000, Number(e.target.value) || 0)))} style={{ ...numInputStyle, width: 90, textAlign: "center", fontWeight: 700 }} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim }}>g</span>
            <div onClick={() => setGrams((g) => Math.min(5000, Math.round(g) + 10))} style={{ width: 34, height: 34, borderRadius: 9, background: COLORS.raised, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <Plus size={14} color={COLORS.text} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
            {[50, 100, 150, 200, 250].map((g) => (
              <div key={g} onClick={() => setGrams(g)} style={{ flex: 1, textAlign: "center", padding: "7px 0", borderRadius: 10, fontFamily: "Sora, sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer", background: grams === g ? COLORS.goldSoft : COLORS.raised, color: grams === g ? COLORS.gold : COLORS.dim, border: `1px solid ${grams === g ? COLORS.gold : COLORS.border}` }}>{g}</div>
            ))}
          </div>

          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 16 }}>{scaled.kcal} kcal · P {scaled.protein} · C {scaled.carbs} · F {scaled.fat}</div>
          <MicroLine t={t} v={scaled} />

          <button
            disabled={!(grams > 0)}
            onClick={() => {
              onAdd({ name: found.name, kcal: scaled.kcal, protein: scaled.protein, carbs: scaled.carbs, fat: scaled.fat, fiber: scaled.fiber, sugar: scaled.sugar, salt: scaled.salt, grams });
              onDone();
            }}
            style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "13px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            {t.addItem}
          </button>
          {savedMsg ? (
            <div style={{ marginTop: 10, textAlign: "center", fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.gold }}>✓ {savedMsg}</div>
          ) : (
            <button onClick={() => setPickP((p) => !p)} disabled={!(grams > 0)} style={{ width: "100%", marginTop: 8, background: "transparent", color: COLORS.gold, border: "1px solid " + COLORS.border, borderRadius: 14, padding: "12px 18px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
              🥫 {t.pantrySaveTo}
            </button>
          )}
          {pickP && !savedMsg && (
            <PantryPicker
              t={t}
              lang={lang}
              pantry={pantry}
              onSave={(id, newName) => {
                const folderName = id ? (pantry.find((f) => f.id === id) || {}).name : newName;
                onPantrySave(id, { name: found.name, per100: found.per100, unit: found.unit === "ml" ? "ml" : "g", grams }, newName);
                setPickP(false);
                setSavedMsg(t.pantrySaved.replace("{f}", folderName || ""));
              }}
            />
          )}
          {camOn && (
            <button onClick={() => { setSavedMsg(null); setPickP(false); resumeScan(); }} style={{ width: "100%", marginTop: 8, background: "transparent", color: COLORS.dim, border: "none", padding: "10px 18px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
              {t.scanNext}
            </button>
          )}
        </Card>
      ) : (
        <>
          {status === "scanning" && !camOn && (
            <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginBottom: 14 }}>{t.barcodeScanning}</div>
          )}
          {errorText && (
            <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginBottom: 14 }}>
              {errorText}
            </div>
          )}
          {!camOn && status !== "scanning" && (
            <button onClick={IS_NATIVE_APP ? scanReal : scanWeb} style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              {status === "idle" ? t.scanBarcode : t.scanAgain}
            </button>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <input
              type="number"
              inputMode="numeric"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.replace(/\D/g, "").slice(0, 14))}
              onKeyDown={(e) => { if (e.key === "Enter" && manualCodeOk) lookupBarcode(manualCode); }}
              placeholder={t.barcodeManualPh}
              style={{ ...numInputStyle, flex: 1, minWidth: 0 }}
            />
            <button
              disabled={!manualCodeOk}
              onClick={() => lookupBarcode(manualCode)}
              style={{ background: manualCodeOk ? COLORS.raised : COLORS.surface, color: manualCodeOk ? COLORS.gold : COLORS.dim, border: "1px solid " + COLORS.border, borderRadius: 12, padding: "0 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {t.barcodeManualGo}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Assistant (support / questions) ---------------- */

// The chat shows plain text, so strip the markdown the model sometimes adds
// (**bold**, *italic*, # headings, `code`, "* " bullets) instead of showing asterisks.
function plainChat(text) {
  return String(text || "")
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/(^|\s)\*(\S[^*\n]*?)\*(?=\s|[.,!?;:]|$)/g, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[*-]\s+/gm, "• ")
    .replace(/`([^`]+)`/g, "$1");
}

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
        {m.role === "assistant" ? plainChat(m.content) : m.content}
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

// Impressum/Nutzungsbedingungen are full legal HTML pages (frontend/public/*.html) —
// shown inside the app's own overlay chrome via iframe, so the back button always
// works. Opening them with window.open() instead used to strand iOS users: an
// installed home-screen PWA has no browser tabs or address bar to get back with.
function LegalPageScreen({ src }) {
  return <iframe src={src} title={src} style={{ width: "100%", height: "100%", border: "none", display: "block", background: COLORS.bg }} />;
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
  const [slow, setSlow] = useState(false);
  const [dishName, setDishName] = useState("");
  const [items, setItems] = useState([]);
  const fileRef = useRef(null);
  const galleryRef = useRef(null);

  // The free Render server sleeps when idle and needs up to ~50s to wake up,
  // during which requests fail — so retry instead of showing an error right
  // away, and tell the user why it is taking a while.
  const postPhoto = async (dataUrl) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(API_BASE + "/api/food/photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl, lang }),
        });
        if (res.ok) return { data: await res.json() };
        const body = await res.json().catch(() => ({}));
        if (res.status === 503 && body.error === "not_configured") return { notConfigured: true };
        if (res.status < 500) throw new Error("http " + res.status);
      } catch (err) {
        if (attempt === 2) throw err;
      }
      await new Promise((r) => setTimeout(r, 8000));
    }
    throw new Error("failed");
  };

  const onPick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setStatus("analyzing");
    setSlow(false);
    const slowTimer = setTimeout(() => setSlow(true), 7000);
    try {
      const dataUrl = await downscaleImage(file, 800);
      setPreview(dataUrl);
      const out = await postPhoto(dataUrl);
      if (out.notConfigured) return setStatus("notConfigured");
      const data = out.data;
      if (!data.isFood) return setStatus("noFood");
      setResult(data);
      setDishName(data.name || data.items[0]?.name || "");
      setItems(data.items.map((it) => ({ name: it.name, unit: it.unit === "ml" ? "ml" : "g", gramsStr: String(it.grams), grams: it.grams, kcal: it.kcal, protein: it.protein, carbs: it.carbs, fat: it.fat, base: { grams: it.grams, kcal: it.kcal, protein: it.protein, carbs: it.carbs, fat: it.fat } })));
      setStatus("result");
    } catch {
      setStatus("error");
    } finally {
      clearTimeout(slowTimer);
      setSlow(false);
    }
  };

  // Editing an amount scales that item's calories and macros proportionally.
  const setItemGrams = (i, str) =>
    setItems((list) =>
      list.map((it, j) => {
        if (j !== i) return it;
        const g = parseFloat(String(str).replace(",", "."));
        if (!(g >= 0)) return { ...it, gramsStr: str };
        const ratio = it.base.grams > 0 ? g / it.base.grams : 1;
        const sc = (v) => Math.round(v * ratio * 10) / 10;
        return { ...it, gramsStr: str, grams: g, kcal: Math.round(it.base.kcal * ratio), protein: sc(it.base.protein), carbs: sc(it.base.carbs), fat: sc(it.base.fat) };
      })
    );
  const setItemName = (i, name) => setItems((list) => list.map((it, j) => (j === i ? { ...it, name } : it)));
  const removeItem = (i) => setItems((list) => list.filter((_, j) => j !== i));

  const btn = { width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" };
  const msg = { textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 13, marginBottom: 14 };
  const round1 = (v) => Math.round(v * 10) / 10;
  const total = items.reduce(
    (a, it) => ({ grams: a.grams + it.grams, kcal: a.kcal + it.kcal, protein: round1(a.protein + it.protein), carbs: round1(a.carbs + it.carbs), fat: round1(a.fat + it.fat) }),
    { grams: 0, kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

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

      {status === "analyzing" && (
        <div style={{ ...msg, marginTop: 8 }}>
          {t.photoAnalyzing}
          {slow && <div style={{ marginTop: 8, fontSize: 12 }}>{t.photoWaking}</div>}
        </div>
      )}

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
          <input value={dishName} onChange={(e) => setDishName(e.target.value)} placeholder={t.photoDishName} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 14 }} />
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
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginBottom: 8 }}>{t.photoEditHint}</div>
          {items.map((it, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 92px 22px", gap: 8, alignItems: "center", padding: "5px 0" }}>
              <div style={{ minWidth: 0 }}>
                <input value={it.name} onChange={(e) => setItemName(i, e.target.value)} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 13 }} />
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: COLORS.dim, marginTop: 3 }}>
                  {it.kcal} kcal · {it.protein}P · {it.carbs}C · {it.fat}F
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input type="number" inputMode="decimal" min="0" value={it.gramsStr} onChange={(e) => setItemGrams(i, e.target.value)} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", padding: "8px 6px", textAlign: "right" }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, minWidth: 14 }}>{it.unit}</span>
              </div>
              <div onClick={() => removeItem(i)} title={t.photoRemoveItem} style={{ cursor: "pointer", display: "flex", justifyContent: "center" }}>
                <X size={16} color={COLORS.dim} />
              </div>
            </div>
          ))}
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim, margin: "12px 0 16px" }}>{t.photoEstimate}</div>
          <button
            disabled={items.length === 0}
            onClick={() => {
              onAdd({ name: dishName.trim() || items[0].name, kcal: total.kcal, protein: total.protein, carbs: total.carbs, fat: total.fat, grams: Math.round(total.grams), unit: items.every((x) => x.unit === "ml") ? "ml" : "g" });
              onDone();
            }}
            style={{ ...btn, opacity: items.length === 0 ? 0.5 : 1 }}
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

/* ---------------- Eating out: fast food with protein first ---------------- */

const FF_MIN = 200;
const FF_MAX = 1500;
const FF_RING = { cx: 110, cy: 110, r: 86, start: 135, sweep: 270 };
const ffPolar = (deg) => {
  const a = (deg * Math.PI) / 180;
  return [FF_RING.cx + FF_RING.r * Math.cos(a), FF_RING.cy + FF_RING.r * Math.sin(a)];
};
const ffArc = (from, to) => {
  const [x1, y1] = ffPolar(from);
  const [x2, y2] = ffPolar(to);
  return "M " + x1.toFixed(2) + " " + y1.toFixed(2) + " A " + FF_RING.r + " " + FF_RING.r + " 0 " + (to - from > 180 ? 1 : 0) + " 1 " + x2.toFixed(2) + " " + y2.toFixed(2);
};
const ffR1 = (v) => Math.round(v * 10) / 10;

function FastFoodScreen({ t, lang, last, goalKcal, eatenKcal, eatenProtein, proteinTarget, onPickChain, onLog }) {
  const [chainId, setChainId] = useState(null);
  const [step, setStep] = useState("chain"); // chain -> budget -> result
  const leftKcal = Math.max(0, Math.round(goalKcal - eatenKcal));
  const [budget, setBudget] = useState(Math.min(FF_MAX, Math.max(300, Math.round(leftKcal / 10) * 10)));
  const [proteinFirst, setProteinFirst] = useState(true);
  const [variantIdx, setVariantIdx] = useState(0);
  const [edited, setEdited] = useState(null); // lines the user changed, null = as suggested
  const [adding, setAdding] = useState(false);
  const [orderView, setOrderView] = useState(false);
  const [slot, setSlot] = useState(mealKeyForNow());
  const [done, setDone] = useState(false);
  const svgRef = useRef(null);
  const chain = CHAINS.find((c) => c.id === chainId) || null;
  const nm = (it) => (lang === "de" ? it.de : it.en);
  const variants = useMemo(() => (chain && step === "result" ? suggest(chain, budget, proteinFirst) : []), [chain, step, budget, proteinFirst]);
  const base = variants[Math.min(variantIdx, Math.max(0, variants.length - 1))] || null;
  const lines = edited || (base ? base.lines : []);
  const tot = sumLines(lines);
  const small = { fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim };
  const slots = [
    { key: "breakfast", label: t.breakfast },
    { key: "lunch", label: t.lunch },
    { key: "dinner", label: t.dinner },
    { key: "snacks", label: t.snacks },
  ];

  const pickChain = (c) => {
    setChainId(c.id);
    onPickChain(c.id);
    setStep("budget");
  };
  const calc = () => {
    setVariantIdx(0);
    setEdited(null);
    setAdding(false);
    setOrderView(false);
    setDone(false);
    setStep("result");
  };
  const fromPointer = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const deg = (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    let rel = (deg - FF_RING.start + 720) % 360;
    if (rel > FF_RING.sweep) rel = rel - FF_RING.sweep < (360 - FF_RING.sweep) / 2 ? FF_RING.sweep : 0;
    setBudget(Math.min(FF_MAX, Math.max(FF_MIN, Math.round((FF_MIN + (rel / FF_RING.sweep) * (FF_MAX - FF_MIN)) / 10) * 10)));
  };
  const nudge = (d) => setBudget((b) => Math.min(FF_MAX, Math.max(FF_MIN, b + d)));
  const frac = (budget - FF_MIN) / (FF_MAX - FF_MIN);
  const [kx, ky] = ffPolar(FF_RING.start + FF_RING.sweep * frac);

  const changeQty = (id, d) => {
    const cur = (edited || base.lines).map((l) => ({ it: l.it, qty: l.qty }));
    const next = cur.map((l) => (l.it.id === id ? { ...l, qty: Math.min(9, l.qty + d) } : l)).filter((l) => l.qty > 0);
    setEdited(next);
  };
  const addItem = (it) => {
    const cur = (edited || base.lines).map((l) => ({ it: l.it, qty: l.qty }));
    setEdited(cur.some((l) => l.it.id === it.id) ? cur.map((l) => (l.it.id === it.id ? { ...l, qty: Math.min(9, l.qty + 1) } : l)) : [...cur, { it, qty: 1 }]);
  };
  const log = () => {
    if (!lines.length || done) return;
    onLog(
      slot,
      lines.map((l) => ({
        name: chain.name + " · " + (l.qty > 1 ? l.qty + "× " : "") + nm(l.it),
        kcal: Math.round(l.it.kcal * l.qty),
        protein: ffR1(l.it.p * l.qty),
        carbs: ffR1(l.it.c * l.qty),
        fat: ffR1(l.it.f * l.qty),
      }))
    );
    setDone(true);
  };

  const backLink = (label, to) => (
    <div onClick={() => setStep(to)} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.gold, cursor: "pointer", marginBottom: 12 }}>
      <ChevronLeft size={14} /> {label}
    </div>
  );
  const dots = (n) => (
    <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 14 }}>
      {["chain", "budget", "result"].map((s, i) => (
        <span key={s} style={{ width: i === n ? 22 : 7, height: 7, borderRadius: 4, background: i === n ? COLORS.gold : COLORS.border }} />
      ))}
    </div>
  );

  if (step === "chain") {
    return (
      <div style={{ padding: "0 20px 28px" }}>
        {dots(0)}
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>{t.ffWhere}</div>
        <div style={{ ...small, lineHeight: 1.5, marginBottom: 16 }}>{t.ffWhereSub}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {CHAINS.map((c) => (
            <div key={c.id} data-chain={c.id} onClick={() => pickChain(c)} style={{ position: "relative", borderRadius: 18, padding: "16px 14px 14px", cursor: "pointer", minHeight: 118, background: "linear-gradient(145deg, " + c.color + "38, " + c.color + "10)", border: "1px solid " + c.color + "66", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              {last === c.id && <span style={{ position: "absolute", top: 10, right: 10, background: COLORS.text, color: COLORS.bg, borderRadius: 999, padding: "2px 8px", fontFamily: "Sora, sans-serif", fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>{t.ffLast}</span>}
              <span style={{ fontSize: 30 }}>{c.emoji}</span>
              <div>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 800, color: COLORS.text, lineHeight: 1.15 }}>{c.name}</div>
                <div style={{ ...small, fontSize: 11.5, marginTop: 3 }}>{c.items.length} {t.ffItems}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ ...small, fontSize: 11.5, lineHeight: 1.5, marginTop: 18 }}>{t.ffDisclaimer}</div>
      </div>
    );
  }

  if (step === "budget") {
    const over = budget - leftKcal;
    return (
      <div style={{ padding: "0 20px 28px" }}>
        {dots(1)}
        {backLink(t.ffOtherPlace, "chain")}
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 800, color: COLORS.text }}>{t.ffHowMuch}</div>
        <div style={{ ...small, marginBottom: 6 }}>{chain.emoji} {chain.name}</div>

        <div style={{ position: "relative", width: 240, height: 240, margin: "0 auto" }}>
          <svg
            ref={svgRef}
            viewBox="0 0 220 220"
            width="240"
            height="240"
            role="slider"
            tabIndex={0}
            aria-label={t.ffHowMuch}
            aria-valuemin={FF_MIN}
            aria-valuemax={FF_MAX}
            aria-valuenow={budget}
            onKeyDown={(e) => { if (e.key === "ArrowRight" || e.key === "ArrowUp") nudge(10); else if (e.key === "ArrowLeft" || e.key === "ArrowDown") nudge(-10); }}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e); }}
            onPointerMove={(e) => { if (e.buttons || e.pointerType === "touch") fromPointer(e); }}
            style={{ touchAction: "none", cursor: "pointer", outline: "none" }}
          >
            <path d={ffArc(FF_RING.start, FF_RING.start + FF_RING.sweep)} fill="none" stroke="var(--c-raised)" strokeWidth="16" strokeLinecap="round" />
            {frac > 0 && <path d={ffArc(FF_RING.start, FF_RING.start + FF_RING.sweep * frac)} fill="none" stroke="var(--c-gold)" strokeWidth="16" strokeLinecap="round" />}
            <circle cx={kx} cy={ky} r="11" fill="var(--c-bg)" stroke="var(--c-gold)" strokeWidth="4" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div data-budget style={{ fontFamily: "Sora, sans-serif", fontSize: 50, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>{budget}</div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 12, fontWeight: 700, color: COLORS.gold, letterSpacing: 1, marginTop: 4 }}>KCAL</div>
          </div>
          <div onClick={() => nudge(-50)} aria-label="-50" style={{ position: "absolute", left: 14, bottom: 8, width: 38, height: 38, borderRadius: "50%", background: COLORS.raised, border: "1px solid " + COLORS.border, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Minus size={16} color={COLORS.text} />
          </div>
          <div onClick={() => nudge(50)} aria-label="+50" style={{ position: "absolute", right: 14, bottom: 8, width: 38, height: 38, borderRadius: "50%", background: COLORS.raised, border: "1px solid " + COLORS.border, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Plus size={16} color={COLORS.text} />
          </div>
        </div>

        <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: over > 0 ? COLORS.coral : COLORS.gold, margin: "2px 0 14px" }}>
          {over > 0 ? t.ffOver.replace("{n}", over) : t.ffFits}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
          {[300, 500, 800, 1000].map((v) => (
            <Chip key={v} label={v + " kcal"} active={budget === v} onClick={() => setBudget(v)} />
          ))}
        </div>

        <div onClick={() => leftKcal >= FF_MIN && setBudget(Math.min(FF_MAX, Math.round(leftKcal / 10) * 10))} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.surface, border: "1px solid " + COLORS.border, borderRadius: 14, padding: "12px 14px", marginBottom: 10, cursor: leftKcal >= FF_MIN ? "pointer" : "default" }}>
          <div>
            <div style={{ ...small, fontSize: 11 }}>{t.ffLeftToday}</div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 600, color: COLORS.text, marginTop: 2 }}>{t.ffLeftGoal}</div>
          </div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 800, color: COLORS.text }}>{leftKcal} kcal</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: COLORS.surface, border: "1px solid " + COLORS.border, borderRadius: 14, padding: "12px 14px", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>{t.ffProteinFirst}</div>
            <div style={{ ...small, fontSize: 11.5, marginTop: 2 }}>{t.ffProteinFirstSub}</div>
          </div>
          <Switch checked={proteinFirst} onChange={setProteinFirst} />
        </div>

        <button data-calc onClick={calc} style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "15px 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
          {t.ffCalc}
        </button>
      </div>
    );
  }

  // result
  if (!base) {
    const small0 = smallestMeal(chain);
    return (
      <div style={{ padding: "0 20px 28px" }}>
        {dots(2)}
        {backLink(t.ffBackBudget, "budget")}
        <div style={{ textAlign: "center", color: COLORS.dim, fontFamily: "Inter, sans-serif", fontSize: 14, lineHeight: 1.6, marginTop: 30 }}>
          {t.ffNothing.replace("{n}", budget).replace("{m}", small0)}
        </div>
      </div>
    );
  }
  const pShare = tot.kcal > 0 ? Math.round(((tot.p * 4) / tot.kcal) * 100) : 0;
  const cShare = tot.kcal > 0 ? Math.round(((tot.c * 4) / tot.kcal) * 100) : 0;
  const fShare = tot.kcal > 0 ? Math.round(((tot.f * 9) / tot.kcal) * 100) : 0;
  const overBudget = tot.kcal > budget;
  const bar = (label, text, pct, color) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
      <span style={{ width: 96, fontFamily: "Sora, sans-serif", fontSize: 11.5, fontWeight: 700, color }}>{label}</span>
      <div style={{ flex: 1, height: 7, borderRadius: 4, background: COLORS.raised, overflow: "hidden" }}>
        <div style={{ width: Math.min(100, pct) + "%", height: "100%", borderRadius: 4, background: color }} />
      </div>
      <span style={{ width: 86, textAlign: "right", fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim, whiteSpace: "nowrap" }}>{text}</span>
    </div>
  );
  const afterK = Math.round(eatenKcal + tot.kcal);
  const afterP = Math.round(eatenProtein + tot.p);
  const groups = CAT_KEYS.map((k) => ({ k, items: itemsOf(chain).filter((i) => i.cat === k) })).filter((g) => g.items.length);

  return (
    <div style={{ padding: "0 20px 28px" }}>
      {dots(2)}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div onClick={() => setStep("budget")} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.gold, cursor: "pointer" }}>
          <ChevronLeft size={14} /> {chain.name} · {budget} kcal
        </div>
        <div onClick={() => setOrderView((v) => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: orderView ? COLORS.gold : COLORS.raised, color: orderView ? COLORS.bg : COLORS.dim, fontFamily: "Sora, sans-serif", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
          {t.ffOrderView}
        </div>
      </div>

      {variants.length > 1 && (
        <div style={{ display: "flex", alignItems: "stretch", gap: 8, marginBottom: 10 }}>
          {variants.map((v, i) => (
            <div key={v.key} data-variant={i} onClick={() => { setVariantIdx(i); setEdited(null); setDone(false); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "7px 4px", borderRadius: 10, fontFamily: "Sora, sans-serif", fontSize: 11, fontWeight: 600, lineHeight: 1.25, cursor: "pointer", background: i === variantIdx ? COLORS.gold : COLORS.surface, color: i === variantIdx ? COLORS.bg : COLORS.dim, border: "1px solid " + (i === variantIdx ? COLORS.gold : COLORS.border) }}>
              {i + 1}/{variants.length} · {t[v.label]}
            </div>
          ))}
        </div>
      )}

      <Card style={{ padding: "16px 16px 12px", marginBottom: 12 }}>
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, color: COLORS.coral, textTransform: "uppercase" }}>{t[base.label]}</div>
        <div style={{ ...small, fontSize: 11.5, marginTop: 2 }}>{t.ffFitsIn.replace("{n}", budget)}</div>
        <div style={{ textAlign: "center", margin: "10px 0 4px" }}>
          <span data-protein style={{ fontFamily: "Sora, sans-serif", fontSize: 52, fontWeight: 800, color: COLORS.coral, lineHeight: 1 }}>{Math.round(tot.p)}</span>
          <span style={{ fontFamily: "Sora, sans-serif", fontSize: 18, fontWeight: 800, color: COLORS.coral }}> g</span>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: COLORS.dim }}>{t.protein.toUpperCase()}</div>
          <div data-kcal style={{ ...small, marginTop: 4, color: overBudget ? COLORS.coral : COLORS.dim }}>{Math.round(tot.kcal)} {t.ffOf} {budget} kcal</div>
        </div>

        {orderView ? (
          <div style={{ marginTop: 10, borderTop: "1px solid " + COLORS.border, paddingTop: 10 }}>
            <div style={{ ...small, fontSize: 11.5, marginBottom: 8 }}>{t.ffOrderHint}</div>
            {lines.map((l) => (
              <div key={l.it.id} style={{ fontFamily: "Sora, sans-serif", fontSize: 19, fontWeight: 700, color: COLORS.text, padding: "7px 0", borderBottom: "1px solid " + COLORS.border }}>
                {l.qty}× {nm(l.it)}
              </div>
            ))}
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 19, fontWeight: 700, color: COLORS.text, padding: "7px 0" }}>1× {t.ffWater}</div>
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            {lines.map((l) => (
              <div key={l.it.id} data-line={l.it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid " + COLORS.border }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span onClick={() => changeQty(l.it.id, -1)} aria-label={t.delete} style={{ width: 24, height: 24, borderRadius: 7, background: COLORS.raised, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    {l.qty === 1 ? <X size={12} color={COLORS.dim} /> : <Minus size={12} color={COLORS.text} />}
                  </span>
                  <span style={{ minWidth: 20, textAlign: "center", fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 700, color: COLORS.text }}>{l.qty}×</span>
                  <span onClick={() => changeQty(l.it.id, 1)} aria-label="+" style={{ width: 24, height: 24, borderRadius: 7, background: COLORS.raised, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Plus size={12} color={COLORS.text} />
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0, fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.text }}>{nm(l.it)}</div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 700, color: COLORS.text }}>{Math.round(l.it.kcal * l.qty)} kcal</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: COLORS.coral }}>{ffR1(l.it.p * l.qty)} g {t.protein}</div>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderTop: "1px solid " + COLORS.border }}>
              <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.text }}>💧 {t.ffWater}</span>
              <span style={{ ...small, fontSize: 11.5 }}>{t.ffFreeDrink}</span>
            </div>
            <div onClick={() => setAdding((a) => !a)} data-add style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0 4px", borderTop: "1px solid " + COLORS.border, color: COLORS.gold, fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              <Plus size={14} /> {t.ffAddItem}
            </div>
            {adding && (
              <div style={{ marginTop: 6 }}>
                {groups.map((g) => (
                  <div key={g.k} style={{ marginBottom: 8 }}>
                    <div style={{ ...small, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", margin: "6px 0 4px" }}>{t["ffCat_" + g.k]}</div>
                    {g.items.map((it) => (
                      <div key={it.id} onClick={() => addItem(it)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: COLORS.raised, marginBottom: 5, cursor: "pointer" }}>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.text }}>{nm(it)}</span>
                        <span style={{ ...small, fontSize: 11.5, whiteSpace: "nowrap" }}>{it.kcal} kcal · {ffR1(it.p)} g P</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card style={{ padding: "14px 16px 10px", marginBottom: 12 }}>
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, color: COLORS.dim, textTransform: "uppercase", marginBottom: 10 }}>{t.ffSum}</div>
        {bar("kcal", Math.round(tot.kcal) + " / " + budget, (tot.kcal / budget) * 100, overBudget ? COLORS.coral : COLORS.gold)}
        {bar(t.protein, Math.round(tot.p) + " g · " + pShare + " %", pShare, COLORS.teal)}
        {bar(t.carbs, Math.round(tot.c) + " g · " + cShare + " %", cShare, COLORS.gold)}
        {bar(t.fat, Math.round(tot.f) + " g · " + fShare + " %", fShare, COLORS.coral)}
        <div style={{ ...small, fontSize: 11.5, marginTop: 8, paddingTop: 8, borderTop: "1px solid " + COLORS.border }}>
          {t.ffAfter}: {afterK}{goalKcal ? " " + t.ffOf + " " + goalKcal : ""} kcal · {afterP}{proteinTarget ? " " + t.ffOf + " " + proteinTarget : ""} g {t.protein}
        </div>
      </Card>

      <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", marginBottom: 10 }}>
        <span style={{ ...small, fontSize: 11.5, whiteSpace: "nowrap" }}>{t.ffLogTo}</span>
        {slots.map((sl) => (
          <Chip key={sl.key} label={sl.label} active={slot === sl.key} onClick={() => setSlot(sl.key)} />
        ))}
      </div>
      <button data-log disabled={!lines.length} onClick={log} style={{ width: "100%", background: done ? COLORS.raised : COLORS.gold, color: done ? COLORS.gold : COLORS.bg, border: "none", borderRadius: 14, padding: "15px 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: lines.length ? 1 : 0.5 }}>
        {done ? "✓ " + t.ffLogged : t.ffLog + " · " + Math.round(tot.kcal) + " kcal"}
      </button>
      <div style={{ ...small, fontSize: 11, lineHeight: 1.5, marginTop: 14 }}>{t.ffDisclaimer}</div>
    </div>
  );
}

/* ---------------- Recipes ---------------- */

// ---------- Pantry ("Speisekammer"): folders with the foods you buy again and again ----------
const PANTRY_EMOJIS = ["🥣", "🍝", "🥩", "🥦", "🍎", "🥛", "🍫", "🥜", "🧀", "🍞", "🥚", "🧂"];
const PANTRY_SUGGEST = { de: ["Frühstück", "Carbs", "Protein", "Snacks", "Gemüse"], en: ["Breakfast", "Carbs", "Protein", "Snacks", "Veggies"] };
const newPantryId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pantryEmojiFor = (name) => {
  const n = String(name || "").toLowerCase();
  if (/früh|break/.test(n)) return "🥣";
  if (/carb|nudel|reis|pasta|brot|bread/.test(n)) return "🍝";
  if (/prot|fleisch|meat|fisch|fish|\bei(er)?\b|egg/.test(n)) return "🥩";
  if (/snack|süß|sweet|riegel|\bbar\b/.test(n)) return "🍫";
  if (/gemüse|veg|salat|obst|fruit|frucht|beere/.test(n)) return "🥦";
  if (/milch|joghurt|dairy|käse|cheese|quark/.test(n)) return "🥛";
  return "🥫";
};
const mealKeyForNow = () => {
  const h = new Date().getHours();
  return h < 10 ? "breakfast" : h < 15 ? "lunch" : h < 17 ? "snacks" : "dinner";
};
const pantryStep = (g) => (g < 30 ? 5 : 10);
// a pantry item at a given amount, in the shape the diary expects
const pantryFood = (it, grams) => ({ name: it.name, ...scale(it.per100, grams), grams, unit: it.unit === "ml" ? "ml" : "g" });

// Small chooser used after picking a food (search / barcode): which folder should it go to?
function PantryPicker({ t, lang, pantry, onSave }) {
  const [name, setName] = useState("");
  const ok = name.trim().length > 0;
  return (
    <div style={{ marginTop: 10, padding: 12, background: COLORS.raised, borderRadius: 12 }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginBottom: 8 }}>{t.pantryChooseFolder}</div>
      {pantry.length > 0 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {pantry.map((f) => (
            <Chip key={f.id} label={f.emoji + " " + f.name} onClick={() => onSave(f.id, null)} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {(PANTRY_SUGGEST[lang] || PANTRY_SUGGEST.en).map((s) => (
            <Chip key={s} label={pantryEmojiFor(s) + " " + s} onClick={() => onSave(null, s)} />
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && ok) onSave(null, name.trim()); }} placeholder={t.pantryNewFolder} style={{ ...numInputStyle, flex: 1, minWidth: 0 }} />
        <button disabled={!ok} onClick={() => onSave(null, name.trim())} aria-label={t.pantryCreate} style={{ background: ok ? COLORS.gold : COLORS.surface, color: ok ? COLORS.bg : COLORS.dim, border: "none", borderRadius: 10, padding: "0 14px", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function PantryScreen({ t, lang, pantry, initialSlot, openId, onAddTo, onCreateFolder, onRenameFolder, onDeleteFolder, onDeleteItem, onAddFoods, onShare }) {
  const [slot, setSlot] = useState(initialSlot);
  const [open, setOpen] = useState(openId || (pantry[0] ? pantry[0].id : null));
  const [amounts, setAmounts] = useState({});
  const [toast, setToast] = useState(null);
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(null);
  const [renaming, setRenaming] = useState(null); // { id, name }
  const [sure, setSure] = useState(null); // folder id waiting for the second tap
  const slots = [
    { key: "breakfast", label: t.breakfast },
    { key: "lunch", label: t.lunch },
    { key: "dinner", label: t.dinner },
    { key: "snacks", label: t.snacks },
  ];
  const amountOf = (it) => (amounts[it.id] != null ? amounts[it.id] : it.grams);
  const setAmount = (it, g) => setAmounts((a) => ({ ...a, [it.id]: Math.max(0, Math.min(5000, Math.round(g))) }));
  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  };
  const addItem = (f, it) => {
    const g = amountOf(it);
    if (!(g > 0)) return false;
    onAddTo(slot, pantryFood(it, g), f.id, it.id, g);
    return true;
  };
  const addAll = (f) => {
    const n = f.items.filter((it) => addItem(f, it)).length;
    if (n) flash(f.emoji + " " + f.name + " (" + n + ")");
  };
  const create = (nm) => {
    const clean = String(nm).trim();
    if (!clean) return;
    const id = newPantryId();
    onCreateFolder(id, clean, emoji || pantryEmojiFor(clean));
    setOpen(id);
    setName("");
    setEmoji(null);
  };
  const suggestions = (PANTRY_SUGGEST[lang] || PANTRY_SUGGEST.en).filter((s) => !pantry.some((f) => f.name.toLowerCase() === s.toLowerCase()));
  const kcalOf = (f) => f.items.reduce((s, it) => s + pantryFood(it, amountOf(it)).kcal, 0);
  const small = { fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim };
  const box = { width: 32, height: 32, borderRadius: 9, background: COLORS.raised, border: "1px solid " + COLORS.border, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 };

  return (
    <div style={{ padding: "0 20px 28px", position: "relative" }}>
      <div style={{ ...small, marginBottom: 12, lineHeight: 1.5 }}>{t.pantryIntro}</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 6, overflowX: "auto" }}>
        {slots.map((sl) => (
          <Chip key={sl.key} label={sl.label} active={slot === sl.key} onClick={() => setSlot(sl.key)} />
        ))}
      </div>
      <div style={{ ...small, fontSize: 11.5, marginBottom: 14 }}>{t.pantryAddTo}</div>

      {pantry.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <span onClick={() => { setEdit((e) => !e); setSure(null); setRenaming(null); }} style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.gold, cursor: "pointer" }}>
            {edit ? t.pantryDone : t.pantryEdit}
          </span>
        </div>
      )}

      {pantry.map((f) => {
        const isOpen = open === f.id;
        return (
          <Card key={f.id} style={{ padding: 0, marginBottom: 12, overflow: "hidden" }}>
            <div onClick={() => setOpen(isOpen ? null : f.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}>
              <span style={{ fontSize: 26, lineHeight: 1 }}>{f.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {renaming && renaming.id === f.id ? (
                  <input
                    autoFocus
                    value={renaming.name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setRenaming({ id: f.id, name: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") { if (renaming.name.trim()) onRenameFolder(f.id, renaming.name.trim()); setRenaming(null); } }}
                    onBlur={() => { if (renaming && renaming.name.trim()) onRenameFolder(f.id, renaming.name.trim()); setRenaming(null); }}
                    style={{ ...numInputStyle, width: "100%", boxSizing: "border-box" }}
                  />
                ) : (
                  <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text }}>{f.name}</div>
                )}
                <div style={{ ...small, fontSize: 12, marginTop: 2 }}>
                  {f.items.length} {f.items.length === 1 ? t.pantryItemOne : t.pantryItemMany}
                  {f.items.length > 0 ? " · " + kcalOf(f) + " kcal" : ""}
                </div>
              </div>
              <ChevronDown size={18} color={COLORS.dim} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
            </div>

            {isOpen && (
              <div style={{ borderTop: "1px solid " + COLORS.border, padding: "6px 12px 14px" }}>
                {f.items.length === 0 ? (
                  <div style={{ ...small, padding: "12px 4px" }}>{t.pantryEmpty}</div>
                ) : (
                  f.items.map((it, i) => {
                    const g = amountOf(it);
                    const unit = it.unit === "ml" ? "ml" : "g";
                    return (
                      <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 4px", borderBottom: i < f.items.length - 1 ? "1px solid " + COLORS.border : "none" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</div>
                          <div style={{ ...small, fontSize: 11.5, marginTop: 2 }}>{pantryFood(it, g).kcal} kcal</div>
                        </div>
                        {edit ? (
                          <div onClick={() => onDeleteItem(f.id, it.id)} style={{ ...box, background: "transparent", border: "none" }} aria-label={t.delete || "Delete"}>
                            <Trash2 size={17} color={COLORS.coral} />
                          </div>
                        ) : (
                          <>
                            <div onClick={() => setAmount(it, g - pantryStep(g))} style={box}>
                              <Minus size={13} color={COLORS.text} />
                            </div>
                            <input type="number" inputMode="decimal" value={g || ""} onChange={(e) => setAmount(it, Number(e.target.value) || 0)} style={{ ...numInputStyle, width: 58, textAlign: "center", fontWeight: 700, padding: "7px 4px" }} />
                            <span style={{ ...small, width: 14 }}>{unit}</span>
                            <div onClick={() => setAmount(it, g + pantryStep(g))} style={box}>
                              <Plus size={13} color={COLORS.text} />
                            </div>
                            <div onClick={() => { if (addItem(f, it)) flash(it.name); }} aria-label={t.addItem} style={{ ...box, width: 36, height: 36, background: COLORS.gold, border: "none", opacity: g > 0 ? 1 : 0.4 }}>
                              <Check size={17} color={COLORS.bg} />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}

                {!edit && f.items.length > 1 && (
                  <button onClick={() => addAll(f)} style={{ width: "100%", marginTop: 12, background: COLORS.goldSoft, color: COLORS.gold, border: "1px solid " + COLORS.gold, borderRadius: 12, padding: "11px 14px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
                    {t.pantryAddAll} · {kcalOf(f)} kcal
                  </button>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 14 }}>
                  <span onClick={() => onAddFoods(f.id)} style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.gold, cursor: "pointer" }}>{t.pantryAddFoods}</span>
                  {!edit && f.items.length > 0 && (
                    <span onClick={() => onShare({ t: "pantry", f: { name: f.name, emoji: f.emoji, items: f.items.map((it) => ({ n: it.name, p: it.per100, u: it.unit, g: it.grams })) } }, t.shareTypePantry)} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, cursor: "pointer" }}>
                      <Share2 size={13} /> {t.shareButton}
                    </span>
                  )}
                  {edit && (
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span onClick={() => setRenaming({ id: f.id, name: f.name })} style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, cursor: "pointer" }}>
                        <Pencil size={13} /> {t.pantryRename}
                      </span>
                      <span
                        onClick={() => {
                          if (sure === f.id) {
                            onDeleteFolder(f.id);
                            setSure(null);
                          } else {
                            setSure(f.id);
                            setTimeout(() => setSure((s) => (s === f.id ? null : s)), 3000);
                          }
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: sure === f.id ? 700 : 400, color: COLORS.coral, cursor: "pointer" }}
                      >
                        <Trash2 size={13} /> {sure === f.id ? t.pantryDeleteSure : t.pantryDeleteFolder}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <Card style={{ marginTop: pantry.length ? 4 : 0 }}>
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>{t.pantryNewFolder}</div>
        {suggestions.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {suggestions.map((s) => (
              <Chip key={s} label={pantryEmojiFor(s) + " " + s} onClick={() => create(s)} />
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 10 }}>
          {PANTRY_EMOJIS.map((e) => (
            <div key={e} onClick={() => setEmoji(emoji === e ? null : e)} style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, cursor: "pointer", flexShrink: 0, background: (emoji || pantryEmojiFor(name)) === e ? COLORS.goldSoft : COLORS.raised, border: "1px solid " + ((emoji || pantryEmojiFor(name)) === e ? COLORS.gold : COLORS.border) }}>{e}</div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") create(name); }} placeholder={t.pantryFolderName} style={{ ...numInputStyle, flex: 1, minWidth: 0 }} />
          <button disabled={!name.trim()} onClick={() => create(name)} style={{ background: name.trim() ? COLORS.gold : COLORS.raised, color: name.trim() ? COLORS.bg : COLORS.dim, border: "none", borderRadius: 10, padding: "0 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {t.pantryCreate}
          </button>
        </div>
      </Card>

      {toast && (
        <div style={{ position: "fixed", left: 20, right: 20, bottom: 90, maxWidth: 350, margin: "0 auto", background: COLORS.gold, color: COLORS.bg, borderRadius: 12, padding: "11px 16px", display: "flex", alignItems: "center", gap: 8, fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, boxShadow: "0 10px 24px rgba(0,0,0,0.3)", zIndex: 50 }}>
          <Check size={15} /> {toast} — {t.addedToast}
        </div>
      )}
    </div>
  );
}

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
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <Chip label={t.cheatMeal} active={type === "meal"} onClick={() => setType("meal")} />
          <Chip label={t.cheatDay} active={type === "day"} onClick={() => setType("day")} />
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginBottom: 6 }}>{t.dateLabel}</div>
        <input
          type="date"
          value={date}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
          style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", marginBottom: 14, colorScheme: "dark" }}
        />
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginBottom: 6 }}>{t.cheatNote}</div>
        <input value={note} onChange={(e) => setNote(e.target.value)} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", marginBottom: 14 }} />
        <button onClick={add} disabled={!date} style={{ width: "100%", opacity: date ? 1 : 0.5, background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 12, padding: "12px 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: date ? "pointer" : "default" }}>
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

function RecipesScreen({ t, lang, onAdd, onDone, customRecipes = [], onSaveRecipe, onDeleteRecipe, initialImport = null, onShare }) {
  const [cat, setCat] = useState("all");
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const [mode, setMode] = useState(initialImport ? "form" : "list"); // list | form
  // recipe from a link or pasted text (Instagram / TikTok caption, recipe website)
  const [impText, setImpText] = useState(initialImport || "");
  const [impBusy, setImpBusy] = useState(false);
  const [impError, setImpError] = useState(null);
  const [impInfo, setImpInfo] = useState(null);
  const emptyForm = { name: "", category: "lunch", kcal: "", protein: "", carbs: "", fat: "", ingredients: "", image: "" };
  const ownPhotoRef = useRef(null);
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
        setForm({ name: r.name, category: r.category, kcal: String(r.kcal), protein: String(r.protein), carbs: String(r.carbs), fat: String(r.fat), ingredients: r.ingredients.join("\n"), image: "" });
      }
    } catch {
      setAiError(t.serverError);
    } finally {
      setAiBusy(false);
    }
  };

  const importRecipe = async (override) => {
    const input = String(override != null ? override : impText).trim();
    if (!input || impBusy) return;
    setImpBusy(true);
    setImpError(null);
    setImpInfo(null);
    try {
      const res = await fetch(API_BASE + "/api/recipe-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, lang }),
      });
      if (res.status === 503) setImpError(t.assistantNotConfigured);
      else if (res.status === 429) setImpError(t.importTooMany);
      else if (res.status === 422) {
        const j = await res.json().catch(() => ({}));
        setImpError(j.error === "unreadable" ? t.importUnreadable : t.importNoRecipe);
      } else if (!res.ok) setImpError(t.assistantError);
      else {
        const r = await res.json();
        setForm({ name: r.name, category: r.category, kcal: String(r.kcal), protein: String(r.protein), carbs: String(r.carbs), fat: String(r.fat), ingredients: r.ingredients.join("\n"), image: "" });
        setImpInfo({ servings: r.servings, estimated: r.estimated });
      }
    } catch {
      setImpError(t.serverError);
    } finally {
      setImpBusy(false);
    }
  };
  useEffect(() => {
    if (initialImport) importRecipe(initialImport);
  }, []);

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
      image: form.image || "",
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
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>🔗 {t.importTitle}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginBottom: 8, lineHeight: 1.45 }}>{t.importHint}</div>
            <textarea value={impText} onChange={(e) => setImpText(e.target.value)} placeholder={t.importPlaceholder} rows={3} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", resize: "vertical", marginBottom: 10, fontFamily: "Inter, sans-serif" }} />
            <button onClick={() => importRecipe()} disabled={impBusy || !impText.trim()} style={{ width: "100%", background: impBusy || !impText.trim() ? COLORS.raised : COLORS.gold, color: impBusy || !impText.trim() ? COLORS.dim : COLORS.bg, border: "none", borderRadius: 12, padding: "11px 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13.5, cursor: impBusy ? "default" : "pointer" }}>
              {impBusy ? t.importBusy : t.importGo}
            </button>
            {impError && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.coral, marginTop: 8, lineHeight: 1.45 }}>{impError}</div>}
            {impInfo && (
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginTop: 8, lineHeight: 1.45 }}>
                ✓ {t.importFound}: {form.name} · {impInfo.servings} {t.importPortions} · {impInfo.estimated ? t.importEstimated : t.importFromSource}
              </div>
            )}
          </Card>

          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>✨ {t.recipeCreateAi}</div>
            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder={t.recipeAiPrompt} rows={2} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", resize: "vertical", marginBottom: 10, fontFamily: "Inter, sans-serif" }} />
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
            <input ref={ownPhotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
              const f = e.target.files && e.target.files[0];
              e.target.value = "";
              if (f) setForm({ ...form, image: await downscaleImage(f, 640) });
            }} />
            {form.image && (
              <div style={{ marginBottom: 10 }}>
                <img src={form.image} alt="" style={{ width: "100%", height: 180, objectFit: "cover", objectPosition: "center top", borderRadius: 12, display: "block", background: COLORS.raised }} />
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <Chip label={t.recipeImageOwn} active={false} onClick={() => ownPhotoRef.current && ownPhotoRef.current.click()} />
              {form.image && <Chip label={t.recipeImageRemove} active={false} onClick={() => setForm({ ...form, image: "" })} />}
            </div>
            <textarea value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} placeholder={t.recipeIngredientsHint} rows={5} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", resize: "vertical", marginBottom: 10, fontFamily: "Inter, sans-serif" }} />
            <button onClick={saveForm} style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 12, padding: "12px 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              {t.recipeSave}
            </button>
            {num(form.kcal) > 0 && (
              <button
                onClick={() => {
                  const nm = form.name.trim() || t.quickAddDefault;
                  onAdd({ name: nm, kcal: num(form.kcal), protein: num(form.protein), carbs: num(form.carbs), fat: num(form.fat) });
                  setToast(nm);
                  setTimeout(() => setToast(null), 1400);
                }}
                style={{ width: "100%", marginTop: 8, background: "transparent", color: COLORS.gold, border: "1px solid " + COLORS.border, borderRadius: 12, padding: "11px 16px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}
              >
                {t.recipeLogNow}
              </button>
            )}
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
          <button onClick={() => setMode("form")} style={{ width: "100%", marginBottom: 14, background: COLORS.surface, border: "1px solid " + COLORS.border, color: COLORS.text, borderRadius: 12, padding: "11px 14px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            🔗 {t.importTitle}
          </button>
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
                {r.image && <img src={r.image} alt="" loading="lazy" style={{ width: 46, height: 46, borderRadius: 10, objectFit: "cover", objectPosition: "left top", marginRight: 12, flexShrink: 0, background: COLORS.raised }} onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
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
          {selected.image && (
            <div style={{ marginBottom: 14 }}>
              <img src={selected.image} alt="" style={{ width: "100%", height: 200, objectFit: "cover", objectPosition: "center top", borderRadius: 14, display: "block", background: COLORS.raised }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
            </div>
          )}
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
          <button
            onClick={() => {
              const ing = (lang === "de" ? selected.ingredientsDe : selected.ingredients) || [];
              onShare({ t: "recipe", r: { name: lang === "de" ? selected.nameDe : selected.name, category: selected.category, kcal: selected.kcal, protein: selected.protein, carbs: selected.carbs, fat: selected.fat, i: ing } }, t.shareTypeRecipe);
            }}
            style={{ width: "100%", marginTop: 8, background: "transparent", color: COLORS.gold, border: "1px solid " + COLORS.border, borderRadius: 14, padding: "12px 18px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}
          >
            {t.shareRecipeBtn}
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
// ---------- Exercise demo: start / end pictures that flip back and forth, plus the steps ----------
// Pictures and English instructions come from the public-domain "free-exercise-db"
// (https://github.com/yuhonas/free-exercise-db, Unlicense); the German steps are our own.
let exerciseMediaPromise = null;
function loadExerciseMedia() {
  if (!exerciseMediaPromise) exerciseMediaPromise = fetch("/exercise-media.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return exerciseMediaPromise;
}
const EQUIP_LABELS = {
  "body only": { de: "Körpergewicht", en: "Bodyweight" },
  barbell: { de: "Langhantel", en: "Barbell" },
  dumbbell: { de: "Kurzhantel", en: "Dumbbell" },
  cable: { de: "Kabelzug", en: "Cable" },
  machine: { de: "Maschine", en: "Machine" },
  kettlebells: { de: "Kettlebell", en: "Kettlebell" },
  bands: { de: "Band", en: "Bands" },
  "e-z curl bar": { de: "SZ-Stange", en: "EZ bar" },
  "medicine ball": { de: "Medizinball", en: "Medicine ball" },
  "exercise ball": { de: "Gymnastikball", en: "Exercise ball" },
  other: { de: "Sonstiges", en: "Other" },
};
const LEVEL_LABELS = { beginner: { de: "Anfänger", en: "Beginner" }, intermediate: { de: "Fortgeschritten", en: "Intermediate" }, expert: { de: "Profi", en: "Expert" } };

function ExerciseDemo({ t, lang, media, item }) {
  const [paused, setPaused] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const l = lang === "de" ? "de" : "en";
  const steps = (lang === "de" ? item.de : item.en) || [];
  const url = (n) => media.base + item.id + "/" + n + ".jpg";
  const chips = [EQUIP_LABELS[item.eq] && EQUIP_LABELS[item.eq][l], LEVEL_LABELS[item.lv] && LEVEL_LABELS[item.lv][l]].filter(Boolean);
  const small = { fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim };
  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>{t.libHowTo}</div>
      {imgOk && (
        <>
          <div onClick={() => setPaused((p) => !p)} style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#fff", cursor: "pointer" }}>
            <style>{"@keyframes demoFlip { 0%, 42% { opacity: 0; } 50%, 92% { opacity: 1; } 100% { opacity: 0; } }"}</style>
            <img src={url(0)} alt="" loading="lazy" onError={() => setImgOk(false)} style={{ display: "block", width: "100%" }} />
            <img src={url(1)} alt="" loading="lazy" onError={() => setImgOk(false)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", opacity: 0, animation: "demoFlip 2.6s ease-in-out infinite", animationPlayState: paused ? "paused" : "running" }} />
          </div>
          <div style={{ ...small, fontSize: 11.5, margin: "6px 0 10px" }}>{t.libStartEnd}</div>
        </>
      )}
      {chips.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {chips.map((c) => (
            <span key={c} style={{ background: COLORS.raised, border: "1px solid " + COLORS.border, borderRadius: 999, padding: "4px 10px", fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.text }}>{c}</span>
          ))}
        </div>
      )}
      <div>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "5px 0", fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.text, lineHeight: 1.45 }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: COLORS.goldSoft, color: COLORS.gold, fontFamily: "Sora, sans-serif", fontSize: 11.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
      <div style={{ ...small, fontSize: 11, marginTop: 10 }}>{t.libSource}</div>
    </Card>
  );
}

// ---------- Target muscles: which muscles an exercise trains (front / back body map) ----------
const MUSCLE_NAMES = {
  chest: { de: "Brust", en: "Chest" },
  shoulders: { de: "Schultern", en: "Shoulders" },
  biceps: { de: "Bizeps", en: "Biceps" },
  triceps: { de: "Trizeps", en: "Triceps" },
  forearms: { de: "Unterarme", en: "Forearms" },
  abs: { de: "Bauch", en: "Abs" },
  obliques: { de: "Seitlicher Bauch", en: "Obliques" },
  quads: { de: "Oberschenkel vorne", en: "Quadriceps" },
  adductors: { de: "Innenschenkel", en: "Adductors" },
  hamstrings: { de: "Beinbeuger", en: "Hamstrings" },
  glutes: { de: "Gesäß", en: "Glutes" },
  calves: { de: "Waden", en: "Calves" },
  traps: { de: "Trapez", en: "Traps" },
  lats: { de: "Latissimus", en: "Lats" },
  lower_back: { de: "Unterer Rücken", en: "Lower back" },
};

// default muscles per library group, [primary, secondary]
const MUSCLE_GROUP_DEFAULT = {
  chest: ["chest", "shoulders,triceps"],
  back: ["lats", "biceps,traps,forearms"],
  legs: ["quads", "glutes,hamstrings,calves"],
  shoulders: ["shoulders", "triceps,traps"],
  arms: ["biceps", "forearms"],
  core: ["abs", "obliques"],
  glutes: ["glutes", "hamstrings,quads"],
  cardio: ["quads,calves", "hamstrings,glutes,abs"],
  full: ["quads,glutes,lower_back", "shoulders,traps,hamstrings,abs,lats,triceps"],
};

// exercises whose muscles differ from their group default: key -> [primary, secondary]
const MUSCLE_OVERRIDES = {
  // chest
  dips: ["chest,triceps", "shoulders"], machine_dip: ["chest,triceps", "shoulders"], diamond_pushup: ["triceps,chest", "shoulders"],
  cable_fly: ["chest", "shoulders"], pec_deck: ["chest", "shoulders"], db_fly: ["chest", "shoulders"], low_cable_fly: ["chest", "shoulders"], high_cable_fly: ["chest", "shoulders"],
  svend_press: ["chest", "shoulders,triceps"],
  // back
  deadlift: ["lower_back,glutes,hamstrings", "traps,lats,forearms,quads"], rack_pull: ["lower_back,glutes,hamstrings", "traps,lats,forearms"], sumo_deadlift: ["glutes,hamstrings,quads", "lower_back,traps,adductors,forearms"], trapbar_deadlift: ["quads,glutes,hamstrings", "lower_back,traps,forearms"],
  good_morning: ["hamstrings,lower_back", "glutes"], back_extension: ["lower_back", "glutes,hamstrings"], hyperextension: ["lower_back", "glutes,hamstrings"],
  barbell_shrug: ["traps", "forearms,shoulders"], db_shrug: ["traps", "forearms,shoulders"], db_pullover: ["lats", "triceps,chest"], straight_arm_pulldown: ["lats", "triceps"],
  row: ["lats,traps", "biceps,shoulders,forearms"], pendlay_row: ["lats,traps", "biceps,lower_back"], db_row: ["lats,traps", "biceps,forearms"], chest_supported_row: ["lats,traps", "biceps,shoulders"], wide_cable_row: ["traps,lats", "biceps,shoulders"], machine_row: ["lats,traps", "biceps,shoulders"], seatedrow: ["lats,traps", "biceps,shoulders"], tbarrow: ["lats,traps", "biceps,lower_back"], meadows_row: ["lats,traps", "biceps,forearms"], inverted_row: ["lats,traps", "biceps,abs"],
  chinup: ["lats,biceps", "forearms,traps"],
  // legs
  rdl: ["hamstrings,glutes", "lower_back,forearms"], db_rdl: ["hamstrings,glutes", "lower_back,forearms"], stiff_leg_dl: ["hamstrings,glutes", "lower_back,forearms"],
  legcurl: ["hamstrings", "calves"], seated_legcurl: ["hamstrings", "calves"], lying_legcurl: ["hamstrings", "calves"], nordic_curl: ["hamstrings", "glutes,calves"],
  legext: ["quads", ""], sissy_squat: ["quads", "abs"],
  calfraise: ["calves", ""], seated_calf: ["calves", ""], legpress_calf: ["calves", ""],
  adductor: ["adductors", ""], abductor: ["glutes", ""],
  lunge: ["quads,glutes", "hamstrings,adductors,calves"], reverse_lunge: ["quads,glutes", "hamstrings,adductors"], step_up: ["quads,glutes", "hamstrings,calves"], bulgarian_split: ["quads,glutes", "hamstrings,adductors"], side_lunge: ["quads,glutes,adductors", "hamstrings"], pistol_squat: ["quads,glutes", "hamstrings,calves,abs"],
  wall_sit: ["quads", "glutes,calves"], jump_squat: ["quads,glutes", "calves,hamstrings"], box_jump: ["quads,glutes", "calves,hamstrings"],
  squat: ["quads,glutes", "hamstrings,lower_back,abs"], front_squat: ["quads", "glutes,abs,lower_back"], goblet_squat: ["quads,glutes", "abs,adductors"], hack_squat: ["quads", "glutes,hamstrings"], smith_squat: ["quads,glutes", "hamstrings"], legpress: ["quads,glutes", "hamstrings,calves"],
  // shoulders
  facepull: ["shoulders", "traps,lats"], reardelt: ["shoulders", "traps,lats"], rear_delt_cable: ["shoulders", "traps"], reverse_pecdeck: ["shoulders", "traps"], y_raise: ["shoulders", "traps"], band_pullapart: ["shoulders", "traps"], db_external_rotation: ["shoulders", ""],
  upright_row: ["shoulders,traps", "biceps"], pike_pushup: ["shoulders", "triceps,chest"], handstand_pushup: ["shoulders", "triceps,traps"],
  // arms
  pushdown: ["triceps", ""], rope_pushdown: ["triceps", ""], skullcrusher: ["triceps", ""], overhead_ext: ["triceps", ""], tricep_kickback: ["triceps", ""],
  bench_dip: ["triceps", "chest,shoulders"], close_grip_bench: ["triceps", "chest,shoulders"], jm_press: ["triceps", "chest,shoulders"],
  wrist_curl: ["forearms", ""], reverse_curl: ["forearms,biceps", ""], farmers_walk: ["forearms,traps", "abs,glutes"],
  // core
  russiantwist: ["obliques", "abs"], woodchop: ["obliques", "abs,shoulders"], side_plank: ["obliques", "abs,shoulders"], pallof_press: ["obliques", "abs,shoulders"], bicycle_crunch: ["abs,obliques", ""], suitcase_carry: ["obliques", "forearms,traps,abs"],
  hanginglegraise: ["abs", "forearms,obliques"], toes_to_bar: ["abs", "forearms,lats"], lying_leg_raise: ["abs", "obliques"], v_up: ["abs", "obliques"], flutter_kicks: ["abs", "quads"], l_sit: ["abs", "triceps,quads"],
  bird_dog: ["abs,lower_back", "glutes,shoulders"], dead_bug: ["abs", "obliques"], mountain_climber: ["abs", "quads,shoulders"], plank: ["abs", "shoulders,glutes"], hollow_hold: ["abs", "quads"], ab_wheel: ["abs", "shoulders,lats"],
  // glutes
  clamshell: ["glutes", ""], fire_hydrant: ["glutes", ""], donkey_kick: ["glutes", "hamstrings"], cable_kickback: ["glutes", "hamstrings"], good_morning_glute: ["glutes", "obliques"],
  kb_swing: ["glutes,hamstrings", "lower_back,shoulders,abs"], curtsy_lunge: ["glutes,quads", "adductors,hamstrings"],
  // full body
  turkish_getup: ["shoulders,abs", "glutes,quads,triceps"], medball_slam: ["abs,shoulders", "lats,triceps"], bear_crawl: ["shoulders,abs", "quads,triceps"],
  power_clean: ["quads,glutes,traps", "shoulders,hamstrings,lower_back"], snatch: ["quads,glutes,traps,shoulders", "hamstrings,lower_back,triceps"], clean_jerk: ["quads,glutes,shoulders", "traps,hamstrings,triceps"], thruster: ["quads,shoulders", "glutes,triceps,abs"], clean_press: ["quads,shoulders", "glutes,traps,triceps"], man_maker: ["shoulders,quads", "chest,lats,abs,triceps"], kb_clean: ["glutes,hamstrings,traps", "shoulders,forearms,quads"],
  // cardio
  rowing_machine: ["lats,quads", "hamstrings,biceps,lower_back"], swimming: ["lats,shoulders", "triceps,abs,quads"], battle_ropes: ["shoulders", "abs,biceps,forearms"], sled_push: ["quads,glutes", "calves,shoulders"], boxing: ["shoulders", "abs,triceps,obliques,calves"],
  jump_rope: ["calves,quads", "shoulders,abs"], burpees: ["quads,chest,shoulders", "triceps,abs,glutes"], jumping_jacks: ["calves,quads", "shoulders,abs"], hiit: ["quads,calves", "glutes,abs,shoulders"],
};

function exerciseMuscles(ex) {
  const split = (s) => (s ? s.split(",") : []);
  const [p, s] = MUSCLE_OVERRIDES[ex.key] || MUSCLE_GROUP_DEFAULT[ex.muscle] || ["", ""];
  const primary = split(p);
  return { primary, secondary: split(s).filter((m) => !primary.includes(m)) };
}

// Simple front and back body; each muscle is a shape that lights up red (primary) or blue (secondary).
function MuscleMap({ primary = [], secondary = [] }) {
  const fillOf = (id) => (primary.includes(id) ? "#E3262E" : secondary.includes(id) ? "#4A8DF6" : "rgba(128,128,128,0.28)");
  const active = (id) => primary.includes(id) || secondary.includes(id);
  const sil = { fill: "rgba(128,128,128,0.14)", stroke: "rgba(128,128,128,0.35)", strokeWidth: 0.8 };
  const m = (id, node) => <g key={id + node.key} fill={fillOf(id)} opacity={active(id) ? 1 : 0.9}>{node}</g>;
  const E = (cx, cy, rx, ry, rot = 0) => <ellipse key={cx + "-" + cy} cx={cx} cy={cy} rx={rx} ry={ry} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined} />;
  const body = (
    <>
      <ellipse cx="50" cy="14" rx="9" ry="11" {...sil} />
      <rect x="45" y="24" width="10" height="9" rx="3" {...sil} />
      <path d="M27 36 Q50 29 73 36 L69 70 Q67 96 62 110 L38 110 Q33 96 31 70 Z" {...sil} />
      <ellipse cx="23" cy="58" rx="6.5" ry="21" transform="rotate(7 23 58)" {...sil} />
      <ellipse cx="77" cy="58" rx="6.5" ry="21" transform="rotate(-7 77 58)" {...sil} />
      <ellipse cx="18" cy="92" rx="5" ry="17" transform="rotate(5 18 92)" {...sil} />
      <ellipse cx="82" cy="92" rx="5" ry="17" transform="rotate(-5 82 92)" {...sil} />
      <ellipse cx="40" cy="138" rx="11.5" ry="29" {...sil} />
      <ellipse cx="60" cy="138" rx="11.5" ry="29" {...sil} />
      <ellipse cx="40" cy="185" rx="7.5" ry="24" {...sil} />
      <ellipse cx="60" cy="185" rx="7.5" ry="24" {...sil} />
    </>
  );
  return (
    <svg viewBox="0 0 210 212" style={{ width: "100%", display: "block" }} role="img" aria-hidden="true">
      <g>
        {body}
        {m("shoulders", <g key="a">{E(27, 43, 7, 8.5)}{E(73, 43, 7, 8.5)}</g>)}
        {m("chest", <g key="b"><path d="M49 40 Q38 38 31 47 Q33 59 49 61 Z" /><path d="M51 40 Q62 38 69 47 Q67 59 51 61 Z" /></g>)}
        {m("biceps", <g key="c">{E(22, 60, 5, 13, 7)}{E(78, 60, 5, 13, -7)}</g>)}
        {m("forearms", <g key="d">{E(18, 92, 4.2, 15, 5)}{E(82, 92, 4.2, 15, -5)}</g>)}
        {m("abs", <g key="e"><rect x="44" y="64" width="12" height="10" rx="3" /><rect x="44" y="76" width="12" height="10" rx="3" /><rect x="44" y="88" width="12" height="11" rx="3" /></g>)}
        {m("obliques", <g key="f">{E(38, 82, 4.2, 15, -6)}{E(62, 82, 4.2, 15, 6)}</g>)}
        {m("adductors", <g key="g">{E(50, 128, 3.6, 17)}</g>)}
        {m("quads", <g key="h">{E(39.5, 135, 9, 25)}{E(60.5, 135, 9, 25)}</g>)}
        {m("calves", <g key="i">{E(40, 182, 5.5, 19)}{E(60, 182, 5.5, 19)}</g>)}
      </g>
      <g transform="translate(110 0)">
        {body}
        {m("traps", <g key="j"><path d="M50 28 L38 35 Q40 45 50 55 Q60 45 62 35 Z" /></g>)}
        {m("shoulders", <g key="k">{E(27, 43, 7, 8.5)}{E(73, 43, 7, 8.5)}</g>)}
        {m("lats", <g key="l"><path d="M37 47 Q31 63 40 84 L49 82 L49 56 Z" /><path d="M63 47 Q69 63 60 84 L51 82 L51 56 Z" /></g>)}
        {m("triceps", <g key="m">{E(22, 60, 5.2, 13, 7)}{E(78, 60, 5.2, 13, -7)}</g>)}
        {m("forearms", <g key="n">{E(18, 92, 4.2, 15, 5)}{E(82, 92, 4.2, 15, -5)}</g>)}
        {m("lower_back", <g key="o"><rect x="42" y="86" width="16" height="15" rx="4" /></g>)}
        {m("glutes", <g key="p">{E(42, 110, 9.5, 9)}{E(58, 110, 9.5, 9)}</g>)}
        {m("hamstrings", <g key="q">{E(39.5, 140, 9, 22)}{E(60.5, 140, 9, 22)}</g>)}
        {m("calves", <g key="r">{E(40, 182, 6.3, 19)}{E(60, 182, 6.3, 19)}</g>)}
      </g>
    </svg>
  );
}

function ExerciseLibrary({ t, lang, mode, onAdd, onFinishPicking, personalBests = {}, workoutHistory = [], onQuickLog, favs = [], onToggleFav, rivals = [], meLabel = "", onShareEx }) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("all");
  const [selected, setSelected] = useState(null);
  const [wInput, setWInput] = useState("");
  const [rInput, setRInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [media, setMedia] = useState(null); // pictures + steps for the "how to do it" card
  useEffect(() => {
    let alive = true;
    loadExerciseMedia().then((m) => {
      if (alive) setMedia(m);
    });
    return () => {
      alive = false;
    };
  }, []);

  const muscles = [
    { key: "all", label: t.muscleAll },
    { key: "fav", label: "★ " + t.libFavs },
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
  const results = EXERCISE_LIBRARY.filter((ex) => (muscle === "all" || (muscle === "fav" ? favs.includes(ex.key) : ex.muscle === muscle)) && matchesQuery(ex));

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
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span onClick={() => onToggleFav(selected.key)} aria-label={t.libFavs} style={{ cursor: "pointer", fontSize: 22, lineHeight: 1, color: favs.includes(selected.key) ? COLORS.gold : COLORS.dim }}>
                {favs.includes(selected.key) ? "★" : "☆"}
              </span>
              <div onClick={() => setSelected(null)} style={{ cursor: "pointer" }}>
                <X size={18} color={COLORS.dim} />
              </div>
            </div>
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.dim, margin: "12px 0" }}>{cueOf(selected)}</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {best ? <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.gold }}>🏆 {t.exerciseBest}: {best} kg</div> : null}
            {maxReps ? <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.teal }}>{t.exerciseMaxReps}: {maxReps}</div> : null}
          </div>
        </Card>

        {(() => {
          const mus = exerciseMuscles(selected);
          const names = (ids) => ids.map((id) => MUSCLE_NAMES[id][lang === "de" ? "de" : "en"]).join(", ");
          const board = [{ name: meLabel || t.duelYou, kg: personalBests[selected.key] || 0, me: true }, ...rivals.map((r) => ({ name: r.name, kg: (r.bests && r.bests[selected.key]) || 0 }))].filter((r) => r.kg > 0).sort((a, b) => b.kg - a.kg);
          const small = { fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim };
          return (
            <>
              {(() => {
                const scene = sceneFor(selected.key);
                return scene ? (
                  <Card style={{ marginBottom: 14 }}>
                    <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>{t.libAnim}</div>
                    <ExerciseAnimation key={selected.key} scene={scene} primary={mus.primary} lang={lang} labelPause={t.libPause} labelPlay={t.libPlay} slow={t.libSlow} />
                    <div style={{ ...small, fontSize: 11.5, marginTop: 6 }}>{t.libAnimHint}</div>
                  </Card>
                ) : null;
              })()}
              {media && media.items && media.items[selected.key] && <ExerciseDemo t={t} lang={lang} media={media} item={media.items[selected.key]} />}
              {(mus.primary.length > 0 || mus.secondary.length > 0) && (
                <Card style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>{t.libTargetMuscles}</div>
                  <MuscleMap primary={mus.primary} secondary={mus.secondary} />
                  <div style={{ display: "flex", justifyContent: "space-around", ...small, fontSize: 11.5, margin: "2px 0 12px" }}>
                    <span>{t.libFront}</span>
                    <span>{t.libBack}</span>
                  </div>
                  {mus.primary.length > 0 && (
                    <div style={{ ...small, color: COLORS.text, marginBottom: 6 }}>
                      <span style={{ color: "#E3262E" }}>●</span> <b style={{ fontWeight: 600 }}>{t.libPrimary}:</b> <span style={{ color: COLORS.dim }}>{names(mus.primary)}</span>
                    </div>
                  )}
                  {mus.secondary.length > 0 && (
                    <div style={{ ...small, color: COLORS.text }}>
                      <span style={{ color: "#4A8DF6" }}>●</span> <b style={{ fontWeight: 600 }}>{t.libSecondary}:</b> <span style={{ color: COLORS.dim }}>{names(mus.secondary)}</span>
                    </div>
                  )}
                </Card>
              )}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button onClick={() => window.open("https://www.youtube.com/results?search_query=" + encodeURIComponent(nameOf(selected) + (lang === "de" ? " Technik" : " form")), "_blank", "noopener")} style={{ flex: 1, background: COLORS.raised, color: COLORS.text, border: "1px solid " + COLORS.border, borderRadius: 12, padding: "11px 10px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  ▶ {t.libYoutube}
                </button>
                <button onClick={() => onShareEx(selected.key, nameOf(selected))} style={{ flex: 1, background: COLORS.raised, color: COLORS.gold, border: "1px solid " + COLORS.border, borderRadius: 12, padding: "11px 10px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  {t.shareButton}
                </button>
              </div>
              {board.some((r) => !r.me) && (
                <Card style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>🏆 {t.libBoard}</div>
                  {board.map((r, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderTop: i ? "1px solid " + COLORS.border : "none" }}>
                      <span style={{ width: 22, fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: i === 0 ? COLORS.gold : COLORS.dim }}>{i === 0 ? "👑" : i + 1}</span>
                      <span style={{ flex: 1, fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.text, fontWeight: r.me ? 700 : 400 }}>{r.name}</span>
                      <span style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: r.me ? COLORS.gold : COLORS.text }}>{r.kg} kg</span>
                    </div>
                  ))}
                </Card>
              )}
            </>
          );
        })()}

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
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                <span onClick={(e) => { e.stopPropagation(); onToggleFav(ex.key); }} aria-label={t.libFavs} style={{ cursor: "pointer", fontSize: 18, lineHeight: 1, color: favs.includes(ex.key) ? COLORS.gold : COLORS.dim }}>
                  {favs.includes(ex.key) ? "★" : "☆"}
                </span>
                <ChevronLeft size={16} color={COLORS.dim} style={{ transform: "rotate(180deg)" }} />
              </div>
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

      {days.length > 0 && days.every((d) => d.exercises.length === 0) && (
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
  const markBackup = () => localStorage.setItem("asfit.lastBackup", String(Date.now()));
  // iPhone: the share sheet offers "Save to Files" / iCloud Drive — the practical cloud copy.
  const shareFile = async () => {
    try {
      const file = new File([collect()], "asfit-backup-" + new Date().toLocaleDateString("sv") + ".json", { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "ASFIT Backup" });
        markBackup();
        flash(t.backupDone);
      } else {
        exportFile();
      }
    } catch (err) {
      if (err && err.name !== "AbortError") exportFile();
    }
  };
  const exportFile = () => {
    markBackup();
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
      markBackup();
      flash(t.backupCopied);
    } catch {
      flash(t.backupCopyFailed);
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
      <button onClick={shareFile} style={{ ...btn, width: "100%", flex: "none", marginBottom: 8, background: COLORS.gold, color: COLORS.bg, border: "none" }}>{t.backupShare}</button>
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

function SettingsGroup({ title, children }) {
  const kids = Children.toArray(children);
  return (
    <div style={{ marginBottom: 22 }}>
      {title && <div style={{ fontFamily: "Sora, sans-serif", fontSize: 11.5, fontWeight: 600, color: COLORS.dim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 6px 8px" }}>{title}</div>}
      <Card style={{ padding: 0, overflow: "hidden" }}>{kids.map((k, i) => cloneElement(k, { first: i === 0 }))}</Card>
    </div>
  );
}

// ---------- Sharing: plans, meals, days, recipes, pantry folders and the week duel ----------
// No account and no server: whatever is shared becomes a link / code that the other person imports in
// the app. Everything that comes in is treated as untrusted and cleaned in sanitizeShare().
const SHARE_BASE = "https://asmarfit-project.onrender.com/";

async function encodeShare(obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  let bytes = raw;
  let prefix = "j";
  if (typeof CompressionStream !== "undefined") {
    try {
      const cs = new CompressionStream("deflate-raw");
      const w = cs.writable.getWriter();
      w.write(raw);
      w.close();
      const out = new Uint8Array(await new Response(cs.readable).arrayBuffer());
      if (out.length < raw.length) {
        bytes = out;
        prefix = "z";
      }
    } catch {
      /* uncompressed is fine */
    }
  }
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return prefix + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function decodeShare(code) {
  const c = String(code || "").trim();
  const prefix = c[0];
  const body = c.slice(1);
  if ((prefix !== "j" && prefix !== "z") || !/^[A-Za-z0-9_-]{8,60000}$/.test(body)) throw new Error("bad");
  const bin = atob(body.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (body.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  let raw = bytes;
  if (prefix === "z") {
    if (typeof DecompressionStream === "undefined") throw new Error("bad");
    const ds = new DecompressionStream("deflate-raw");
    const w = ds.writable.getWriter();
    w.write(bytes).catch(() => {});
    w.close().catch(() => {});
    const reader = ds.readable.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 300000) throw new Error("too_big"); // guards against zip-bomb style codes
      chunks.push(value);
    }
    raw = new Uint8Array(size);
    let off = 0;
    for (const ch of chunks) {
      raw.set(ch, off);
      off += ch.length;
    }
  }
  const obj = JSON.parse(new TextDecoder().decode(raw));
  if (!obj || obj.v !== 1 || typeof obj.t !== "string") throw new Error("bad");
  return obj;
}

// finds the code in a pasted link or message (…#s=CODE, or a bare code)
function extractShareCode(text) {
  const s = String(text || "");
  const m = s.match(/#s=([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  const bare = s.trim().match(/^([jz][A-Za-z0-9_-]{12,})$/);
  if (bare) return bare[1];
  const last = s.trim().split(/\s+/).pop() || "";
  return /^[jz][A-Za-z0-9_-]{20,}$/.test(last) ? last : null;
}

const shStr = (v, n) => String(v == null ? "" : v).slice(0, n);
const shNum = (v, max) => Math.max(0, Math.min(max, Number(v) || 0));
const shFoodIn = (x) => ({ name: shStr(x && x.n, 80) || "?", kcal: Math.round(shNum(x && x.k, 20000)), protein: Math.round(shNum(x && x.p, 2000) * 10) / 10, carbs: Math.round(shNum(x && x.c, 5000) * 10) / 10, fat: Math.round(shNum(x && x.f, 2000) * 10) / 10, ...(x && x.g > 0 ? { grams: shNum(x.g, 5000), unit: x.u === "ml" ? "ml" : "g" } : {}) });
const shFoodOut = (f) => ({ n: shStr(f.name, 80), k: Math.round(f.kcal || 0), p: f.protein || 0, c: f.carbs || 0, f: f.fat || 0, g: f.grams || 0, u: f.unit === "ml" ? "ml" : "g" });

// Cleans anything that arrives from outside into the shapes the app uses; null = not usable.
function sanitizeShare(o) {
  if (!o || o.v !== 1) return null;
  const from = shStr(o.n, 30);
  const foods = (arr) => (Array.isArray(arr) ? arr : []).slice(0, 60).map(shFoodIn);
  switch (o.t) {
    case "plan": {
      const days = (Array.isArray(o.d) ? o.d : [])
        .slice(0, 14)
        .map((d, i) => ({ id: "d" + i + Date.now().toString(36), name: shStr(d && d.n, 30) || "Day " + (i + 1), exercises: (Array.isArray(d && d.e) ? d.e : []).slice(0, 30).map((k) => EXERCISE_LIBRARY.find((e) => e.key === k)).filter(Boolean) }))
        .filter((d) => d.exercises.length);
      return days.length ? { t: "plan", from, name: shStr(o.p, 40) || "Plan", days } : null;
    }
    case "meal": {
      const items = foods(o.f);
      return items.length ? { t: "meal", from, title: shStr(o.title, 40), slot: ["breakfast", "lunch", "dinner", "snacks"].includes(o.slot) ? o.slot : null, items } : null;
    }
    case "day": {
      const slots = {};
      let n = 0;
      for (const k of ["breakfast", "lunch", "dinner", "snacks"]) {
        slots[k] = foods(o.m && o.m[k]);
        n += slots[k].length;
      }
      return n ? { t: "day", from, slots } : null;
    }
    case "recipe": {
      const r = o.r || {};
      const ingredients = (Array.isArray(r.i) ? r.i : []).slice(0, 40).map((x) => shStr(x, 120)).filter(Boolean);
      if (!r.name || !ingredients.length) return null;
      return { t: "recipe", from, r: { name: shStr(r.name, 80), category: ["breakfast", "lunch", "dinner", "snacks"].includes(r.category) ? r.category : "lunch", kcal: Math.round(shNum(r.kcal, 20000)), protein: Math.round(shNum(r.protein, 2000)), carbs: Math.round(shNum(r.carbs, 5000)), fat: Math.round(shNum(r.fat, 2000)), ingredients } };
    }
    case "pantry": {
      const f = o.f || {};
      const items = (Array.isArray(f.items) ? f.items : []).slice(0, 60).map((i) => ({ name: shStr(i && i.n, 80), per100: { kcal: shNum(i && i.p && i.p.kcal, 2000), protein: shNum(i && i.p && i.p.protein, 200), carbs: shNum(i && i.p && i.p.carbs, 200), fat: shNum(i && i.p && i.p.fat, 200) }, unit: i && i.u === "ml" ? "ml" : "g", grams: Math.max(1, shNum(i && i.g, 5000)) })).filter((i) => i.name);
      return items.length ? { t: "pantry", from, folder: { name: shStr(f.name, 40) || "Pantry", emoji: PANTRY_EMOJIS.includes(f.emoji) ? f.emoji : "🥫", items } } : null;
    }
    case "ex": {
      const e = EXERCISE_LIBRARY.find((x) => x.key === o.k);
      return e ? { t: "ex", from, key: e.key } : null;
    }
    case "duel": {
      const s = o.s || {};
      const bests = {};
      Object.entries(o.b && typeof o.b === "object" ? o.b : {}).slice(0, 80).forEach(([k, v]) => {
        if (/^[A-Za-z0-9_]{1,40}$/.test(k) && Number(v) > 0) bests[k] = Math.min(2000, Number(v));
      });
      return { t: "duel", from, id: shStr(o.id, 24) || shStr(o.n, 30), ts: Number(o.ts) || Date.now(), stats: { tr: Math.round(shNum(s.tr, 100)), vol: Math.round(shNum(s.vol, 1000000)), min: Math.round(shNum(s.min, 20000)), str: Math.round(shNum(s.str, 5000)), days: Math.round(shNum(s.days, 7)), steps: Math.round(shNum(s.steps, 200000)) }, bests };
    }
    default:
      return null;
  }
}

const sumKcal = (items) => items.reduce((s, i) => s + (i.kcal || 0), 0);

// Asks what to do with something somebody shared.
function ShareImportModal({ t, lang, item, onImport, onClose }) {
  const [slot, setSlot] = useState(item.slot || mealKeyForNow());
  const needsSlot = item.t === "meal" || item.t === "day";
  const slots = [
    { key: "breakfast", label: t.breakfast },
    { key: "lunch", label: t.lunch },
    { key: "dinner", label: t.dinner },
    { key: "snacks", label: t.snacks },
  ];
  const typeLabel = { plan: t.shareTypePlan, meal: t.shareTypeMeal, day: t.shareTypeDay, recipe: t.shareTypeRecipe, pantry: t.shareTypePantry, duel: t.shareTypeDuel, ex: t.shareTypeEx }[item.t];
  let lines = [];
  if (item.t === "plan") lines = [item.name, ...item.days.map((d) => d.name + " · " + d.exercises.length + " " + t.exercises)];
  else if (item.t === "meal") lines = [item.title || t.shareTypeMeal, item.items.length + " " + t.pantryItemMany + " · " + sumKcal(item.items) + " kcal"];
  else if (item.t === "day") {
    const all = Object.values(item.slots).flat();
    lines = [all.length + " " + t.pantryItemMany + " · " + sumKcal(all) + " kcal"];
  } else if (item.t === "recipe") lines = [item.r.name, item.r.kcal + " kcal " + t.perServing];
  else if (item.t === "pantry") lines = [item.folder.emoji + " " + item.folder.name, item.folder.items.length + " " + t.pantryItemMany];
  else if (item.t === "duel") lines = [item.from || "?", item.stats.tr + "× " + t.duelTrainings + " · " + item.stats.vol + " kg"];
  else if (item.t === "ex") {
    const e = EXERCISE_LIBRARY.find((x) => x.key === item.key);
    lines = e ? [lang === "de" ? e.nameDe : e.name, lang === "de" ? e.cueDe : e.cue] : [];
  }
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(22,26,29,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.bg, borderRadius: 24, padding: "24px 22px", width: "100%", maxWidth: 340 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim }}>{t.shareFrom.replace("{n}", item.from || "?")}</div>
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 19, fontWeight: 800, color: COLORS.text, margin: "4px 0 10px" }}>{typeLabel}</div>
        {lines.map((l, i) => (
          <div key={i} style={{ fontFamily: i === 0 ? "Sora, sans-serif" : "Inter, sans-serif", fontSize: i === 0 ? 14 : 13, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? COLORS.text : COLORS.dim, marginBottom: 3 }}>{l}</div>
        ))}
        {item.t === "plan" && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.coral, marginTop: 8 }}>{t.sharePlanReplace}</div>}
        {needsSlot && (
          <>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, margin: "14px 0 8px" }}>{t.myMealsPick}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {slots.map((sl) => (
                <Chip key={sl.key} label={sl.label} active={slot === sl.key} onClick={() => setSlot(sl.key)} />
              ))}
            </div>
          </>
        )}
        <button onClick={() => onImport(item, slot)} style={{ width: "100%", marginTop: 18, background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}>
          {item.t === "ex" ? t.libAddFav : t.shareImport}
        </button>
        <button onClick={onClose} style={{ width: "100%", marginTop: 8, background: "transparent", color: COLORS.dim, border: "none", padding: "10px 18px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
          {t.shareDiscard}
        </button>
      </div>
    </div>
  );
}

const DUEL_CATS = [
  { k: "tr", label: "duelTrainings", unit: "" },
  { k: "vol", label: "duelVolume", unit: "kg" },
  { k: "min", label: "duelMinutes", unit: "min" },
  { k: "days", label: "duelTracked", unit: "/7" },
  { k: "str", label: "duelStreak", unit: "" },
  { k: "steps", label: "duelSteps", unit: "" },
];

function duelScore(mine, theirs) {
  let me = 0;
  let them = 0;
  DUEL_CATS.forEach((c) => {
    const a = mine[c.k] || 0;
    const b = theirs[c.k] || 0;
    if (a > b) me += 1;
    else if (b > a) them += 1;
    else {
      me += 0.5;
      them += 0.5;
    }
  });
  return { me, them };
}

function FriendsScreen({ t, lang, myName, setMyName, myStats, rivals, onShareMine, onImportText, onRemove }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState(null);
  const ageText = (ts) => {
    const d = Math.floor((Date.now() - ts) / 86400000);
    return d <= 0 ? t.diaryToday : d === 1 ? t.diaryYesterday : lang === "de" ? "vor " + d + " Tagen" : d + " days ago";
  };
  const doImport = async () => {
    const res = await onImportText(text);
    if (res && res.ok) {
      setText("");
      setMsg(null);
    } else setMsg(t.friendsBadCode);
  };
  const small = { fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim };
  return (
    <div style={{ padding: "0 20px 28px" }}>
      <div style={{ ...small, lineHeight: 1.5, marginBottom: 14 }}>{t.friendsIntro}</div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ ...small, marginBottom: 6 }}>{t.friendsName}</div>
        <input value={myName} onChange={(e) => setMyName(e.target.value.slice(0, 30))} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", marginBottom: 12 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
          {[
            [myStats.tr, t.duelTrainings],
            [myStats.vol, "kg"],
            [myStats.days + "/7", t.duelTracked],
          ].map(([v, l], i) => (
            <div key={i} style={{ background: COLORS.raised, borderRadius: 12, padding: "9px 4px", textAlign: "center" }}>
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text }}>{v}</div>
              <div style={{ ...small, fontSize: 10.5, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
        <button onClick={onShareMine} style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 12, padding: "12px 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          {t.friendsShareMine}
        </button>
      </Card>

      <Card style={{ marginBottom: 18 }}>
        <textarea value={text} onChange={(e) => { setText(e.target.value); setMsg(null); }} placeholder={t.friendsPaste} rows={2} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", resize: "vertical", marginBottom: 10, fontFamily: "Inter, sans-serif" }} />
        <button onClick={doImport} disabled={!text.trim()} style={{ width: "100%", background: text.trim() ? COLORS.raised : COLORS.surface, color: text.trim() ? COLORS.gold : COLORS.dim, border: "1px solid " + COLORS.border, borderRadius: 12, padding: "11px 14px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
          {t.friendsImport}
        </button>
        {msg && <div style={{ ...small, color: COLORS.coral, marginTop: 8 }}>{msg}</div>}
      </Card>

      {rivals.length === 0 ? (
        <div style={{ ...small, textAlign: "center", lineHeight: 1.5, padding: "0 12px" }}>{t.friendsNone}</div>
      ) : (
        rivals.map((r) => {
          const sc = duelScore(myStats, r.stats);
          const leading = sc.me > sc.them ? t.duelYouLead : sc.them > sc.me ? t.duelTheyLead.replace("{n}", r.name) : t.duelTie;
          return (
            <Card key={r.id} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text }}>
                  {t.duelYou} vs {r.name}
                </div>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 18, fontWeight: 800, color: sc.me >= sc.them ? COLORS.gold : COLORS.coral }}>
                  {sc.me} : {sc.them}
                </div>
              </div>
              <div style={{ ...small, marginBottom: 12 }}>
                {sc.me > sc.them ? "👑 " : ""}
                {leading} · {t.friendsAsOf.replace("{d}", ageText(r.ts))}
              </div>
              {DUEL_CATS.map((c) => {
                const a = myStats[c.k] || 0;
                const b = r.stats[c.k] || 0;
                const max = Math.max(a, b, 1);
                const unit = c.unit ? " " + c.unit : "";
                return (
                  <div key={c.k} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", ...small, fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: a > b ? COLORS.gold : COLORS.dim, fontWeight: a > b ? 700 : 400 }}>
                        {a}
                        {unit}
                      </span>
                      <span>{t[c.label]}</span>
                      <span style={{ color: b > a ? COLORS.coral : COLORS.dim, fontWeight: b > a ? 700 : 400 }}>
                        {b}
                        {unit}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 4, height: 7 }}>
                      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", background: COLORS.raised, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: (a / max) * 100 + "%", background: COLORS.gold }} />
                      </div>
                      <div style={{ flex: 1, display: "flex", background: COLORS.raised, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: (b / max) * 100 + "%", background: COLORS.coral }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <span onClick={onShareMine} style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.gold, cursor: "pointer" }}>{t.friendsRematch}</span>
                <span onClick={() => onRemove(r.id)} style={{ ...small, cursor: "pointer" }}>{t.friendsRemove}</span>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ---------- Intake log ("Einnahme-Tagebuch"): what was taken / injected when, with site rotation ----------
// A plain diary of the user's own entries: no recommendations and no dosing advice.
const INTAKE_ROUTES = [
  { k: "inject", de: "Spritze", en: "Injection" },
  { k: "oral", de: "Tabletten / Kapseln", en: "Tablets / capsules" },
  { k: "gel", de: "Gel / Creme", en: "Gel / cream" },
  { k: "other", de: "Sonstiges", en: "Other" },
];
const INTAKE_UNITS = ["mg", "ml", "IE", "mcg", "Stk"];
// ordered so the suggested next site alternates left / right and moves around the body
const INTAKE_SITES = [
  { k: "gl", de: "Gesäß links", en: "Glute left" },
  { k: "gr", de: "Gesäß rechts", en: "Glute right" },
  { k: "ol", de: "Oberschenkel links", en: "Thigh left" },
  { k: "or", de: "Oberschenkel rechts", en: "Thigh right" },
  { k: "sl", de: "Schulter links", en: "Shoulder left" },
  { k: "sr", de: "Schulter rechts", en: "Shoulder right" },
  { k: "bl", de: "Bauch links", en: "Belly left" },
  { k: "br", de: "Bauch rechts", en: "Belly right" },
];
const INTAKE_WEEKDAYS = { de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
const dayStartMs = (ms) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const addDaysMs = (ms, n) => {
  const d = new Date(ms);
  d.setDate(d.getDate() + n);
  return dayStartMs(d.getTime());
};
const toLocalInput = (ms) => {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
};

// When the next intake of a substance is due: { diff } in days from today (negative = overdue), or null for "as needed".
function intakeNext(sub, log) {
  const s = sub.sched || { type: "needed" };
  if (s.type === "needed") return null;
  const mine = log.filter((e) => e.subId === sub.id);
  const last = mine.length ? Math.max(...mine.map((e) => e.ts)) : null;
  const today = dayStartMs(Date.now());
  let due;
  if (s.type === "interval") {
    due = last == null ? today : addDaysMs(last, Math.max(1, s.days || 1));
  } else {
    const wd = s.weekdays && s.weekdays.length ? s.weekdays : [1];
    due = last == null ? today : addDaysMs(last, 1);
    for (let i = 0; i < 8 && !wd.includes(new Date(due).getDay()); i++) due = addDaysMs(due, 1);
  }
  return { diff: Math.round((due - today) / 86400000) };
}

// the injection site that follows the one used last (cycles through INTAKE_SITES)
function nextSite(sub, log) {
  const withSite = log.filter((e) => e.subId === sub.id && e.site).sort((a, b) => b.ts - a.ts);
  if (!withSite.length) return INTAKE_SITES[0].k;
  const i = INTAKE_SITES.findIndex((x) => x.k === withSite[0].site);
  return INTAKE_SITES[(i + 1) % INTAKE_SITES.length].k;
}

function IntakeScreen({ t, lang, data, setData }) {
  const subs = data.subs || [];
  const log = data.log || [];
  const [logging, setLogging] = useState(null); // substance id while the "taken now" form is open
  const [lf, setLf] = useState({ dose: "", site: null, when: "", note: "" });
  const [editing, setEditing] = useState(null); // "new" | substance id
  const emptySub = { name: "", route: "inject", dose: "", unit: "mg", schedType: "interval", days: 7, weekdays: [1] };
  const [sf, setSf] = useState(emptySub);
  const [edit, setEdit] = useState(false);
  const [sure, setSure] = useState(null);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const locale = lang === "de" ? "de-DE" : "en-US";
  const flash = (m) => {
    setToast(m);
    setTimeout(() => setToast(null), 1500);
  };
  const lbl = (arr, k) => {
    const x = arr.find((a) => a.k === k);
    return x ? x[lang === "de" ? "de" : "en"] : "";
  };
  const wdNames = INTAKE_WEEKDAYS[lang] || INTAKE_WEEKDAYS.en;
  const small = { fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim };
  const num = (v) => parseFloat(String(v).replace(",", "."));

  const schedText = (s) => {
    const sc = s.sched || { type: "needed" };
    if (sc.type === "interval") return t.intakeEveryN.replace("{n}", sc.days);
    if (sc.type === "weekdays") return (sc.weekdays || []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => wdNames[d]).join(", ");
    return t.intakeNeeded;
  };
  const statusOf = (s) => {
    const n = intakeNext(s, log);
    if (!n) return { text: t.intakeNeeded, tone: "dim" };
    if (n.diff < 0) return { text: t.intakeOverdue.replace("{n}", -n.diff), tone: "coral" };
    if (n.diff === 0) return { text: t.intakeDueToday, tone: "gold" };
    if (n.diff === 1) return { text: t.intakeTomorrow, tone: "dim" };
    return { text: t.intakeInDays.replace("{n}", n.diff), tone: "dim" };
  };
  const fmtWhen = (ms) => new Date(ms).toLocaleString(locale, { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const lastOf = (s) => {
    const mine = log.filter((e) => e.subId === s.id).sort((a, b) => b.ts - a.ts);
    return mine[0] || null;
  };

  const openLog = (s) => {
    setLogging(s.id);
    setLf({ dose: String(s.dose || ""), site: s.route === "inject" ? nextSite(s, log) : null, when: toLocalInput(Date.now()), note: "" });
  };
  const saveLog = (s) => {
    const dose = num(lf.dose);
    if (!(dose > 0)) return;
    const ts = lf.when ? new Date(lf.when).getTime() : Date.now();
    const entry = { id: newPantryId(), subId: s.id, ts: isFinite(ts) ? ts : Date.now(), dose, unit: s.unit, site: s.route === "inject" ? lf.site : null, note: lf.note.trim().slice(0, 200) };
    setData((d) => ({ ...d, log: [...(d.log || []), entry], subs: d.subs.map((x) => (x.id === s.id ? { ...x, dose } : x)) }));
    setLogging(null);
    flash(t.intakeLogged);
  };

  const startNew = () => {
    setSf(emptySub);
    setEditing("new");
  };
  const startEdit = (s) => {
    const sc = s.sched || { type: "needed" };
    setSf({ name: s.name, route: s.route, dose: String(s.dose || ""), unit: s.unit, schedType: sc.type, days: sc.days || 7, weekdays: sc.weekdays || [1] });
    setEditing(s.id);
  };
  const saveSub = () => {
    const name = sf.name.trim();
    const dose = num(sf.dose);
    if (!name || !(dose > 0)) return;
    const sched = sf.schedType === "interval" ? { type: "interval", days: Math.max(1, Math.min(60, Math.round(Number(sf.days) || 1))) } : sf.schedType === "weekdays" ? { type: "weekdays", weekdays: sf.weekdays.length ? sf.weekdays : [1] } : { type: "needed" };
    const base = { name: name.slice(0, 40), route: sf.route, dose, unit: sf.unit, sched };
    setData((d) => ({ ...d, subs: editing === "new" ? [...d.subs, { id: newPantryId(), ...base }] : d.subs.map((x) => (x.id === editing ? { ...x, ...base } : x)) }));
    setEditing(null);
  };
  const deleteSub = (id) => setData((d) => ({ ...d, subs: d.subs.filter((x) => x.id !== id), log: d.log.filter((e) => e.subId !== id) }));
  const deleteEntry = (id) => setData((d) => ({ ...d, log: d.log.filter((e) => e.id !== id) }));

  const entries = log.filter((e) => filter === "all" || e.subId === filter).sort((a, b) => b.ts - a.ts).slice(0, 60);
  const subName = (id) => (subs.find((s) => s.id === id) || {}).name || "?";
  const toneStyle = (tone) => (tone === "coral" ? { background: COLORS.coralSoft, color: COLORS.coral } : tone === "gold" ? { background: COLORS.goldSoft, color: COLORS.gold } : { background: COLORS.raised, color: COLORS.dim });

  return (
    <div style={{ padding: "0 20px 28px", position: "relative" }}>
      <div style={{ ...small, fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>{t.intakeDisclaimer}</div>

      {subs.length === 0 && editing === null && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ ...small, lineHeight: 1.5, marginBottom: 12 }}>{t.intakeIntro}</div>
          <button onClick={startNew} style={{ width: "100%", background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 12, padding: "12px 16px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            + {t.intakeNew}
          </button>
        </Card>
      )}

      {subs.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <span onClick={() => { setEdit((e) => !e); setSure(null); }} style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.gold, cursor: "pointer" }}>
            {edit ? t.pantryDone : t.pantryEdit}
          </span>
        </div>
      )}

      {subs.map((s) => {
        const st = statusOf(s);
        const last = lastOf(s);
        return (
          <Card key={s.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text }}>{s.name}</div>
                <div style={{ ...small, marginTop: 3 }}>
                  {lbl(INTAKE_ROUTES, s.route)} · {s.dose} {s.unit} · {schedText(s)}
                </div>
              </div>
              <span style={{ ...toneStyle(st.tone), fontFamily: "Sora, sans-serif", fontSize: 11.5, fontWeight: 700, borderRadius: 10, padding: "5px 9px", whiteSpace: "nowrap", flexShrink: 0 }}>{st.text}</span>
            </div>
            <div style={{ ...small, fontSize: 12, marginTop: 8 }}>
              {t.intakeLast}: {last ? fmtWhen(last.ts) + " · " + last.dose + " " + last.unit + (last.site ? " · " + lbl(INTAKE_SITES, last.site) : "") : t.intakeNever}
            </div>

            {logging === s.id ? (
              <div style={{ marginTop: 12, padding: 12, background: COLORS.raised, borderRadius: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                  <input type="number" inputMode="decimal" value={lf.dose} onChange={(e) => setLf({ ...lf, dose: e.target.value })} placeholder={t.intakeDose} style={{ ...numInputStyle, width: 110 }} />
                  <span style={small}>{s.unit}</span>
                </div>
                <input type="datetime-local" value={lf.when} onChange={(e) => setLf({ ...lf, when: e.target.value })} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", marginBottom: 10 }} />
                {s.route === "inject" && (
                  <>
                    <div style={{ ...small, marginBottom: 6 }}>{t.intakeSite}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      {INTAKE_SITES.map((x) => (
                        <Chip key={x.k} label={(x.k === nextSite(s, log) ? "★ " : "") + x[lang === "de" ? "de" : "en"]} active={lf.site === x.k} onClick={() => setLf({ ...lf, site: lf.site === x.k ? null : x.k })} />
                      ))}
                    </div>
                    <div style={{ ...small, fontSize: 11.5, marginBottom: 10 }}>★ {t.intakeSuggest}</div>
                  </>
                )}
                <input value={lf.note} onChange={(e) => setLf({ ...lf, note: e.target.value })} placeholder={t.intakeNote} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", marginBottom: 10 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => saveLog(s)} disabled={!(num(lf.dose) > 0)} style={{ flex: 1, background: num(lf.dose) > 0 ? COLORS.gold : COLORS.surface, color: num(lf.dose) > 0 ? COLORS.bg : COLORS.dim, border: "none", borderRadius: 12, padding: "12px 14px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
                    {t.intakeSave}
                  </button>
                  <button onClick={() => setLogging(null)} style={{ background: "transparent", color: COLORS.dim, border: "1px solid " + COLORS.border, borderRadius: 12, padding: "12px 16px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
                    {t.intakeCancel}
                  </button>
                </div>
              </div>
            ) : (
              !edit && (
                <button onClick={() => openLog(s)} style={{ width: "100%", marginTop: 12, background: COLORS.goldSoft, color: COLORS.gold, border: "1px solid " + COLORS.gold, borderRadius: 12, padding: "12px 14px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  ✓ {t.intakeTakeNow}
                </button>
              )
            )}

            {edit && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 18, marginTop: 12 }}>
                <span onClick={() => startEdit(s)} style={{ display: "flex", alignItems: "center", gap: 4, ...small, cursor: "pointer" }}>
                  <Pencil size={13} /> {t.intakeChange}
                </span>
                <span
                  onClick={() => {
                    if (sure === s.id) {
                      deleteSub(s.id);
                      setSure(null);
                    } else {
                      setSure(s.id);
                      setTimeout(() => setSure((x) => (x === s.id ? null : x)), 3000);
                    }
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: sure === s.id ? 700 : 400, color: COLORS.coral, cursor: "pointer" }}
                >
                  <Trash2 size={13} /> {sure === s.id ? t.pantryDeleteSure : t.delete}
                </span>
              </div>
            )}
          </Card>
        );
      })}

      {editing !== null ? (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>{editing === "new" ? t.intakeNew : t.intakeChange}</div>
          <input value={sf.name} onChange={(e) => setSf({ ...sf, name: e.target.value })} placeholder={t.intakeName} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", marginBottom: 10 }} />
          <div style={{ ...small, marginBottom: 6 }}>{t.intakeRoute}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {INTAKE_ROUTES.map((r) => (
              <Chip key={r.k} label={r[lang === "de" ? "de" : "en"]} active={sf.route === r.k} onClick={() => setSf({ ...sf, route: r.k })} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input type="number" inputMode="decimal" value={sf.dose} onChange={(e) => setSf({ ...sf, dose: e.target.value })} placeholder={t.intakeDose} style={{ ...numInputStyle, width: 110 }} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {INTAKE_UNITS.map((u) => (
                <Chip key={u} label={u} active={sf.unit === u} onClick={() => setSf({ ...sf, unit: u })} />
              ))}
            </div>
          </div>
          <div style={{ ...small, margin: "10px 0 6px" }}>{t.intakeSchedule}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <Chip label={t.intakeEvery} active={sf.schedType === "interval"} onClick={() => setSf({ ...sf, schedType: "interval" })} />
            <Chip label={t.intakeWeekdaysLabel} active={sf.schedType === "weekdays"} onClick={() => setSf({ ...sf, schedType: "weekdays" })} />
            <Chip label={t.intakeNeeded} active={sf.schedType === "needed"} onClick={() => setSf({ ...sf, schedType: "needed" })} />
          </div>
          {sf.schedType === "interval" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={small}>{t.intakeEveryPre}</span>
              <input type="number" inputMode="numeric" value={sf.days} onChange={(e) => setSf({ ...sf, days: e.target.value })} style={{ ...numInputStyle, width: 70, textAlign: "center" }} />
              <span style={small}>{t.intakeEveryPost}</span>
            </div>
          )}
          {sf.schedType === "weekdays" && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <Chip key={d} label={wdNames[d]} active={sf.weekdays.includes(d)} onClick={() => setSf({ ...sf, weekdays: sf.weekdays.includes(d) ? sf.weekdays.filter((x) => x !== d) : [...sf.weekdays, d] })} />
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveSub} disabled={!sf.name.trim() || !(num(sf.dose) > 0)} style={{ flex: 1, background: sf.name.trim() && num(sf.dose) > 0 ? COLORS.gold : COLORS.raised, color: sf.name.trim() && num(sf.dose) > 0 ? COLORS.bg : COLORS.dim, border: "none", borderRadius: 12, padding: "12px 14px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              {t.intakeSave}
            </button>
            <button onClick={() => setEditing(null)} style={{ background: "transparent", color: COLORS.dim, border: "1px solid " + COLORS.border, borderRadius: 12, padding: "12px 16px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              {t.intakeCancel}
            </button>
          </div>
        </Card>
      ) : (
        subs.length > 0 && (
          <button onClick={startNew} style={{ width: "100%", marginBottom: 18, background: COLORS.surface, border: "1px dashed " + COLORS.border, color: COLORS.gold, borderRadius: 12, padding: "12px 14px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
            + {t.intakeNew}
          </button>
        )
      )}

      {subs.length > 0 && (
        <>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.text, margin: "6px 0 10px" }}>{t.intakeHistory}</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 10 }}>
            <Chip label={t.intakeAll} active={filter === "all"} onClick={() => setFilter("all")} />
            {subs.map((s) => (
              <Chip key={s.id} label={s.name} active={filter === s.id} onClick={() => setFilter(s.id)} />
            ))}
          </div>
          <Card style={{ padding: 4 }}>
            {entries.length === 0 ? (
              <div style={{ ...small, padding: 12 }}>{t.intakeEmptyHistory}</div>
            ) : (
              entries.map((e, i) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderBottom: i < entries.length - 1 ? "1px solid " + COLORS.border : "none" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: COLORS.text }}>
                      {subName(e.subId)} · {e.dose} {e.unit}
                    </div>
                    <div style={{ ...small, fontSize: 11.5, marginTop: 2 }}>
                      {fmtWhen(e.ts)}
                      {e.site ? " · " + lbl(INTAKE_SITES, e.site) : ""}
                      {e.note ? " · " + e.note : ""}
                    </div>
                  </div>
                  <div onClick={() => deleteEntry(e.id)} aria-label={t.delete} style={{ cursor: "pointer", padding: 6 }}>
                    <Trash2 size={15} color={COLORS.dim} />
                  </div>
                </div>
              ))
            )}
          </Card>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 18 }}>
            <span style={{ ...small, flex: 1 }}>{t.intakeCardOn}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <Chip label={t.introOn} active={data.card !== false} onClick={() => setData((d) => ({ ...d, card: true }))} />
              <Chip label={t.introOff} active={data.card === false} onClick={() => setData((d) => ({ ...d, card: false }))} />
            </div>
          </div>
        </>
      )}

      {toast && (
        <div style={{ position: "fixed", left: 20, right: 20, bottom: 90, maxWidth: 350, margin: "0 auto", background: COLORS.gold, color: COLORS.bg, borderRadius: 12, padding: "11px 16px", display: "flex", alignItems: "center", gap: 8, fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, boxShadow: "0 10px 24px rgba(0,0,0,0.3)", zIndex: 50 }}>
          <Check size={15} /> {toast}
        </div>
      )}
    </div>
  );
}

function SettingsRow({ icon: Icon, tint = "gold", label, sub, onClick, right, first }) {
  const bg = tint === "coral" ? COLORS.coralSoft : tint === "dim" ? COLORS.raised : COLORS.goldSoft;
  const fg = tint === "coral" ? COLORS.coral : tint === "dim" ? COLORS.dim : COLORS.gold;
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", cursor: onClick ? "pointer" : "default", borderTop: first ? "none" : "1px solid " + COLORS.border }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={17} color={fg} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14.5, color: COLORS.text }}>{label}</div>
        {sub && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
      {onClick && !right && <ChevronLeft size={16} color={COLORS.dim} style={{ transform: "rotate(180deg)", flexShrink: 0 }} />}
    </div>
  );
}

function SettingsLabel({ children }) {
  return <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.dim, margin: "16px 0 8px" }}>{children}</div>;
}

function SettingsScreen({ t, profile, reminders, onNav, onShare, shareMsg }) {
  const remOn = Object.values(reminders).filter(Boolean).length;
  return (
    <div style={{ padding: "0 20px 28px" }}>
      <Card onClick={() => onNav("settingsProfile")} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, cursor: "pointer" }}>
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt="" style={{ width: 54, height: 54, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 54, height: 54, borderRadius: "50%", background: `linear-gradient(150deg, ${COLORS.gold}, ${COLORS.teal})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.bg }}>{(profile.name || "?").charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 16.5, fontWeight: 700, color: COLORS.text }}>{profile.name}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginTop: 2 }}>{profile.weight} kg · {profile.height} cm · {profile.kcalGoal} kcal</div>
        </div>
        <ChevronLeft size={16} color={COLORS.dim} style={{ transform: "rotate(180deg)", flexShrink: 0 }} />
      </Card>

      <SettingsGroup title={t.setGroupAccount}>
        <SettingsRow icon={User} label={t.setProfileRow} onClick={() => onNav("settingsProfile")} />
        <SettingsRow icon={Target} label={t.setGoalsRow} sub={profile.kcalGoal + " kcal"} onClick={() => onNav("settingsGoals")} />
      </SettingsGroup>

      <SettingsGroup title={t.setGroupApp}>
        <SettingsRow icon={Palette} label={t.setDisplayRow} onClick={() => onNav("settingsDisplay")} />
        <SettingsRow icon={Bell} label={t.reminders} sub={remOn + " / 3"} onClick={() => onNav("settingsReminders")} />
        <SettingsRow icon={Link2} label={t.connSettings} onClick={() => onNav("connections")} />
        <SettingsRow icon={Users} label={t.friendsTitle} onClick={() => onNav("friends")} />
        <SettingsRow icon={Pill} label={t.intakeTitle} onClick={() => onNav("intake")} />
      </SettingsGroup>

      <SettingsGroup title={t.setGroupData}>
        <SettingsRow icon={Database} label={t.setDataRow} onClick={() => onNav("settingsData")} />
      </SettingsGroup>

      <SettingsGroup title={t.setGroupHelp}>
        <SettingsRow icon={HelpCircle} label={t.setHelpRow} onClick={() => onNav("settingsHelp")} />
        <SettingsRow icon={MessageCircle} label={t.settingsSupport} onClick={() => onNav("assistant")} />
        <SettingsRow icon={Share2} label={t.setShareRow} sub={shareMsg} onClick={onShare} />
        <SettingsRow icon={Info} label={t.setAboutRow} onClick={() => onNav("settingsAbout")} />
      </SettingsGroup>

      <SettingsGroup title={t.setGroupLegal}>
        <SettingsRow icon={Shield} label={t.settingsPrivacy} onClick={() => onNav("privacy")} />
        <SettingsRow icon={FileText} label={t.setTermsRow} onClick={() => onNav("terms")} />
        <SettingsRow icon={Landmark} label={t.setImprintRow} onClick={() => onNav("impressum")} />
      </SettingsGroup>

      <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLORS.dim }}>{t.setVersion}</div>
    </div>
  );
}

function ProfileSettings({ t, profile, onSave }) {
  const [name, setName] = useState(profile.name || "");
  const [gender, setGender] = useState(profile.gender || "male");
  const [birth, setBirth] = useState(profile.birth || { d: "1", m: "1", y: "2000" });
  const [height, setHeight] = useState(String(profile.height || ""));
  const [saved, setSaved] = useState(false);
  const avatarRef = useRef(null);
  const canSave = name.trim() && Number(height) > 100 && Number(height) < 250;
  const save = () => {
    if (!canSave) return;
    onSave({ name: name.trim(), gender, birth, height: Number(height) });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  const pickAvatar = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    onSave({ avatarUrl: await downscaleImage(file, 320) });
  };
  return (
    <div style={{ padding: "0 20px 28px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 8 }}>
        <div onClick={() => avatarRef.current?.click()} style={{ position: "relative", width: 88, height: 88, cursor: "pointer" }}>
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ width: 88, height: 88, borderRadius: "50%", background: COLORS.goldSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User size={36} color={COLORS.gold} />
            </div>
          )}
          <div style={{ position: "absolute", right: -2, bottom: -2, width: 30, height: 30, borderRadius: "50%", background: COLORS.gold, border: `2px solid ${COLORS.bg}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Camera size={14} color={COLORS.bg} />
          </div>
        </div>
        <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }} onChange={pickAvatar} />
        <span onClick={() => avatarRef.current?.click()} style={{ marginTop: 10, fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 600, color: COLORS.gold, cursor: "pointer" }}>{t.setAvatarChange}</span>
        {profile.avatarUrl && (
          <span onClick={() => onSave({ avatarUrl: null })} style={{ marginTop: 6, fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, cursor: "pointer" }}>{t.setAvatarRemove}</span>
        )}
      </div>
      <SettingsLabel>{t.setName}</SettingsLabel>
      <TextField value={name} onChange={setName} placeholder={t.setName} />
      <SettingsLabel>{t.setGender}</SettingsLabel>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Chip label={t.obGenderFemale} active={gender === "female"} onClick={() => setGender("female")} />
        <Chip label={t.obGenderMale} active={gender === "male"} onClick={() => setGender("male")} />
        <Chip label={t.obGenderDiverse} active={gender === "diverse"} onClick={() => setGender("diverse")} />
      </div>
      <SettingsLabel>{t.setBirth}</SettingsLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.7fr 1.2fr", gap: 10 }}>
        {[
          { key: "d", options: Array.from({ length: 31 }, (_, i) => ({ v: i + 1, l: i + 1 })) },
          { key: "m", options: t.months.map((l, i) => ({ v: i + 1, l })) },
          { key: "y", options: Array.from({ length: 90 }, (_, i) => new Date().getFullYear() - 10 - i).map((v) => ({ v, l: v })) },
        ].map((f) => (
          <select key={f.key} value={birth[f.key]} onChange={(e) => setBirth((b) => ({ ...b, [f.key]: e.target.value }))} style={{ ...numInputStyle, padding: "12px 8px" }}>
            {f.options.map((o) => (
              <option key={o.v} value={o.v}>{o.l}</option>
            ))}
          </select>
        ))}
      </div>
      <SettingsLabel>{t.setHeight}</SettingsLabel>
      <input type="number" inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box" }} />
      <button onClick={save} disabled={!canSave} style={{ width: "100%", marginTop: 22, background: canSave ? COLORS.gold : COLORS.raised, color: canSave ? COLORS.bg : COLORS.dim, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: canSave ? "pointer" : "default" }}>
        {saved ? t.setSavedMsg : t.stepsSave}
      </button>
    </div>
  );
}

function GoalsSettings({ t, profile, stepsGoal, onSave }) {
  const [goal, setGoal] = useState(profile.goal || "maintain");
  const [target, setTarget] = useState(String(profile.target || profile.weight || ""));
  const [targetDate, setTargetDate] = useState(profile.targetDate || new Date(Date.now() + 84 * 86400000).toISOString().slice(0, 10));
  const [manual, setManual] = useState(!!profile.kcalManual);
  const [kcalInput, setKcalInput] = useState(String(profile.kcalGoal || 2000));
  const [split, setSplit] = useState(profile.macroSplit || "balanced");
  const [steps, setSteps] = useState(String(stepsGoal));
  const defaultWater = Math.round(((profile.weight || 70) * 35) / 250) * 250;
  const [water, setWater] = useState(String(profile.waterGoalMl || defaultWater));
  const [saved, setSaved] = useState(false);
  const auto = computeKcalGoal({ gender: profile.gender, age: profile.age || ageFromBirth(profile.birth || { d: 1, m: 1, y: 2000 }), height: profile.height, weight: profile.weight, target: Number(target), goal, targetDate });
  const kcal = manual ? Math.round(Number(kcalInput)) : auto;
  const valid = kcal >= 800 && kcal <= 6000 && Number(steps) >= 500 && Number(water) >= 500;
  const macros = computeMacroTargets(kcal || 0, split);
  const save = () => {
    if (!valid) return;
    onSave(
      { goal, target: Number(target), targetDate, kcalManual: manual, kcalGoal: kcal, macroSplit: split, macroTargets: computeMacroTargets(kcal, split), waterGoalMl: Number(water) === defaultWater ? null : Number(water) },
      Math.round(Number(steps))
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  const goals = [
    { key: "cut", label: t.obGoalCut },
    { key: "maintain", label: t.obGoalMaintain },
    { key: "gain", label: t.obGoalGain },
    { key: "bulk", label: t.obGoalBulk },
  ];
  return (
    <div style={{ padding: "0 20px 28px" }}>
      <SettingsLabel>{t.setGoalType}</SettingsLabel>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {goals.map((g) => (
          <Chip key={g.key} label={g.label} active={goal === g.key} onClick={() => setGoal(g.key)} />
        ))}
      </div>
      <SettingsLabel>{t.setTargetWeight}</SettingsLabel>
      <input type="number" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box" }} />
      <SettingsLabel>{t.setTargetDate}</SettingsLabel>
      <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box", colorScheme: "dark" }} />

      <SettingsLabel>{t.setKcal}</SettingsLabel>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <Chip label={t.setKcalAuto} active={!manual} onClick={() => setManual(false)} />
        <Chip label={t.setKcalManual} active={manual} onClick={() => setManual(true)} />
      </div>
      {manual ? (
        <input type="number" inputMode="numeric" value={kcalInput} onChange={(e) => setKcalInput(e.target.value)} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box" }} />
      ) : (
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 24, fontWeight: 700, color: COLORS.text }}>{auto} <span style={{ fontSize: 13, color: COLORS.dim, fontWeight: 500 }}>kcal</span></div>
      )}
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 6 }}>{manual ? t.setKcalManualHint : t.setKcalHint}</div>

      <SettingsLabel>{t.setMacros}</SettingsLabel>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Chip label={t.setSplitBalanced} active={split === "balanced"} onClick={() => setSplit("balanced")} />
        <Chip label={t.setSplitProtein} active={split === "protein"} onClick={() => setSplit("protein")} />
        <Chip label={t.setSplitLowcarb} active={split === "lowcarb"} onClick={() => setSplit("lowcarb")} />
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginTop: 8 }}>
        {t.protein} {macros.protein} g · {t.carbs} {macros.carbs} g · {t.fat} {macros.fat} g
      </div>

      <SettingsLabel>{t.setStepsGoalLabel}</SettingsLabel>
      <input type="number" inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box" }} />
      <SettingsLabel>{t.setWaterGoal}</SettingsLabel>
      <input type="number" inputMode="numeric" value={water} onChange={(e) => setWater(e.target.value)} style={{ ...numInputStyle, width: "100%", boxSizing: "border-box" }} />
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 6 }}>{t.setWaterDefault} {defaultWater} ml</div>

      <button onClick={save} disabled={!valid} style={{ width: "100%", marginTop: 24, background: valid ? COLORS.gold : COLORS.raised, color: valid ? COLORS.bg : COLORS.dim, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: valid ? "pointer" : "default" }}>
        {saved ? t.setSavedMsg : t.stepsSave}
      </button>
    </div>
  );
}

function DisplaySettings({ t, lang, setLang, display }) {
  return (
    <div style={{ padding: "0 20px 28px" }}>
      <SettingsLabel>{t.setAppearance}</SettingsLabel>
      <div style={{ display: "flex", gap: 8 }}>
        <Chip label={t.setLight} active={display.appearance === "light"} onClick={() => display.setAppearance("light")} />
        <Chip label={t.setDark} active={display.appearance === "dark"} onClick={() => display.setAppearance("dark")} />
        <Chip label={t.setSystem} active={display.appearance === "system"} onClick={() => display.setAppearance("system")} />
      </div>
      <SettingsLabel>{t.setColorTheme}</SettingsLabel>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Chip label={t.setThemeAuto} active={display.colorTheme === "auto"} onClick={() => display.setColorTheme("auto")} />
        <Chip label={t.setThemeNeutral} active={display.colorTheme === "neutral"} onClick={() => display.setColorTheme("neutral")} />
        <Chip label={t.setThemeFemale} active={display.colorTheme === "female"} onClick={() => display.setColorTheme("female")} />
        <Chip label={t.setThemeMale} active={display.colorTheme === "male"} onClick={() => display.setColorTheme("male")} />
        <Chip label={t.setThemeDiverse} active={display.colorTheme === "diverse"} onClick={() => display.setColorTheme("diverse")} />
      </div>
      <SettingsLabel>{t.setTextSize}</SettingsLabel>
      <div style={{ display: "flex", gap: 8 }}>
        <Chip label={t.setSmall} active={display.textSize === "s"} onClick={() => display.setTextSize("s")} />
        <Chip label={t.setNormal} active={display.textSize === "m"} onClick={() => display.setTextSize("m")} />
        <Chip label={t.setLarge} active={display.textSize === "l"} onClick={() => display.setTextSize("l")} />
      </div>
      <SettingsLabel>{t.introSetting}</SettingsLabel>
      <div style={{ display: "flex", gap: 8 }}>
        <Chip label={t.introOn} active={display.intro} onClick={() => display.setIntro(true)} />
        <Chip label={t.introOff} active={!display.intro} onClick={() => display.setIntro(false)} />
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.dim, marginTop: 8 }}>{t.introHint}</div>
      <SettingsLabel>{t.language}</SettingsLabel>
      <div style={{ display: "flex", gap: 8 }}>
        <Chip label="Deutsch" active={lang === "de"} onClick={() => setLang("de")} />
        <Chip label="English" active={lang === "en"} onClick={() => setLang("en")} />
      </div>
    </div>
  );
}

// Opening animation in the style of the "paint splash" app openers: the logo
// slides in, an accent-coloured splat bursts out behind it while the sprout
// and the dumbbell of the logo move apart, then the colour floods the screen
// and the app appears. Tap to skip; it ends by itself after ~3 s and can be
// switched off in the settings.
// circles of the gooey splat (SVG units, viewBox 100 x 120) and the spray drops around it
const INTRO_SPLAT = [
  [50, 60, 26],
  [36, 47, 17],
  [64, 49, 18],
  [34, 76, 17],
  [66, 74, 18],
  [50, 35, 14],
  [50, 86, 14],
  [27, 62, 13],
  [73, 62, 13],
];
const INTRO_DROPS = [
  [13, 38, 3],
  [89, 84, 3.5],
  [19, 94, 2.4],
  [87, 28, 2.8],
];
// small badges for what the app can do; they pop up around the splat one after another
const INTRO_CHIPS = [UtensilsCrossed, Barcode, Camera, BookOpen, Droplets, Footprints, Timer, Dumbbell, Flame, TrendingUp];
const INTRO_MS = 2300;
// quick version for every further launch on the same day: same show, played faster, without the badges
const INTRO_MS_SHORT = 950;
const INTRO_SHORT_RATE = 2.2;
// the logo glyph (same shapes as public/logo.svg) with a dark edge so it reads on every colour
const LOGO_EDGE = { stroke: "#0D0D0D", strokeWidth: 9, strokeLinejoin: "round", paintOrder: "stroke" };

function IntroLogo() {
  return (
    <svg viewBox="104 138 304 228" style={{ display: "block", width: "calc(var(--s) * 0.56)", overflow: "visible", filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.25))" }}>
      <g style={{ transformBox: "fill-box", transformOrigin: "50% 100%", animation: "introSprout 0.75s cubic-bezier(0.25, 1.3, 0.4, 1) 1s both" }}>
        <rect x="252" y="196" width="8" height="106" rx="4" fill="#E3262E" style={LOGO_EDGE} />
        <path d="M256 222 C 234 172, 186 164, 160 180 C 172 220, 220 240, 256 222 Z" fill="#E3262E" style={LOGO_EDGE} />
        <path d="M261 212 C 278 170, 320 152, 354 160 C 344 202, 302 222, 261 212 Z" fill="#9E1219" style={LOGO_EDGE} />
      </g>
      <g style={{ animation: "introBell 0.75s cubic-bezier(0.25, 1.3, 0.4, 1) 1s both" }}>
        <rect x="168" y="292" width="176" height="18" rx="6" fill="#E3262E" style={LOGO_EDGE} />
        <rect x="118" y="270" width="24" height="62" rx="6" fill="#9E1219" style={LOGO_EDGE} />
        <rect x="144" y="250" width="28" height="102" rx="7" fill="#E3262E" style={LOGO_EDGE} />
        <rect x="370" y="270" width="24" height="62" rx="6" fill="#9E1219" style={LOGO_EDGE} />
        <rect x="340" y="250" width="28" height="102" rx="7" fill="#E3262E" style={LOGO_EDGE} />
      </g>
    </svg>
  );
}

// full = the whole show (very first start and first open of each day), otherwise the quick version
function StartIntro({ onDone, accent, full }) {
  const [phase, setPhase] = useState("play"); // play → exit (colour floods the screen) or skip (quick fade)
  const doneRef = useRef(false);
  const timers = useRef([]);
  const rootRef = useRef(null);
  const k = full ? 1 : 1 / INTRO_SHORT_RATE; // time scale of the exit transitions
  const leave = (mode) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase(mode);
    timers.current.push(setTimeout(onDone, mode === "exit" ? 950 * k : 320));
  };
  useEffect(() => {
    if (!full && document.getAnimations) {
      document.getAnimations().forEach((a) => {
        const el = a.effect && a.effect.target;
        if (el && rootRef.current && rootRef.current.contains(el)) a.playbackRate = INTRO_SHORT_RATE;
      });
    }
    timers.current.push(setTimeout(() => leave("exit"), full ? INTRO_MS : INTRO_MS_SHORT));
    return () => timers.current.forEach(clearTimeout);
  }, []);
  const exit = phase === "exit";
  const skip = phase === "skip";
  return (
    <div
      ref={rootRef}
      onClick={() => leave("skip")}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        opacity: exit || skip ? 0 : 1,
        transition: exit ? `opacity ${0.4 * k}s ease ${0.5 * k}s` : skip ? "opacity 0.3s ease" : "none",
        "--s": "min(86vw, 46vh, 440px)",
      }}
    >
      <style>{`
        @keyframes introSplat { 0% { transform: scale(0); } 100% { transform: scale(1); } }
        @keyframes introWobble { 0%,100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(0.6px, -0.8px) scale(1.04); } }
        @keyframes introLogoIn { 0% { transform: translateX(70vw) rotate(-12deg); opacity: 0; filter: blur(6px); } 65% { transform: translateX(-1.5vw) rotate(1.5deg); opacity: 1; filter: blur(0); } 100% { transform: translateX(0) rotate(0); opacity: 1; filter: blur(0); } }
        @keyframes introPunch { 0% { transform: scale(1); } 40% { transform: scale(1.14); } 100% { transform: scale(1); } }
        @keyframes introRipple { 0% { transform: scale(0.35); opacity: 0; } 15% { opacity: 0.8; } 100% { transform: scale(1.35); opacity: 0; } }
        @keyframes introFly { 0% { transform: translate(var(--fx), var(--fy)) scale(0.15); opacity: 0; } 55% { transform: translate(0, 0) scale(1.18); opacity: 1; } 100% { transform: translate(0, 0) scale(1); opacity: 1; } }
        @keyframes introSprout { 0% { transform: translate(0, 0) rotate(0); } 100% { transform: translate(-6px, -58px) rotate(-7deg); } }
        @keyframes introBell { 0% { transform: translate(0, 0); } 100% { transform: translate(0, 46px); } }
      `}</style>
      <div style={{ position: "relative", width: "var(--s)", height: "calc(var(--s) * 1.2)" }}>
        <svg viewBox="0 0 100 120" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
          <defs>
            <filter id="introGoo" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b" />
              <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
            </filter>
          </defs>
          <g filter="url(#introGoo)" style={{ fill: accent }}>
            {INTRO_SPLAT.map(([cx, cy, r], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                style={{ transformBox: "fill-box", transformOrigin: "center", animation: `introSplat 0.65s cubic-bezier(0.2, 0.9, 0.3, 1.25) ${0.7 + (i % 4) * 0.06}s both, introWobble 1.4s ease-in-out ${1.4 + (i % 3) * 0.1}s 1` }}
              />
            ))}
            {INTRO_DROPS.map(([cx, cy, r], i) => (
              <circle key={"d" + i} cx={cx} cy={cy} r={r} style={{ transformBox: "fill-box", transformOrigin: "center", animation: `introSplat 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.4) ${0.95 + i * 0.07}s both` }} />
            ))}
          </g>
        </svg>
        {[0, 0.4, 0.8].map((d) => (
          <div key={d} style={{ position: "absolute", left: "20%", right: "20%", top: "43%", height: "14%", borderRadius: "50%", border: "2px solid rgba(0,0,0,0.5)", animation: `introRipple 1.5s ease-out ${0.85 + d}s infinite both` }} />
        ))}
        {full && INTRO_CHIPS.map((Icon, i) => {
          const a = (i / INTRO_CHIPS.length) * Math.PI * 2;
          const x = Math.sin(a);
          const y = Math.cos(a);
          return (
            <div key={i} style={{ position: "absolute", left: `${50 + 47 * x}%`, top: `${50 - 50 * y}%`, width: 0, height: 0 }}>
              <div style={{ position: "absolute", transform: "translate(-50%, -50%)" }}>
                <div
                  style={{
                    "--fx": `calc(var(--s) * ${-0.47 * x})`,
                    "--fy": `calc(var(--s) * ${0.6 * y})`,
                    width: "calc(var(--s) * 0.13)",
                    height: "calc(var(--s) * 0.13)",
                    borderRadius: "50%",
                    background: COLORS.bg,
                    border: `2px solid ${accent}`,
                    boxShadow: "0 4px 10px rgba(0,0,0,0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: `introFly 0.5s cubic-bezier(0.25, 1.2, 0.4, 1) ${1.15 + i * 0.06}s both`,
                  }}
                >
                  <Icon size="56%" color={COLORS.text} strokeWidth={2.1} />
                </div>
              </div>
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "40vmax",
            height: "40vmax",
            marginLeft: "-20vmax",
            marginTop: "-20vmax",
            borderRadius: "50%",
            background: accent,
            transform: exit ? "scale(7)" : "scale(0)",
            transition: exit ? `transform ${0.55 * k}s cubic-bezier(0.5, 0, 0.2, 1)` : "none",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ transition: `transform ${0.5 * k}s cubic-bezier(0.55, 0, 0.9, 0.5), opacity ${0.4 * k}s ease ${0.1 * k}s`, transform: exit ? "scale(5)" : "scale(1)", opacity: exit ? 0 : 1 }}>
            <div style={{ animation: "introLogoIn 0.55s cubic-bezier(0.2, 0.8, 0.3, 1) 0.05s both" }}>
              <div style={{ animation: "introPunch 0.4s ease-out 0.7s both" }}>
                <IntroLogo />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RemindersSettings({ t, reminders, setReminders, times, setTimes, native }) {
  const rows = [
    { key: "food", label: t.remFood, icon: UtensilsCrossed },
    { key: "weigh", label: t.remWeigh, icon: TrendingUp },
    { key: "train", label: t.remTrain, icon: Dumbbell },
  ];
  return (
    <div style={{ padding: "0 20px 28px" }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim, margin: "0 2px 14px", lineHeight: 1.5 }}>{native ? t.remNoteNative : t.remNoteWeb}</div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {rows.map((r, i) => (
          <div key={r.key} style={{ padding: "13px 14px", borderTop: i === 0 ? "none" : "1px solid " + COLORS.border }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <r.icon size={16} color={COLORS.dim} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14.5, color: COLORS.text }}>{r.label}</span>
              </div>
              <Switch checked={!!reminders[r.key]} onChange={(v) => setReminders({ ...reminders, [r.key]: v })} />
            </div>
            {reminders[r.key] && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim }}>{t.remTime}</span>
                <input type="time" value={times[r.key]} onChange={(e) => e.target.value && setTimes({ ...times, [r.key]: e.target.value })} style={{ ...numInputStyle, width: 120 }} />
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}

function DataSettings({ t, onReplayOnboarding }) {
  const [confirmingDanger, setConfirmingDanger] = useState(false);
  useEffect(() => {
    if (!confirmingDanger) return undefined;
    const id = setTimeout(() => setConfirmingDanger(false), 4000);
    return () => clearTimeout(id);
  }, [confirmingDanger]);
  return (
    <div style={{ padding: "0 20px 28px" }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim, margin: "0 2px 14px", lineHeight: 1.5 }}>{t.setDataIntro}</div>
      <Card style={{ marginBottom: 18 }}>
        <BackupCard t={t} />
      </Card>
      <SettingsGroup>
        <SettingsRow icon={RotateCcw} tint="dim" label={t.replayOnboarding} onClick={onReplayOnboarding} />
      </SettingsGroup>
      <Card style={{ border: "1px solid " + COLORS.coral }}>
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 14, color: COLORS.coral, fontWeight: 700 }}>{t.setDangerTitle}</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, margin: "4px 0 12px", lineHeight: 1.45 }}>{t.setDangerText}</div>
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
          style={{ width: "100%", background: confirmingDanger ? COLORS.coral : COLORS.coralSoft, color: confirmingDanger ? "#fff" : COLORS.coral, border: "1px solid " + COLORS.coral, borderRadius: 10, padding: "11px 12px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
        >
          {confirmingDanger ? t.setDangerConfirm : t.setDangerTitle}
        </button>
      </Card>
    </div>
  );
}

function HelpSettings({ t, onOpenAssistant }) {
  const [open, setOpen] = useState(null);
  return (
    <div style={{ padding: "0 20px 28px" }}>
      <button onClick={onOpenAssistant} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: COLORS.gold, color: COLORS.bg, border: "none", borderRadius: 14, padding: "14px 18px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 20 }}>
        <MessageCircle size={17} /> {t.setAskAi}
      </button>
      <SettingsLabel>{t.setFaqTitle}</SettingsLabel>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {t.setFaq.map((f, i) => (
          <div key={i} style={{ borderTop: i === 0 ? "none" : "1px solid " + COLORS.border }}>
            <div onClick={() => setOpen(open === i ? null : i)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "13px 14px", cursor: "pointer" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, color: COLORS.text }}>{f.q}</span>
              <ChevronDown size={16} color={COLORS.dim} style={{ flexShrink: 0, transform: open === i ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            </div>
            {open === i && <div style={{ padding: "0 14px 14px", fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim, lineHeight: 1.55 }}>{f.a}</div>}
          </div>
        ))}
      </Card>
    </div>
  );
}

function AboutSettings({ t }) {
  const block = (title, text) => (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 13.5, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>{title}</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.dim, lineHeight: 1.55 }}>{text}</div>
    </Card>
  );
  return (
    <div style={{ padding: "0 20px 28px" }}>
      <div style={{ textAlign: "center", padding: "10px 0 22px" }}>
        <img src="/icon-192.png" alt="ASFIT" style={{ width: 76, height: 76, borderRadius: 22, display: "block", margin: "0 auto 12px" }} />
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 800, color: COLORS.text }}>ASFIT</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLORS.dim, marginTop: 4 }}>{t.setAboutVersion} 1.0</div>
      </div>
      {block(t.setAboutData, t.setAboutDataText)}
      {block(t.setAboutAi, t.setAboutAiText)}
      {block(t.setAboutDisclaimer, t.setAboutDisclaimerText)}
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
  // The actual days/exercises of the saved plan — previously the plan
  // builder only kept the name and threw this away, so "Workout starten"
  // always opened a blank free workout no matter what plan was built.
  const [planDays, setPlanDays] = usePersisted("planDays", []);
  const [units, setUnits] = usePersisted("units", "kg");
  const [reminders, setReminders] = usePersisted("reminders", { food: true, weigh: true, train: false });
  const [reminderTimes, setReminderTimes] = usePersisted("reminderTimes", { food: "12:30", weigh: "08:00", train: "18:00" });
  const [shareMsg, setShareMsg] = useState(null);

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
  // Opening animation: once per app launch, never for people who asked the OS to reduce motion.
  const [introOn, setIntroOn] = usePersisted("intro", true);
  const [introDone, setIntroDone] = useState(() => {
    try {
      if (sessionStorage.getItem("asfit.introShown")) return true;
    } catch {
      /* storage unavailable */
    }
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  });
  // whole show on the very first start and the first open of each day, quick version after that
  const [introFull] = useState(() => {
    try {
      return localStorage.getItem("asfit.introDay") !== todayStamp();
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("asfit.introDay", todayStamp());
    } catch {
      /* storage unavailable */
    }
  }, []);
  const finishIntro = () => {
    try {
      sessionStorage.setItem("asfit.introShown", "1");
    } catch {
      /* storage unavailable */
    }
    setIntroDone(true);
  };
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
  const startOrResumeWorkout = (presetEntries) => {
    setActiveWorkout((w) => w || { startedAt: Date.now(), entries: presetEntries || [] });
    setOverlay("workout");
  };
  const [customRecords, setCustomRecords] = usePersisted("customRecords", []);
  const [progressPhotos, setProgressPhotos] = usePersisted("progressPhotos", []);
  const [myMeals, setMyMeals] = usePersisted("myMeals", []);
  const [recentFoods, setRecentFoods] = usePersisted("recentFoods", []);
  const [pantry, setPantry] = usePersisted("pantry", []);
  const [pantryTarget, setPantryTarget] = useState(null); // folder id while foods are being picked for it
  const [pantryOpenId, setPantryOpenId] = useState(null);
  const [pantryReturn, setPantryReturn] = useState(null); // where "back" goes from the pantry screen
  const [fastfood, setFastfood] = usePersisted("fastfood", { last: null }); // eating-out planner: last chain
  const [recipeImport, setRecipeImport] = useState(null); // a pasted link that opens the recipe import straight away
  const [intake, setIntake] = usePersisted("intake", { subs: [], log: [], card: true });
  const [intakeReturn, setIntakeReturn] = useState("settings"); // where "back" goes from the intake log
  const [rivals, setRivals] = usePersisted("rivals", []);
  const [favEx, setFavEx] = usePersisted("favEx", []);
  const [myName, setMyName] = usePersisted("myName", "");
  const [myId] = usePersisted("myId", newPantryId() + newPantryId());
  const [incomingShare, setIncomingShare] = useState(null); // something a friend shared, waiting for "import"
  const [shareToast, setShareToast] = useState(null);
  const [friendsReturn, setFriendsReturn] = useState(null);
  const intakeDue = intake.card === false ? [] : (intake.subs || []).map((s) => ({ name: s.name, n: intakeNext(s, intake.log || []) })).filter((x) => x.n && x.n.diff <= 0).map((x) => ({ name: x.name, diff: x.n.diff }));
  const [firstSeen] = usePersisted("firstSeen", Date.now());
  // nudge for a backup once a week — the data only lives on this device
  const backupDue = onboarded && Date.now() - (Number(localStorage.getItem("asfit.lastBackup")) || firstSeen) > 7 * 86400000;
  const [customRecipes, setCustomRecipes] = usePersisted("customRecipes", []);
  const [cheats, setCheats] = usePersisted("cheats", []);
  const [celebrate, setCelebrate] = useState(null);
  const [waterMl, setWaterMl] = usePersistedDaily("water", 0);
  const [waterLog, setWaterLog] = usePersistedDaily("waterLog", []);
  const [steps, setSteps] = usePersistedDaily("steps", 0);
  const [stepsGoal, setStepsGoal] = usePersisted("stepsGoal", 10000);
  const historyMap = useMemo(() => buildHistory(meals, waterMl, steps), [meals, waterMl, steps]);
  const streak = useMemo(() => computeStreaks(historyMap), [historyMap]);
  const [streakCelebrated, setStreakCelebrated] = usePersisted("streakCelebrated", 0);
  // Confetti once per milestone. If the streak broke, the marker drops so the next run celebrates again.
  useEffect(() => {
    const reached = STREAK_MILESTONES.filter((m) => m <= streak.current).pop() || 0;
    if (reached > streakCelebrated) {
      setStreakCelebrated(reached);
      setCelebrate({ kind: "streak", days: reached });
    } else if (reached < streakCelebrated) {
      setStreakCelebrated(reached);
    }
  }, [streak.current]);
  // A streak of at least two days that drops to zero: Sprout gets worn out, once.
  const [streakPeak, setStreakPeak] = usePersisted("streakPeak", 0);
  useEffect(() => {
    if (!onboarded) return;
    if (streak.current > streakPeak) {
      setStreakPeak(streak.current);
    } else if (streak.current === 0 && streakPeak >= 2) {
      setCelebrate({
        kind: "lost",
        days: streakPeak,
        onStart: () => {
          setOverlay(null);
          setTab("nutrition");
        },
      });
      setStreakPeak(0);
    }
  }, [streak.current, onboarded]);
  // connect = native, not authorised yet | health = auto from Health Connect
  // manual = typed in (web) | unavailable = native but no Health Connect
  const [stepsSource, setStepsSource] = useState(IS_NATIVE_APP ? "connect" : "manual");

  const [healthInfo, setHealthInfo] = usePersisted("healthInfo", { connected: false, lastSync: null, granted: [], unavailable: false });
  const lastExtrasRef = useRef(0);
  // refreshSteps below is captured once by a setInterval effect (deps: [onboarded]),
  // so it keeps closing over whatever `healthInfo` was at that render — reading
  // through a ref instead keeps its fallback value current on every tick.
  const healthInfoRef = useRef(healthInfo);
  useEffect(() => {
    healthInfoRef.current = healthInfo;
  }, [healthInfo]);

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
      let lastSync = healthInfoRef.current.lastSync;
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

  // One scroll container serves every tab and overlay, so a screen used to open at
  // whatever scroll position the previous one had (e.g. Nutrition landing half-way down
  // after scrolling Home). Every screen change starts at the top.
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [tab, overlay]);

  // The free server sleeps when idle and needs ~30 s to wake. Poke it as soon as the
  // app opens (and whenever it returns to the foreground after a while), so it is
  // already awake by the time someone searches, scans or asks the assistant.
  useEffect(() => {
    let last = 0;
    const wake = () => {
      if (Date.now() - last < 4 * 60_000) return;
      last = Date.now();
      fetch(API_BASE + "/health").catch(() => {});
    };
    wake();
    const onVis = () => document.visibilityState === "visible" && wake();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const finishOnboarding = (data) => {
    setProfile(data);
    setWeightLog([{ dateISO: new Date().toISOString(), kg: data.weight }]);
    if (data.stepsGoal) setStepsGoal(data.stepsGoal);
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

  const addFoodTo = (key, food) => {
    setMeals((m) => ({ ...m, [key]: [...m[key], food] }));
    // remember the exact portion for one-tap re-logging ("recently used")
    setRecentFoods((l) => [food, ...l.filter((x) => x.name !== food.name)].slice(0, 12));
  };
  const addFoodItem = (food) => addFoodTo(activeMealKey, food);

  // ----- pantry ("Speisekammer"): folders of the foods you buy again and again -----
  // Saves a food (per-100 values + usual amount) into a folder; folderId null = create the folder first.
  const pantrySaveItem = (folderId, item, newName) => {
    const id = folderId || newPantryId();
    setPantry((list) => {
      const base = list.some((f) => f.id === id) ? list : [...list, { id, name: newName || "Speisekammer", emoji: pantryEmojiFor(newName), items: [] }];
      return base.map((f) => {
        if (f.id !== id) return f;
        const known = f.items.some((i) => i.name === item.name);
        return { ...f, items: known ? f.items.map((i) => (i.name === item.name ? { ...i, per100: item.per100, unit: item.unit, grams: item.grams } : i)) : [...f.items, { id: newPantryId(), uses: 0, ...item }] };
      });
    });
    return id;
  };
  // Adds a pantry food to the diary and remembers the amount that was used as the new default.
  const pantryAddToMeal = (key, food, folderId, itemId, grams) => {
    addFoodTo(key, food);
    setPantry((list) => list.map((f) => (f.id !== folderId ? f : { ...f, items: f.items.map((i) => (i.id !== itemId ? i : { ...i, grams, uses: (i.uses || 0) + 1 })) })));
  };
  const openPantry = (from) => {
    setPantryReturn(from || null);
    setOverlay("pantry");
  };

  // ----- sharing and friends: plans, meals, recipes, pantry folders and the week duel -----
  const flashShare = (m) => {
    setShareToast(m);
    setTimeout(() => setShareToast(null), 2200);
  };
  const sharerName = () => (myName || profile.name || "").trim().slice(0, 30);
  // the last 7 days in numbers, for the duel
  const myDuelStats = () => {
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    const ws = workoutHistory.filter((w) => new Date(w.dateISO).getTime() >= weekAgo);
    const keys = Array.from({ length: 7 }, (_, i) => dateKey(new Date(now - i * 86400000)));
    const steps = keys.reduce((s, k) => s + ((historyMap[k] && historyMap[k].steps) || 0), 0);
    return {
      tr: ws.length,
      vol: Math.round(ws.reduce((s, w) => s + (w.volumeKg || 0), 0)),
      min: Math.round(ws.reduce((s, w) => s + (w.durationSec || 0), 0) / 60),
      str: streak.current,
      days: keys.filter((k) => dayHasFood(historyMap[k])).length,
      steps: Math.round(steps / 7),
    };
  };
  const doShare = async (obj, title) => {
    const code = await encodeShare({ v: 1, n: sharerName(), ...obj });
    const link = SHARE_BASE + "#s=" + code;
    const text = (sharerName() ? sharerName() + ": " : "") + title + "\n" + link + "\n\n" + t.shareCodeHint + "\n" + code;
    try {
      if (navigator.share) {
        await navigator.share({ title: "ASFIT", text });
        return;
      }
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(text);
      flashShare(t.shareCopied);
    } catch {
      flashShare(link.slice(0, 60) + "…");
    }
  };
  const shareMyDuel = () => doShare({ t: "duel", id: myId, ts: Date.now(), s: myDuelStats(), b: personalBests }, t.shareTypeDuel);
  const importShareText = async (text) => {
    const code = extractShareCode(text);
    if (!code) return { ok: false };
    try {
      const item = sanitizeShare(await decodeShare(code));
      if (!item) return { ok: false };
      setIncomingShare(item);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  };
  const applyShare = (item, slot) => {
    if (item.t === "plan") {
      setPlanName(item.name);
      setPlanDays(item.days);
    } else if (item.t === "meal") {
      item.items.forEach((f) => addFoodTo(slot, f));
    } else if (item.t === "day") {
      Object.entries(item.slots).forEach(([k, arr]) => arr.forEach((f) => addFoodTo(k, f)));
    } else if (item.t === "recipe") {
      const r = item.r;
      saveRecipe({ key: "c" + Date.now(), name: r.name, nameDe: r.name, category: r.category, kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, ingredients: r.ingredients, ingredientsDe: r.ingredients, image: "", custom: true });
    } else if (item.t === "pantry") {
      setPantry((l) => [...l, { id: newPantryId(), name: item.folder.name, emoji: item.folder.emoji, items: item.folder.items.map((i) => ({ id: newPantryId(), uses: 0, ...i })) }]);
    } else if (item.t === "ex") {
      setFavEx((l) => (l.includes(item.key) ? l : [...l, item.key]));
    } else if (item.t === "duel") {
      setRivals((l) => [...l.filter((r) => r.id !== item.id), { id: item.id, name: item.from || "?", ts: item.ts, stats: item.stats, bests: item.bests }].slice(-20));
      setFriendsReturn(null);
      setOverlay("friends");
    }
    setIncomingShare(null);
    flashShare(t.shareImported);
  };
  // a link with #s=CODE (opened in the browser / Android app) is picked up right at the start
  useEffect(() => {
    const read = async () => {
      const m = window.location.hash.match(/^#s=([A-Za-z0-9_-]+)/);
      if (!m) return;
      try {
        const item = sanitizeShare(await decodeShare(m[1]));
        if (item) setIncomingShare(item);
      } catch {
        /* not a valid code */
      }
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  // Copy a meal (from yesterday, or from any past day being viewed) into today's meal.
  const copyItems = (slot, items) => setMeals((m) => ({ ...m, [slot]: [...m[slot], ...items.map((it) => ({ ...it }))] }));

  // Change the portion of an already logged food — calories and macros scale with it.
  const editFoodItem = (mealKey, index, grams) =>
    setMeals((m) => ({
      ...m,
      [mealKey]: m[mealKey].map((it, i) => {
        if (i !== index || !it.grams || !(grams > 0)) return it;
        const r = grams / it.grams;
        const f1 = (v) => Math.round((v || 0) * r * 10) / 10;
        return {
          ...it,
          grams: Math.round(grams * 10) / 10,
          kcal: Math.round((it.kcal || 0) * r),
          protein: f1(it.protein),
          carbs: f1(it.carbs),
          fat: f1(it.fat),
          ...(it.fiber != null ? { fiber: f1(it.fiber) } : {}),
          ...(it.sugar != null ? { sugar: f1(it.sugar) } : {}),
          ...(it.salt != null ? { salt: Math.round(it.salt * r * 100) / 100 } : {}),
        };
      }),
    }));

  const deleteFoodItem = (mealKey, index) => {
    setMeals((m) => ({ ...m, [mealKey]: m[mealKey].filter((_, i) => i !== index) }));
  };

  const addExerciseToPbDay = (ex) => {
    setPbDays((days) => days.map((d) => (d.id === pbSelectedDay ? { ...d, exercises: [...d.exercises, ex] } : d)));
  };

  const addNoteEntry = (entry) => {
    // dateISO (not a pre-translated "Today" string) so the label stays right on later days
    // and in either language; "date" is kept for notes saved before this change.
    setNotes((n) => [{ id: Date.now(), date: t.today, dateISO: new Date().toISOString(), ...entry }, ...n]);
    setOverlay(null);
  };

  const nav = [
    { key: "home", icon: Home, label: t.tabs.home },
    { key: "nutrition", icon: UtensilsCrossed, label: t.tabs.nutrition },
    { key: "training", icon: Dumbbell, label: t.tabs.training },
    { key: "progress", icon: TrendingUp, label: t.tabs.progress },
    { key: "notes", icon: NotebookPen, label: t.tabs.notes },
  ];

  const saveProfileBasics = (v) =>
    setProfile((p) => {
      // v may be a partial update (e.g. just a new avatar) without a birth date —
      // fall back to the profile's existing one instead of crashing on destructure.
      const next = { ...p, ...v, age: ageFromBirth(v.birth || p.birth) };
      if (!p.kcalManual) {
        next.kcalGoal = computeKcalGoal({ gender: next.gender, age: next.age, height: next.height, weight: next.weight, target: next.target, goal: next.goal, targetDate: next.targetDate });
        next.macroTargets = computeMacroTargets(next.kcalGoal, next.macroSplit);
      }
      return next;
    });
  const saveGoals = (v, steps) => {
    setProfile((p) => ({ ...p, ...v }));
    setStepsGoal(steps);
  };
  const shareApp = async () => {
    const url = "https://asmarfit-project.onrender.com";
    try {
      if (navigator.share) {
        await navigator.share({ title: "ASFIT", text: t.setShareText, url });
        return;
      }
      await navigator.clipboard.writeText(t.setShareText + " " + url);
      setShareMsg(t.setShareCopied);
      setTimeout(() => setShareMsg(null), 2500);
    } catch {
      /* share sheet dismissed */
    }
  };

  // Daily reminders as local notifications (only inside the installed app).
  useEffect(() => {
    if (!IS_NATIVE_APP || !onboarded) return;
    (async () => {
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        await LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }, { id: 3 }] });
        const defs = [
          { id: 1, key: "food", body: t.remFoodBody },
          { id: 2, key: "weigh", body: t.remWeighBody },
          { id: 3, key: "train", body: t.remTrainBody },
        ].filter((d) => reminders[d.key]);
        if (defs.length === 0) return;
        const perm = await LocalNotifications.requestPermissions();
        if (perm.display !== "granted") return;
        await LocalNotifications.schedule({
          notifications: defs.map((d) => {
            const [hour, minute] = (reminderTimes[d.key] || "12:00").split(":").map(Number);
            return { id: d.id, title: "ASFIT", body: d.body, schedule: { on: { hour, minute }, allowWhileIdle: true } };
          }),
        });
      } catch {
        /* notifications are optional */
      }
    })();
  }, [reminders, reminderTimes, onboarded, lang]);

  // Installed app: also nudge via notification once a workout has been running 2 h.
  const workoutStartedAt = activeWorkout?.startedAt;
  useEffect(() => {
    if (!IS_NATIVE_APP) return;
    (async () => {
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        await LocalNotifications.cancel({ notifications: [{ id: 4 }] });
        if (!workoutStartedAt) return;
        const at = new Date(Math.max(workoutStartedAt + 2 * 3600_000, Date.now() + 60_000));
        const perm = await LocalNotifications.requestPermissions();
        if (perm.display !== "granted") return;
        await LocalNotifications.schedule({ notifications: [{ id: 4, title: "ASFIT", body: t.workoutLongBody, schedule: { at, allowWhileIdle: true } }] });
      } catch {
        /* notifications are optional */
      }
    })();
  }, [workoutStartedAt, lang]);

  let content, topTitle, showBack, onSettingsBtn;

  if (overlay === "workout") {
    content = (
      <WorkoutSession
        t={t}
        lang={lang}
        startedAt={activeWorkout?.startedAt || Date.now()}
        pausedAt={activeWorkout?.pausedAt || null}
        pausedMs={activeWorkout?.pausedMs || 0}
        onTogglePause={() =>
          setActiveWorkout((w) => {
            if (!w) return w;
            const n = Date.now();
            return w.pausedAt ? { ...w, pausedMs: (w.pausedMs || 0) + (n - w.pausedAt), pausedAt: null } : { ...w, pausedAt: n };
          })
        }
        entries={activeWorkout?.entries || []}
        workoutHistory={workoutHistory}
        onChangeEntries={(entries) => setActiveWorkout((w) => ({ ...(w || { startedAt: Date.now() }), entries }))}
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
    const targetFolder = pantryTarget ? pantry.find((f) => f.id === pantryTarget) || null : null;
    content = (
      <FoodSearchScreen
        t={t}
        lang={lang}
        recentFoods={recentFoods}
        onAdd={addFoodItem}
        onOpenBarcode={() => setOverlay("barcode")}
        onOpenPhoto={() => setOverlay("photo")}
        myMeals={myMeals}
        onOpenMyMeals={() => setOverlay("myMeals")}
        pantry={pantry}
        pantryFolder={targetFolder}
        onPantrySave={pantrySaveItem}
        onPantryDone={() => {
          setPantryOpenId(pantryTarget);
          setPantryTarget(null);
          setOverlay("pantry");
        }}
        onOpenPantry={() => openPantry("foodSearch")}
        onImportLink={(url) => {
          setRecipeImport(url);
          setOverlay("recipes");
        }}
      />
    );
    topTitle = targetFolder ? t.pantryTitle : t.foodSearchTitle;
    showBack = targetFolder
      ? () => {
          setPantryOpenId(pantryTarget);
          setPantryTarget(null);
          setOverlay("pantry");
        }
      : () => setOverlay(null);
  } else if (overlay === "friends") {
    content = <FriendsScreen t={t} lang={lang} myName={myName || profile.name || ""} setMyName={setMyName} myStats={myDuelStats()} rivals={rivals} onShareMine={shareMyDuel} onImportText={importShareText} onRemove={(id) => setRivals((l) => l.filter((r) => r.id !== id))} />;
    topTitle = t.friendsTitle;
    showBack = () => setOverlay(friendsReturn);
  } else if (overlay === "fastfood") {
    content = (
      <FastFoodScreen
        t={t}
        lang={lang}
        last={fastfood.last}
        goalKcal={profile.kcalGoal || 0}
        eatenKcal={sumMeals(meals, "kcal")}
        eatenProtein={sumMeals(meals, "protein")}
        proteinTarget={profile.macroTargets ? profile.macroTargets.protein : 0}
        onPickChain={(id) => setFastfood((f) => ({ ...f, last: id }))}
        onLog={(slot, foods) => foods.forEach((f) => addFoodTo(slot, f))}
      />
    );
    topTitle = t.ffTitle;
    showBack = () => setOverlay(null);
  } else if (overlay === "intake") {
    content = <IntakeScreen t={t} lang={lang} data={intake} setData={setIntake} />;
    topTitle = t.intakeTitle;
    showBack = () => setOverlay(intakeReturn);
  } else if (overlay === "pantry") {
    content = (
      <PantryScreen
        key={pantryOpenId || "pantry"}
        t={t}
        lang={lang}
        pantry={pantry}
        initialSlot={pantryReturn ? activeMealKey : mealKeyForNow()}
        openId={pantryOpenId}
        onAddTo={pantryAddToMeal}
        onCreateFolder={(id, name, emoji) => setPantry((l) => [...l, { id, name, emoji, items: [] }])}
        onRenameFolder={(id, name) => setPantry((l) => l.map((f) => (f.id === id ? { ...f, name } : f)))}
        onDeleteFolder={(id) => setPantry((l) => l.filter((f) => f.id !== id))}
        onDeleteItem={(fid, iid) => setPantry((l) => l.map((f) => (f.id === fid ? { ...f, items: f.items.filter((i) => i.id !== iid) } : f)))}
        onAddFoods={(fid) => {
          setPantryTarget(fid);
          setOverlay("foodSearch");
        }}
        onShare={doShare}
      />
    );
    topTitle = t.pantryTitle;
    showBack = () => {
      setPantryOpenId(null);
      setOverlay(pantryReturn);
    };
  } else if (overlay === "barcode") {
    content = <BarcodeScanScreen t={t} lang={lang} pantry={pantry} onPantrySave={pantrySaveItem} onAdd={addFoodItem} onDone={() => setOverlay(null)} />;
    topTitle = t.barcodeTitle;
    showBack = () => setOverlay("foodSearch");
  } else if (overlay === "photo") {
    content = <PhotoScanScreen t={t} lang={lang} onAdd={addFoodItem} onDone={() => setOverlay(null)} />;
    topTitle = t.photoTitle;
    showBack = () => setOverlay("foodSearch");
  } else if (overlay === "recipes") {
    content = <RecipesScreen key={recipeImport || "recipes"} t={t} lang={lang} onAdd={addFoodItem} onDone={() => setOverlay(null)} customRecipes={customRecipes} onSaveRecipe={saveRecipe} onDeleteRecipe={deleteRecipe} initialImport={recipeImport} onShare={doShare} />;
    topTitle = t.recipesTitle;
    showBack = () => {
      setRecipeImport(null);
      setOverlay(null);
    };
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
  } else if (overlay === "history") {
    content = <HistoryScreen t={t} lang={lang} history={historyMap} streak={streak} workoutHistory={workoutHistory} kcalGoal={profile.kcalGoal} />;
    topTitle = t.historyTitle;
    showBack = () => setOverlay(null);
  } else if (overlay === "records") {
    content = <RecordsScreen t={t} lang={lang} personalBests={personalBests} cardioBests={cardioBests} workoutHistory={workoutHistory} customRecords={customRecords} onCreate={createCustomRecord} onUpdate={updateCustomRecord} />;
    topTitle = t.recordsTitle;
    showBack = () => setOverlay(null);
  } else if (overlay === "privacy") {
    content = <PrivacyScreen t={t} />;
    topTitle = t.privacyTitle;
    showBack = () => setOverlay("settings");
  } else if (overlay === "terms") {
    content = <LegalPageScreen src="/terms.html" />;
    topTitle = t.setTermsRow;
    showBack = () => setOverlay("settings");
  } else if (overlay === "impressum") {
    content = <LegalPageScreen src="/impressum.html" />;
    topTitle = t.setImprintRow;
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
          setPlanDays(pbDays);
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
        favs={favEx}
        onToggleFav={(k) => setFavEx((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]))}
        rivals={rivals}
        meLabel={myName || profile.name || ""}
        onShareEx={(k, n) => doShare({ t: "ex", k }, t.shareTypeEx + ": " + n)}
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
        profile={profile}
        reminders={reminders}
        onNav={(k) => {
          if (k === "intake") setIntakeReturn("settings");
          if (k === "friends") setFriendsReturn("settings");
          setOverlay(k);
        }}
        onShare={shareApp}
        shareMsg={shareMsg}
      />
    );
    topTitle = t.settingsTitle;
    showBack = () => setOverlay(null);
  } else if (overlay === "settingsProfile") {
    content = <ProfileSettings t={t} profile={profile} onSave={saveProfileBasics} />;
    topTitle = t.setProfileRow;
    showBack = () => setOverlay("settings");
  } else if (overlay === "settingsGoals") {
    content = <GoalsSettings t={t} profile={profile} stepsGoal={stepsGoal} onSave={saveGoals} />;
    topTitle = t.setGoalsRow;
    showBack = () => setOverlay("settings");
  } else if (overlay === "settingsDisplay") {
    content = <DisplaySettings t={t} lang={lang} setLang={setLang} display={{ appearance, setAppearance, colorTheme, setColorTheme, textSize, setTextSize, intro: introOn, setIntro: setIntroOn }} />;
    topTitle = t.setDisplayRow;
    showBack = () => setOverlay("settings");
  } else if (overlay === "settingsReminders") {
    content = <RemindersSettings t={t} reminders={reminders} setReminders={setReminders} times={reminderTimes} setTimes={setReminderTimes} native={IS_NATIVE_APP} />;
    topTitle = t.reminders;
    showBack = () => setOverlay("settings");
  } else if (overlay === "settingsData") {
    content = <DataSettings t={t} onReplayOnboarding={() => { setOverlay(null); setOnboarded(false); }} />;
    topTitle = t.setDataRow;
    showBack = () => setOverlay("settings");
  } else if (overlay === "settingsHelp") {
    content = <HelpSettings t={t} onOpenAssistant={() => setOverlay("assistant")} />;
    topTitle = t.setHelpRow;
    showBack = () => setOverlay("settings");
  } else if (overlay === "settingsAbout") {
    content = <AboutSettings t={t} />;
    topTitle = t.setAboutRow;
    showBack = () => setOverlay("settings");
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
          onAddWater={(ml) => {
            const v = Math.round(Number(ml));
            if (!(v > 0 && v <= 5000)) return;
            setWaterMl((w) => w + v);
            setWaterLog((l) => [...l.slice(-49), v]);
          }}
          onUndoWater={() => {
            const last = waterLog.length ? waterLog[waterLog.length - 1] : 250;
            setWaterMl((w) => Math.max(0, w - last));
            setWaterLog((l) => l.slice(0, -1));
          }}
          lastWaterMl={waterLog.length ? waterLog[waterLog.length - 1] : 250}
          onSaveWaterGoal={(ml) => setProfile((p) => ({ ...p, waterGoalMl: ml }))}
          onOpenAssistant={() => setOverlay("assistant")}
          steps={steps}
          stepsSource={stepsSource}
          onConnectSteps={() => refreshSteps(true)}
          onSaveSteps={(v) => setSteps(v)}
          stepsGoal={stepsGoal}
          onSaveStepsGoal={setStepsGoal}
          history={historyMap}
          streak={streak}
          onOpenHistory={() => setOverlay("history")}
          backupDue={backupDue}
          onOpenBackup={() => setOverlay("settingsData")}
          intakeDue={intakeDue}
          onOpenIntake={() => {
            setIntakeReturn(null);
            setOverlay("intake");
          }}
        />
      ),
      nutrition: (
        <NutritionScreen
          t={t}
          lang={lang}
          meals={meals}
          history={historyMap}
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
          pantry={pantry}
          onOpenPantry={() => openPantry(null)}
          onOpenFastFood={() => setOverlay("fastfood")}
          onImportText={(txt) => {
            setRecipeImport(txt);
            setOverlay("recipes");
          }}
          onShare={doShare}
          cheats={cheats}
          onOpenMyMeals={() => setOverlay("myMeals")}
          onOpenCheats={() => setOverlay("cheats")}
          onSaveMyMeal={addMyMeal}
          onDeleteItem={deleteFoodItem}
          onEditItem={editFoodItem}
          onCopyItems={copyItems}
        />
      ),
      training: (
        <TrainingScreen
          t={t}
          lang={lang}
          planName={planName}
          planDays={planDays}
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
          onSharePlan={() => doShare({ t: "plan", p: planName, d: planDays.map((d) => ({ n: d.name, e: d.exercises.map((e) => e.key) })) }, t.shareTypePlan + (planName ? ": " + planName : ""))}
          onOpenFriends={() => {
            setFriendsReturn(null);
            setOverlay("friends");
          }}
        />
      ),
      progress: (
        <ProgressScreen
          t={t}
          lang={lang}
          weightLog={weightLog}
          workoutHistory={workoutHistory}
          onAddWeight={addWeight}
          onDeleteWeight={(dateISO) =>
            setWeightLog((l) => {
              // Filtering by dateISO would remove every entry sharing that exact
              // timestamp (e.g. two health-sync samples that landed on the same
              // second) instead of just the one the user tapped — drop only the
              // first match.
              const idx = l.findIndex((w) => w.dateISO === dateISO);
              return idx === -1 ? l : [...l.slice(0, idx), ...l.slice(idx + 1)];
            })
          }
          photos={progressPhotos}
          onAddPhoto={(p) => setProgressPhotos((ph) => [...ph, p])}
          onDeletePhoto={(id) => setProgressPhotos((ph) => ph.filter((p) => p.id !== id))}
        />
      ),
      notes: <NotesScreen t={t} lang={lang} notes={notes} filter={notesFilter} setFilter={setNotesFilter} onAddNote={() => setOverlay("noteComposer")} />,
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
            {activeWorkout && overlay !== "workout" && <WorkoutBanner t={t} aw={activeWorkout} onOpen={() => startOrResumeWorkout()} />}
            {activeWorkout && <WorkoutLongPrompt t={t} aw={activeWorkout} onEnd={() => startOrResumeWorkout()} />}
            <div ref={scrollRef} style={isPhone ? { flex: 1, minHeight: 0, overflowY: "auto" } : { height: 700, overflowY: "auto" }}>{content}</div>
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
        {onboarded && incomingShare && <ShareImportModal t={t} lang={lang} item={incomingShare} onImport={applyShare} onClose={() => setIncomingShare(null)} />}
        {shareToast && (
          <div style={{ position: "fixed", left: 20, right: 20, bottom: 96, maxWidth: 350, margin: "0 auto", background: COLORS.gold, color: COLORS.bg, borderRadius: 12, padding: "11px 16px", display: "flex", alignItems: "center", gap: 8, fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, boxShadow: "0 10px 24px rgba(0,0,0,0.3)", zIndex: 1100 }}>
            <Check size={15} /> {shareToast}
          </div>
        )}
        {introOn && !introDone && <StartIntro onDone={finishIntro} full={introFull} accent={(THEMES[colorTheme === "auto" ? profile.gender : colorTheme] || THEMES.neutral).dark.gold} />}
      </div>
    </div>
  );
}
