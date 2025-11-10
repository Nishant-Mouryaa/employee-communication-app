// hooks/useOnlineStatus.ts
import { useEffect, useCallback } from 'react'
import { AppState } from 'react-native'
import { supabase } from '../lib/supabase'
import { updateUserOnlineStatus, subscribeToOnlineStatus } from '../services/onlineStatusService'

export const useOnlineStatus = (userId: string | undefined, channelId: string | undefined) => {
  const handleAppStateChange = useCallback((nextAppState: string) => {
    if (!userId) return

    if (nextAppState === 'active') {
      updateUserOnlineStatus(userId, true)
    } else {
      updateUserOnlineStatus(userId, false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return

    // Set user as online when they connect
    updateUserOnlineStatus(userId, true)

    const subscription = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      subscription.remove()
      // Set user as offline when they disconnect
      updateUserOnlineStatus(userId, false)
    }
  }, [userId, handleAppStateChange])

  useEffect(() => {
    if (!channelId) return

    // Subscribe to online status changes for other users in the channel
    const subscription = subscribeToOnlineStatus(channelId, (payload) => {
      // You can update your local state here if needed
      console.log('User status changed:', payload)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [channelId])
}