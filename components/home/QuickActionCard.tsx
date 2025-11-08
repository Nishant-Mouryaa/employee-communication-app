// components/home/QuickActionCard.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { IS_MOBILE, SCREEN_WIDTH } from '../../constants/home'

interface QuickActionCardProps {
  icon: string
  iconBgColor: string
  title: string
  onPress: () => void
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  icon,
  iconBgColor,
  title,
  onPress
}) => {
  return (
    <TouchableOpacity 
      style={styles.actionCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIconBg, { backgroundColor: iconBgColor }]}>
        <Text style={styles.actionIcon}>{icon}</Text>
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  actionCard: {
    flex: IS_MOBILE ? 0 : 1,
    minWidth: IS_MOBILE ? (SCREEN_WIDTH - 52) / 2 : undefined,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
})