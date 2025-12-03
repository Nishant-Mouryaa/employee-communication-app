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
import { useNavigation, useRoute } from '@react-navigation/native'
import { validateInvitation, acceptInvitation } from '../services/invitationService'
import { useAuth } from '../hooks/useAuth'

export default function AcceptInvitationScreen() {
  const route = useRoute()
  const navigation = useNavigation()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const params = route.params as { token?: string; org?: string } | undefined
  const token = params?.token
  const org = params?.org

  useEffect(() => {
    if (token && org) {
      loadInvitation()
    } else {
      setError('Invalid invitation link')
      setLoading(false)
    }
  }, [token, org])

  const loadInvitation = async () => {
    if (!token || !org) return

    try {
      const data = await validateInvitation(token, org)
      setInvitation(data)
    } catch (err: any) {
      setError(err.message || 'Invalid or expired invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!user) {
      // User not logged in - navigate to sign up
      navigation.navigate('SignUp' as never, {
        email: invitation.email,
        role: invitation.role,
        organizationId: invitation.organization_id,
        invitationToken: token,
      } as never)
      return
    }

    // User already logged in - accept invitation
    try {
      await acceptInvitation(token!, user.id)
      Alert.alert('Success', 'Invitation accepted!', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Home' as never),
        },
      ])
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to accept invitation')
    }
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
        <Text style={styles.errorText}>❌ {error}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 You've Been Invited!</Text>
      <Text style={styles.subtitle}>
        Join as a <Text style={styles.highlight}>{invitation?.role}</Text>
      </Text>
      <Text style={styles.email}>{invitation?.email}</Text>

      <TouchableOpacity style={styles.button} onPress={handleAccept}>
        <Text style={styles.buttonText}>
          {user ? 'Accept Invitation' : 'Sign Up to Accept'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.linkText}>Cancel</Text>
      </TouchableOpacity>
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
  loadingText: {
    marginTop: 16,
    color: '#64748b',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'center',
  },
  highlight: {
    color: '#6366F1',
    fontWeight: '600',
  },
  email: {
    fontSize: 16,
    color: '#6366F1',
    marginBottom: 40,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    padding: 12,
  },
  linkText: {
    color: '#6366F1',
    fontSize: 14,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 24,
  },
})