// KI-Anmeldung: Statt Formular spricht eine KI mit dem Nutzer („Willkommen bei
// ASFIT — was möchtest du mit deinem Körper erreichen? …") und sammelt Ziel,
// Name, Geschlecht, Alter, Gewicht, Grösse und Zielgewicht. Antworten per
// Mikrofon (Spracherkennung des Geräts), Antwort-Chips oder Tastatur.
// Am Ende: „So könnte dein Körper aussehen" — Plan und Übungs-Demos ZENSIERT
// (geblurrt). Freigeschaltet wird erst mit dem Probeabo; danach öffnet die App.
import { useState, useEffect, useRef } from "react";
import { speak, stopSpeaking, unlockAudio, playClip, warmClips, audioReady } from "./voice.js";
import { gifFor } from "./gifList.js";

const C = {
  bg: "var(--c-bg)",
  surface: "var(--c-surface)",
  raised: "var(--c-raised)",
  border: "var(--c-border)",
  text: "var(--c-text)",
  dim: "var(--c-dim)",
  gold: "var(--c-gold)",
  goldSoft: "var(--c-goldSoft)",
  coral: "var(--c-coral)",
};

// Texte des Gesprächs (de/en voll; andere Sprachen fallen auf Englisch zurück)
const AI = {
  de: {
    pickTitle: "Wie möchtest du starten?",
    pickAi: "Mit der KI sprechen",
    pickAiSub: "Die KI fragt dich alles — du antwortest einfach",
    pickManual: "Manuell ausfüllen",
    pickManualSub: "Klassisch mit Formular",
    welcome: "Was möchtest du mit deinem Körper erreichen?",
    qName: "Stark! Und wie heisst du?",
    qGender: "Bist du männlich, weiblich oder divers?",
    qAge: "Wie alt bist du?",
    qWeight: "Wie viel wiegst du gerade, in Kilogramm?",
    qHeight: "Wie gross bist du, in Zentimetern?",
    qTarget: "Und was ist dein Zielgewicht in Kilogramm?",
    final: () => "Interessant! So könnte dein Körper aussehen.",
    chipsGoal: [["cut", "Abnehmen"], ["bulk", "Muskeln aufbauen"], ["maintain", "Gewicht halten"]],
    chipsGender: [["male", "Männlich"], ["female", "Weiblich"], ["diverse", "Divers"]],
    mic: "Antwort sprechen",
    micListen: "Ich höre zu …",
    typePh: "… oder hier tippen",
    send: "Senden",
    numErr: "Sag mir bitte eine Zahl — zum Beispiel „80“.",
    previewTitle: "Dein persönlicher Plan ist bereit",
    previewSub: "So könnte dein Körper aussehen — Plan, Tagesziele und Übungs-Demos warten auf dich.",
    lockKcal: "Dein Kalorien-Tagesziel",
    lockPlan: "Dein 12-Wochen-Plan",
    lockDemos: "Deine Übungs-Demos",
    lockedHint: "Zensiert — schalte alles mit ASFIT Premium frei",
    cta: "Jetzt freischalten — ASFIT Premium",
    skip: "Lieber manuell ausfüllen",
  },
  en: {
    pickTitle: "How do you want to start?",
    pickAi: "Talk to the AI",
    pickAiSub: "The AI asks you everything — just answer",
    pickManual: "Fill in manually",
    pickManualSub: "Classic form",
    welcome: "What do you want to achieve with your body?",
    qName: "Great! What's your name?",
    qGender: "Are you male, female or diverse?",
    qAge: "How old are you?",
    qWeight: "How much do you weigh right now, in kilograms?",
    qHeight: "How tall are you, in centimeters?",
    qTarget: "And what's your target weight in kilograms?",
    final: () => "Interesting! This is how your body could look.",
    chipsGoal: [["cut", "Lose weight"], ["bulk", "Build muscle"], ["maintain", "Maintain"]],
    chipsGender: [["male", "Male"], ["female", "Female"], ["diverse", "Diverse"]],
    mic: "Speak your answer",
    micListen: "Listening …",
    typePh: "… or type here",
    send: "Send",
    numErr: "Please tell me a number — for example “80”.",
    previewTitle: "Your personal plan is ready",
    previewSub: "This is how your body could look — plan, daily targets and exercise demos are waiting.",
    lockKcal: "Your daily calorie target",
    lockPlan: "Your 12-week plan",
    lockDemos: "Your exercise demos",
    lockedHint: "Censored — unlock everything with ASFIT Premium",
    cta: "Unlock now — ASFIT Premium",
    skip: "Fill in manually instead",
  },
  fr: {
    welcome: "Que veux-tu accomplir avec ton corps ?",
    qName: "Super ! Et comment tu t'appelles ?",
    qGender: "Tu es un homme, une femme ou divers ?",
    qAge: "Quel âge as-tu ?",
    qWeight: "Combien pèses-tu en ce moment, en kilogrammes ?",
    qHeight: "Combien mesures-tu, en centimètres ?",
    qTarget: "Et quel est ton poids cible en kilogrammes ?",
    final: () => "Intéressant ! Voilà à quoi ton corps pourrait ressembler.",
    chipsGoal: [["cut", "Perdre du poids"], ["bulk", "Prendre du muscle"], ["maintain", "Maintenir"]],
    chipsGender: [["male", "Homme"], ["female", "Femme"], ["diverse", "Divers"]],
    mic: "Répondre à voix haute",
    micListen: "Je t'écoute …",
    typePh: "… ou tape ici",
    send: "Envoyer",
    numErr: "Dis-moi un nombre, s'il te plaît — par exemple « 80 ».",
    previewTitle: "Ton plan personnel est prêt",
    previewSub: "Voilà à quoi ton corps pourrait ressembler — plan, objectifs quotidiens et démos d'exercices t'attendent.",
    lockKcal: "Ton objectif calorique quotidien",
    lockPlan: "Ton plan de 12 semaines",
    lockDemos: "Tes démos d'exercices",
    lockedHint: "Censuré — débloque tout avec ASFIT Premium",
    cta: "Débloquer maintenant — ASFIT Premium",
    skip: "Remplir manuellement",
  },
  it: {
    welcome: "Cosa vuoi ottenere con il tuo corpo?",
    qName: "Ottimo! E come ti chiami?",
    qGender: "Sei maschio, femmina o diverso?",
    qAge: "Quanti anni hai?",
    qWeight: "Quanto pesi adesso, in chilogrammi?",
    qHeight: "Quanto sei alto, in centimetri?",
    qTarget: "E qual è il tuo peso obiettivo in chilogrammi?",
    final: () => "Interessante! Ecco come potrebbe apparire il tuo corpo.",
    chipsGoal: [["cut", "Dimagrire"], ["bulk", "Mettere muscoli"], ["maintain", "Mantenere"]],
    chipsGender: [["male", "Maschio"], ["female", "Femmina"], ["diverse", "Diverso"]],
    mic: "Rispondi a voce",
    micListen: "Ti ascolto …",
    typePh: "… o scrivi qui",
    send: "Invia",
    numErr: "Dimmi un numero, per favore — ad esempio «80».",
    previewTitle: "Il tuo piano personale è pronto",
    previewSub: "Ecco come potrebbe apparire il tuo corpo — piano, obiettivi giornalieri e demo degli esercizi ti aspettano.",
    lockKcal: "Il tuo obiettivo calorico giornaliero",
    lockPlan: "Il tuo piano di 12 settimane",
    lockDemos: "Le tue demo degli esercizi",
    lockedHint: "Censurato — sblocca tutto con ASFIT Premium",
    cta: "Sblocca ora — ASFIT Premium",
    skip: "Compila manualmente",
  },
  es: {
    welcome: "¿Qué quieres lograr con tu cuerpo?",
    qName: "¡Genial! ¿Y cómo te llamas?",
    qGender: "¿Eres hombre, mujer o diverso?",
    qAge: "¿Cuántos años tienes?",
    qWeight: "¿Cuánto pesas ahora mismo, en kilogramos?",
    qHeight: "¿Cuánto mides, en centímetros?",
    qTarget: "¿Y cuál es tu peso objetivo en kilogramos?",
    final: () => "¡Interesante! Así podría verse tu cuerpo.",
    chipsGoal: [["cut", "Bajar de peso"], ["bulk", "Ganar músculo"], ["maintain", "Mantener"]],
    chipsGender: [["male", "Hombre"], ["female", "Mujer"], ["diverse", "Diverso"]],
    mic: "Responder hablando",
    micListen: "Te escucho …",
    typePh: "… o escribe aquí",
    send: "Enviar",
    numErr: "Dime un número, por favor — por ejemplo «80».",
    previewTitle: "Tu plan personal está listo",
    previewSub: "Así podría verse tu cuerpo — plan, objetivos diarios y demos de ejercicios te esperan.",
    lockKcal: "Tu objetivo diario de calorías",
    lockPlan: "Tu plan de 12 semanas",
    lockDemos: "Tus demos de ejercicios",
    lockedHint: "Censurado — desbloquea todo con ASFIT Premium",
    cta: "Desbloquear ahora — ASFIT Premium",
    skip: "Rellenar manualmente",
  },
  tr: {
    welcome: "Vücudunla neyi başarmak istiyorsun?",
    qName: "Harika! Peki adın ne?",
    qGender: "Erkek misin, kadın mısın yoksa diğer mi?",
    qAge: "Kaç yaşındasın?",
    qWeight: "Şu anda kaç kilosun, kilogram olarak?",
    qHeight: "Boyun kaç, santimetre olarak?",
    qTarget: "Peki hedef kilon kaç kilogram?",
    final: () => "İlginç! Vücudun böyle görünebilir.",
    chipsGoal: [["cut", "Kilo vermek"], ["bulk", "Kas yapmak"], ["maintain", "Korumak"]],
    chipsGender: [["male", "Erkek"], ["female", "Kadın"], ["diverse", "Diğer"]],
    mic: "Sesli cevap ver",
    micListen: "Dinliyorum …",
    typePh: "… veya buraya yaz",
    send: "Gönder",
    numErr: "Lütfen bana bir sayı söyle — örneğin «80».",
    previewTitle: "Kişisel planın hazır",
    previewSub: "Vücudun böyle görünebilir — plan, günlük hedefler ve egzersiz demoları seni bekliyor.",
    lockKcal: "Günlük kalori hedefin",
    lockPlan: "12 haftalık planın",
    lockDemos: "Egzersiz demoların",
    lockedHint: "Sansürlü — ASFIT Premium ile her şeyin kilidini aç",
    cta: "Şimdi aç — ASFIT Premium",
    skip: "Manuel doldur",
  },
  pt: {
    welcome: "O que você quer alcançar com o seu corpo?",
    qName: "Ótimo! E qual é o seu nome?",
    qGender: "Você é homem, mulher ou outro?",
    qAge: "Quantos anos você tem?",
    qWeight: "Quanto você pesa agora, em quilogramas?",
    qHeight: "Quanto você mede, em centímetros?",
    qTarget: "E qual é o seu peso desejado em quilogramas?",
    final: () => "Interessante! É assim que seu corpo poderia ficar.",
    chipsGoal: [["cut", "Perder peso"], ["bulk", "Ganhar músculo"], ["maintain", "Manter"]],
    chipsGender: [["male", "Homem"], ["female", "Mulher"], ["diverse", "Outro"]],
    mic: "Responder por voz",
    micListen: "Estou ouvindo você …",
    typePh: "… ou digite aqui",
    send: "Enviar",
    numErr: "Me diga um número, por favor — por exemplo “80”.",
    previewTitle: "Seu plano pessoal está pronto",
    previewSub: "É assim que seu corpo poderia ficar — plano, metas diárias e demonstrações de exercícios esperam por você.",
    lockKcal: "Sua meta diária de calorias",
    lockPlan: "Seu plano de 12 semanas",
    lockDemos: "Suas demonstrações de exercícios",
    lockedHint: "Censurado — desbloqueie tudo com o ASFIT Premium",
    cta: "Desbloquear agora — ASFIT Premium",
    skip: "Preencher manualmente",
  },
  ru: {
    welcome: "Чего ты хочешь добиться со своим телом?",
    qName: "Отлично! А как тебя зовут?",
    qGender: "Ты мужчина, женщина или другое?",
    qAge: "Сколько тебе лет?",
    qWeight: "Сколько ты сейчас весишь, в килограммах?",
    qHeight: "Какой у тебя рост, в сантиметрах?",
    qTarget: "А какой у тебя целевой вес в килограммах?",
    final: () => "Интересно! Вот как могло бы выглядеть твоё тело.",
    chipsGoal: [["cut", "Похудеть"], ["bulk", "Набрать мышцы"], ["maintain", "Удержать вес"]],
    chipsGender: [["male", "Мужчина"], ["female", "Женщина"], ["diverse", "Другое"]],
    mic: "Ответить голосом",
    micListen: "Слушаю тебя …",
    typePh: "… или напиши здесь",
    send: "Отправить",
    numErr: "Назови мне число, пожалуйста — например «80».",
    previewTitle: "Твой личный план готов",
    previewSub: "Вот как могло бы выглядеть твоё тело — тебя ждут план, дневные цели и демо упражнений.",
    lockKcal: "Твоя дневная норма калорий",
    lockPlan: "Твой план на 12 недель",
    lockDemos: "Твои демо упражнений",
    lockedHint: "Скрыто — разблокируй всё с ASFIT Premium",
    cta: "Разблокировать сейчас — ASFIT Premium",
    skip: "Заполнить вручную",
  },
  pl: {
    welcome: "Co chcesz osiągnąć ze swoim ciałem?",
    qName: "Super! A jak masz na imię?",
    qGender: "Jesteś mężczyzną, kobietą czy osobą inną?",
    qAge: "Ile masz lat?",
    qWeight: "Ile teraz ważysz, w kilogramach?",
    qHeight: "Ile masz wzrostu, w centymetrach?",
    qTarget: "A jaka jest Twoja waga docelowa w kilogramach?",
    final: () => "Ciekawe! Tak mogłoby wyglądać Twoje ciało.",
    chipsGoal: [["cut", "Schudnąć"], ["bulk", "Zbudować mięśnie"], ["maintain", "Utrzymać"]],
    chipsGender: [["male", "Mężczyzna"], ["female", "Kobieta"], ["diverse", "Inna"]],
    mic: "Odpowiedz głosem",
    micListen: "Słucham Cię …",
    typePh: "… albo wpisz tutaj",
    send: "Wyślij",
    numErr: "Podaj mi liczbę, proszę — na przykład „80”.",
    previewTitle: "Twój osobisty plan jest gotowy",
    previewSub: "Tak mogłoby wyglądać Twoje ciało — plan, dzienne cele i demonstracje ćwiczeń czekają na Ciebie.",
    lockKcal: "Twój dzienny cel kaloryczny",
    lockPlan: "Twój plan na 12 tygodni",
    lockDemos: "Twoje demonstracje ćwiczeń",
    lockedHint: "Ukryte — odblokuj wszystko z ASFIT Premium",
    cta: "Odblokuj teraz — ASFIT Premium",
    skip: "Wypełnij ręcznie",
  },
  nl: {
    welcome: "Wat wil je met je lichaam bereiken?",
    qName: "Super! En hoe heet je?",
    qGender: "Ben je een man, een vrouw of anders?",
    qAge: "Hoe oud ben je?",
    qWeight: "Hoeveel weeg je op dit moment, in kilogram?",
    qHeight: "Hoe lang ben je, in centimeters?",
    qTarget: "En wat is je streefgewicht in kilogram?",
    final: () => "Interessant! Zo zou je lichaam eruit kunnen zien.",
    chipsGoal: [["cut", "Afvallen"], ["bulk", "Spieren opbouwen"], ["maintain", "Behouden"]],
    chipsGender: [["male", "Man"], ["female", "Vrouw"], ["diverse", "Anders"]],
    mic: "Hardop antwoorden",
    micListen: "Ik luister …",
    typePh: "… of typ hier",
    send: "Versturen",
    numErr: "Zeg me een getal, alsjeblieft — bijvoorbeeld „80\".",
    previewTitle: "Je persoonlijke plan is klaar",
    previewSub: "Zo zou je lichaam eruit kunnen zien — plan, dagelijkse doelen en oefeningdemo's staan voor je klaar.",
    lockKcal: "Je dagelijkse caloriedoel",
    lockPlan: "Je plan van 12 weken",
    lockDemos: "Je oefeningdemo's",
    lockedHint: "Vergrendeld — ontgrendel alles met ASFIT Premium",
    cta: "Nu ontgrendelen — ASFIT Premium",
    skip: "Handmatig invullen",
  },
  ar: {
    welcome: "ماذا تريد أن تحقق مع جسمك؟",
    qName: "رائع! وما اسمك؟",
    qGender: "هل أنت ذكر أم أنثى أم آخر؟",
    qAge: "كم عمرك؟",
    qWeight: "كم وزنك حاليًا بالكيلوغرام؟",
    qHeight: "كم طولك بالسنتيمتر؟",
    qTarget: "وما وزنك المستهدف بالكيلوغرام؟",
    final: () => "مثير للاهتمام! هكذا قد يبدو جسمك.",
    chipsGoal: [["cut", "خسارة الوزن"], ["bulk", "بناء العضلات"], ["maintain", "الحفاظ على الوزن"]],
    chipsGender: [["male", "ذكر"], ["female", "أنثى"], ["diverse", "آخر"]],
    mic: "أجب بصوتك",
    micListen: "أنا أستمع إليك …",
    typePh: "… أو اكتب هنا",
    send: "إرسال",
    numErr: "قل لي رقمًا من فضلك — مثلًا «80».",
    previewTitle: "خطتك الشخصية جاهزة",
    previewSub: "هكذا قد يبدو جسمك — الخطة والأهداف اليومية وعروض التمارين بانتظارك.",
    lockKcal: "هدف سعراتك اليومي",
    lockPlan: "خطتك لـ 12 أسبوعًا",
    lockDemos: "عروض تمارينك التوضيحية",
    lockedHint: "محجوب — افتح كل شيء مع ASFIT Premium",
    cta: "افتح الآن — ASFIT Premium",
    skip: "التعبئة يدويًا",
  },
  hi: {
    welcome: "तुम अपने शरीर के साथ क्या पाना चाहते हो?",
    qName: "बढ़िया! और तुम्हारा नाम क्या है?",
    qGender: "तुम पुरुष हो, महिला या अन्य?",
    qAge: "तुम्हारी उम्र कितनी है?",
    qWeight: "अभी तुम्हारा वज़न कितना है, किलोग्राम में?",
    qHeight: "तुम्हारी लंबाई कितनी है, सेंटीमीटर में?",
    qTarget: "और तुम्हारा लक्ष्य वज़न किलोग्राम में क्या है?",
    final: () => "दिलचस्प! तुम्हारा शरीर ऐसा दिख सकता है।",
    chipsGoal: [["cut", "वज़न घटाना"], ["bulk", "मसल बनाना"], ["maintain", "बनाए रखना"]],
    chipsGender: [["male", "पुरुष"], ["female", "महिला"], ["diverse", "अन्य"]],
    mic: "बोलकर जवाब दो",
    micListen: "मैं सुन रहा हूँ …",
    typePh: "… या यहाँ टाइप करो",
    send: "भेजो",
    numErr: "मुझे एक नंबर बताओ, प्लीज़ — जैसे «80»।",
    previewTitle: "तुम्हारा निजी प्लान तैयार है",
    previewSub: "तुम्हारा शरीर ऐसा दिख सकता है — प्लान, दैनिक लक्ष्य और एक्सरसाइज़ डेमो तुम्हारा इंतज़ार कर रहे हैं।",
    lockKcal: "तुम्हारा दैनिक कैलोरी लक्ष्य",
    lockPlan: "तुम्हारा 12 हफ़्तों का प्लान",
    lockDemos: "तुम्हारे एक्सरसाइज़ डेमो",
    lockedHint: "छिपा हुआ — ASFIT Premium से सब अनलॉक करो",
    cta: "अभी अनलॉक करो — ASFIT Premium",
    skip: "ख़ुद भरो",
  },
  id: {
    welcome: "Apa yang ingin kamu capai dengan tubuhmu?",
    qName: "Mantap! Siapa namamu?",
    qGender: "Kamu laki-laki, perempuan atau lainnya?",
    qAge: "Berapa usiamu?",
    qWeight: "Berapa berat badanmu sekarang, dalam kilogram?",
    qHeight: "Berapa tinggi badanmu, dalam sentimeter?",
    qTarget: "Dan berapa berat badan targetmu dalam kilogram?",
    final: () => "Menarik! Seperti inilah tubuhmu bisa terlihat.",
    chipsGoal: [["cut", "Turun berat badan"], ["bulk", "Bangun otot"], ["maintain", "Jaga berat"]],
    chipsGender: [["male", "Laki-laki"], ["female", "Perempuan"], ["diverse", "Lainnya"]],
    mic: "Jawab dengan suara",
    micListen: "Aku mendengarkan …",
    typePh: "… atau ketik di sini",
    send: "Kirim",
    numErr: "Sebutkan sebuah angka, ya — misalnya \"80\".",
    previewTitle: "Rencana pribadimu sudah siap",
    previewSub: "Seperti inilah tubuhmu bisa terlihat — rencana, target harian dan demo latihan menantimu.",
    lockKcal: "Target kalori harianmu",
    lockPlan: "Program 12 minggumu",
    lockDemos: "Demo latihanmu",
    lockedHint: "Disensor — buka semuanya dengan ASFIT Premium",
    cta: "Buka sekarang — ASFIT Premium",
    skip: "Isi manual",
  },
  ja: {
    welcome: "体でどんなことを達成したい?",
    qName: "いいね!名前は何て呼べばいい?",
    qGender: "性別は男性、女性、それともその他?",
    qAge: "何歳?",
    qWeight: "今の体重は何キロ?",
    qHeight: "身長は何センチ?",
    qTarget: "じゃあ、目標体重は何キロ?",
    final: () => "いいね!あなたの体はこんなふうになれるかも。",
    chipsGoal: [["cut", "減量する"], ["bulk", "筋肉をつける"], ["maintain", "キープする"]],
    chipsGender: [["male", "男性"], ["female", "女性"], ["diverse", "その他"]],
    mic: "声で答える",
    micListen: "聞いてるよ…",
    typePh: "…またはここに入力",
    send: "送信",
    numErr: "数字で教えてね — 例えば「80」。",
    previewTitle: "あなた専用プランが完成",
    previewSub: "あなたの体はこんなふうになれるかも — プラン、1日の目標、エクササイズのデモが待ってるよ。",
    lockKcal: "あなたの1日のカロリー目標",
    lockPlan: "あなたの12週間プラン",
    lockDemos: "あなたのエクササイズデモ",
    lockedHint: "モザイク中 — ASFIT Premium ですべてアンロック",
    cta: "今すぐアンロック — ASFIT Premium",
    skip: "手動で入力",
  },
  ko: {
    welcome: "몸으로 무엇을 이루고 싶나요?",
    qName: "좋아요! 이름이 뭐예요?",
    qGender: "남성, 여성, 아니면 기타인가요?",
    qAge: "나이가 어떻게 되나요?",
    qWeight: "지금 체중이 몇 킬로그램인가요?",
    qHeight: "키가 몇 센티미터인가요?",
    qTarget: "그럼 목표 체중은 몇 킬로그램인가요?",
    final: () => "흥미롭네요! 당신의 몸은 이렇게 될 수 있어요.",
    chipsGoal: [["cut", "체중 감량"], ["bulk", "근육 키우기"], ["maintain", "체중 유지"]],
    chipsGender: [["male", "남성"], ["female", "여성"], ["diverse", "기타"]],
    mic: "말로 대답하기",
    micListen: "듣고 있어요 …",
    typePh: "… 또는 여기에 입력",
    send: "보내기",
    numErr: "숫자로 말해 주세요 — 예를 들어 「80」처럼요.",
    previewTitle: "나만의 플랜이 준비됐어요",
    previewSub: "당신의 몸은 이렇게 될 수 있어요 — 플랜, 하루 목표, 운동 데모가 기다리고 있어요.",
    lockKcal: "나의 하루 칼로리 목표",
    lockPlan: "나의 12주 플랜",
    lockDemos: "나의 운동 데모",
    lockedHint: "가려져 있어요 — ASFIT Premium으로 모두 잠금 해제",
    cta: "지금 잠금 해제 — ASFIT Premium",
    skip: "직접 입력하기",
  },
  zh: {
    welcome: "你想让自己的身体达成什么目标？",
    qName: "很好！你叫什么名字？",
    qGender: "你是男性、女性，还是多元性别？",
    qAge: "你多大了？",
    qWeight: "你现在体重多少公斤？",
    qHeight: "你身高多少厘米？",
    qTarget: "那你的目标体重是多少公斤？",
    final: () => "有意思！你的身体可以变成这样。",
    chipsGoal: [["cut", "减重"], ["bulk", "增肌"], ["maintain", "保持体重"]],
    chipsGender: [["male", "男"], ["female", "女"], ["diverse", "多元"]],
    mic: "语音回答",
    micListen: "我在听……",
    typePh: "……或在这里输入",
    send: "发送",
    numErr: "请告诉我一个数字——比如“80”。",
    previewTitle: "你的个人计划已就绪",
    previewSub: "你的身体可以变成这样——计划、每日目标和动作演示都在等你。",
    lockKcal: "你的每日卡路里目标",
    lockPlan: "你的 12 周计划",
    lockDemos: "你的动作演示",
    lockedHint: "已遮挡——用 ASFIT Premium 解锁全部",
    cta: "立即解锁——ASFIT Premium",
    skip: "改为手动填写",
  },
};
export const aiT = (lang) => AI[String(lang || "de").slice(0, 2)] || AI.en;

