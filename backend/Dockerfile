# BOLI backend — Hugging Face Space, Docker SDK.
#
# Docker rather than the Gradio SDK because this is a FastAPI app the
# React frontend calls, not a Gradio UI. Hugging Face rather than Render
# because the free Render tier cannot hold IndicTrans2 plus four MMS-TTS
# checkpoints in memory at once (ARCHITECTURE.md §6).

FROM python:3.10-slim

# tesseract-ocr-hin is the Hindi language pack /ocr needs; git is needed
# because two dependencies install straight from GitHub.
RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-hin \
        git \
    && rm -rf /var/lib/apt/lists/*

# Spaces run the container as uid 1000. Everything the app writes — the
# model cache and the sqlite file — has to live somewhere that user owns.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    HF_HOME=/home/user/.cache/huggingface \
    PYTHONUNBUFFERED=1

WORKDIR $HOME/app

# CPU-only torch. The default wheel pulls ~2GB of CUDA that a free CPU
# Space can neither use nor afford to store.
RUN pip install --no-cache-dir --user \
        torch --index-url https://download.pytorch.org/whl/cpu

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# IndicTransToolkit, pinned to its last pure-Python commit. Master was
# Cythonised and needs a C toolchain; --no-build-isolation is required
# because that commit's setup.py imports pkg_resources, which modern
# setuptools no longer provides in an isolated build (RULES.md §8).
RUN pip install --no-cache-dir --user --no-build-isolation --no-deps \
        git+https://github.com/VarunGumma/IndicTransToolkit.git@0c607654e8

COPY --chown=user . .

# Models are NOT baked into the image. They are ~1.7GB and would make
# every rebuild enormous; instead the first boot downloads them into
# HF_HOME and the lifespan hook warms them before serving. That makes a
# cold start slow — see docs/DEPLOY.md.
EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
