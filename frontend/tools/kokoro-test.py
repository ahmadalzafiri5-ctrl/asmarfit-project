# Schneller Hörtest: eine deutsche und eine englische Workout-Ansage mit Kokoro
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = r"C:\Users\StartKlar\Downloads\asmarfit-project\frontend\tools"
k = Kokoro(HERE + r"\kokoro-models\kokoro-v1.0.onnx", HERE + r"\kokoro-models\voices-v1.0.bin")
print("Stimmen:", len(k.get_voices()))
print([v for v in k.get_voices()][:30])

# Englisch, beste Stimme laut Bewertung (af_heart = Note A)
samples, sr = k.create("Get ready. First: Jumping Jacks!", voice="af_heart", speed=1.1, lang="en-us")
sf.write(HERE + r"\sample_en_af_heart.wav", samples, sr)
samples, sr = k.create("Push-Up. Go! Halfway. Done, well done!", voice="am_fenrir", speed=1.1, lang="en-us")
sf.write(HERE + r"\sample_en_am_fenrir.wav", samples, sr)
print("ok")
