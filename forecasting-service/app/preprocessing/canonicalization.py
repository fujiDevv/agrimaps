"""
Commodity Name Canonicalization
Resolves the ~30 naming inconsistencies identified in the Bantay Presyo
dataset, including the 2024 taxonomy revision (local vs. imported subcategories).
"""

import json
import os
from typing import Optional


class CommodityCanonicalizer:
    def __init__(self, mapping_file: Optional[str] = None):
        self.name_map = self._load_default_map()
        if mapping_file and os.path.exists(mapping_file):
            with open(mapping_file, "r") as f:
                custom = json.load(f)
                self.name_map.update(custom)

    def _load_default_map(self) -> dict:
        """
        Default canonicalization map.
        Maps raw Bantay Presyo commodity names to canonical names.
        This should be populated from the commodity_name_map database table.
        """
        return {
            # Rice variants
            "Rice, Regular-Milled, Local": "Rice - Regular Milled",
            "Rice, Regular-Milled, Imported": "Rice - Regular Milled",
            "Rice, Well-Milled, Local": "Rice - Well Milled",
            "Rice, Well-Milled, Imported": "Rice - Well Milled",
            "Rice, Special, Local": "Rice - Special",
            "Rice, Special, Imported": "Rice - Special",
            "Rice, Sinandomeng": "Rice - Sinandomeng",
            # Vegetable naming variants
            "Ampalaya (Bitter Gourd)": "Ampalaya",
            "Ampalaya, Local": "Ampalaya",
            "Cabbage, Imported": "Cabbage",
            "Cabbage, Local": "Cabbage",
            "Carrots, Imported": "Carrots",
            "Carrots, Local": "Carrots",
            # Onion variants (critical post-2022 crisis)
            "Red Onion, Local": "Red Onion",
            "Red Onion, Imported": "Red Onion",
            "White Onion, Local": "White Onion",
            "White Onion, Imported": "White Onion",
            # Fish naming inconsistencies
            "Bangus (Milkfish)": "Bangus",
            "Galunggong (Round Scad), Local": "Galunggong",
            "Galunggong (Round Scad), Imported": "Galunggong",
            # Tomato variants
            "Tomato": "Tomato",
            "Tomatoes": "Tomato",
            # Sugar
            "Sugar, Washed": "Sugar - Washed",
            "Sugar, Refined": "Sugar - Refined",
            "Sugar, Brown": "Sugar - Brown",
            # Oil
            "Cooking Oil, Palm": "Cooking Oil - Palm",
            "Cooking Oil, Coconut": "Cooking Oil - Coconut",
        }

    def canonicalize(self, raw_name: str) -> str:
        """Map a raw commodity name to its canonical form."""
        cleaned = raw_name.strip()
        return self.name_map.get(cleaned, cleaned)

    def reverse_lookup(self, canonical_name: str) -> list:
        """Find all raw names that map to a canonical name."""
        return [
            raw for raw, canon in self.name_map.items()
            if canon == canonical_name
        ]