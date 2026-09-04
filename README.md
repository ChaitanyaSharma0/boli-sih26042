# boli-sih26042

# BOLI — Mother-tongue speech for Jharkhand's classrooms
SIH26042 · Government of Jharkhand · Smart Education · Team LARPERS

Turns a Hindi primary-school lesson into a spoken lesson in a child's
mother tongue — for languages no commercial system supports.

## What runs today
| Language | ISO | TTS | Status |
|---|---|---|---|
| Ho | hoc | facebook/mms-tts-hoc | audio generated |
| Mundari | unr | facebook/mms-tts-unr | audio generated |
| Kurukh | kru | facebook/mms-tts-kru | audio generated |
| Sadri | sck | facebook/mms-tts-sck | audio generated |
| Santali | sat | none exists | translation only |

## Findings (4 Sep 2026)
- Google Translate: Santali text only, "Listen" disabled. Ho, Mundari,
  Kurukh, Sadri absent entirely.
- No MMS-TTS checkpoint exists for Santali.
- MMS trained Ho/Mundari TTS on **Odia script**; Jharkhand writes them
  in Devanagari / Warang Chiti — transliteration layer required.
- IndicTrans2 leaks Meetei Mayek script on out-of-domain vocabulary
  (गेहूँ, धान). Shorter, culturally localised sentences return clean Ol Chiki.

## Notebook
`sih_2026.ipynb` — coverage probe, TTS generation, IndicTrans2 test.
