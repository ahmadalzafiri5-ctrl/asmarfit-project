# Je eine Hoerprobe fuer die Sprachen, die Kokoro nicht offiziell kann (Akzent-Check)
import json
import os
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
k = Kokoro(os.path.join(HERE, "kokoro-models", "kokoro-v1.0.onnx"), os.path.join(HERE, "kokoro-models", "voices-v1.0.bin"))
with open(os.path.join(HERE, "texts-workout.json"), encoding="utf-8") as f:
    TEXTS = json.load(f)

PROBE = {"tr": "tr", "ru": "ru", "pl": "pl", "nl": "nl", "ar": "ar", "id": "id", "ko": "ko"}
for lang, code in PROBE.items():
    text = TEXTS[lang]["ready_jumping_jacks"] + " " + TEXTS[lang]["done"]
    try:
        samples, sr = k.create(text, voice="af_heart", speed=1.1, lang=code)
        sf.write(os.path.join(HERE, "sample_unsup_" + lang + ".wav"), samples, sr)
        print(lang, "ok")
    except Exception as e:
        print(lang, "FEHLER:", str(e)[:150])
