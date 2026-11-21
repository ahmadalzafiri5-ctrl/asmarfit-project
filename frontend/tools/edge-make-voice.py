# Erzeugt Workout-Ansagen mit Microsoft-Edge-Neural-Stimmen (kostenlos, natuerliche Muttersprachler)
# fuer die Sprachen, die Kokoro nicht kann: tr ru pl nl ar id ko.
#
# Vorher:  node tools/kokoro-dump-texts.mjs   (schreibt texts-workout.json)
# Aufruf:  tools/kokoro-venv/Scripts/python.exe tools/edge-make-voice.py [tr,ru,...] [--probe]
#          --probe erzeugt nur je 1 Probedatei tools/probe-edge-<lang>.mp3
import asyncio
import json
import os
import sys

import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public", "voice")

VOICES = {
    "tr": "tr-TR-AhmetNeural",
    "ru": "ru-RU-SvetlanaNeural",
    "pl": "pl-PL-MarekNeural",
    "nl": "nl-NL-MaartenNeural",
    "ar": "ar-EG-ShakirNeural",
    "id": "id-ID-ArdiNeural",
    "ko": "ko-KR-InJoonNeural",
}
RATE = "+10%"  # etwas flotter, passt zu Workout-Ansagen

probe = "--probe" in sys.argv
args = [a for a in sys.argv[1:] if not a.startswith("--")]
langs = args[0].split(",") if args else list(VOICES)

with open(os.path.join(HERE, "texts-workout.json"), encoding="utf-8") as f:
    TEXTS = json.load(f)


async def gen(text, voice, path):
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, voice, rate=RATE).save(path)
            if os.path.getsize(path) > 500:
                return True
            os.remove(path)  # leere Datei = fehlgeschlagen, nicht als Clip liegen lassen
            raise RuntimeError("leere Antwort")
        except Exception as e:
            if attempt == 2:
                print("FEHLER", path, str(e)[:120])
                return False
            await asyncio.sleep(2 * (attempt + 1))


async def main():
    ok = 0
    for lang in langs:
        if lang not in VOICES:
            print(lang, "nicht vorgesehen - uebersprungen")
            continue
        voice = VOICES[lang]
        if probe:
            text = TEXTS[lang]["ready_jumping_jacks"] + " " + TEXTS[lang]["work_pushup"] + " " + TEXTS[lang]["done"]
            if await gen(text, voice, os.path.join(HERE, "probe-edge-" + lang + ".mp3")):
                ok += 1
                print(lang, "Probe ok (" + voice + ")")
            continue
        outdir = os.path.join(OUT, lang)
        os.makedirs(outdir, exist_ok=True)
        for cid, text in TEXTS[lang].items():
            if await gen(text, voice, os.path.join(outdir, cid + ".mp3")):
                ok += 1
                print(lang + "/" + cid, "ok")
            await asyncio.sleep(0.3)  # sanft bleiben, kein Rate-Limit provozieren
        print("-", lang, "fertig (" + voice + ")")
    print("FERTIG:", ok, "Dateien.")


asyncio.run(main())
