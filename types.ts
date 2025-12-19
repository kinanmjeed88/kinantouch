
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
    networks?: string;
    dimensions?: string;
    weight?: string;
    materials?: string;
    water_resistance?: string;
    display?: string;
    processor?: string;
    gpu?: string;
    memory_storage?: string;
    rear_cameras?: string;
    front_camera?: string;
    video?: string;
    battery_charging?: string;
    operating_system?: string;
    connectivity?: string;
    sensors?: string;
    colors?: string;
    [key: string]: string | undefined;
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