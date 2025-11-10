// hooks/useTypingIndicator.ts
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { TypingUser } from '../types/chat'
import { updateTypingIndicator, clearTypingIndicator } from '../services/typingService'
import { TYPING_DEBOUNCE, TYPING_TIMEOUT } from '../constants/chat'

interface UseTypingIndicatorProps {
  channelId: string | undefined
  userId: string | undefined
  channelMembers: Map<string, any>
}

export const useTypingIndicator = ({
  channelId,
  userId,
  channelMembers
}: UseTypingIndicatorProps) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const subscriptionRef = useRef<RealtimeChannel | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleTyping = useCallback(async () => {
    if (!channelId || !userId) return
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(async () => {
      try {
        await updateTypingIndicator(channelId, userId)
      } catch (error) {
        console.error('Error updating typing indicator:', error)
      }
    }, TYPING_DEBOUNCE)
  }, [channelId, userId])

  const handleStopTyping = useCallback(async () => {
    if (!channelId || !userId) return
    
    try {
      await clearTypingIndicator(channelId, userId)
    } catch (error) {
      console.error('Error clearing typing indicator:', error)
    }
  }, [channelId, userId])

  useEffect(() => {
    if (!channelId || !userId) return

    const channel = supabase
      .channel(`typing:${channelId}:${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          if (payload.new && payload.new.user_id !== userId) {
            const typedTime = new Date(payload.new.last_typed).getTime()
            const now = Date.now()
            
            if (now - typedTime < TYPING_TIMEOUT) {
              const profile = channelMembers.get(payload.new.user_id) || {
                id: payload.new.user_id,
                username: 'Someone',
                full_name: 'Someone'
              }

              setTypingUsers(prev => {
                const filtered = prev.filter(u => u.user_id !== payload.new.user_id)
                return [...filtered, {
                  user_id: payload.new.user_id,
                  username: profile.username,
                  full_name: profile.full_name
                }]
              })
              
              setTimeout(() => {
                setTypingUsers(prev => 
                  prev.filter(u => u.user_id !== payload.new.user_id)
                )
              }, TYPING_TIMEOUT)
            }
          }

          if (payload.eventType === 'DELETE' && payload.old) {
            setTypingUsers(prev => 
              prev.filter(u => u.user_id !== payload.old.user_id)
            )
          }
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [channelId, userId, channelMembers])

  return {
    typingUsers,
    handleTyping,
    handleStopTyping
  }
}