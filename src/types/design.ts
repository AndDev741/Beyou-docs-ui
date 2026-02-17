export type DesignCategory = "flows" | "wireframes" | "specs";

export type DesignMeta = {
  title?: string;
  category?: DesignCategory;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  project?: string;
};

export interface Design {
  id: string;
  slug?: string;
  path?: string;
  title: string;
  category: DesignCategory;
  content: string; // Markdown content with optional mermaid blocks
  author: string;
  createdAt: Date;
  updatedAt: Date;
  project?: string;
}

export interface DesignFormData {
  title: string;
  category: DesignCategory;
  content: string;
}
