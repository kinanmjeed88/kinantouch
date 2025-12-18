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
  description: string;
  url: string;
}

export interface PhoneNewsItem {
  title: string;
  manufacturer: string;
  launchDate: string;
  shortDesc: string;
  fullSpecs: string[];
  url: string;
}

export interface JobItem {
  title: string;
  ministry: string;
  date: string;
  description: string;
  url: string;
  announcement_type: 'informational' | 'actionable';
  is_link_verified: boolean;
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