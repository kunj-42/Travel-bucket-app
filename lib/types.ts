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
