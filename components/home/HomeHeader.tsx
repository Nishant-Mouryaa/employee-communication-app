// components/home/HomeHeader.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { supabase } from '../../lib/supabase'
import { IS_MOBILE } from '../../constants/home'

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
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.title}>Smart Workplace</Text>
          <Text style={styles.subtitle}>
            {userEmail ? `Welcome, ${userEmail.split('@')[0]}!` : 'Welcome!'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingTop: IS_MOBILE ? 16 : 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: IS_MOBILE ? 24 : 32,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: IS_MOBILE ? 14 : 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '400',
  },
  signOutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signOutText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
})