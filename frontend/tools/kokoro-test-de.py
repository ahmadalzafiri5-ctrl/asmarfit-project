# Hörtest: deutsche Workout-Ansagen mit der Kokoro-Stimme "Martin"
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = r"C:\Users\StartKlar\Downloads\asmarfit-project\frontend\tools"
k = Kokoro(HERE + r"\kokoro-models\kokoro-martin.onnx", HERE + r"\kokoro-models\voices-martin.npz")
print("Stimmen:", k.get_voices())

LINES = [
    ("de_ready", "Mach dich bereit. Zuerst: Hampelmann!"),
    ("de_work", "Liegestütz. Los!"),
    ("de_rest", "Pause. Als Nächstes: Kniebeuge."),
    ("de_done", "Geschafft. Gut gemacht!"),
]
for name, text in LINES:
    samples, sr = k.create(text, voice="martin", speed=1.125, lang="de")
    sf.write(HERE + "\\sample_" + name + ".wav", samples, sr)
    print(name, "ok")
