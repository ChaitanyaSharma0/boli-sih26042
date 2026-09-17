"""Munda languages translation engine (Ho and Mundari).

Implements North Munda lexical and morphological mapping for Ho (hoc)
and Mundari (unr), with dual-script support:
- Devanagari representation for classroom display
- Odia script transliteration for Meta MMS-TTS synthesis
"""

import re
from typing import List, Tuple
from .base import BaseTranslationEngine

# Common North Munda root lexicon (Hindi -> (Devanagari, Odia))
MUNDA_MAPPINGS = [
    # Commands & Verbs (phrases first)
    ("जा रहे हैं", "सेनोः तानाको", "ସେନୋଃ ତାନାକୋ"),
    ("जा रहा हूँ", "सेनोः तानाइञ", "ସେନୋଃ ତାନାଇଞ"),
    ("जा रहा है", "सेनोः तानाए", "ସେନୋଃ ତାନାଏ"),
    ("जा रही है", "सेनोः तानाए", "ସେନୋଃ ତାନାଏ"),
    ("आ रहे हैं", "हिजुः तानाको", "ହିଜୁଃ ତାନାକୋ"),
    ("आ रहा है", "हिजुः तानाए", "ହିଜୁଃ ତାନାଏ"),
    ("पढ़ा रहे हैं", "पढ़ाओ तानाको", "ପଢ଼ାଓ ତାନାକୋ"),
    ("पढ़ रहे हैं", "पढ़ाओ तानाको", "ପଢ଼ାଓ ତାନାକୋ"),
    ("बैठ जाओ", "दुबु मे", "ଦୁବୁ ମେ"),
    ("बैठो", "दुबु मे", "ଦୁବୁ ମେ"),
    ("चलो", "सेनोः मे", "ସେନୋଃ ମେ"),
    ("पढ़ो", "पढ़ाओ मे", "ପଢ଼ାଓ ମେ"),
    ("सुनो", "आयूम मे", "ଆୟୁମ ମେ"),
    ("खोलो", "उगाड़ा", "ଉଗାଡ଼ା"),
    ("नमस्ते", "जोहार", "ଜୋହାର"),

    # Pronouns & basic grammar
    ("हम सब", "आले", "ଆଲେ"),
    ("हमारा", "आलेआः", "ଆଲେଆଃ"),
    ("हमारी", "आलेआः", "ଆଲେଆଃ"),
    ("हमारे", "आलेआः", "ଆଲେଆଃ"),
    ("तुम्हारा", "आमाः", "ଆମାଃ"),
    ("तुम्हारी", "आमाः", "ଆମାଃ"),
    ("तुम्हारे", "आमाः", "ଆମାଃ"),
    ("मैं", "इञ", "ଇଞ"),
    ("हम", "आले", "ଆଲେ"),
    ("तुम", "आम", "ଆମ"),
    ("आप", "आपे", "ଆପେ"),
    ("वह", "आए", "ଆଏ"),
    ("वे", "आको", "ଆକୋ"),
    ("यह", "नेआ", "ନେଆ"),
    ("यहाँ", "नेरे", "ନେରେ"),
    ("वहाँ", "एंटे", "ଏଣ୍ଟେ"),

    # Core nouns
    ("पानी", "दा", "ଦା"),
    ("जल", "दा", "ଦା"),
    ("पेड़", "दारु", "ଦାରୁ"),
    ("वृक्ष", "दारु", "ଦାରୁ"),
    ("सूरज", "सिंगी", "ସିଙ୍ଗି"),
    ("सूर्य", "सिंगी", "ସିଙ୍ଗି"),
    ("माँ", "एंगा", "ଏଙ୍ଗା"),
    ("माता", "एंगा", "ଏଙ୍ଗା"),
    ("दोस्त", "गाते", "ଗାତେ"),
    ("मित्र", "गाते", "ଗାତେ"),
    ("स्कूल", "इस्कुल", "ଇସ୍କୁଲ"),
    ("विद्यालय", "इस्कुल", "ଇସ୍କୁଲ"),
    ("किताब", "पुथी", "ପୁଥି"),
    ("पुस्तक", "पुथी", "ପୁଥି"),
    ("गाँव", "हातु", "ହାତୁ"),
    ("घर", "ओड़ाः", "ଓଡ଼ାଃ"),
    ("बच्चे", "होनको", "ହୋନକୋ"),
    ("बच्चा", "होन", "ହୋନ"),
    ("जीवन", "जीउ", "ଜୀଉ"),
    ("खेत", "बाद", "ବାଦ"),
    ("धान", "बाबा", "ବାବା"),
    ("चावल", "रुंगु", "ରୁଙ୍ଗୁ"),
    ("खाना", "मांडी", "ମାଣ୍ଡୀ"),

    # Copulas
    ("हैं", "तानाको", "ତାନାକୋ"),
    ("है", "ताना", "ତାନା"),
    ("हूँ", "तानाइञ", "ତାନାଇଞ"),
    ("था", "ताइकेना", "ତାଈକେନା"),
    ("थी", "ताइकेना", "ତାଈକେନା"),
    ("थे", "ताइकेनाको", "ତାଈକେନାକୋ"),
]


# Build pre-compiled single-pass replacement regexes to avoid cascading substitutions
FORWARD_DEVA_MAP = {k: deva for k, deva, _ in MUNDA_MAPPINGS}
_sorted_deva = sorted(FORWARD_DEVA_MAP.keys(), key=len, reverse=True)
_alts_deva = "|".join(re.escape(k) for k in _sorted_deva)
_RE_FORWARD_DEVA = re.compile(
    rf"(?<![^\s.,?!।॥\(\)\[\]\'\"])(?:{_alts_deva})(?![^\s.,?!।॥\(\)\[\]\'\"])"
)

FORWARD_ODIA_MAP = {k: odia for k, _, odia in MUNDA_MAPPINGS}
_sorted_odia = sorted(FORWARD_ODIA_MAP.keys(), key=len, reverse=True)
_alts_odia = "|".join(re.escape(k) for k in _sorted_odia)
_RE_FORWARD_ODIA = re.compile(
    rf"(?<![^\s.,?!।॥\(\)\[\]\'\"])(?:{_alts_odia})(?![^\s.,?!।॥\(\)\[\]\'\"])"
)


class HoMundaEngine(BaseTranslationEngine):
    @property
    def name(self) -> str:
        return "boli/north-munda-transfer"

    @property
    def mode(self) -> str:
        return "munda_transfer"

    def supports(self, source: str, target: str) -> bool:
        s = source.lower().split('_')[0]
        t = target.lower().split('_')[0]
        return s == 'hin' and t in ('hoc', 'unr')

    def translate_sentence(self, sent: str, target: str, script: str = "deva") -> str:
        if script == "odia":
            return _RE_FORWARD_ODIA.sub(lambda m: FORWARD_ODIA_MAP[m.group(0)], sent)
        return _RE_FORWARD_DEVA.sub(lambda m: FORWARD_DEVA_MAP[m.group(0)], sent)

    def translate_sentences(self, sentences: List[str], source: str, target: str) -> List[str]:
        return [self.translate_sentence(s, target) for s in sentences]