// ---------------------------------------------------------------------------
// Der ASFIT-Orb: Echtzeit-Canvas-Animation in Flaggschiff-Qualität.
// Eine wogende, kreisförmige Stimmwelle aus Licht, umkreist von glühenden
// Partikeln, mit atmendem Kern — 60 fps, additives Leuchten, nie derselbe
// Moment zweimal. Zustände: idle (ruhiges Atmen), speak (rhythmisches
// Sprechen), listen (energisch, hellwach).
export function AsfitOrb({ state = "idle", size = 190, onClick }) {
  const ref = useRef(null);
  const stRef = useRef(state);
  stRef.current = state;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.3;
    // Partikel auf elliptischen Bahnen (leicht 3D durch z-Skalierung)
    const P = Array.from({ length: 30 }, (_, i) => ({
      a: Math.random() * Math.PI * 2,
      sp: (0.12 + Math.random() * 0.5) * (Math.random() < 0.5 ? 1 : -1),
      r: R * (1.12 + Math.random() * 0.55),
      tilt: 0.45 + Math.random() * 0.5,
      size: 0.8 + Math.random() * 1.9,
      tw: Math.random() * Math.PI * 2,
    }));
    let raf = 0;
    let t = 0;
    let energy = 0; // weiche Überblendung zwischen den Zuständen
    const draw = () => {
      const st = stRef.current;
      const target = st === "listen" ? 1 : st === "speak" ? 0.55 : 0.22;
      energy += (target - energy) * 0.04;
      t += 0.016 * (0.7 + energy * 1.6);
      ctx.clearRect(0, 0, size, size);

      // Raumglow
      const glow = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, size * 0.52);
      glow.addColorStop(0, `rgba(232,70,62,${0.16 + energy * 0.2})`);
      glow.addColorStop(1, "rgba(232,70,62,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      ctx.globalCompositeOperation = "lighter";

      // „Stimme": simulierte Amplitude (mehrere überlagerte Frequenzen)
      const voice = st === "speak" ? 0.55 + 0.45 * Math.abs(Math.sin(t * 5.2) * Math.sin(t * 2.3) + 0.4 * Math.sin(t * 9.1)) : 1;

      // wogender Licht-Ring (3 Schichten: breiter Schein, Kante, heisse Spitze)
      const wob = (ang, k1, k2, amp) => Math.sin(ang * k1 + t * 1.9) * amp + Math.sin(ang * k2 - t * 1.3) * amp * 0.6;
      const layers = [
        { w: 10, alpha: 0.10 + energy * 0.10, amp: 4 + energy * 9, blur: 18, col: "232,70,62" },
        { w: 3.2, alpha: 0.5 + energy * 0.35, amp: 3.4 + energy * 8, blur: 8, col: "255,110,90" },
        { w: 1.4, alpha: 0.85, amp: 3.4 + energy * 8, blur: 3, col: "255,196,180" },
      ];
      for (const L of layers) {
        ctx.beginPath();
        for (let i = 0; i <= 120; i++) {
          const ang = (i / 120) * Math.PI * 2;
          const rr = R + wob(ang, 5, 9, L.amp) * voice;
          const x = cx + Math.cos(ang) * rr;
          const y = cy + Math.sin(ang) * rr;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(${L.col},${L.alpha})`;
        ctx.lineWidth = L.w;
        ctx.shadowColor = `rgba(${L.col},0.9)`;
        ctx.shadowBlur = L.blur;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // atmender Kern
      const breathe = 1 + Math.sin(t * (st === "listen" ? 4.2 : 1.6)) * (0.05 + energy * 0.1);
      const coreR = R * 0.5 * breathe * (st === "speak" ? 0.82 + voice * 0.25 : 1);
      const core = ctx.createRadialGradient(cx - coreR * 0.2, cy - coreR * 0.25, coreR * 0.08, cx, cy, coreR);
      core.addColorStop(0, "rgba(255,236,228,0.95)");
      core.addColorStop(0.35, `rgba(255,140,115,${0.6 + energy * 0.3})`);
      core.addColorStop(1, "rgba(180,25,30,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      // glühende Partikel, die den Ring umkreisen
      for (const p of P) {
        p.a += p.sp * 0.013 * (0.7 + energy * 1.8);
        const px = cx + Math.cos(p.a) * p.r;
        const py = cy + Math.sin(p.a) * p.r * p.tilt;
        const depth = (Math.sin(p.a) + 1) / 2; // hinten dunkler/kleiner
        const tw = 0.55 + 0.45 * Math.sin(t * 3 + p.tw);
        ctx.beginPath();
        ctx.arc(px, py, p.size * (0.6 + depth * 0.7), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,${150 + depth * 60},${120 + depth * 50},${(0.25 + depth * 0.6) * tw})`;
        ctx.shadowColor = "rgba(255,140,110,0.9)";
        ctx.shadowBlur = 6;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);
  return <canvas ref={ref} data-ai-orb onClick={onClick} style={{ width: size, height: size, cursor: "pointer", display: "block" }} />;
}

const SR = () => (typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null;
const srLang = (l) => ({ de: "de-DE", en: "en-GB", fr: "fr-FR", it: "it-IT", es: "es-ES", tr: "tr-TR", pt: "pt-BR", ru: "ru-RU", pl: "pl-PL", nl: "nl-NL", ar: "ar-SA", hi: "hi-IN", id: "id-ID", ja: "ja-JP", ko: "ko-KR", zh: "zh-CN" }[String(l).slice(0, 2)] || "en-GB");
const firstNumber = (s) => {
  const m = String(s).replace(",", ".").match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};

// Auswahl-Screen: KI-Gespräch oder manuelles Formular
export function OnboardModePick({ lang, onPick }) {
  const t = aiT(lang);
  const card = (emoji, title, sub, mode, highlight) => (
    <div
      data-ob-mode={mode}
      onClick={() => onPick(mode)}
      style={{ padding: "22px 18px", borderRadius: 18, marginBottom: 14, cursor: "pointer", textAlign: "center", background: highlight ? C.goldSoft : C.surface, border: `2px solid ${highlight ? C.gold : C.border}` }}
    >
      <div style={{ fontSize: 34, marginBottom: 8 }}>{emoji}</div>
      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 16.5, fontWeight: 700, color: C.text }}>{title}</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.dim, marginTop: 5, lineHeight: 1.45 }}>{sub}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 24px 28px", justifyContent: "center" }}>
      <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: C.text, textAlign: "center", margin: "0 0 24px" }}>{t.pickTitle}</h2>
      {card("🎙️", t.pickAi, t.pickAiSub, "ai", true)}
      {card("✍️", t.pickManual, t.pickManualSub, "manual", false)}
    </div>
  );
}

