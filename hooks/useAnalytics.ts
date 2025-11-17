// hooks/useAnalytics.ts
import { useState, useEffect } from 'react'
import { analyticsService } from '../services/analyticsService'
import { AnalyticsSummary } from '../types/announcement'

export const useAnalytics = (startDate: Date, endDate: Date) => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [topAnnouncements, setTopAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)

      const [summaryData, chartResult, topResult] = await Promise.all([
        analyticsService.getAnalyticsSummary(startDate, endDate),
        analyticsService.getChartData(startDate, endDate),
        analyticsService.getTopAnnouncements(10, startDate, endDate)
      ])

      setSummary(summaryData)
      setChartData(chartResult)
      setTopAnnouncements(topResult)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [startDate, endDate])

  return { summary, chartData, topAnnouncements, loading, refetch: fetchAnalytics }
}