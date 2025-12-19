
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
  tool_name?: string;
  title: string;
  summary: string[];
  date?: string;
  official_link: string;
}

export interface PhoneNewsItem {
  phone_name: string;
  brand: string;
  release_date: string;
  // Flexible key-value pair for detailed specs
  specifications: Record<string, string>;
  price_usd: string;
  official_specs_link?: string;
  iraqi_price_source?: string;
  pros: string[];
  cons: string[];
  copy_payload?: string;
}

export interface PhoneComparisonResult {
  phone1_name: string;
  phone2_name: string;
  comparison_points: {
    feature: string;
    phone1_val: string;
    phone2_val: string;
    winner?: 1 | 2 | 0; // 0 for tie/neutral
  }[];
  verdict: string;
}

export interface StatsResult {
  title: string;
  description: string;
  total_samples?: string;
  chart_type: 'bar' | 'list';
  data: {
    label: string;
    value: number; // Percentage 0-100
    displayValue: string; // e.g., "50M Units" or "25%"
    color?: string;
  }[];
  insight: string;
}
