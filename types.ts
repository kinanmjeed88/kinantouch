
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
  tool_name?: string; // Optional now as strictly mapped from title
  title: string;
  summary: string[]; // Mapped from 'content' in new schema
  date?: string; // Optional, derived from context if needed
  official_link: string;
}

export interface PhoneNewsItem {
  phone_name: string;
  brand: string;
  release_date: string;
  specifications: {
    [key: string]: string; // Flexible key-value for full_specifications
  };
  price_usd: string;
  official_specs_link?: string; // Mapped from generic link if needed
  iraqi_price_source?: string; // Mapped from price_source
  pros: string[];
  cons: string[];
  copy_payload?: string;
}

export interface PhoneComparisonResult {
  specs: { feature: string; phone1: string; phone2: string }[];
  verdict: string;
  betterPhone: string;
}
