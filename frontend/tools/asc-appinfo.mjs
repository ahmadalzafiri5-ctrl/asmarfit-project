// Setzt App-Infos für den App-Store-Eintrag: Untertitel, Datenschutz-URL, Kategorien, Altersfreigabe.
// Aufruf: node tools/asc-appinfo.mjs
import { asc } from "./asc.mjs";

const APP_INFO = "f26ab285-a4aa-4684-add7-df5beeab0079";
const LOC = "41a4d756-9362-42b5-979f-9e8d5b9d1d1f";
const show = (label, r) => console.log(label, r.status, r.status >= 300 ? JSON.stringify(r.json.errors || r.json).slice(0, 400) : "ok");

show("Untertitel + Datenschutz-URL:", await asc("PATCH", `/appInfoLocalizations/${LOC}`, {
  data: { type: "appInfoLocalizations", id: LOC, attributes: { subtitle: "Calories, training, AI coach", privacyPolicyUrl: "https://asmarfit-project.onrender.com/privacypolicy.html" } },
}));

show("Kategorien:", await asc("PATCH", `/appInfos/${APP_INFO}`, {
  data: {
    type: "appInfos",
    id: APP_INFO,
    relationships: {
      primaryCategory: { data: { type: "appCategories", id: "HEALTH_AND_FITNESS" } },
      secondaryCategory: { data: { type: "appCategories", id: "FOOD_AND_DRINK" } },
    },
  },
}));

// Altersfreigabe: Fitness- und Ernährungs-App ohne Gewalt, Glücksspiel, Werbung oder offenen Browser.
// Gesundheits-/Wellness-Themen = ja. Nutzer teilen nichts öffentlich (Freunde nur per Code, Fotos privat).
show("Altersfreigabe:", await asc("PATCH", `/ageRatingDeclarations/${APP_INFO}`, {
  data: {
    type: "ageRatingDeclarations",
    id: APP_INFO,
    attributes: {
      advertising: false,
      alcoholTobaccoOrDrugUseOrReferences: "NONE",
      contests: "NONE",
      gambling: false,
      gamblingSimulated: "NONE",
      gunsOrOtherWeapons: "NONE",
      healthOrWellnessTopics: true,
      lootBox: false,
      medicalOrTreatmentInformation: "NONE",
      messagingAndChat: false,
      parentalControls: false,
      ageAssurance: false,
      profanityOrCrudeHumor: "NONE",
      sexualContentGraphicAndNudity: "NONE",
      sexualContentOrNudity: "NONE",
      horrorOrFearThemes: "NONE",
      matureOrSuggestiveThemes: "NONE",
      unrestrictedWebAccess: false,
      userGeneratedContent: false,
      socialMedia: false,
      sharedLocation: false,
      datingAndRelationships: false,
      violenceCartoonOrFantasy: "NONE",
      violenceRealisticProlongedGraphicOrSadistic: "NONE",
      violenceRealistic: "NONE",
    },
  },
}));
