export type Category = 'Stay' | 'Eat' | 'Do' | 'See';

export const CATEGORIES: Category[] = ['Stay', 'Eat', 'Do', 'See'];

export const CATEGORY_BLURBS: Record<Category, string> = {
  Stay: 'Where to sleep',
  Eat: 'Where to eat & drink',
  Do: 'What to do',
  See: 'What to see',
};

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Place {
  id: string;
  title: string;
  category: Category;
  city: string;
  country: string;
  coordinates?: Coordinates;
  sourceUrl?: string;
  thumbnailUrl?: string;
  address?: string;
  googlePlaceId?: string;
  notes?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  // Reserved for future shared-bucket support. V1 places all sit in the
  // default personal bucket.
  bucketIds: string[];
  // Visited state — set when the user taps "Mark as visited" on the detail
  // screen. `visitNote` is the share-eligible tip shown post-visit.
  visited?: boolean;
  visitedAt?: number;
  visitNote?: string;
  // "Up next" pin — the short-list of places the user is actively planning
  // to visit on their next trip. Capped in the store (see MAX_PINS) so this
  // stays a curated shortlist, not another dump.
  pinned?: boolean;
  pinnedAt?: number;
}

export interface PickedCity {
  name: string;
  country: string;
  coordinates?: Coordinates;
}

export interface Bucket {
  id: string;
  name: string;
  ownerId: string;
  isShared: boolean;
  createdAt: number;
}

export const DEFAULT_BUCKET_ID = 'personal';
export const DEFAULT_OWNER_ID = 'me';

/**
 * A pin imported from a Google Maps Takeout export. Stored separately from
 * Place so the user can browse their full Google history without polluting
 * the curated bucket. Promoting an imported pin runs it through the normal
 * add flow, which creates a real Place record from this skeleton.
 */
export interface ImportedPin {
  id: string;
  title: string;
  address?: string;
  city?: string;
  country?: string;
  coordinates?: Coordinates;
  mapsUrl?: string;
  note?: string;
  sourceList?: string;
  importedAt: number;
  promoted?: boolean;
}
