// Erzeugt ALLE Sprach-Clips der App mit OpenAI TTS (gpt-4o-mini-tts):
//   - KI-Onboarding (Begrüssung, Fragen, Finale) in Deutsch + Englisch
//   - Kurz-Workout-Ansagen in allen 6 Sprachen
// Eine Stimme ("ash", warm-männlich) mit Trainer-Anweisung — klingt überall gleich.
//
// Aufruf (im Ordner frontend/):  node tools/make-voice-openai.mjs
// Der OpenAI-API-Schlüssel wird beim Start abgefragt (einfügen + Enter) und NIE gespeichert.
// Andere Stimme: VOICE=onyx node tools/make-voice-openai.mjs  (alloy|ash|ballad|coral|echo|fable|onyx|nova|sage|verse)
import { createInterface } from "readline";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "voice");
const VOICE = process.env.VOICE || "ash";

const INSTR = {
  de: "Du bist ein mitreißender, lebendiger Fitness-Coach. Sprich schnell, mit echter Emotion und Begeisterung — warm, dynamisch, nie monoton.",
  en: "You are a vibrant, charismatic fitness coach. Speak fast, with real emotion and excitement — warm, dynamic, never monotone.",
  fr: "Tu es un coach fitness vibrant et charismatique. Parle vite, avec une vraie émotion et de l'enthousiasme — chaleureux, dynamique, jamais monotone.",
  it: "Sei un coach fitness vivace e carismatico. Parla veloce, con vera emozione ed entusiasmo — caloroso, dinamico, mai monotono.",
  es: "Eres un coach fitness vibrante y carismático. Habla rápido, con emoción real y entusiasmo — cálido, dinámico, nunca monótono.",
  tr: "Canlı ve karizmatik bir fitness koçusun. Hızlı, gerçek duygu ve coşkuyla konuş — sıcak, dinamik, asla monoton değil.",
  pt: "Você é um coach fitness vibrante e carismático. Fale rápido, com emoção real e entusiasmo — caloroso, dinâmico, nunca monótono.",
  ru: "Ты яркий, харизматичный фитнес-коуч. Говори быстро, с настоящими эмоциями и азартом — тепло, динамично, никогда монотонно.",
  pl: "Jesteś porywającym, charyzmatycznym trenerem fitness. Mów szybko, z prawdziwymi emocjami i entuzjazmem — ciepło, dynamicznie, nigdy monotonnie.",
  nl: "Je bent een levendige, charismatische fitnesscoach. Spreek snel, met echte emotie en enthousiasme — warm, dynamisch, nooit monotoon.",
  ar: "أنت مدرب لياقة حيوي وجذاب. تحدث بسرعة وبعاطفة حقيقية وحماس — دافئ وديناميكي ولا رتيب أبدًا.",
  hi: "तुम एक जोशीले, करिश्माई फिटनेस कोच हो। तेज़, सच्ची भावना और जोश के साथ बोलो — गर्मजोशी से, कभी नीरस नहीं।",
  id: "Kamu pelatih kebugaran yang hidup dan karismatik. Bicaralah cepat, dengan emosi dan antusiasme nyata — hangat, dinamis, tidak pernah monoton.",
  ja: "あなたは生き生きとしたカリスマフィットネスコーチ。速いテンポで、本物の感情と熱意を込めて話して — 温かくダイナミックに、決して単調にならないで。",
  ko: "당신은 생기 넘치는 카리스마 피트니스 코치예요. 빠르게, 진짜 감정과 열정을 담아 말하세요 — 따뜻하고 다이내믹하게, 절대 단조롭지 않게.",
  zh: "你是一位充满活力、有魅力的健身教练。语速要快，带着真实的情感和热情——温暖、有活力，绝不单调。",
};

