"""Sentence and paragraph segmentation for multilingual text.

Preserves:
- Paragraph line breaks (newlines)
- Sentence structural ordering
- Sentence boundary punctuation (Devanagari danda ।, ॥, Latin . ? !)
- Short educational phrases and fragments
"""

import re
from typing import List, Tuple

# Sentence boundary regex with lookbehind for punctuation
_SENT_SPLIT_REGEX = re.compile(r"(?<=[.?!।॥])\s+")


def segment_into_paragraphs(text: str) -> List[str]:
    """Split text by newlines, preserving empty lines as structure."""
    return text.split("\n")


def segment_paragraph_into_sentences(paragraph: str) -> List[str]:
    """Split a single paragraph line into clean sentence units."""
    if not paragraph.strip():
        return []
    raw_sents = _SENT_SPLIT_REGEX.split(paragraph.strip())
    sents = [s.strip() for s in raw_sents if s.strip()]
    return sents if sents else [paragraph.strip()]


def segment_text(text: str) -> List[Tuple[int, str]]:
    """Segment full text into (paragraph_index, sentence_text) pairs.
    
    Enables batched translation while guaranteeing exact reconstruction.
    """
    paragraphs = segment_into_paragraphs(text)
    items = []
    for p_idx, p in enumerate(paragraphs):
        sents = segment_paragraph_into_sentences(p)
        for s in sents:
            items.append((p_idx, s))
    return items


def reconstruct_text(original_text: str, translated_items: List[Tuple[int, str]]) -> str:
    """Reconstruct paragraphs and sentences maintaining original structure."""
    paragraphs = segment_into_paragraphs(original_text)
    para_map = {idx: [] for idx in range(len(paragraphs))}

    for p_idx, trans_sent in translated_items:
        if trans_sent.strip():
            para_map[p_idx].append(trans_sent.strip())

    reconstructed_paras = []
    for p_idx in range(len(paragraphs)):
        if not paragraphs[p_idx].strip():
            reconstructed_paras.append("")
        else:
            reconstructed_paras.append(" ".join(para_map[p_idx]))

    return "\n".join(reconstructed_paras)