// Das KI-Gespräch: Vollbild-Spracherlebnis OHNE Chat. Zuerst wird das echte
// Live-Gespräch versucht (OpenAI-Echtzeitmodell per WebRTC — hört zu, versteht,
// antwortet frei wie ChatGPT). Scheitert Verbindung oder Mikrofon, übernimmt
// nahtlos das bewährte Clip-Onboarding.
export function AiOnboarding({ lang, onDone, onManual }) {
  const [mode, setMode] = useState("live"); // live | clips
  if (mode === "clips") return <AiVoiceOnboarding lang={lang} onDone={onDone} onManual={onManual} />;
  return <LiveVoiceOnboarding lang={lang} onDone={onDone} onManual={onManual} onFallback={() => setMode("clips")} />;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

// Live-Gespräch mit OpenAIs Echtzeit-Modell: Audio in beide Richtungen per WebRTC,
// die KI stellt die Fragen frei, versteht die Antworten selbst und füllt die
// Felder über Werkzeug-Aufrufe (set_field/finish). Der API-Schlüssel bleibt auf
// dem Server — die App holt sich nur ein kurzlebiges Ticket.
function LiveVoiceOnboarding({ lang, onDone, onManual, onFallback }) {
  const s2 = String(lang || "de").slice(0, 2);
  const l2 = FIELD_LABELS[s2] ? s2 : "en";
  const FL = FIELD_LABELS[l2];
  const [state, setState] = useState("speak");
  const [data, setData] = useState({});
  const [step, setStep] = useState("talk"); // talk | preview
  const [needsTap, setNeedsTap] = useState(false);
  const connRef = useRef(null);
  const dataRef = useRef({});
  const doneRef = useRef(false);
  const fellRef = useRef(false);

  const cleanup = () => {
    const c = connRef.current;
    connRef.current = null;
    if (!c) return;
    try {
      if (c.dc) c.dc.close();
    } catch {}
    try {
      if (c.pc) c.pc.close();
    } catch {}
    try {
      if (c.mic) c.mic.getTracks().forEach((t) => t.stop());
    } catch {}
    try {
      if (c.audioEl) c.audioEl.srcObject = null;
    } catch {}
  };
  const fallback = () => {
    if (fellRef.current || doneRef.current) return;
    fellRef.current = true;
    cleanup();
    onFallback();
  };

  const applyField = (field, value) => {
    const d = { ...dataRef.current };
    const v = String(value == null ? "" : value).trim();
    if (field === "goal") {
      if (["cut", "bulk", "maintain"].includes(v)) d.goal = v;
    } else if (field === "gender") {
      if (["male", "female", "diverse"].includes(v)) d.gender = v;
    } else if (field === "name") {
      const n = v.split(/\s+/)[0] || "";
      if (n) d.name = n.charAt(0).toUpperCase() + n.slice(1);
    } else {
      const n = parseFloat(v.replace(",", "."));
      if (Number.isFinite(n)) {
        if (field === "height") d.height = n < 3 ? Math.round(n * 100) : Math.round(n);
        else d[field] = Math.round(n);
      }
    }
    dataRef.current = d;
    setData(d);
  };

  const previewTimerRef = useRef(null);
  const goPreview = () => {
    clearTimeout(previewTimerRef.current);
    cleanup();
    setStep("preview");
  };
  const finishTalk = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    // Die Vorschau kommt erst, wenn der Schlusssatz FERTIG gesprochen ist
    // (output_audio_buffer.stopped) — dieser Timer ist nur das Sicherheitsnetz.
    previewTimerRef.current = setTimeout(goPreview, 9000);
  };

  const connect = async () => {
    try {
      const sRes = await fetch(API_BASE + "/api/ai/realtime-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang: l2 }),
      });
      if (!sRes.ok) return fallback();
      const { client_secret, model } = await sRes.json();
      // Echo-Entfernung ist entscheidend: ohne sie hört die KI ihre eigene
      // Stimme aus dem Lautsprecher und fühlt sich ständig unterbrochen.
      const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (fellRef.current) {
        mic.getTracks().forEach((t) => t.stop());
        return;
      }
      const pc = new RTCPeerConnection();
      const audioEl = new Audio();
      audioEl.autoplay = true;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
        const p = audioEl.play();
        // Sollte der Browser die Wiedergabe doch sperren, wartet der Orb auf einen Tipp
        if (p && p.catch) p.catch(() => setNeedsTap(true));
      };
      mic.getTracks().forEach((t) => pc.addTrack(t, mic));
      const dc = pc.createDataChannel("oai-events");
      connRef.current = { pc, dc, mic, audioEl };
      // Kommt die Verbindung nicht zustande, übernimmt das Clip-Onboarding
      const guard = setTimeout(() => {
        if (!fellRef.current && dc.readyState !== "open") fallback();
      }, 12000);
      dc.onopen = () => {
        clearTimeout(guard);
        setState("speak");
        try {
          dc.send(JSON.stringify({ type: "response.create" }));
        } catch {}
      };
      dc.onclose = () => {
        if (!doneRef.current) fallback();
      };
      dc.onmessage = (m) => {
        let ev;
        try {
          ev = JSON.parse(m.data);
        } catch {
          return;
        }
        const t = ev.type || "";
        if (t === "output_audio_buffer.started") setState("speak");
        else if (t === "output_audio_buffer.stopped" || t === "output_audio_buffer.cleared") {
          if (doneRef.current) setTimeout(goPreview, 400);
          else setState("listen");
        } else if (t === "input_audio_buffer.speech_started") {
          if (!doneRef.current) setState("listen");
        } else if (t === "response.output_item.done" && ev.item && ev.item.type === "function_call") {
          let args = {};
          try {
            args = JSON.parse(ev.item.arguments || "{}");
          } catch {}
          if (ev.item.name === "set_field") {
            applyField(args.field, args.value);
            try {
              dc.send(JSON.stringify({ type: "conversation.item.create", item: { type: "function_call_output", call_id: ev.item.call_id, output: JSON.stringify({ ok: true }) } }));
              dc.send(JSON.stringify({ type: "response.create" }));
            } catch {}
          } else if (ev.item.name === "finish") {
            try {
              dc.send(JSON.stringify({ type: "conversation.item.create", item: { type: "function_call_output", call_id: ev.item.call_id, output: JSON.stringify({ ok: true }) } }));
            } catch {}
            finishTalk();
          }
        }
      };
      pc.onconnectionstatechange = () => {
        if ((pc.connectionState === "failed" || pc.connectionState === "disconnected") && !doneRef.current) fallback();
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const aRes = await fetch("https://api.openai.com/v1/realtime/calls?model=" + encodeURIComponent(model), {
        method: "POST",
        headers: { authorization: "Bearer " + client_secret, "content-type": "application/sdp" },
        body: offer.sdp,
      });
      if (!aRes.ok) return fallback();
      await pc.setRemoteDescription({ type: "answer", sdp: await aRes.text() });
    } catch {
      fallback();
    }
  };

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return undefined;
    didInit.current = true;
    unlockAudio();
    // Sofort starten: Die Mikrofon-Anfrage des Browsers erscheint direkt beim
    // Laden. Eine aktive Mikrofon-Freigabe erlaubt auch die Tonwiedergabe —
    // der Start-Tipp auf den Orb bleibt nur als seltener Notnagel.
    connect();
    return () => cleanup();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const startByTap = () => {
    unlockAudio();
    const c = connRef.current;
    if (c && c.audioEl) {
      const p = c.audioEl.play();
      if (p && p.then) p.then(() => setNeedsTap(false)).catch(() => {});
    } else setNeedsTap(false);
  };

  if (step === "preview") {
    return <CensoredPreview lang={lang} data={dataRef.current} onUnlock={() => onDone(dataRef.current)} />;
  }

  const ORDER = ["goal", "name", "gender", "age", "weight", "height", "target"];
  const rows = ORDER.map((k) => {
    let v = data[k];
    if (k === "goal" && v) v = GOAL_WORDS[l2][v];
    if (k === "gender" && v) v = GENDER_WORDS[l2][v];
    if ((k === "weight" || k === "target") && v) v = v + " kg";
    if (k === "height" && v) v = v + " cm";
    return { k, label: FL[k], value: v };
  });

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", padding: "0 22px 22px", overflow: "hidden" }}>
      {/* zensierte Angaben im Hintergrund */}
      <div aria-hidden="true" style={{ position: "absolute", left: 22, right: 22, bottom: 20, zIndex: 0 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "14px 16px", opacity: 0.85 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "Sora, sans-serif", fontSize: 11.5, fontWeight: 700, color: C.dim, letterSpacing: 0.5, marginBottom: 8 }}>
            <span>{DATA_TITLE[l2]}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>
          </div>
          {rows.map((r) => (
            <div key={r.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.dim }}>{r.label}</span>
              <span style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 700, color: r.value ? C.gold : C.dim, filter: r.value ? "blur(5px)" : "none", userSelect: "none" }}>
                {r.value || "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Kopf: Stift-Symbol als Ausweg zum Formular */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "16px 0 0", zIndex: 1 }}>
        <div data-ai-manual onClick={onManual} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: 0.6 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9aa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </div>
      </div>

      {/* Mitte: nur der Orb — das Gespräch führt die Stimme */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 1, paddingBottom: 150 }}>
        <AsfitOrb state={state} size={230} onClick={() => needsTap && startByTap()} />
      </div>
    </div>
  );
}

