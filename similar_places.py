#!/usr/bin/env python3
"""
POC: similar-places recommender for the travel bucket-list app.

Averages the OpenAI embeddings of a user's saved places into a "taste vector",
then ranks candidate places by cosine similarity to that vector.

Run:
    OPENAI_API_KEY=sk-... python3 similar_places.py

Deps: openai, numpy. Nothing else.
Cache: embeddings are memoised in .embedding_cache.json so re-runs cost nothing.
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from openai import OpenAI

EMBED_MODEL = "text-embedding-3-small"
CACHE_PATH = Path(__file__).with_name(".embedding_cache.json")


@dataclass(frozen=True)
class Place:
    name: str
    city: str
    type: str
    tags: tuple[str, ...]

    def describe(self) -> str:
        return f"{self.name} — {self.type} in {self.city} — {', '.join(self.tags)}"


# --------------------------------------------------------------------------- #
# Data                                                                        #
# --------------------------------------------------------------------------- #

PROFILE_FINE_DINING_ART: list[Place] = [
    Place("Noma", "Copenhagen", "restaurant",
          ("fine-dining", "new-nordic", "tasting-menu", "michelin-3-star")),
    Place("The French Laundry", "Yountville", "restaurant",
          ("fine-dining", "french", "michelin-3-star", "tasting-menu")),
    Place("Frantzén", "Stockholm", "restaurant",
          ("fine-dining", "nordic", "michelin-3-star", "tasting-menu")),
    Place("Fondation Louis Vuitton", "Paris", "museum",
          ("contemporary-art", "architecture", "frank-gehry")),
    Place("Palais de Tokyo", "Paris", "museum",
          ("contemporary-art", "experimental", "avant-garde")),
    Place("Tate Modern", "London", "museum",
          ("contemporary-art", "modern-art", "turbine-hall")),
    Place("Hotel Sanders", "Copenhagen", "hotel",
          ("design-hotel", "boutique", "scandinavian")),
]

PROFILE_ADVENTURE_STREET_FOOD: list[Place] = [
    Place("Jemaa el-Fnaa food stalls", "Marrakech", "market",
          ("street-food", "night-market", "moroccan")),
    Place("Tsukiji Outer Market", "Tokyo", "market",
          ("street-food", "seafood", "sushi")),
    Place("Smorrebrod at Torvehallerne", "Copenhagen", "market",
          ("street-food", "food-hall", "nordic")),
    Place("Annapurna Circuit", "Pokhara", "hike",
          ("adventure", "multi-day", "mountains", "trekking")),
    Place("Torres del Paine W Trek", "Patagonia", "hike",
          ("adventure", "wilderness", "mountains", "trekking")),
    Place("Mount Bromo sunrise hike", "East Java", "hike",
          ("adventure", "volcano", "sunrise")),
    Place("Bangkok street food tour", "Bangkok", "tour",
          ("street-food", "thai", "walking-tour")),
]

PROFILE_FAMILY_BEACHES: list[Place] = [
    Place("LEGOLAND Billund", "Billund", "theme-park",
          ("family", "kids", "rides")),
    Place("Universal Studios Japan", "Osaka", "theme-park",
          ("family", "kids", "rides", "harry-potter")),
    Place("Disneyland Paris", "Paris", "theme-park",
          ("family", "kids", "rides", "disney")),
    Place("Phi Phi Islands day tour", "Krabi", "tour",
          ("family", "beach", "snorkel", "boat-tour")),
    Place("Waikiki Beach", "Honolulu", "beach",
          ("family", "beach", "surf-lessons")),
    Place("Atlantis Aquaventure", "Dubai", "water-park",
          ("family", "kids", "water-park", "slides")),
    Place("Maldives family resort (Kuredu)", "Maldives", "resort",
          ("family", "beach", "all-inclusive", "snorkel")),
]

CANDIDATES: list[Place] = [
    # Fine-dining / Michelin
    Place("Geranium", "Copenhagen", "restaurant",
          ("fine-dining", "new-nordic", "michelin-3-star", "tasting-menu")),
    Place("Alinea", "Chicago", "restaurant",
          ("fine-dining", "molecular", "michelin-3-star", "tasting-menu")),
    Place("Asador Etxebarri", "Atxondo", "restaurant",
          ("fine-dining", "basque", "wood-fire", "michelin-1-star")),
    Place("Mirazur", "Menton", "restaurant",
          ("fine-dining", "mediterranean", "michelin-3-star", "tasting-menu")),
    Place("Sushi Saito", "Tokyo", "restaurant",
          ("fine-dining", "sushi", "omakase", "michelin-3-star")),
    Place("Central", "Lima", "restaurant",
          ("fine-dining", "peruvian", "tasting-menu", "world-50-best")),

    # Casual / mid-range restaurants (should rank below fine-dining for that profile)
    Place("A Cevicheria", "Lisbon", "restaurant",
          ("casual", "seafood", "portuguese")),
    Place("Hawker Chan", "Singapore", "restaurant",
          ("casual", "cheap-eats", "chinese", "michelin-1-star")),
    Place("Pizzeria Starita", "Naples", "restaurant",
          ("casual", "pizza", "italian")),

    # Contemporary / modern art museums
    Place("Louisiana Museum of Modern Art", "Humlebæk", "museum",
          ("contemporary-art", "modern-art", "nordic", "sculpture-garden")),
    Place("Centre Pompidou", "Paris", "museum",
          ("contemporary-art", "modern-art", "iconic-architecture")),
    Place("Museum of Modern Art (MoMA)", "New York", "museum",
          ("contemporary-art", "modern-art", "iconic")),
    Place("Prada Foundation", "Milan", "museum",
          ("contemporary-art", "avant-garde", "rem-koolhaas")),
    Place("Teshima Art Museum", "Teshima", "museum",
          ("contemporary-art", "architecture", "art-island")),
    Place("Garage Museum", "Moscow", "museum",
          ("contemporary-art", "avant-garde")),

    # Classical / historic museums (adjacent but different)
    Place("Musée d'Orsay", "Paris", "museum",
          ("impressionism", "19th-century", "classical")),
    Place("The Louvre", "Paris", "museum",
          ("classical", "antiquities", "tourist")),
    Place("Uffizi Gallery", "Florence", "museum",
          ("renaissance", "classical", "tourist")),

    # Design hotels
    Place("Ace Hotel Kyoto", "Kyoto", "hotel",
          ("design-hotel", "boutique", "japanese")),
    Place("Hotel Il Pellicano", "Porto Ercole", "hotel",
          ("design-hotel", "boutique", "coastal")),
    Place("The Standard", "London", "hotel",
          ("design-hotel", "boutique", "hip")),
    Place("Chiltern Firehouse", "London", "hotel",
          ("design-hotel", "boutique", "restaurant")),
    Place("Aman Tokyo", "Tokyo", "hotel",
          ("luxury-hotel", "minimalist", "japanese")),

    # Street food / markets
    Place("Old Delhi food tour", "Delhi", "tour",
          ("street-food", "indian", "walking-tour")),
    Place("Mercado de San Miguel", "Madrid", "market",
          ("street-food", "food-hall", "tapas")),
    Place("Chatuchak Weekend Market", "Bangkok", "market",
          ("market", "street-food", "shopping")),
    Place("Borough Market", "London", "market",
          ("market", "food-hall", "produce")),
    Place("Mercado Central", "Valencia", "market",
          ("market", "street-food", "spanish")),

    # Hikes / adventure
    Place("Kilimanjaro Machame Route", "Tanzania", "hike",
          ("adventure", "mountain", "multi-day", "summit")),
    Place("Laugavegur Trail", "Iceland", "hike",
          ("adventure", "multi-day", "volcanic")),
    Place("Inca Trail to Machu Picchu", "Cusco", "hike",
          ("adventure", "multi-day", "historic", "mountains")),
    Place("Tour du Mont Blanc", "Chamonix", "hike",
          ("adventure", "multi-day", "alps")),
    Place("Kalalau Trail", "Kauai", "hike",
          ("adventure", "coastal", "tropical")),

    # Surf / diving / active
    Place("Uluwatu surf", "Bali", "activity",
          ("surf", "beach", "adventure")),
    Place("Great Barrier Reef dive", "Cairns", "activity",
          ("diving", "reef", "marine-life")),

    # Theme parks
    Place("Walt Disney World", "Orlando", "theme-park",
          ("family", "kids", "rides", "disney")),
    Place("Tokyo DisneySea", "Tokyo", "theme-park",
          ("family", "kids", "rides", "disney")),
    Place("Europa-Park", "Rust", "theme-park",
          ("family", "kids", "rides")),
    Place("Ferrari World", "Abu Dhabi", "theme-park",
          ("family", "kids", "rides")),

    # Family beach resorts
    Place("Club Med Cefalù", "Sicily", "resort",
          ("family", "beach", "all-inclusive", "kids-club")),
    Place("Beaches Turks & Caicos", "Providenciales", "resort",
          ("family", "beach", "all-inclusive", "kids-club")),
    Place("Four Seasons Maldives Kuda Huraa", "Maldives", "resort",
          ("luxury-hotel", "beach", "family", "snorkel")),
    Place("Aulani", "Oahu", "resort",
          ("family", "beach", "disney", "kids")),

    # Beaches / snorkel
    Place("Elafonissi Beach", "Crete", "beach",
          ("beach", "pink-sand", "family")),
    Place("Navagio Beach", "Zakynthos", "beach",
          ("beach", "boat-access", "scenic")),
    Place("Baa Atoll snorkel", "Maldives", "activity",
          ("snorkel", "marine-life", "reef")),

    # Generic tourist landmarks (sanity check — should not rank high for any profile)
    Place("Eiffel Tower", "Paris", "landmark",
          ("landmark", "tourist", "iconic")),
    Place("Colosseum", "Rome", "landmark",
          ("landmark", "ancient", "tourist")),
    Place("Big Ben", "London", "landmark",
          ("landmark", "tourist", "iconic")),
    Place("Statue of Liberty", "New York", "landmark",
          ("landmark", "tourist", "iconic")),
    Place("Times Square", "New York", "landmark",
          ("landmark", "tourist", "iconic")),
]


# --------------------------------------------------------------------------- #
# Cache + embeddings                                                          #
# --------------------------------------------------------------------------- #

def load_cache() -> dict[str, list[float]]:
    if CACHE_PATH.exists():
        return json.loads(CACHE_PATH.read_text())
    return {}


def save_cache(cache: dict[str, list[float]]) -> None:
    CACHE_PATH.write_text(json.dumps(cache))


def embed(texts: list[str], cache: dict[str, list[float]], client: OpenAI) -> np.ndarray:
    missing = sorted({t for t in texts if t not in cache})
    if missing:
        resp = client.embeddings.create(model=EMBED_MODEL, input=missing)
        for text, item in zip(missing, resp.data):
            cache[text] = item.embedding
        save_cache(cache)
    return np.array([cache[t] for t in texts], dtype=np.float32)


def cosine(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """a: (d,), b: (n, d) → (n,) cosine similarities."""
    an = a / (np.linalg.norm(a) + 1e-12)
    bn = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-12)
    return bn @ an


# --------------------------------------------------------------------------- #
# Recommender                                                                 #
# --------------------------------------------------------------------------- #

def recommend(
    saved: list[Place],
    candidates: list[Place],
    top_k: int,
    client: OpenAI,
    cache: dict[str, list[float]],
) -> list[tuple[Place, float]]:
    saved_text = [p.describe() for p in saved]
    cand_text = [p.describe() for p in candidates]
    saved_vecs = embed(saved_text, cache, client)
    cand_vecs = embed(cand_text, cache, client)

    taste = saved_vecs.mean(axis=0)
    scores = cosine(taste, cand_vecs)

    # Exclude any candidate that's already in the saved list.
    saved_keys = {(p.name, p.city) for p in saved}
    ranked = [
        (p, float(s)) for p, s in zip(candidates, scores)
        if (p.name, p.city) not in saved_keys
    ]
    ranked.sort(key=lambda row: -row[1])
    return ranked[:top_k]


def print_recs(title: str, recs: list[tuple[Place, float]]) -> None:
    print(f"\n{title}")
    print("-" * len(title))
    for i, (p, score) in enumerate(recs, 1):
        print(f"{i:>2}. {score:.3f}  {p.describe()}")


# --------------------------------------------------------------------------- #
# Main                                                                        #
# --------------------------------------------------------------------------- #

def main() -> int:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        print("ERROR: OPENAI_API_KEY is not set. Export it and re-run.", file=sys.stderr)
        return 1

    client = OpenAI(api_key=key)
    cache = load_cache()

    # Primary demo — top 10 for the fine-dining + contemporary-art profile.
    recs = recommend(PROFILE_FINE_DINING_ART, CANDIDATES, 10, client, cache)
    print_recs("Top 10 — profile: fine-dining & contemporary art", recs)

    # Eval — top 5 for each of three hand-picked profiles.
    print("\n" + "=" * 60)
    print("Eval: top 5 recommendations per user profile")
    print("=" * 60)
    profiles = {
        "fine-dining & contemporary art": PROFILE_FINE_DINING_ART,
        "adventure & street food": PROFILE_ADVENTURE_STREET_FOOD,
        "family beaches & theme parks": PROFILE_FAMILY_BEACHES,
    }
    for name, saved in profiles.items():
        recs = recommend(saved, CANDIDATES, 5, client, cache)
        print_recs(name, recs)

    return 0


if __name__ == "__main__":
    sys.exit(main())
