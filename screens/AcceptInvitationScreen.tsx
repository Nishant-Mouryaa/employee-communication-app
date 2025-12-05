// screens/AcceptInvitationScreen.tsx
import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { validateInvitation, acceptInvitation } from '../services/invitationService'
import { useAuth } from '../hooks/useAuth'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTenant } from '../hooks/useTenant'
type RootStackParamList = {
  AcceptInvitation: { token: string; org: string }
  Auth: { 
    mode: 'signup' | 'login'
    invitationData?: {
      email: string
      role: string
      organizationId: string
      token: string
    }
  }
  MainApp: undefined
}

type AcceptInvitationRouteProp = RouteProp<RootStackParamList, 'AcceptInvitation'>
type NavigationProp = NativeStackNavigationProp<RootStackParamList>

const PENDING_INVITATION_KEY = 'pending_invitation'

export default function AcceptInvitationScreen() {
  const route = useRoute<AcceptInvitationRouteProp>()
  const navigation = useNavigation<NavigationProp>()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  const { token, org } = route.params || {}
   const { refreshTenant } = useTenant()

  useEffect(() => {
    console.log('🎯 AcceptInvitationScreen mounted')
    console.log('📦 Params:', { token, org, hasUser: !!user })
    
    if (token && org) {
      loadInvitation()
    } else {
      setError('Invalid invitation link - missing parameters')
      setLoading(false)
    }
  }, [token, org])

  // Auto-accept if user is already logged in
  useEffect(() => {
    if (user && invitation && !accepting) {
      handleAutoAccept()
    }
  }, [user, invitation])

  const loadInvitation = async () => {
    if (!token || !org) return

    try {
      console.log('🔍 Validating invitation...')
      const data = await validateInvitation(token, org)
      console.log('✅ Invitation validated:', data)
      setInvitation(data)

      // Store invitation details in case user needs to sign up
      await AsyncStorage.setItem(PENDING_INVITATION_KEY, JSON.stringify({
        token,
        organizationId: org,
        email: data.email,
        role: data.role,
      }))
    } catch (err: any) {
      console.error('❌ Validation error:', err)
      setError(err.message || 'Invalid or expired invitation')
    } finally {
      setLoading(false)
    }
  }

const handleAutoAccept = async () => {
    if (!user || !token || accepting) return

    setAccepting(true)
    try {
      console.log('✅ Auto-accepting invitation for logged-in user')
      
      // Accept the invitation
      await acceptInvitation(token, user.id)
      
      // Update the user's profile with organization_id
      const { supabase } = await import('../lib/supabase')
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single()
      
      console.log('🔍 Current profile after accept:', currentProfile)
      
      // If user doesn't have an organization, set it from invitation
      if (!currentProfile?.organization_id) {
        console.log('📝 Updating profile with organization:', invitation.organization_id)
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            organization_id: invitation.organization_id,
            role: invitation.role,
          })
          .eq('id', user.id)
          .select()
          .single()
        
        if (updateError) {
          console.error('❌ Error updating profile:', updateError)
          throw updateError
        }
        
        console.log('✅ Profile updated:', updatedProfile)
      }
      
      // Clear pending invitation
      await AsyncStorage.removeItem(PENDING_INVITATION_KEY)
      
      // Force refresh tenant data
      console.log('🔄 Forcing tenant refresh...')
      await refreshTenant()
      
      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 500))
      
      Alert.alert(
        'Welcome! 🎉',
        'You have successfully joined the organization!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to MainApp
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainApp' }],
              })
            },
          },
        ]
      )
    } catch (err: any) {
      console.error('❌ Auto-accept error:', err)
      setError(err.message || 'Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  const handleSignUp = () => {
    console.log('👤 Navigating to signup with invitation data')
    navigation.navigate('Auth', {
      mode: 'signup',
      invitationData: {
        email: invitation.email,
        role: invitation.role,
        organizationId: invitation.organization_id,
        token,
      },
    })
  }

  const handleLogin = () => {
    console.log('👤 Navigating to login')
    navigation.navigate('Auth', {
      mode: 'login',
      invitationData: {
        email: invitation.email,
        role: invitation.role,
        organizationId: invitation.organization_id,
        token,
      },
    })
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Validating invitation...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Auth', { mode: 'login' })}
        >
          <Text style={styles.secondaryButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // If user is logged in and accepting
  if (user && accepting) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Accepting invitation...</Text>
      </View>
    )
  }

  // User not logged in - show sign up/login options
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>You've Been Invited!</Text>
          
          <View style={styles.infoContainer}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{invitation?.email}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.label}>Role:</Text>
            <Text style={styles.roleValue}>{invitation?.role}</Text>
          </View>

          <View style={styles.messageBox}>
            <Text style={styles.messageText}>
              To accept this invitation, you need to create an account or log in.
            </Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSignUp}>
            <Text style={styles.buttonText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleLogin}
          >
            <Text style={styles.secondaryButtonText}>
              Already have an account? Log In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // This shouldn't happen (user logged in but not auto-accepted)
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366F1" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    marginTop: 16,
    color: '#64748b',
    fontSize: 16,
  },
  emoji: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 24,
    textAlign: 'center',
  },
  infoContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600',
  },
  roleValue: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  messageBox: {
    backgroundColor: '#e0e7ff',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  messageText: {
    fontSize: 14,
    color: '#4338ca',
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '500',
  },
  errorIcon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 24,
  },
})