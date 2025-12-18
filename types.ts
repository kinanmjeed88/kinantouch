
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
}

export interface AINewsResponse {
  generated_at: string;
  expires_in_hours: number;
  items: AINewsItem[];
  fallback_highlight?: {
    tool_name: string;
    latest_version: string;
    title: string;
    display_rule: string;
  };
}

export interface PhoneNewsItem {
  phone_name: string;
  brand: string;
  release_date: string;
  specifications: {
    display: string;
    processor: string;
    ram: string;
    storage: string;
    cameras: string;
    battery: string;
    os: string;
    features: string;
  };
  price_usd: string;
  official_link: string;
  iraqi_price_source: string;
  copy_payload: string;
}

export interface JobItem {
  title: string;
  content: string[];
  official_link: string;
  copy_payload: string;
}

export interface PhoneComparisonResult {
  specs: { feature: string; phone1: string; phone2: string }[];
  verdict: string;
  betterPhone: string;
}
