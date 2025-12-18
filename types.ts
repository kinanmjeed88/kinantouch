
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
  tool_name: string;
  title: string;
  summary: string[];
  date: string;
  official_link: string;
}

export interface PhoneNewsItem {
  phone_name: string;
  brand: string;
  release_date: string;
  specifications: {
    networks: string;
    dimensions: string;
    weight: string;
    materials: string;
    water_resistance: string;
    display: string;
    processor: string;
    gpu: string;
    memory: string;
    cameras: string;
    video: string;
    battery: string;
    os: string;
    connectivity: string;
    sensors: string;
    colors: string;
  };
  price_usd: string;
  official_specs_link: string;
  iraqi_price_source: string;
  pros: string[];
  cons: string[];
  copy_payload: string;
}

export interface JobItem {
  title: string;
  entity: string;
  job_type: string;
  conditions: string[];
  apply_deadline: string;
  official_link: string;
}

export interface PhoneComparisonResult {
  specs: { feature: string; phone1: string; phone2: string }[];
  verdict: string;
  betterPhone: string;
}
