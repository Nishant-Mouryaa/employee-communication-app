// components/ProfileActions.tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { supabase } from '../../lib/supabase'

interface ProfileActionsProps {
  onRefresh: () => void
}

export function ProfileActions({ onRefresh }: ProfileActionsProps) {
  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
    ])
  }

  return (
    <View style={styles.actionsSection}>
      <Text style={styles.actionsTitle}>Account Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionCard} onPress={onRefresh}>
          <View style={[styles.actionIcon, styles.refreshIcon]}>
            <Text style={styles.actionIconText}>🔄</Text>
          </View>
          <Text style={styles.actionTitle}>Refresh</Text>
          <Text style={styles.actionDescription}>Update profile data</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={handleSignOut}>
          <View style={[styles.actionIcon, styles.signOutIcon]}>
            <Text style={styles.actionIconText}>🚪</Text>
          </View>
          <Text style={styles.actionTitle}>Sign Out</Text>
          <Text style={styles.actionDescription}>Log out of your account</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  actionsSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fafafa',
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  refreshIcon: {
    backgroundColor: '#e0e7ff',
  },
  signOutIcon: {
    backgroundColor: '#fee2e2',
  },
  actionIconText: {
    fontSize: 18,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
})