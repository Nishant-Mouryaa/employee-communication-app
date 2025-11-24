import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../hooks/useTenant'
import { supabase } from '../lib/supabase'
import {
  createOrganization,
  addUserToOrganization,
  AddUserData,
} from '../services/organizationService'

type SetupStep = 'create-org' | 'add-users' | 'complete'

export default function OrganizationSetupScreen() {
  const { user } = useAuth()
  const { organizationId, refreshTenant } = useTenant()
  const [step, setStep] = useState<SetupStep>('create-org')
  const [loading, setLoading] = useState(false)
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null)

  // Organization form
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')

  // User form
  const [users, setUsers] = useState<AddUserData[]>([
    {
      email: '',
      username: '',
      full_name: '',
      department: '',
      position: '',
      role: 'employee',
    },
  ])

  // Auto-detect organization and complete setup
  useEffect(() => {
    const effectiveOrgId = organizationId || createdOrgId
    
    console.log('👀 Watching for org:', {
      step,
      organizationId,
      createdOrgId,
      effectiveOrgId,
      user_id: user?.id
    })

    // If we're on complete step and have an org, we're done
    if (step === 'complete' && effectiveOrgId) {
      console.log('✅ Setup complete with org:', effectiveOrgId)
      // The App.tsx will now show the main app since organizationId exists
    }
  }, [organizationId, createdOrgId, step, user?.id])

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      Alert.alert('Error', 'Please enter an organization name')
      return
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create an organization')
      return
    }

    setLoading(true)
    try {
      console.log('🏢 Creating organization for user:', user.id, user.email)
      
      const organization = await createOrganization(
        {
          name: orgName.trim(),
          slug: orgSlug.trim() || undefined,
        },
        user.id
      )

      console.log('✅ Organization created:', organization)

      if (!organization || !organization.id) {
        throw new Error('Failed to create organization')
      }

      // Store org ID locally for this device
      setCreatedOrgId(organization.id)

      // Wait a moment for DB triggers to complete
      await new Promise(resolve => setTimeout(resolve, 800))

      // Verify profile was updated
      const { data: profileCheck } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single()

      console.log('✅ Profile updated:', {
        user_id: user.id,
        profile_org_id: profileCheck?.organization_id,
        created_org_id: organization.id,
        matches: profileCheck?.organization_id === organization.id
      })

      // Trigger tenant refresh (will update organizationId in context)
      refreshTenant().catch(err => console.warn('Refresh error:', err))

      setLoading(false)
      setStep('add-users')
      
      Alert.alert('Success', 'Organization created successfully!')
    } catch (error: any) {
      console.error('❌ Error creating organization:', error)
      setLoading(false)
      Alert.alert('Error', error.message || 'Failed to create organization')
    }
  }

  const handleAddUser = (index: number, field: keyof AddUserData, value: string) => {
    const newUsers = [...users]
    newUsers[index] = { ...newUsers[index], [field]: value }
    setUsers(newUsers)
  }

  const handleAddUserRow = () => {
    setUsers([
      ...users,
      {
        email: '',
        username: '',
        full_name: '',
        department: '',
        position: '',
        role: 'employee',
      },
    ])
  }

  const handleRemoveUser = (index: number) => {
    if (users.length > 1) {
      setUsers(users.filter((_, i) => i !== index))
    }
  }

  const handleAddUsers = async () => {
    // Validate all users
    for (const userData of users) {
      if (!userData.email || !userData.username || !userData.full_name) {
        Alert.alert('Error', 'Please fill in all required fields for all users')
        return
      }
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in')
      return
    }

    const effectiveOrgId = organizationId || createdOrgId
    if (!effectiveOrgId) {
      Alert.alert('Error', 'Organization not found')
      return
    }

    setLoading(true)
    try {
      const results = []
      const errors = []

      for (const userData of users) {
        try {
          const result = await addUserToOrganization(userData, effectiveOrgId, user.id)
          results.push(result)
        } catch (error: any) {
          errors.push(`${userData.email}: ${error.message}`)
        }
      }

      if (errors.length === users.length) {
        Alert.alert(
          'Unable to Add Users',
          `These users need to sign up first before being added:\n\n${errors.join('\n')}\n\nYou can add them later from the Admin panel after they create accounts.`
        )
      } else if (errors.length > 0) {
        Alert.alert(
          'Partial Success',
          `Added ${results.length} user(s). Some users need to sign up first:\n\n${errors.join('\n')}`
        )
      } else {
        Alert.alert('Success', `Successfully added ${results.length} user(s)!`)
      }

      setStep('complete')
    } catch (error: any) {
      console.error('Error adding users:', error)
      Alert.alert('Error', error.message || 'Failed to add users')
    } finally {
      setLoading(false)
    }
  }

  const handleSkipAddUsers = () => {
    setStep('complete')
  }


