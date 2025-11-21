// components/ProfileStats.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { ProfileStats as ProfileStatsType } from '../../types/profile'

interface ProfileStatsProps {
  stats: ProfileStatsType
}

export function ProfileStats({ stats }: ProfileStatsProps) {
  return (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <View style={[styles.statIcon, styles.announcementsIcon]}>
          <Text style={styles.statIconText}>📢</Text>
        </View>
        <Text style={styles.statNumber}>{stats.announcements_count}</Text>
        <Text style={styles.statLabel}>Announcements</Text>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statCard}>
        <View style={[styles.statIcon, styles.reactionsIcon]}>
          <Text style={styles.statIconText}>❤️</Text>
        </View>
        <Text style={styles.statNumber}>{stats.reactions_count}</Text>
        <Text style={styles.statLabel}>Reactions</Text>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statCard}>
        <View style={[styles.statIcon, styles.memberIcon]}>
          <Text style={styles.statIconText}>📅</Text>
        </View>
        <Text style={styles.statValue}>{stats.member_since}</Text>
        <Text style={styles.statLabel}>Member Since</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: -25,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  announcementsIcon: {
    backgroundColor: '#e0e7ff',
  },
  reactionsIcon: {
    backgroundColor: '#fce7f3',
  },
  memberIcon: {
    backgroundColor: '#f0fdf4',
  },
  statIconText: {
    fontSize: 16,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 8,
  },
})