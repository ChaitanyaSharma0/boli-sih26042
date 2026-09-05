---
title: BOLI Backend
emoji: 🗣️
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# BOLI — backend

FastAPI service behind [BOLI](https://github.com/ChaitanyaSharma0/boli-sih26042),
a prototype that turns a Hindi primary-school lesson into simplified,
translated, spoken output for children in Jharkhand whose mother tongue
is not Hindi. SIH26042, Government of Jharkhand.

## What is real here, and what is not

| Language | Translation | Speech |
|---|---|---|
| Santali (`sat`) | Real, IndicTrans2, Ol Chiki | **None exists**, anywhere |
| Ho (`hoc`) | **None exists** — curated phrase bank | Real, MMS-TTS |
| Mundari (`unr`) | **None exists** — curated phrase bank | Real, MMS-TTS |
| Kurukh (`kru`) | **None exists** — curated phrase bank | Real, MMS-TTS |
| Sadri (`sck`) | **None exists** — curated phrase bank | Real, MMS-TTS |

Santali is the only one of these languages with an open parallel corpus,
so it is the only one this service will translate. `POST /translate`
returns `501` for anything else and points at the phrase bank instead —
it does not fall through and produce plausible-looking nonsense.

**No phrase-bank entry has been checked by a native speaker.** Every one
is marked `verified: false` and stays that way until one actually is.

## Endpoints

`GET /languages` · `GET /health` · `POST /ocr` · `POST /simplify` ·
`POST /translate` · `POST /speak` · `POST /lessons` · `POST /correct` ·
`GET /corrections/count`

Interactive docs at `/docs`.

## Secrets this Space needs

| Name | Why |
|---|---|
| `HF_TOKEN` | IndicTrans2 is a gated repo. Read scope is enough. |
| `LLM_API_KEY` | The Hindi simplification step. |
| `LLM_PROVIDER` | `gemini` |

## Notes

- The first boot downloads ~1.7GB of model weights and warms them before
  serving, so a cold start takes several minutes. `GET /health` does not
  answer until the models are loaded.
- Storage on a free Space is ephemeral: logged corrections do not
  survive a restart.
