# 3D-Anatomie-Figur (ASFIT)

Quelle der App-Dateien `frontend/public/anatomy-body.bin` und `anatomy-body.json`.

- `rodin-model.glb`: Original-Modell aus Rodin (Hyper3D), Aufgabe 9f2c8bf7-d85d-4ea9-8f17-dde90b83be48, 1 Mio. Dreiecke, Draco-komprimiert.
- `rodin-mesh-V.npy` / `rodin-mesh-T.npy`: daraus vorbereitetes Netz (entpackt, verschweißt, auf 160.000 Dreiecke verkleinert,
  Sockel unter dem Fuß entfernt, auf 180 cm skaliert, Füße auf y = 0, Gesicht nach +z, x = linke Körperseite).
- `build_body.py`: die Muskelkarte (Formen für die 15 Muskel-IDs der App, Faserrichtungen, Sehnenregeln).
- `process_rodin.py`: überträgt die Muskelkarte auf das Rodin-Netz und schreibt die Modelldatei für die App.
- `decode.mjs`: entpackt das Draco-GLB (`npm i draco3d`, dann `node decode.mjs rodin-model.glb`).

Neu erzeugen (Python mit numpy, scipy, scikit-image, pyfqmr):

    python process_rodin.py anatomy-body.bin

Danach `anatomy-body.bin` und `anatomy-body.json` nach `frontend/public/` kopieren.