const FIELD_LABELS = {
  de: { goal: "Ziel", name: "Name", gender: "Geschlecht", age: "Alter", weight: "Gewicht", height: "Grösse", target: "Zielgewicht" },
  en: { goal: "Goal", name: "Name", gender: "Gender", age: "Age", weight: "Weight", height: "Height", target: "Target weight" },
  fr: { goal: "Objectif", name: "Nom", gender: "Genre", age: "Âge", weight: "Poids", height: "Taille", target: "Poids cible" },
  it: { goal: "Obiettivo", name: "Nome", gender: "Genere", age: "Età", weight: "Peso", height: "Altezza", target: "Peso obiettivo" },
  es: { goal: "Objetivo", name: "Nombre", gender: "Género", age: "Edad", weight: "Peso", height: "Altura", target: "Peso objetivo" },
  tr: { goal: "Hedef", name: "Ad", gender: "Cinsiyet", age: "Yaş", weight: "Kilo", height: "Boy", target: "Hedef kilo" },
  pt: { goal: "Objetivo", name: "Nome", gender: "Gênero", age: "Idade", weight: "Peso", height: "Altura", target: "Peso desejado" },
  ru: { goal: "Цель", name: "Имя", gender: "Пол", age: "Возраст", weight: "Вес", height: "Рост", target: "Целевой вес" },
  pl: { goal: "Cel", name: "Imię", gender: "Płeć", age: "Wiek", weight: "Waga", height: "Wzrost", target: "Waga docelowa" },
  nl: { goal: "Doel", name: "Naam", gender: "Geslacht", age: "Leeftijd", weight: "Gewicht", height: "Lengte", target: "Streefgewicht" },
  ar: { goal: "الهدف", name: "الاسم", gender: "الجنس", age: "العمر", weight: "الوزن", height: "الطول", target: "الوزن المستهدف" },
  hi: { goal: "लक्ष्य", name: "नाम", gender: "लिंग", age: "उम्र", weight: "वज़न", height: "लंबाई", target: "लक्ष्य वज़न" },
  id: { goal: "Tujuan", name: "Nama", gender: "Jenis kelamin", age: "Usia", weight: "Berat", height: "Tinggi", target: "Berat target" },
  ja: { goal: "目標", name: "名前", gender: "性別", age: "年齢", weight: "体重", height: "身長", target: "目標体重" },
  ko: { goal: "목표", name: "이름", gender: "성별", age: "나이", weight: "체중", height: "키", target: "목표 체중" },
  zh: { goal: "目标", name: "名字", gender: "性别", age: "年龄", weight: "体重", height: "身高", target: "目标体重" },
};
const DATA_TITLE = { de: "DEINE ANGABEN", en: "YOUR DETAILS", fr: "TES DONNÉES", it: "I TUOI DATI", es: "TUS DATOS", tr: "BİLGİLERİN", pt: "SEUS DADOS", ru: "ТВОИ ДАННЫЕ", pl: "TWOJE DANE", nl: "JOUW GEGEVENS", ar: "بياناتك", hi: "तुम्हारी जानकारी", id: "DATA KAMU", ja: "あなたのデータ", ko: "나의 정보", zh: "你的资料" };
const GOAL_WORDS = {
  de: { cut: "Abnehmen", bulk: "Muskeln aufbauen", maintain: "Gewicht halten" },
  en: { cut: "Lose weight", bulk: "Build muscle", maintain: "Maintain" },
  fr: { cut: "Perdre du poids", bulk: "Prendre du muscle", maintain: "Maintenir" },
  it: { cut: "Dimagrire", bulk: "Mettere muscoli", maintain: "Mantenere" },
  es: { cut: "Bajar de peso", bulk: "Ganar músculo", maintain: "Mantener" },
  tr: { cut: "Kilo vermek", bulk: "Kas yapmak", maintain: "Korumak" },
  pt: { cut: "Perder peso", bulk: "Ganhar músculo", maintain: "Manter" },
  ru: { cut: "Похудеть", bulk: "Набрать мышцы", maintain: "Удержать вес" },
  pl: { cut: "Schudnąć", bulk: "Zbudować mięśnie", maintain: "Utrzymać" },
  nl: { cut: "Afvallen", bulk: "Spieren opbouwen", maintain: "Behouden" },
  ar: { cut: "خسارة الوزن", bulk: "بناء العضلات", maintain: "الحفاظ على الوزن" },
  hi: { cut: "वज़न घटाना", bulk: "मसल बनाना", maintain: "बनाए रखना" },
  id: { cut: "Turun berat badan", bulk: "Bangun otot", maintain: "Jaga berat" },
  ja: { cut: "減量する", bulk: "筋肉をつける", maintain: "キープする" },
  ko: { cut: "체중 감량", bulk: "근육 키우기", maintain: "체중 유지" },
  zh: { cut: "减重", bulk: "增肌", maintain: "保持体重" },
};
const GENDER_WORDS = {
  de: { male: "Männlich", female: "Weiblich", diverse: "Divers" },
  en: { male: "Male", female: "Female", diverse: "Diverse" },
  fr: { male: "Homme", female: "Femme", diverse: "Divers" },
  it: { male: "Maschio", female: "Femmina", diverse: "Diverso" },
  es: { male: "Hombre", female: "Mujer", diverse: "Diverso" },
  tr: { male: "Erkek", female: "Kadın", diverse: "Diğer" },
  pt: { male: "Homem", female: "Mulher", diverse: "Outro" },
  ru: { male: "Мужчина", female: "Женщина", diverse: "Другое" },
  pl: { male: "Mężczyzna", female: "Kobieta", diverse: "Inna" },
  nl: { male: "Man", female: "Vrouw", diverse: "Anders" },
  ar: { male: "ذكر", female: "أنثى", diverse: "آخر" },
  hi: { male: "पुरुष", female: "महिला", diverse: "अन्य" },
  id: { male: "Laki-laki", female: "Perempuan", diverse: "Lainnya" },
  ja: { male: "男性", female: "女性", diverse: "その他" },
  ko: { male: "남성", female: "여성", diverse: "기타" },
  zh: { male: "男", female: "女", diverse: "多元" },
};

