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

## Translation and Speech Architecture

| Language | Translation Engine | Speech Engine |
|---|---|---|
| Santali (`sat`) | Neural MT (IndicTrans2, Ol Chiki) | AI4Bharat Indic Parler-TTS |
| Kurukh (`kru`) | Neural MT (fine-tuned mT5) | Meta MMS-TTS |
| Ho (`hoc`) | Linguistic Transfer Engine | Meta MMS-TTS (Devanagari → Odia) |
| Mundari (`unr`) | Linguistic Transfer Engine | Meta MMS-TTS (Devanagari → Odia) |
| Sadri (`sck`) | Morphological Transfer Engine | Meta MMS-TTS |

All five target languages support arbitrary multi-sentence translation via `POST /translate` and speech synthesis via `POST /speak`. Curated phrase-bank entries remain available as verified fallbacks. Translation quality remains subject to native-speaker field validation.

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
| `LLM_PROVIDER` | `openai_compatible` or `gemini` (defaults to `gemini` if unset) |
| `LLM_BASE_URL` | Base URL when using `openai_compatible` (e.g. `https://api.experientiallabs.ai/v1`) |
| `LLM_MODEL` | Model name/slug when using `openai_compatible` (e.g. `gpt-5.6-luna`) |

## Notes

- The first boot downloads ~1.7GB of model weights and warms them before
  serving, so a cold start takes several minutes. `GET /health` does not
  answer until the models are loaded.
- Storage on a free Space is ephemeral: logged corrections do not
  survive a restart.
