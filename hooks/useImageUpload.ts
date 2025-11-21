// hooks/useImageUpload.ts
import { useState } from 'react'
import { Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../lib/supabase'
import { AVATAR_CONFIG } from '../constants/profile'

export function useImageUpload(userId: string | undefined, onUploadSuccess: (url: string) => void) {
  const [uploading, setUploading] = useState(false)

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: AVATAR_CONFIG.aspect,
        quality: AVATAR_CONFIG.quality,
      })

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0])
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to pick image')
    }
  }

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      if (!userId) throw new Error('No user found')

      setUploading(true)

      const response = await fetch(asset.uri)
      if (!response.ok) throw new Error('Failed to read selected image')

      const arrayBuffer = await response.arrayBuffer()
      if (!arrayBuffer) throw new Error('Unable to process selected image')

      const inferredExt =
        asset.fileName?.split('.').pop()?.toLowerCase() ||
        asset.uri.split('.').pop()?.toLowerCase() ||
        'jpg'

      const fileExt = inferredExt.replace('jpeg', 'jpg')
      const contentType = asset.mimeType || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, arrayBuffer, {
          contentType,
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath)

      if (!publicUrlData?.publicUrl) {
        throw new Error('Unable to retrieve profile image URL')
      }

      const avatarUrl = publicUrlData.publicUrl

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateError) throw updateError

      onUploadSuccess(avatarUrl)
      Alert.alert('Success', 'Profile picture uploaded!')
    } catch (error) {
      console.error('Error uploading image:', error)
      Alert.alert('Upload failed', 'Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const removeAvatar = async () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('profiles')
                .update({
                  avatar_url: null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', userId!)

              if (error) throw error

              onUploadSuccess('')
            } catch (error) {
              console.error('Error removing avatar:', error)
              Alert.alert('Error', 'Failed to remove profile picture')
            }
          },
        },
      ]
    )
  }

  return { uploading, pickImage, removeAvatar }
}