// ---- KI-Onboarding (Stimme führt durchs Anmelden) ----
const OB = {
  de: {
    ob_goal: "Was möchtest du mit deinem Körper erreichen?",
    ob_name: "Stark! Und wie heisst du?",
    ob_gender: "Bist du männlich, weiblich oder divers?",
    ob_age: "Wie alt bist du?",
    ob_weight: "Wie viel wiegst du gerade, in Kilogramm?",
    ob_height: "Wie gross bist du, in Zentimetern?",
    ob_target: "Und was ist dein Zielgewicht in Kilogramm?",
    ob_final: "Interessant! So könnte dein Körper aussehen.",
    ob_numerr: "Sag mir bitte eine Zahl — zum Beispiel achtzig.",
  },
  en: {
    ob_goal: "What do you want to achieve with your body?",
    ob_name: "Great! What's your name?",
    ob_gender: "Are you male, female or diverse?",
    ob_age: "How old are you?",
    ob_weight: "How much do you weigh right now, in kilograms?",
    ob_height: "How tall are you, in centimeters?",
    ob_target: "And what's your target weight in kilograms?",
    ob_final: "Interesting! This is how your body could look.",
    ob_numerr: "Please tell me a number — for example eighty.",
  },
  fr: {
    ob_goal: "Que veux-tu accomplir avec ton corps ?",
    ob_name: "Super ! Et comment tu t'appelles ?",
    ob_gender: "Tu es un homme, une femme ou divers ?",
    ob_age: "Quel âge as-tu ?",
    ob_weight: "Combien pèses-tu en ce moment, en kilogrammes ?",
    ob_height: "Combien mesures-tu, en centimètres ?",
    ob_target: "Et quel est ton poids cible en kilogrammes ?",
    ob_final: "Intéressant ! Voilà à quoi ton corps pourrait ressembler.",
    ob_numerr: "Dis-moi un nombre, s'il te plaît — par exemple quatre-vingts.",
  },
  it: {
    ob_goal: "Cosa vuoi ottenere con il tuo corpo?",
    ob_name: "Ottimo! E come ti chiami?",
    ob_gender: "Sei maschio, femmina o diverso?",
    ob_age: "Quanti anni hai?",
    ob_weight: "Quanto pesi adesso, in chilogrammi?",
    ob_height: "Quanto sei alto, in centimetri?",
    ob_target: "E qual è il tuo peso obiettivo in chilogrammi?",
    ob_final: "Interessante! Ecco come potrebbe apparire il tuo corpo.",
    ob_numerr: "Dimmi un numero, per favore — ad esempio ottanta.",
  },
  es: {
    ob_goal: "¿Qué quieres lograr con tu cuerpo?",
    ob_name: "¡Genial! ¿Y cómo te llamas?",
    ob_gender: "¿Eres hombre, mujer o diverso?",
    ob_age: "¿Cuántos años tienes?",
    ob_weight: "¿Cuánto pesas ahora mismo, en kilogramos?",
    ob_height: "¿Cuánto mides, en centímetros?",
    ob_target: "¿Y cuál es tu peso objetivo en kilogramos?",
    ob_final: "¡Interesante! Así podría verse tu cuerpo.",
    ob_numerr: "Dime un número, por favor — por ejemplo ochenta.",
  },
  tr: {
    ob_goal: "Vücudunla neyi başarmak istiyorsun?",
    ob_name: "Harika! Peki adın ne?",
    ob_gender: "Erkek misin, kadın mısın yoksa diğer mi?",
    ob_age: "Kaç yaşındasın?",
    ob_weight: "Şu anda kaç kilosun, kilogram olarak?",
    ob_height: "Boyun kaç, santimetre olarak?",
    ob_target: "Peki hedef kilon kaç kilogram?",
    ob_final: "İlginç! Vücudun böyle görünebilir.",
    ob_numerr: "Lütfen bana bir sayı söyle — örneğin seksen.",
  },
  pt: {
    ob_goal: "O que você quer alcançar com o seu corpo?",
    ob_name: "Ótimo! E qual é o seu nome?",
    ob_gender: "Você é homem, mulher ou outro?",
    ob_age: "Quantos anos você tem?",
    ob_weight: "Quanto você pesa agora, em quilogramas?",
    ob_height: "Quanto você mede, em centímetros?",
    ob_target: "E qual é o seu peso desejado em quilogramas?",
    ob_final: "Interessante! É assim que seu corpo poderia ficar.",
    ob_numerr: "Me diga um número, por favor — por exemplo oitenta.",
  },
  ru: {
    ob_goal: "Чего ты хочешь добиться со своим телом?",
    ob_name: "Отлично! А как тебя зовут?",
    ob_gender: "Ты мужчина, женщина или другое?",
    ob_age: "Сколько тебе лет?",
    ob_weight: "Сколько ты сейчас весишь, в килограммах?",
    ob_height: "Какой у тебя рост, в сантиметрах?",
    ob_target: "А какой у тебя целевой вес в килограммах?",
    ob_final: "Интересно! Вот как могло бы выглядеть твоё тело.",
    ob_numerr: "Назови мне число, пожалуйста — например восемьдесят.",
  },
  pl: {
    ob_goal: "Co chcesz osiągnąć ze swoim ciałem?",
    ob_name: "Super! A jak masz na imię?",
    ob_gender: "Jesteś mężczyzną, kobietą czy osobą inną?",
    ob_age: "Ile masz lat?",
    ob_weight: "Ile teraz ważysz, w kilogramach?",
    ob_height: "Ile masz wzrostu, w centymetrach?",
    ob_target: "A jaka jest Twoja waga docelowa w kilogramach?",
    ob_final: "Ciekawe! Tak mogłoby wyglądać Twoje ciało.",
    ob_numerr: "Podaj mi liczbę, proszę — na przykład osiemdziesiąt.",
  },
  nl: {
    ob_goal: "Wat wil je met je lichaam bereiken?",
    ob_name: "Super! En hoe heet je?",
    ob_gender: "Ben je een man, een vrouw of anders?",
    ob_age: "Hoe oud ben je?",
    ob_weight: "Hoeveel weeg je op dit moment, in kilogram?",
    ob_height: "Hoe lang ben je, in centimeters?",
    ob_target: "En wat is je streefgewicht in kilogram?",
    ob_final: "Interessant! Zo zou je lichaam eruit kunnen zien.",
    ob_numerr: "Zeg me een getal, alsjeblieft — bijvoorbeeld tachtig.",
  },
  ar: {
    ob_goal: "ماذا تريد أن تحقق مع جسمك؟",
    ob_name: "رائع! وما اسمك؟",
    ob_gender: "هل أنت ذكر أم أنثى أم آخر؟",
    ob_age: "كم عمرك؟",
    ob_weight: "كم وزنك حاليًا بالكيلوغرام؟",
    ob_height: "كم طولك بالسنتيمتر؟",
    ob_target: "وما وزنك المستهدف بالكيلوغرام؟",
    ob_final: "مثير للاهتمام! هكذا قد يبدو جسمك.",
    ob_numerr: "قل لي رقمًا من فضلك — مثلًا ثمانين.",
  },
  hi: {
    ob_goal: "तुम अपने शरीर के साथ क्या पाना चाहते हो?",
    ob_name: "बढ़िया! और तुम्हारा नाम क्या है?",
    ob_gender: "तुम पुरुष हो, महिला या अन्य?",
    ob_age: "तुम्हारी उम्र कितनी है?",
    ob_weight: "अभी तुम्हारा वज़न कितना है, किलोग्राम में?",
    ob_height: "तुम्हारी लंबाई कितनी है, सेंटीमीटर में?",
    ob_target: "और तुम्हारा लक्ष्य वज़न किलोग्राम में क्या है?",
    ob_final: "दिलचस्प! तुम्हारा शरीर ऐसा दिख सकता है।",
    ob_numerr: "मुझे एक नंबर बताओ, प्लीज़ — जैसे अस्सी।",
  },
  id: {
    ob_goal: "Apa yang ingin kamu capai dengan tubuhmu?",
    ob_name: "Mantap! Siapa namamu?",
    ob_gender: "Kamu laki-laki, perempuan atau lainnya?",
    ob_age: "Berapa usiamu?",
    ob_weight: "Berapa berat badanmu sekarang, dalam kilogram?",
    ob_height: "Berapa tinggi badanmu, dalam sentimeter?",
    ob_target: "Dan berapa berat badan targetmu dalam kilogram?",
    ob_final: "Menarik! Seperti inilah tubuhmu bisa terlihat.",
    ob_numerr: "Sebutkan sebuah angka, ya — misalnya delapan puluh.",
  },
  ja: {
    ob_goal: "体でどんなことを達成したい?",
    ob_name: "いいね!名前は何て呼べばいい?",
    ob_gender: "性別は男性、女性、それともその他?",
    ob_age: "何歳?",
    ob_weight: "今の体重は何キログラム?",
    ob_height: "身長は何センチ?",
    ob_target: "じゃあ、目標体重は何キログラム?",
    ob_final: "いいね!あなたの体はこんなふうになれるかも。",
    ob_numerr: "数字で教えてね — 例えば、はちじゅう。",
  },
  ko: {
    ob_goal: "몸으로 무엇을 이루고 싶나요?",
    ob_name: "좋아요! 이름이 뭐예요?",
    ob_gender: "남성, 여성, 아니면 기타인가요?",
    ob_age: "나이가 어떻게 되나요?",
    ob_weight: "지금 체중이 몇 킬로그램인가요?",
    ob_height: "키가 몇 센티미터인가요?",
    ob_target: "그럼 목표 체중은 몇 킬로그램인가요?",
    ob_final: "흥미롭네요! 당신의 몸은 이렇게 될 수 있어요.",
    ob_numerr: "숫자로 말해 주세요 — 예를 들어 팔십처럼요.",
  },
  zh: {
    ob_goal: "你想让自己的身体达成什么目标？",
    ob_name: "很好！你叫什么名字？",
    ob_gender: "你是男性、女性，还是多元性别？",
    ob_age: "你多大了？",
    ob_weight: "你现在体重多少公斤？",
    ob_height: "你身高多少厘米？",
    ob_target: "那你的目标体重是多少公斤？",
    ob_final: "有意思！你的身体可以变成这样。",
    ob_numerr: "请告诉我一个数字——比如八十。",
  },
};

