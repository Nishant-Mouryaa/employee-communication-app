// components/announcements/AnalyticsDashboard.tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions
} from 'react-native'
import { LineChart, BarChart } from 'react-native-chart-kit'
import { useAnalytics } from '../../hooks/useAnalytics'
import { useLanguage } from '../../hooks/useLanguage'
import { useTenant } from '../../hooks/useTenant'

const screenWidth = Dimensions.get('window').width

export const AnalyticsDashboard: React.FC = () => {
  const { t } = useLanguage()
  const { organizationId } = useTenant()
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')
  
  const getDateRange = () => {
    const end = new Date()
    const start = new Date()
    
    switch (dateRange) {
      case '7d':
        start.setDate(start.getDate() - 7)
        break
      case '30d':
        start.setDate(start.getDate() - 30)
        break
      case '90d':
        start.setDate(start.getDate() - 90)
        break
    }
    
    return { start, end }
  }

  const { start, end } = getDateRange()
  const { summary, chartData, topAnnouncements, loading } = useAnalytics(organizationId, start, end)

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#007AFF'
    }
  }

  const renderStatCard = (title: string, value: string | number, icon: string, color: string) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  )

  if (!organizationId) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t('common.loading')}</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t('common.loading')}</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('analytics.title')}</Text>
        
        {/* Date Range Filter */}
        <View style={styles.dateRangeContainer}>
          {[
            { key: '7d', label: t('analytics.last7Days') },
            { key: '30d', label: t('analytics.last30Days') },
            { key: '90d', label: t('analytics.last90Days') }
          ].map((range) => (
            <TouchableOpacity
              key={range.key}
              style={[
                styles.dateRangeButton,
                dateRange === range.key && styles.dateRangeButtonActive
              ]}
              onPress={() => setDateRange(range.key as any)}
            >
              <Text style={[
                styles.dateRangeText,
                dateRange === range.key && styles.dateRangeTextActive
              ]}>
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.statsGrid}>
        {renderStatCard(
          t('analytics.totalViews'),
          summary?.total_views || 0,
          '👁️',
          '#007AFF'
        )}
        {renderStatCard(
          t('analytics.totalReactions'),
          summary?.total_reactions || 0,
          '❤️',
          '#FF3B30'
        )}
        {renderStatCard(
          t('analytics.totalComments'),
          summary?.total_comments || 0,
          '💬',
          '#34C759'
        )}
        {renderStatCard(
          t('analytics.activeUsers'),
          summary?.active_users || 0,
          '👥',
          '#FF9500'
        )}
      </View>

      {/* Engagement Rate */}
      <View style={styles.engagementCard}>
        <Text style={styles.engagementTitle}>
          {t('analytics.engagementRate')}
        </Text>
        <Text style={styles.engagementValue}>
          {summary?.avg_engagement_rate?.toFixed(1) || 0}%
        </Text>
        <Text style={styles.engagementSubtitle}>
          Average across all announcements
        </Text>
      </View>

      {/* Chart */}
      {chartData.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Activity Trend</Text>
          <LineChart
            data={{
              labels: chartData.map(d => 
                new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              ),
              datasets: [
                {
                  data: chartData.map(d => d.views),
                  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                  strokeWidth: 2
                },
                {
                  data: chartData.map(d => d.reactions),
                  color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`,
                  strokeWidth: 2
                }
              ],
              legend: ['Views', 'Reactions']
            }}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Top Announcements */}
      <View style={styles.topAnnouncementsContainer}>
        <Text style={styles.sectionTitle}>{t('analytics.topAnnouncements')}</Text>
        {topAnnouncements.map((item, index) => (
          <View key={item.announcement_id} style={styles.topAnnouncementItem}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={styles.topAnnouncementContent}>
              <Text style={styles.topAnnouncementTitle} numberOfLines={1}>
                {item.announcements.title}
              </Text>
              <View style={styles.topAnnouncementStats}>
                <Text style={styles.topAnnouncementStat}>
                  👁️ {item.view_count}
                </Text>
                <Text style={styles.topAnnouncementStat}>
                  ❤️ {item.reaction_count}
                </Text>
                <Text style={styles.topAnnouncementStat}>
                  💬 {item.comment_count}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dateRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  dateRangeButtonActive: {
    backgroundColor: '#007AFF',
  },
  dateRangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  dateRangeTextActive: {
    color: 'white',
  },
  statsGrid: {
    padding: 20,
    gap: 12,
  },
  statCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  engagementCard: {
    margin: 20,
    marginTop: 0,
    padding: 24,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    alignItems: 'center',
  },
  engagementTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginBottom: 8,
  },
  engagementValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  engagementSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  chartContainer: {
    margin: 20,
    marginTop: 0,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  topAnnouncementsContainer: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  topAnnouncementItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  topAnnouncementContent: {
    flex: 1,
  },
  topAnnouncementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  topAnnouncementStats: {
    flexDirection: 'row',
    gap: 16,
  },
  topAnnouncementStat: {
    fontSize: 12,
    color: '#64748b',
  },
})