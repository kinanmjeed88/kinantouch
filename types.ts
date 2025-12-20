
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
  summary: string[];
  date: string;
  official_link: string;
}

export interface AICategoryData {
  id: string;
  name: string;
  last_updated: number; // Timestamp
  items: AINewsItem[];
}

export interface AINewsFeed {
  openai: AICategoryData;
  google: AICategoryData;
  meta: AICategoryData;
  microsoft: AICategoryData;
  anthropic: AICategoryData;
}

export interface PhoneNewsItem {
  phone_name: string;
  brand: string;
  release_date: string;
  // Flexible key-value pair for detailed specs
  specifications: Record<string, string>;
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

// Updated to support multiple charts per query
export interface StatsChart {
  title: string;
  description: string;
  chart_type: 'bar' | 'pie' | 'list';
  data: {
    label: string;
    value: number; // Percentage 0-100 or raw value
    displayValue: string; // e.g., "50M" or "25%"
    color?: string;
  }[];
}

export interface StatsResult {
  main_insight: string;
  charts: StatsChart[];
}

// Interfaces for Local Database
export interface LocalPhone {
  id: string;
  name: string;
  release_year: number;
  category: string;
  manufacturing: {
    frame: string;
    back: string;
    protection: string;
    water_resistance: string;
  };
  specs: {
    display: {
      size?: string;
      type?: string;
      resolution?: string;
      refresh_rate?: string;
      // For foldables
      main?: string;
      cover?: string;
    };
    chipset: string;
    ram: string;
    storage: string;
    rear_camera: string;
    front_camera: string;
    battery: string;
    charging: string;
    weight: string;
    os: string;
  };
}

export interface BrandFile {
  brand: string;
  country: string;
  phones: LocalPhone[];
}