// ---- Kurz-Workout-Ansagen (alle 6 Sprachen) ----
const T = {
  de: { ready: "Mach dich bereit. Zuerst: {name}", work: "{name}. Los!", rest: "Pause. Als Nächstes: {name}", half: "Halbzeit", done: "Geschafft. Gut gemacht!" },
  en: { ready: "Get ready. First: {name}", work: "{name}. Go!", rest: "Rest. Next: {name}", half: "Halfway", done: "Done. Well done!" },
  fr: { ready: "Prépare-toi. D'abord : {name}", work: "{name}. Go !", rest: "Repos. Suivant : {name}", half: "Mi-parcours", done: "Terminé. Bien joué !" },
  it: { ready: "Preparati. Per primo: {name}", work: "{name}. Via!", rest: "Recupero. Prossimo: {name}", half: "Metà", done: "Fatto. Ben fatto!" },
  es: { ready: "Prepárate. Primero: {name}", work: "{name}. ¡Ya!", rest: "Descanso. Siguiente: {name}", half: "Mitad", done: "Hecho. ¡Bien hecho!" },
  tr: { ready: "Hazırlan. İlk: {name}", work: "{name}. Başla!", rest: "Dinlen. Sıradaki: {name}", half: "Yarısı bitti", done: "Bitti. Aferin!" },
  pt: { ready: "Prepare-se. Primeiro: {name}", work: "{name}. Vai!", rest: "Descanso. Próximo: {name}", half: "Metade do caminho", done: "Pronto. Muito bem!" },
  ru: { ready: "Приготовься. Первое: {name}", work: "{name}. Вперёд!", rest: "Отдых. Дальше: {name}", half: "Половина пройдена", done: "Готово. Отличная работа!" },
  pl: { ready: "Przygotuj się. Najpierw: {name}", work: "{name}. Start!", rest: "Przerwa. Następne: {name}", half: "Połowa", done: "Gotowe. Dobra robota!" },
  nl: { ready: "Maak je klaar. Eerst: {name}", work: "{name}. Go!", rest: "Rust. Volgende: {name}", half: "Halverwege", done: "Klaar. Goed gedaan!" },
  ar: { ready: "استعد. أولًا: {name}", work: "{name}. انطلق!", rest: "راحة. التالي: {name}", half: "منتصف الطريق", done: "انتهينا. أحسنت!" },
  hi: { ready: "तैयार हो जाओ। पहले: {name}", work: "{name}। शुरू!", rest: "आराम। अगला: {name}", half: "आधा हो गया", done: "हो गया। शाबाश!" },
  id: { ready: "Bersiaplah. Pertama: {name}", work: "{name}. Mulai!", rest: "Istirahat. Berikutnya: {name}", half: "Setengah jalan", done: "Selesai. Kerja bagus!" },
  ja: { ready: "準備して。最初は {name}", work: "{name}。スタート!", rest: "休憩。次は {name}", half: "折り返し", done: "完了。お疲れさま!" },
  ko: { ready: "준비하세요. 첫 번째: {name}", work: "{name}. 시작!", rest: "휴식. 다음: {name}", half: "절반 지났어요", done: "완료. 수고했어요!" },
  zh: { ready: "准备好。第一个：{name}", work: "{name}。开始！", rest: "休息。下一个：{name}", half: "过半了", done: "完成。干得漂亮！" },
};
const NAMES = {
  bench_dip: { de: "Dips an der Bank", en: "Bench Dip", fr: "Dips sur banc", it: "Dip alla panca", es: "Fondos en banco", tr: "Bank dips", pt: "Mergulho no banco", ru: "Обратные отжимания от скамьи", pl: "Dipy na ławce", nl: "Dips op de bank", ar: "ديبس على المقعد", hi: "बेंच डिप्स", id: "Dip di bangku", ja: "ベンチディップス", ko: "벤치 딥스", zh: "凳上臂屈伸" },
  bicycle_crunch: { de: "Fahrrad-Crunch", en: "Bicycle Crunch", fr: "Crunch bicyclette", it: "Crunch bicicletta", es: "Crunch bicicleta", tr: "Bisiklet mekik", pt: "Abdominal bicicleta", ru: "Скручивания «велосипед»", pl: "Brzuszki rowerek", nl: "Fiets-crunch", ar: "كرانش الدراجة", hi: "बाइसिकल क्रंच", id: "Crunch sepeda", ja: "バイシクルクランチ", ko: "바이시클 크런치", zh: "自行车卷腹" },
  burpees: { de: "Burpees", en: "Burpees", fr: "Burpees", it: "Burpees", es: "Burpees", tr: "Burpee", pt: "Burpees", ru: "Бёрпи", pl: "Burpees", nl: "Burpees", ar: "بيربي", hi: "बर्पीज़", id: "Burpee", ja: "バーピー", ko: "버피", zh: "波比跳" },
  crunch: { de: "Crunch", en: "Crunch", fr: "Crunch", it: "Crunch", es: "Crunch", tr: "Mekik", pt: "Abdominal crunch", ru: "Скручивания", pl: "Brzuszki", nl: "Crunch", ar: "كرانش", hi: "क्रंच", id: "Crunch", ja: "クランチ", ko: "크런치", zh: "卷腹" },
  diamond_pushup: { de: "Diamant-Liegestütz", en: "Diamond Push-Up", fr: "Pompes diamant", it: "Piegamenti a diamante", es: "Flexiones diamante", tr: "Elmas şınav", pt: "Flexão diamante", ru: "Алмазные отжимания", pl: "Pompki diamentowe", nl: "Diamant-push-up", ar: "الضغط الماسي", hi: "डायमंड पुश-अप", id: "Push-up berlian", ja: "ダイヤモンドプッシュアップ", ko: "다이아몬드 푸시업", zh: "钻石俯卧撑" },
  glute_bridge: { de: "Glute Bridge", en: "Glute Bridge", fr: "Pont fessier", it: "Ponte per glutei", es: "Puente de glúteos", tr: "Kalça köprüsü", pt: "Ponte de glúteos", ru: "Ягодичный мостик", pl: "Mostek biodrowy", nl: "Glute bridge", ar: "جسر المؤخرة", hi: "ग्लूट ब्रिज", id: "Glute bridge", ja: "ヒップリフト", ko: "힙 브리지", zh: "臀桥" },
  jump_squat: { de: "Sprungkniebeuge", en: "Jump Squat", fr: "Squat sauté", it: "Squat con salto", es: "Sentadilla con salto", tr: "Sıçramalı squat", pt: "Agachamento com salto", ru: "Приседания с выпрыгиванием", pl: "Przysiad z wyskokiem", nl: "Squat met sprong", ar: "سكوات بالقفز", hi: "जंप स्क्वाट", id: "Squat lompat", ja: "ジャンプスクワット", ko: "점프 스쿼트", zh: "深蹲跳" },
  jumping_jacks: { de: "Hampelmann", en: "Jumping Jacks", fr: "Jumping jacks", it: "Jumping jack", es: "Saltos de tijera", tr: "Jumping jack", pt: "Polichinelos", ru: "Прыжки «джампинг джек»", pl: "Pajacyki", nl: "Jumping jacks", ar: "جمبينغ جاك", hi: "जंपिंग जैक्स", id: "Jumping jack", ja: "ジャンピングジャック", ko: "점핑 잭", zh: "开合跳" },
  lying_leg_raise: { de: "Beinheben liegend", en: "Lying Leg Raise", fr: "Relevé de jambes allongé", it: "Alzate delle gambe da sdraiato", es: "Elevación de piernas tumbado", tr: "Yerde bacak kaldırma", pt: "Elevação de pernas deitado", ru: "Подъём ног лёжа", pl: "Unoszenie nóg w leżeniu", nl: "Liggend beenheffen", ar: "رفع الأرجل مستلقيًا", hi: "लेटकर लेग रेज़", id: "Angkat kaki berbaring", ja: "レッグレイズ", ko: "누워서 레그 레이즈", zh: "仰卧举腿" },
  mountain_climber: { de: "Bergsteiger", en: "Mountain Climber", fr: "Mountain climbers", it: "Mountain climber", es: "Escaladores", tr: "Dağcı hareketi", pt: "Escalador", ru: "«Скалолаз»", pl: "Wspinaczka górska", nl: "Mountain climbers", ar: "متسلق الجبال", hi: "माउंटेन क्लाइंबर", id: "Mountain climber", ja: "マウンテンクライマー", ko: "마운틴 클라이머", zh: "登山跑" },
  plank: { de: "Unterarmstütz", en: "Plank", fr: "Planche", it: "Plank", es: "Plancha", tr: "Plank", pt: "Prancha", ru: "Планка", pl: "Deska", nl: "Plank", ar: "بلانك", hi: "प्लैंक", id: "Plank", ja: "プランク", ko: "플랭크", zh: "平板支撑" },
  pushup: { de: "Liegestütz", en: "Push-Up", fr: "Pompes", it: "Piegamenti", es: "Flexiones", tr: "Şınav", pt: "Flexão de braço", ru: "Отжимания", pl: "Pompki", nl: "Push-up", ar: "تمرين الضغط", hi: "पुश-अप", id: "Push-up", ja: "プッシュアップ", ko: "푸시업", zh: "俯卧撑" },
  reverse_lunge: { de: "Ausfallschritt rückwärts", en: "Reverse Lunge", fr: "Fente arrière", it: "Affondo indietro", es: "Zancada hacia atrás", tr: "Geriye lunge", pt: "Afundo para trás", ru: "Выпады назад", pl: "Wykrok w tył", nl: "Lunge achterwaarts", ar: "لانجز خلفي", hi: "रिवर्स लंज", id: "Lunge ke belakang", ja: "バックランジ", ko: "리버스 런지", zh: "后撤箭步蹲" },
  side_plank: { de: "Seitstütz", en: "Side Plank", fr: "Planche latérale", it: "Plank laterale", es: "Plancha lateral", tr: "Yan plank", pt: "Prancha lateral", ru: "Боковая планка", pl: "Deska boczna", nl: "Zijplank", ar: "بلانك جانبي", hi: "साइड प्लैंक", id: "Plank samping", ja: "サイドプランク", ko: "사이드 플랭크", zh: "侧平板支撑" },
  squat: { de: "Kniebeuge", en: "Squat", fr: "Squat", it: "Squat", es: "Sentadilla", tr: "Squat", pt: "Agachamento", ru: "Приседания", pl: "Przysiad", nl: "Squat", ar: "سكوات", hi: "स्क्वाट", id: "Squat", ja: "スクワット", ko: "스쿼트", zh: "深蹲" },
  step_up: { de: "Step-Up", en: "Step-Up", fr: "Step-up", it: "Step-up", es: "Step-up", tr: "Step-up", pt: "Step-up", ru: "Зашагивания на возвышение", pl: "Wejścia na podwyższenie", nl: "Step-up", ar: "ستيب أب", hi: "स्टेप-अप", id: "Step-up", ja: "ステップアップ", ko: "스텝업", zh: "登台阶" },
  wall_sit: { de: "Wandsitzen", en: "Wall Sit", fr: "Chaise contre le mur", it: "Seduta al muro", es: "Sentadilla en pared", tr: "Duvar oturuşu", pt: "Cadeirinha na parede", ru: "«Стульчик» у стены", pl: "Krzesełko przy ścianie", nl: "Wall sit", ar: "جلسة الحائط", hi: "वॉल सिट", id: "Duduk di dinding", ja: "ウォールシット", ko: "월 싯", zh: "靠墙静蹲" },
};
const READY_KEYS = ["burpees", "crunch", "jumping_jacks", "squat"];

