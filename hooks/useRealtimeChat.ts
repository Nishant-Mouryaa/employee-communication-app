// hooks/useRealtimeChat.ts
import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { Message } from '../types/chat'

interface UseRealtimeChatProps {
  channelId: string | undefined
  userId: string | undefined
  onNewMessage: (message: Message) => void
  onDeleteMessage: (messageId: string) => void
  onMessageRead: (messageId: string, userId: string) => void
}

export const useRealtimeChat = ({
  channelId,
  userId,
  onNewMessage,
  onDeleteMessage,
  onMessageRead
}: UseRealtimeChatProps) => {
  const subscriptionRef = useRef<RealtimeChannel | null>(null)

  const setupSubscription = useCallback(() => {
    if (!channelId || !userId) return

    const channel = supabase
      .channel(`chat_messages:${channelId}:${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, username, full_name, avatar_url')
              .eq('id', payload.new.user_id)
              .single()

            const messageWithProfile = {
              ...payload.new,
              profiles: profile || { 
                id: payload.new.user_id,
                username: 'Unknown', 
                full_name: 'Unknown User', 
                avatar_url: null 
              },
              read_by: [],
              read_count: 0
            } as Message

            onNewMessage(messageWithProfile)
          } catch (error) {
            console.error('Error in realtime subscription:', error)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`
        },
        (payload) => {
          onDeleteMessage(payload.old.id)
        }
      )
      .subscribe()

    subscriptionRef.current = channel
  }, [channelId, userId, onNewMessage, onDeleteMessage])

  const setupReadReceiptsSubscription = useCallback(() => {
    if (!channelId || !userId) return

    const channel = supabase
      .channel(`read_receipts:${channelId}:${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_message_reads'
        },
        (payload) => {
          onMessageRead(payload.new.message_id, payload.new.user_id)
        }
      )
      .subscribe()

    return channel
  }, [channelId, userId, onMessageRead])

  useEffect(() => {
    const messageChannel = setupSubscription()
    const readChannel = setupReadReceiptsSubscription()

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
      if (readChannel) {
        supabase.removeChannel(readChannel)
      }
    }
  }, [setupSubscription, setupReadReceiptsSubscription])
}