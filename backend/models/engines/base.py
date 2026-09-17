"""Base interface for translation engines."""

from abc import ABC, abstractmethod
from typing import List


class BaseTranslationEngine(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable name of the engine."""
        pass

    @property
    @abstractmethod
    def mode(self) -> str:
        """Engine mode (e.g. 'neural', 'munda_transfer', 'rule_transfer', 'phrase_bank')."""
        pass

    @abstractmethod
    def supports(self, source: str, target: str) -> bool:
        """Return True if this engine can translate between source and target."""
        pass

    @abstractmethod
    def translate_sentences(self, sentences: List[str], source: str, target: str) -> List[str]:
        """Translate a list of individual sentence strings from source to target."""
        pass
