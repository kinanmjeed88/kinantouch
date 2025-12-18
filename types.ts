
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
  category: 'llm' | 'text' | 'image' | 'video' | 'audio' | 'productivity' | 'research' | 'platform' | 'other';
  title: string;
  content: string[]; // بالضبط 4 أسطر
  news_date: string; // YYYY-MM-DD
  official_link: string;
  review_status: 'draft' | 'pending_review' | 'auto_approved' | 'rejected';
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
