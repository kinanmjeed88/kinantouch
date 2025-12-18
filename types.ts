
export interface ChannelData {
  id: string;
  name: string;
  description: string;
  url: string;
  isFolder?: boolean;
  iconType?: 'telegram' | 'folder' | 'ai';
}

export interface SocialData {
  id: string;
  platform: 'Facebook' | 'Instagram' | 'TikTok' | 'YouTube';
  url: string;
}

export interface AINewsItem {
  id: string;
  tool_name: string;
  company: string;
  category: 'llm' | 'image' | 'video' | 'audio' | 'platform' | 'other';
  version: string;
  title: string;
  description: string[];
  official_usage_link: string;
  news_date?: string;
}

export interface AIFallbackHighlight {
  tool_name: string;
  latest_version: string;
  title: string;
  display_rule: string;
}

export interface AINewsResponse {
  generated_at: string;
  expires_in_hours: number;
  items: AINewsItem[];
  fallback_highlight?: AIFallbackHighlight;
}

export interface PhoneNewsItem {
  title: string;
  manufacturer: string;
  launchYear: string;
  specsPoints: string[];
  imageUrl: string;
  url: string;
}

export interface CompanySalesStat {
  name: string;
  marketShare: string;
  topPhone: string;
  details: string;
}

export interface JobItem {
  title: string;
  ministry: string;
  date: string;
  description: string;
  url: string;
}

export interface PhoneSpec {
  feature: string;
  phone1: string;
  phone2: string;
}

export interface PhoneComparisonResult {
  specs: PhoneSpec[];
  verdict: string;
  betterPhone: string;
}