// --clip: Schluessel direkt aus der Zwischenablage lesen (nach dem "Copy"-Klick
// auf platform.openai.com) — kein Einfuegen noetig, er bleibt auf diesem Rechner.
let key = "";
if (process.argv.includes("--clip")) {
  try {
    key = execSync("powershell -NoProfile -Command Get-Clipboard", { encoding: "utf8" }).trim().split(/\s+/)[0];
  } catch {}
  if (!key.startsWith("sk-")) {
    console.error("In der Zwischenablage liegt kein OpenAI-Schluessel (sk-...). Bitte auf platform.openai.com erneut 'Copy' klicken und das Skript neu starten.");
    process.exit(1);
  }
  console.log("Schluessel aus der Zwischenablage uebernommen (sk-..." + key.slice(-4) + ")");
} else {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  key = await new Promise((res) => rl.question("OpenAI-API-Schluessel einfuegen (sk-...): ", (a) => res(a.trim())));
  rl.close();
  if (!key.startsWith("sk-")) {
    console.error("Das sieht nicht nach einem OpenAI-Schluessel aus — Abbruch.");
    process.exit(1);
  }
}

async function tts(text, lang, out) {
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { authorization: "Bearer " + key, "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: VOICE, input: text, instructions: INSTR[lang], response_format: "mp3" }),
  });
  if (!r.ok) throw new Error("OpenAI " + r.status + ": " + (await r.text()).slice(0, 180));
  writeFileSync(out, Buffer.from(await r.arrayBuffer()));
}

