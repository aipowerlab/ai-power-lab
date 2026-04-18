import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface PremiumIconProps {
  name: string;
  size?: number;
  color: string;
  bgSize?: number;
  borderRadius?: number;
  gradientOpacity?: number;
}

export default function PremiumIcon({
  name,
  size = 20,
  color,
  bgSize = 40,
  borderRadius = 14,
  gradientOpacity = 0.18,
}: PremiumIconProps) {
  const hexToRGBA = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const bgStart = hexToRGBA(color, gradientOpacity);
  const bgEnd = hexToRGBA(color, gradientOpacity * 0.4);
  const glowColor = hexToRGBA(color, 0.25);

  return (
    <View style={[s.outer, { width: bgSize, height: bgSize, borderRadius }]}>
      <LinearGradient
        colors={[bgStart, bgEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.gradient, { borderRadius }]}
      />
      <View style={[s.glowBorder, { borderRadius, borderColor: hexToRGBA(color, 0.12) }]} />
      <Ionicons name={name as any} size={size} color={color} />
    </View>
  );
}

// Smaller variant for list items
export function PremiumIconSmall({
  name,
  color,
  size = 16,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  return (
    <PremiumIcon
      name={name}
      color={color}
      size={size}
      bgSize={34}
      borderRadius={11}
      gradientOpacity={0.15}
    />
  );
}

// Nav icon for sidebar
export function NavIcon({
  name,
  color,
  active,
  size = 20,
}: {
  name: string;
  color: string;
  active?: boolean;
  size?: number;
}) {
  const hexToRGBA = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  if (!active) {
    return <Ionicons name={name as any} size={size} color={color} />;
  }

  return (
    <View style={[s.navOuter, { width: 34, height: 34, borderRadius: 10 }]}>
      <LinearGradient
        colors={[hexToRGBA(color, 0.2), hexToRGBA(color, 0.08)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.gradient, { borderRadius: 10 }]}
      />
      <Ionicons name={name as any} size={size} color={color} />
    </View>
  );
}

const s = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      },
      default: {
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
    }),
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
  },
  navOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
