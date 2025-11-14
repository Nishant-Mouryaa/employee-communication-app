// hooks/useDocumentPicker.ts
import { useState } from 'react'
import { Alert } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { SelectedFile } from '../types/tasks'
import { MAX_FILE_SIZE } from '../constants/tasks'

export const useDocumentPicker = () => {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0]
        
        if (file.size && file.size > MAX_FILE_SIZE) {
          Alert.alert('Error', 'File size must be less than 10MB')
          return null
        }

        const selectedFile: SelectedFile = {
          uri: file.uri,
          name: file.name,
          size: file.size || 0,
          mimeType: file.mimeType || 'application/octet-stream'
        }

        return selectedFile
      }
      return null
    } catch (error) {
      console.error('Error picking document:', error)
      Alert.alert('Error', 'Failed to pick document')
      return null
    }
  }

  const addFile = (file: SelectedFile) => {
    setSelectedFiles(prev => [...prev, file])
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const clearFiles = () => {
    setSelectedFiles([])
  }

  return {
    selectedFiles,
    pickDocument,
    addFile,
    removeFile,
    clearFiles
  }
}