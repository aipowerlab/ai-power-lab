import { Ionicons } from '@expo/vector-icons';

export interface ToolInput {
  key: string;
  label: string;
  placeholder: string;
}

export interface Tool {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  type: string;
  enabled: boolean;
  inputs: ToolInput[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'document-text': 'document-text',
  'share-social': 'share-social',
  'briefcase': 'briefcase',
  'code-slash': 'code-slash',
  'color-palette': 'color-palette',
  'search': 'search',
  'checkbox': 'checkbox',
  'cash': 'cash',
  'compass': 'compass',
};

export const TOOL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'document-text': 'document-text',
  'film': 'film',
  'megaphone': 'megaphone',
  'camera': 'camera',
  'pricetag': 'pricetag',
  'logo-youtube': 'logo-youtube',
  'logo-linkedin': 'logo-linkedin',
  'bulb': 'bulb',
  'briefcase': 'briefcase',
  'text': 'text',
  'code-slash': 'code-slash',
  'terminal': 'terminal',
  'image': 'image',
  'color-palette': 'color-palette',
  'search': 'search',
  'create': 'create',
  'checkbox': 'checkbox',
  'trophy': 'trophy',
  'cash': 'cash',
  'trending-up': 'trending-up',
  'compass': 'compass',
};