const handleComplete = async () => {
    console.log('🎯 Completing setup...')
    
    const effectiveOrgId = organizationId || createdOrgId
    
    if (!effectiveOrgId) {
      Alert.alert(
        'Please wait',
        'Your organization is still being set up. Please wait a moment.',
        [{ text: 'OK' }]
      )
      return
    }
    
    console.log('✅ Organization confirmed:', effectiveOrgId)
    
    // Just trigger one final refresh
    setLoading(true)
    await refreshTenant()
    setLoading(false)
    
    // The App.tsx should now detect organizationId and navigate automatically
    // If it doesn't, the realtime subscription will trigger it
  }

  // Create Org Step
  if (step === 'create-org') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Ionicons name="business" size={64} color="#6366F1" />
            <Text style={styles.title}>Create Your Organization</Text>
            <Text style={styles.subtitle}>
              Set up your workspace to get started with team collaboration
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Organization Name *</Text>
              <TextInput
                style={styles.input}
                value={orgName}
                onChangeText={setOrgName}
                placeholder="e.g., Acme Corporation"
                autoCapitalize="words"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Organization Slug (Optional)</Text>
              <Text style={styles.hint}>
                A unique identifier for your organization. If left empty, it will be generated from
                the name.
              </Text>
              <TextInput
                style={styles.input}
                value={orgSlug}
                onChangeText={setOrgSlug}
                placeholder="e.g., acme-corp"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleCreateOrganization}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Organization</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Add Users Step
  if (step === 'add-users') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Ionicons name="people" size={64} color="#6366F1" />
            <Text style={styles.title}>Add Team Members</Text>
            <Text style={styles.subtitle}>
              Add users to your organization. You can add more later from the Admin panel.
            </Text>
          </View>

          <View style={styles.form}>
            {users.map((userData, index) => (
              <View key={index} style={styles.userCard}>
                <View style={styles.userCardHeader}>
                  <Text style={styles.userCardTitle}>User {index + 1}</Text>
                  {users.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveUser(index)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email *</Text>
                  <TextInput
                    style={styles.input}
                    value={userData.email}
                    onChangeText={(text) => handleAddUser(index, 'email', text)}
                    placeholder="user@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Username *</Text>
                  <TextInput
                    style={styles.input}
                    value={userData.username}
                    onChangeText={(text) => handleAddUser(index, 'username', text)}
                    placeholder="johndoe"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={userData.full_name}
                    onChangeText={(text) => handleAddUser(index, 'full_name', text)}
                    placeholder="John Doe"
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Department</Text>
                    <TextInput
                      style={styles.input}
                      value={userData.department}
                      onChangeText={(text) => handleAddUser(index, 'department', text)}
                      placeholder="Engineering"
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Position</Text>
                    <TextInput
                      style={styles.input}
                      value={userData.position}
                      onChangeText={(text) => handleAddUser(index, 'position', text)}
                      placeholder="Software Engineer"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.hint}>
                    Users must sign up first before being added to the organization.
                  </Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addUserButton} onPress={handleAddUserRow}>
              <Ionicons name="add-circle" size={24} color="#6366F1" />
              <Text style={styles.addUserButtonText}>Add Another User</Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { flex: 1 }]}
                onPress={handleSkipAddUsers}
                disabled={loading}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Skip for Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { flex: 1 }, loading && styles.buttonDisabled]}
                onPress={handleAddUsers}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Add Users</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Complete Step
  const effectiveOrgId = organizationId || createdOrgId

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.completeContainer}>
        <Ionicons name="checkmark-circle" size={96} color="#10b981" />
        <Text style={styles.completeTitle}>Setup Complete!</Text>
        <Text style={styles.completeSubtitle}>
          {effectiveOrgId 
            ? 'Your organization is ready. Click below to continue.' 
            : 'Finalizing your organization setup...'}
        </Text>
        
        {loading && (
          <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 20 }} />
        )}
        
        {!loading && (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { marginTop: 32 }]}
            onPress={handleComplete}
          >
            <Text style={styles.buttonText}>
              {effectiveOrgId ? 'Continue to App' : 'Check Status'}
            </Text>
          </TouchableOpacity>
        )}
        
        {!effectiveOrgId && !loading && (
          <Text style={[styles.hint, { marginTop: 16, textAlign: 'center' }]}>
            Your organization was created but we're still loading it. This should only take a moment.
          </Text>
        )}
      </View>
    </SafeAreaView>
  )
}


    

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  inputRow: {
    flexDirection: 'row',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: '#6366F1',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#1e293b',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  removeButton: {
    padding: 4,
  },
  addUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addUserButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  completeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 24,
    marginBottom: 12,
  },
  completeSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
})