function AiVoiceOnboarding({ lang, onDone, onManual }) {
  const t = aiT(lang);
  const s2 = String(lang || "de").slice(0, 2);
  const l2 = FIELD_LABELS[s2] ? s2 : "en";
  const FL = FIELD_LABELS[l2];
  const [step, setStep] = useState("goal");
  const [question, setQuestion] = useState("");
  const [state, setState] = useState("speak"); // speak | listen | idle
  const [data, setData] = useState({});
  const [fails, setFails] = useState(0);
  const [typed, setTyped] = useState("");
  const [caption, setCaption] = useState("");
  const recRef = useRef(null);
  const stepRef = useRef("goal");
  const dataRef = useRef({});
  const failsRef = useRef(0);

  const ORDER = ["goal", "name", "gender", "age", "weight", "height", "target"];
  const qOf = (s) => ({ goal: t.welcome, name: t.qName, gender: t.qGender, age: t.qAge, weight: t.qWeight, height: t.qHeight, target: t.qTarget }[s]);

  const listen = () => {
    const Rec = SR();
    if (!Rec) {
      setState("idle");
      setFails(9); // kein Mikrofon: Eingabe-Fallback zeigen
      return;
    }
    try {
      if (recRef.current) recRef.current.abort();
      const r = new Rec();
      recRef.current = r;
      r.lang = srLang(lang);
      // Zwischenergebnisse: Eindeutige Antworten werden SOFORT übernommen,
      // ohne auf die Sprechpause zu warten — fühlt sich an wie ein Gespräch.
      r.interimResults = true;
      r.continuous = true; // nicht nach der ersten Pause aufgeben — zuhören wie ein Gesprächspartner
      r.maxAlternatives = 1;
      let got = false;
      let settled = false;
      let numTimer = null;
      const fail = () => {
        if (settled) return;
        settled = true;
        clearTimeout(numTimer);
        try {
          r.abort();
        } catch {}
        failsRef.current += 1;
        setFails(failsRef.current);
        // Wie ein echtes Gespräch: das Mikrofon öffnet sich von selbst wieder —
        // erst nach vielen stillen Versuchen wartet der Orb auf einen Tipp.
        const s = stepRef.current;
        if (failsRef.current < 6 && s !== "final" && s !== "preview") {
          setTimeout(() => {
            if (stepRef.current === s) listen();
          }, 300);
        } else {
          setState("idle");
        }
      };
      const accept = (text) => {
        if (settled) return;
        got = true;
        settled = true;
        clearTimeout(guard);
        clearTimeout(numTimer);
        try {
          r.abort();
        } catch {}
        handleAnswer(text);
      };
      // Zeitwächter: Wenn in 8 s weder Sprache noch Fehler kommt (z. B. Mikrofon
      // blockiert oder Freigabe hängt), gilt der Versuch als gescheitert.
      const guard = setTimeout(fail, 8000);
      r.onresult = (e) => {
        if (settled) return;
        let text = "";
        let anyFinal = false;
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i][0].transcript + " ";
          if (e.results[i].isFinal) anyFinal = true;
        }
        text = text.trim();
        const s = stepRef.current;
        if (anyFinal) return accept(text);
        // Sofort-Übernahme aus dem Zwischenergebnis:
        if ((s === "goal" && parseGoal(text)) || (s === "gender" && parseGender(text))) return accept(text);
        // Zahlen: kurz warten, ob noch mehr kommt ("achtzig" statt "acht"), dann übernehmen
        if (s !== "goal" && s !== "gender" && s !== "name" && firstNumber(text) !== null) {
          clearTimeout(numTimer);
          numTimer = setTimeout(() => accept(text), 600);
        }
      };
      r.onerror = () => {
        clearTimeout(guard);
        fail();
      };
      r.onend = () => {
        clearTimeout(guard);
        if (!got) fail();
      };
      setState("listen");
      r.start();
    } catch {
      setState("idle");
      setFails((f) => f + 1);
    }
  };

  // Spricht eine Zeile — NUR mit dem Studio-Clip (ob_<id>). Die Roboter-Gerätestimme
  // kommt nie zum Einsatz: klappt der Clip nicht, kurzer zweiter Versuch, danach
  // erscheint die Frage als Text und das Mikrofon öffnet trotzdem.
  const sayLine = (id, text, after) => {
    setState("speak");
    setCaption("");
    playClip(l2, id, after).then((played) => {
      if (played) return;
      setTimeout(() => {
        playClip(l2, id, after).then((again) => {
          if (again) return;
          setCaption(text);
          if (after) after();
        });
      }, 350);
    });
  };

  const ask = (s) => {
    stepRef.current = s;
    setStep(s);
    const q = qOf(s);
    setQuestion(q);
    sayLine("ob_" + s, q, () => listen());
  };

  // Autoplay-Sperre des Browsers: Ohne vorherige Berührung darf kein Ton spielen.
  // Dann wartet der Orb pulsierend auf den ersten Tipp und startet damit. In der
  // installierten App (Capacitor) ist Ton sofort erlaubt — dort startet es von selbst.
  const [needsTap, setNeedsTap] = useState(false);
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return undefined;
    didInit.current = true;
    unlockAudio();
    // alle Gesprächs-Clips sofort vorladen — jede Ansage startet ohne Verzögerung
    warmClips(l2, ["ob_goal", "ob_name", "ob_gender", "ob_age", "ob_weight", "ob_height", "ob_target", "ob_final", "ob_numerr"]);
    setTimeout(() => {
      if (audioReady()) ask("goal");
      else {
        setNeedsTap(true);
        setState("idle");
      }
    }, 60);
    return () => {
      stopSpeaking();
      try {
        if (recRef.current) recRef.current.abort();
      } catch {}
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const startByTap = () => {
    unlockAudio();
    setNeedsTap(false);
    ask("goal");
  };

  const parseGoal = (s) => {
    const x = String(s).toLowerCase();
    if (/abneh|verlier|lose|weniger|schlank/.test(x)) return "cut";
    if (/muskel|muscle|aufbau|build|masse/.test(x)) return "bulk";
    if (/halten|maintain|bleib/.test(x)) return "maintain";
    return null;
  };
  const parseGender = (s) => {
    const x = String(s).toLowerCase();
    if (/männ|male|mann|erkek|homme|hombre|uomo/.test(x) && !/weib|female|fem/.test(x)) return "male";
    if (/weib|frau|female|femme|mujer|donna|kadın/.test(x)) return "female";
    if (/divers|diverse|non/.test(x)) return "diverse";
    return null;
  };

  const handleAnswer = (raw) => {
    const text = String(raw || "").trim();
    const s = stepRef.current;
    if (!text) return;
    setTyped("");
    const d = { ...dataRef.current };
    const retry = (q, id) => {
      setQuestion(q);
      sayLine(id || "ob_" + s, q, () => listen());
    };
    if (s === "goal") {
      const g = parseGoal(text);
      if (!g) return retry(qOf("goal"));
      d.goal = g;
    } else if (s === "name") {
      let n = text.replace(/^(ich heisse|ich heiße|mein name ist|my name is|i am|i'm)\s*/i, "").split(/\s+/)[0] || "";
      d.name = n.charAt(0).toUpperCase() + n.slice(1);
    } else if (s === "gender") {
      const g = parseGender(text);
      if (!g) return retry(qOf("gender"));
      d.gender = g;
    } else {
      const n = firstNumber(text);
      if (n === null) return retry(t.numErr, "ob_numerr");
      if (s === "age") d.age = n;
      if (s === "weight") d.weight = n;
      if (s === "height") d.height = n < 3 ? Math.round(n * 100) : n;
      if (s === "target") d.target = n;
    }
    dataRef.current = d;
    setData(d);
    failsRef.current = 0;
    setFails(0);
    const i = ORDER.indexOf(s);
    const nx = ORDER[i + 1];
    if (!nx) {
      stepRef.current = "final";
      setStep("final");
      const fin = t.final(d.name || "");
      setQuestion(fin);
      sayLine("ob_final", fin, () => setStep("preview"));
      return;
    }
    ask(nx);
  };

  if (step === "preview") {
    return <CensoredPreview lang={lang} data={data} onUnlock={() => onDone(data)} />;
  }

  // Hintergrund: die gesammelten Angaben — zensiert
  const rows = ORDER.map((k) => {
    let v = data[k];
    if (k === "goal" && v) v = GOAL_WORDS[l2][v];
    if (k === "gender" && v) v = GENDER_WORDS[l2][v];
    if ((k === "weight" || k === "target") && v) v = v + " kg";
    if (k === "height" && v) v = v + " cm";
    return { k, label: FL[k], value: v };
  });

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", padding: "0 22px 22px", overflow: "hidden" }}>
      <style>{`
        @keyframes aiPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.045); } }
        @keyframes aiListen { 0%,100% { transform: scale(1); } 50% { transform: scale(1.09); } }
        @keyframes aiFade { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes aiSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes aiSpinBack { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes aiBar { 0%,100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
        @keyframes aiAurora { 0%,100% { transform: translate(-12%, -6%) scale(1); opacity: 0.5; } 33% { transform: translate(10%, 8%) scale(1.18); opacity: 0.8; } 66% { transform: translate(-4%, 14%) scale(0.92); opacity: 0.6; } }
        @keyframes aiAurora2 { 0%,100% { transform: translate(10%, 12%) scale(1.1); opacity: 0.45; } 50% { transform: translate(-10%, -10%) scale(0.95); opacity: 0.75; } }
        @keyframes aiFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes aiSparkle { 0% { transform: translateY(10px) scale(0.4); opacity: 0; } 25% { opacity: 1; } 100% { transform: translateY(-46px) scale(1); opacity: 0; } }
        @keyframes aiBreath { 0%,100% { opacity: 0.45; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.08); } }
      `}</style>

      {/* zensierte Angaben im Hintergrund */}
      <div aria-hidden="true" style={{ position: "absolute", left: 22, right: 22, bottom: 20, zIndex: 0 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "14px 16px", opacity: 0.85 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "Sora, sans-serif", fontSize: 11.5, fontWeight: 700, color: C.dim, letterSpacing: 0.5, marginBottom: 8 }}>
            <span>{DATA_TITLE[l2]}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>
          </div>
          {rows.map((r) => (
            <div key={r.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.dim }}>{r.label}</span>
              <span style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 700, color: r.value ? C.gold : C.dim, filter: r.value ? "blur(5px)" : "none", userSelect: "none" }}>
                {r.value || "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Kopf: nur ein dezentes Stift-Symbol als Ausweg zum Formular — sonst kein Text */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "16px 0 0", zIndex: 1 }}>
        <div data-ai-manual onClick={onManual} title={t.skip} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: 0.6 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9aa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </div>
      </div>

      {/* Mitte: nur der Orb — die Stimme führt, kein Text */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 1, paddingBottom: 150 }}>
        <AsfitOrb state={state} size={230} onClick={() => (needsTap ? startByTap() : state !== "speak" && listen())} />
        {/* Nur wenn der Sprach-Clip nicht abspielbar war: Frage als Text zeigen (nie Roboterstimme) */}
        {caption && (
          <div style={{ marginTop: 18, maxWidth: 320, textAlign: "center", fontFamily: "Sora, sans-serif", fontSize: 15.5, fontWeight: 600, color: C.text, animation: "aiFade .4s ease" }}>
            {caption}
          </div>
        )}
        {/* Fallback erst, wenn das Mikrofon mehrfach nicht klappt (oder es keins gibt) */}
        {fails >= 2 && state !== "speak" && (
          <div style={{ display: "flex", gap: 8, marginTop: 20, width: "100%", maxWidth: 320 }}>
            <input
              data-ai-type
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnswer(typed)}
              placeholder={t.typePh}
              style={{ flex: 1, boxSizing: "border-box", padding: "11px 13px", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, fontFamily: "Inter, sans-serif", fontSize: 14 }}
            />
            <button data-ai-send onClick={() => handleAnswer(typed)} style={{ background: C.raised, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, padding: "0 16px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              {t.send}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Alte Chat-Variante (nicht mehr im Einsatz; bleibt als Referenz)
function AiChatOnboarding({ lang, onDone, onManual }) {
  const t = aiT(lang);
  // Schritte: goal -> name -> gender -> age -> weight -> height -> target -> preview
  const [step, setStep] = useState("goal");
  const [msgs, setMsgs] = useState([]); // {who:"ai"|"me", text}
  const [data, setData] = useState({});
  const [listening, setListening] = useState(false);
  const [typed, setTyped] = useState("");
  const recRef = useRef(null);
  const scrollRef = useRef(null);

  const say = (text) => {
    setMsgs((m) => [...m, { who: "ai", text }]);
    try {
      speak(text, String(lang).slice(0, 2) === "de" ? "de" : "en");
    } catch {}
  };
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return undefined; // StrictMode im Dev mountet doppelt — nur einmal begrüssen
    didInit.current = true;
    unlockAudio();
    say(t.welcome);
    return () => stopSpeaking();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, step]);

  const QUESTION = { name: t.qName, gender: t.qGender, age: t.qAge, weight: t.qWeight, height: t.qHeight, target: t.qTarget };
  const ORDER = ["goal", "name", "gender", "age", "weight", "height", "target"];
  const next = (cur, d) => {
    const i = ORDER.indexOf(cur);
    const nx = ORDER[i + 1];
    if (!nx) {
      setStep("preview");
      say(t.final(d.name || ""));
      return;
    }
    setStep(nx);
    say(QUESTION[nx]);
  };

  const parseGoal = (s) => {
    const x = String(s).toLowerCase();
    if (/abneh|verlier|lose|weniger|schlank/.test(x)) return "cut";
    if (/muskel|muscle|aufbau|build|masse/.test(x)) return "bulk";
    if (/halten|maintain|bleib/.test(x)) return "maintain";
    return null;
  };
  const parseGender = (s) => {
    const x = String(s).toLowerCase();
    if (/männ|male|mann|erkek|homme|hombre|uomo/.test(x) && !/weib|female|fem/.test(x)) return "male";
    if (/weib|frau|female|femme|mujer|donna|kadın/.test(x)) return "female";
    if (/divers|diverse|non/.test(x)) return "diverse";
    return null;
  };

  const answer = (raw) => {
    const text = String(raw || "").trim();
    if (!text) return;
    setMsgs((m) => [...m, { who: "me", text }]);
    setTyped("");
    const d = { ...data };
    if (step === "goal") {
      const g = parseGoal(text);
      if (!g) return say(t.welcome);
      d.goal = g;
    } else if (step === "name") {
      d.name = text.replace(/^(ich heisse|ich heiße|mein name ist|my name is|i am|i'm)\s*/i, "").split(/\s+/)[0];
      d.name = d.name.charAt(0).toUpperCase() + d.name.slice(1);
    } else if (step === "gender") {
      const g = parseGender(text);
      if (!g) return say(t.qGender);
      d.gender = g;
    } else {
      const n = firstNumber(text);
      if (n === null) return say(t.numErr);
      if (step === "age") d.age = n;
      if (step === "weight") d.weight = n;
      if (step === "height") d.height = n < 3 ? Math.round(n * 100) : n; // "1,80" -> 180
      if (step === "target") d.target = n;
    }
    setData(d);
    next(step, d);
  };

  const listen = () => {
    const Rec = SR();
    if (!Rec) return; // kein Mikrofon-Support: tippen bleibt immer möglich
    try {
      if (recRef.current) recRef.current.abort();
      const r = new Rec();
      recRef.current = r;
      r.lang = srLang(lang);
      r.interimResults = false;
      r.maxAlternatives = 1;
      r.onresult = (e) => {
        setListening(false);
        answer(e.results[0][0].transcript);
      };
      r.onerror = () => setListening(false);
      r.onend = () => setListening(false);
      setListening(true);
      r.start();
    } catch {
      setListening(false);
    }
  };

  const chips = step === "goal" ? t.chipsGoal : step === "gender" ? t.chipsGender : null;

  if (step === "preview") {
    return <CensoredPreview lang={lang} data={data} onUnlock={() => onDone(data)} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 20px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 0 12px" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.goldSoft, border: `2px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}>🤖</div>
        <div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: C.text }}>ASFIT Coach</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.gold }}>● online</div>
        </div>
        <div style={{ flex: 1 }} />
        <div data-ai-manual onClick={onManual} style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.dim, cursor: "pointer" }}>{t.skip}</div>
      </div>
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.who === "ai" ? "flex-start" : "flex-end", marginBottom: 10 }}>
            <div style={{ maxWidth: "82%", padding: "11px 14px", borderRadius: m.who === "ai" ? "16px 16px 16px 5px" : "16px 16px 5px 16px", background: m.who === "ai" ? C.surface : C.gold, color: m.who === "ai" ? C.text : C.bg, border: m.who === "ai" ? `1px solid ${C.border}` : "none", fontFamily: "Inter, sans-serif", fontSize: 14, lineHeight: 1.5 }}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      {chips && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {chips.map(([, label]) => (
            <div key={label} data-ai-chip={label} onClick={() => answer(label)} style={{ padding: "9px 14px", borderRadius: 999, background: C.goldSoft, border: `1.5px solid ${C.gold}`, color: C.text, fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {label}
            </div>
          ))}
        </div>
      )}
      {SR() && (
        <button data-ai-mic onClick={listen} style={{ width: "100%", background: listening ? C.coral : C.gold, color: C.bg, border: "none", borderRadius: 16, padding: "15px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 8 }}>
          {listening ? t.micListen : t.mic}
        </button>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          data-ai-type
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && answer(typed)}
          placeholder={t.typePh}
          style={{ flex: 1, boxSizing: "border-box", padding: "12px 14px", borderRadius: 13, border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, fontFamily: "Inter, sans-serif", fontSize: 14 }}
        />
        <button data-ai-send onClick={() => answer(typed)} style={{ background: C.raised, color: C.text, border: `1px solid ${C.border}`, borderRadius: 13, padding: "0 18px", fontFamily: "Sora, sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
          {t.send}
        </button>
      </div>
    </div>
  );
}

// „So könnte dein Körper aussehen" — alles geblurrt, bis das Probeabo läuft
const LockGlyph = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#F4F4F5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))" }}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);

function CensoredPreview({ lang, data, onUnlock }) {
  const t = aiT(lang);
  const demoKeys = ["pushup", "squat", "plank"].filter((k) => gifFor(k));
  const lockBadge = (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(10,10,11,0.72)", border: "1px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LockGlyph size={18} />
      </div>
    </div>
  );
  const blurBox = { position: "relative", overflow: "hidden", borderRadius: 14 };
  const blurred = { filter: "blur(10px)", userSelect: "none", pointerEvents: "none" };
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 22px 22px", overflowY: "auto" }}>
      <div style={{ textAlign: "center", padding: "26px 0 6px" }}>
        <div style={{ width: 44, height: 2, background: C.gold, margin: "0 auto 18px" }} />
        <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 21, fontWeight: 800, color: C.text, margin: "0 0 8px" }}>{t.previewTitle}</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.dim, margin: 0, lineHeight: 1.5 }}>{t.previewSub}</p>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, margin: "16px 0 10px" }}>
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 700, color: C.dim, marginBottom: 8 }}>{t.lockKcal}</div>
        <div style={blurBox}>
          {lockBadge}
          <div style={{ ...blurred, fontFamily: "Sora, sans-serif", fontSize: 40, fontWeight: 800, color: C.gold, textAlign: "center", padding: "6px 0" }}>2480 kcal</div>
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, marginBottom: 10 }}>
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 700, color: C.dim, marginBottom: 8 }}>{t.lockPlan}</div>
        <div style={blurBox}>
          {lockBadge}
          <div style={blurred}>
            {["Montag — Push: Brust, Schultern, Trizeps", "Mittwoch — Pull: Rücken, Bizeps", "Freitag — Beine & Core", "Täglich — Protein-Ziel & Schritte"].map((l) => (
              <div key={l} style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.text, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>{l}</div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, marginBottom: 14 }}>
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 12.5, fontWeight: 700, color: C.dim, marginBottom: 8 }}>{t.lockDemos}</div>
        <div style={{ display: "flex", gap: 10 }}>
          {demoKeys.map((k) => (
            <div key={k} style={{ ...blurBox, flex: 1, aspectRatio: "1", background: C.raised }}>
              {lockBadge}
              <img src={gifFor(k)} alt="" style={{ ...blurred, width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.coral, textAlign: "center", marginBottom: 12 }}>{t.lockedHint}</div>
      <button data-ai-unlock onClick={onUnlock} style={{ width: "100%", background: C.gold, color: C.bg, border: "none", borderRadius: 16, padding: "16px", fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 15.5, cursor: "pointer" }}>
        {t.cta}
      </button>
    </div>
  );
}
