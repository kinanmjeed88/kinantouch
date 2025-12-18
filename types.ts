
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
  title: string;
  description: string; // يجب أن يكون 5 أسطر
  url: string;
}

export interface PhoneNewsItem {
  title: string;
  manufacturer: string;
  launchYear: string;
  specsPoints: string[]; // قائمة نقاط مرتبة
  imageUrl: string;
  url: string;
}

export interface CompanySalesStat {
  name: string;
  marketShare: string;
  details: string;
}

export interface JobItem {
  title: string;
  ministry: string;
  date: string;
  description: string; // لا يتجاوز 5 أسطر
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
