// hooks/useRealtimeChat.ts
import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { Message, Reaction, MessageAttachment } from '../types/chat'
import { getReactionWithProfile } from '../services/reactionService'

interface UseRealtimeChatProps {
  channelId: string | undefined
  userId: string | undefined
  onNewMessage: (message: Message) => void
  onDeleteMessage: (messageId: string) => void
  onMessageRead: (messageId: string, userId: string) => void
  onReactionAdded: (reaction: Reaction) => void
  onReactionRemoved: (reactionId: string, messageId: string) => void
}

export const useRealtimeChat = ({
  channelId,
  userId,
  onNewMessage,
  onDeleteMessage,
  onMessageRead,
  onReactionAdded,
  onReactionRemoved
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

            const baseMessage = payload.new as Message
            const messageWithProfile: Message = {
              ...baseMessage,
              attachments: (payload.new.attachments as MessageAttachment[] | null) || [],
              profiles: profile || { 
                id: payload.new.user_id,
                username: 'Unknown', 
                full_name: 'Unknown User', 
                avatar_url: null 
              },
              read_by: [],
              read_count: 0,
              reactions: [] // Initialize with empty reactions
            }

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

  const setupReactionsSubscription = useCallback(() => {
    if (!channelId) return

    const channel = supabase
      .channel(`reactions:${channelId}:${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reactions'
        },
        async (payload) => {
          try {
            // Get the reaction with profile data
            const reactionWithProfile = await getReactionWithProfile(payload.new)
            onReactionAdded(reactionWithProfile)
          } catch (error) {
            console.error('Error handling reaction insert:', error)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'reactions'
        },
        (payload) => {
          onReactionRemoved(payload.old.id, payload.old.message_id)
        }
      )
      .subscribe()

    return channel
  }, [channelId, onReactionAdded, onReactionRemoved])

  useEffect(() => {
    const messageChannel = setupSubscription()
    const readChannel = setupReadReceiptsSubscription()
    const reactionChannel = setupReactionsSubscription()

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
      if (readChannel) {
        supabase.removeChannel(readChannel)
      }
      if (reactionChannel) {
        supabase.removeChannel(reactionChannel)
      }
    }
  }, [setupSubscription, setupReadReceiptsSubscription, setupReactionsSubscription])
}