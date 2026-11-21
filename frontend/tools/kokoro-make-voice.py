# Erzeugt die Workout-Ansagen mit Kokoro (lokal, kostenlos, keine API).
# Deutsch: Community-Stimme "Martin" (eigenes Modell), andere Sprachen: beste Kokoro-Stimmen.
# Sprachen ohne Kokoro-Unterstuetzung (tr ru pl nl ar id ja ko zh) behalten die vorhandenen Clips.
#
# Vorher:  node tools/kokoro-dump-texts.mjs   (schreibt texts-workout.json)
# Aufruf:  tools/kokoro-venv/Scripts/python.exe tools/kokoro-make-voice.py [de,en,...]
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public", "voice")
MODELS = os.path.join(HERE, "kokoro-models")

# Sprache -> (Stimme, espeak-Sprachcode). Deutsch nutzt das Martin-Modell, der Rest das Standardmodell.
VOICES = {
    "de": ("martin", "de"),
    "en": ("am_puck", "en-us"),
    "es": ("ef_dora", "es"),
    "fr": ("ff_siwis", "fr-fr"),
    "it": ("if_sara", "it"),
    "pt": ("pf_dora", "pt-br"),
    "hi": ("hf_alpha", "hi"),
    "ja": ("jf_alpha", "ja"),
    "zh": ("zf_xiaobei", "cmn"),
    # Nicht offiziell trainiert - espeak phonemisiert, die Stimme spricht es mit Akzent:
    "tr": ("af_heart", "tr"),
    "ru": ("af_heart", "ru"),
    "pl": ("af_heart", "pl"),
    "nl": ("af_heart", "nl"),
    "ar": ("af_heart", "ar"),
    "id": ("af_heart", "id"),
    "ko": ("af_heart", "ko"),
}
SPEED = {"de": 1.125}  # Martin klingt bei 1.125 am natuerlichsten (Empfehlung des Modells)

langs = sys.argv[1].split(",") if len(sys.argv) > 1 else list(VOICES)

import soundfile as sf
from kokoro_onnx import Kokoro

with open(os.path.join(HERE, "texts-workout.json"), encoding="utf-8") as f:
    TEXTS = json.load(f)

ffmpeg = None
for root, _dirs, files in os.walk(os.path.join(os.environ["LOCALAPPDATA"], "Microsoft", "WinGet", "Packages")):
    if "ffmpeg.exe" in files and "Gyan.FFmpeg" in root:
        ffmpeg = os.path.join(root, "ffmpeg.exe")
        break
if not ffmpeg:
    print("ffmpeg nicht gefunden")
    sys.exit(1)

std = None
martin = None
ok = 0
for lang in langs:
    if lang not in VOICES:
        print(lang, "wird von Kokoro nicht unterstuetzt - uebersprungen")
        continue
    voice, espeak_lang = VOICES[lang]
    if lang == "de":
        martin = martin or Kokoro(os.path.join(MODELS, "kokoro-martin.onnx"), os.path.join(MODELS, "voices-martin.npz"))
        k = martin
    else:
        std = std or Kokoro(os.path.join(MODELS, "kokoro-v1.0.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
        k = std
    outdir = os.path.join(OUT, lang)
    os.makedirs(outdir, exist_ok=True)
    tmp = os.path.join(HERE, "_tmp_clip_" + str(os.getpid()) + ".wav")  # eindeutig je Prozess, sonst kollidieren parallele Laeufe
    for cid, text in TEXTS[lang].items():
        samples, sr = k.create(text, voice=voice, speed=SPEED.get(lang, 1.1), lang=espeak_lang)
        sf.write(tmp, samples, sr)
        mp3 = os.path.join(outdir, cid + ".mp3")
        r = subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-i", tmp, "-af", "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse", "-b:a", "96k", mp3], capture_output=True)
        if r.returncode != 0:
            print(lang, cid, "ffmpeg-FEHLER", r.stderr.decode()[:120])
            continue
        ok += 1
        print(lang + "/" + cid, "ok")
    if os.path.exists(tmp):
        os.remove(tmp)
    print("-", lang, "fertig (Stimme:", voice + ")")
print("FERTIG:", ok, "Clips erzeugt.")
