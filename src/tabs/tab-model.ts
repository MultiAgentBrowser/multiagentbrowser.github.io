export interface Tab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  profileId: string;
  isPinned: boolean;
  createdAt: number;
  lastAccessedAt: number;
}

export interface CreateTabOptions {
  url?: string;
  profileId?: string;
  activate?: boolean;
}

