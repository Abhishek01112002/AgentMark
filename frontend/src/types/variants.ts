export interface CopyVariant {
  id: string;
  headline: string;
  body_copy: string;
  ctas: Record<string, string>;
  tags: string[];
  isChampion: boolean;
  isHidden: boolean;
  createdAt: string;
  generationNote: string;
}

export interface VisualVariant {
  id: string;
  deliverable_name: string;
  prompt: string;
  rationale: string;
  aspect_ratio: string;
  tags: string[];
  isChampion: boolean;
  isHidden: boolean;
  createdAt: string;
  generationNote: string;
}

export type CopyVariantsMap = Record<string, CopyVariant[]>;
export type VisualVariantsMap = Record<string, VisualVariant[]>;
