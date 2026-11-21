# Hoerproben verschiedener Kokoro-Stimmen fuer die Kurz-Workout-Ansagen (Englisch)
import os
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
k = Kokoro(os.path.join(HERE, "kokoro-models", "kokoro-v1.0.onnx"), os.path.join(HERE, "kokoro-models", "voices-v1.0.bin"))
TEXT = "Get ready. First: Jumping Jacks! Push-Up. Go! Halfway. Done. Well done!"
for v in ["am_fenrir", "am_michael", "am_puck", "bm_george", "af_bella", "bf_isabella"]:
    samples, sr = k.create(TEXT, voice=v, speed=1.1, lang="en-us")
    sf.write(os.path.join(HERE, "probe-voice-" + v + ".wav"), samples, sr)
    print(v, "ok")