// --only <id>: nur diesen einen Clip (je Sprache) neu erzeugen, z. B. --only ob_final
const onlyIdx = process.argv.indexOf("--only");
const ONLY = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : null;
// --langs fr,it,es,tr: nur diese Sprachen erzeugen (Standard: alle sechs)
const langsIdx = process.argv.indexOf("--langs");
const LANGS = langsIdx !== -1 ? process.argv[langsIdx + 1].split(",").map((x) => x.trim()) : ["de", "en", "fr", "it", "es", "tr"];

const manifestPath = join(OUT, "manifest.json");
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
let okAll = 0;
let failAll = 0;

for (const lang of LANGS) {
  const dir = join(OUT, lang);
  mkdirSync(dir, { recursive: true });
  const name = (k) => NAMES[k][lang] || NAMES[k].en;
  let jobs = [
    ...Object.keys(NAMES).flatMap((k) => [
      { id: "work_" + k, text: T[lang].work.replace("{name}", name(k)) },
      { id: "rest_" + k, text: T[lang].rest.replace("{name}", name(k)) },
    ]),
    ...READY_KEYS.map((k) => ({ id: "ready_" + k, text: T[lang].ready.replace("{name}", name(k)) })),
    { id: "half", text: T[lang].half },
    { id: "done", text: T[lang].done },
    ...(OB[lang] ? Object.entries(OB[lang]).map(([id, text]) => ({ id, text })) : []),
  ];
  if (ONLY) jobs = jobs.filter((j) => j.id === ONLY);
  if (process.argv.includes("--ob")) jobs = jobs.filter((j) => j.id.startsWith("ob_"));
  const ids = new Set(Array.isArray(manifest[lang]) ? manifest[lang] : []);
  for (const j of jobs) {
    const out = join(dir, j.id + ".mp3");
    process.stdout.write(lang + "/" + j.id + " ... ");
    try {
      await tts(j.text, lang, out);
      ids.add(j.id);
      okAll++;
      console.log("ok");
    } catch (e) {
      failAll++;
      console.log("FEHLER: " + e.message);
    }
    await new Promise((r) => setTimeout(r, 220));
  }
  manifest[lang] = [...ids].sort();
  writeFileSync(manifestPath, JSON.stringify(manifest));
  console.log("— " + lang + " fertig");
}
console.log("\nFERTIG: " + okAll + " Clips erzeugt" + (failAll ? ", " + failAll + " Fehler" : "") + ". Manifest aktualisiert.");
