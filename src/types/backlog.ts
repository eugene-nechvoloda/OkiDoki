export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  parentId?: string;
  depth: number;
  createdAt: string;
}

export interface Backlog {
  id: string;
  prdTitle: string;
  items: BacklogItem[];
  createdAt: string;
  updatedAt: string;
}
