// components/home/HomeHeader.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { supabase } from '../../lib/supabase'
import { IS_MOBILE } from '../../constants/home'
import { Ionicons } from '@expo/vector-icons'

interface HomeHeaderProps {
  userEmail?: string
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ userEmail }) => {
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => supabase.auth.signOut()
        }
      ]
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContent}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Smart Workplace</Text>
          <Text style={styles.subtitle}>
            {userEmail ? `Welcome, ${userEmail.split('@')[0]}!` : 'Welcome!'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="log-out-outline" size={22} color="#6366F1" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    height: 56,
    marginTop: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: IS_MOBILE ? 20 : 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: IS_MOBILE ? 13 : 15,
    color: '#64748b',
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
})