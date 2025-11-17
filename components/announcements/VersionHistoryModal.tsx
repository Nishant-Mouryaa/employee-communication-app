// components/announcements/VersionHistoryModal.tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native'
import { useVersionHistory } from '../../hooks/useVersionHistory'
import { versionHistoryService } from '../../services/versionHistoryService'
import { AnnouncementVersion } from '../../types/announcement'
import { useLanguage } from '../../hooks/useLanguage'

interface VersionHistoryModalProps {
  visible: boolean
  onClose: () => void
  announcementId: string
  onRestore?: () => void
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  visible,
  onClose,
  announcementId,
  onRestore
}) => {
  const { t } = useLanguage()
  const { versions, loading, refetch } = useVersionHistory(announcementId)
  const [selectedVersion, setSelectedVersion] = useState<AnnouncementVersion | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareVersion1, setCompareVersion1] = useState<AnnouncementVersion | null>(null)
  const [compareVersion2, setCompareVersion2] = useState<AnnouncementVersion | null>(null)

  const handleRestore = async (versionId: string) => {
    Alert.alert(
      t('versionHistory.restoreVersion'),
      t('versionHistory.restoreConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.restore'),
          style: 'default',
          onPress: async () => {
            try {
              await versionHistoryService.restoreVersion(announcementId, versionId)
              Alert.alert(t('common.success'), 'Version restored successfully')
              onRestore?.()
              onClose()
            } catch (error) {
              Alert.alert(t('common.error'), 'Failed to restore version')
            }
          }
        }
      ]
    )
  }

  const renderVersion = (version: AnnouncementVersion) => (
    <TouchableOpacity
      key={version.id}
      style={styles.versionItem}
      onPress={() => setSelectedVersion(version)}
    >
      <View style={styles.versionHeader}>
             <View style={styles.versionBadge}>
          <Text style={styles.versionNumber}>v{version.version_number}</Text>
        </View>
        <View style={styles.versionInfo}>
          <Text style={styles.versionAuthor}>
            {version.profiles?.full_name || 'Unknown User'}
          </Text>
          <Text style={styles.versionDate}>
            {new Date(version.created_at).toLocaleString()}
          </Text>
        </View>
      </View>
      
      <Text style={styles.versionTitle} numberOfLines={2}>
        {version.title}
      </Text>
      
      {version.change_summary && (
        <Text style={styles.changeSummary}>{version.change_summary}</Text>
      )}
      
      <View style={styles.versionActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleRestore(version.id)}
        >
          <Text style={styles.actionButtonText}>{t('versionHistory.restoreVersion')}</Text>
        </TouchableOpacity>
        
        {compareMode && (
          <TouchableOpacity
            style={[styles.actionButton, styles.compareButton]}
            onPress={() => {
              if (!compareVersion1) {
                setCompareVersion1(version)
              } else if (!compareVersion2) {
                setCompareVersion2(version)
              }
            }}
          >
            <Text style={styles.actionButtonText}>
              {compareVersion1 === version || compareVersion2 === version ? '✓ Selected' : 'Compare'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  )

  const renderComparison = () => {
    if (!compareVersion1 || !compareVersion2) return null

    const changes = versionHistoryService.compareVersions(compareVersion1, compareVersion2)

    return (
      <View style={styles.comparisonContainer}>
        <Text style={styles.comparisonTitle}>Comparing Versions</Text>
        <View style={styles.comparisonVersions}>
          <Text style={styles.comparisonVersion}>v{compareVersion1.version_number}</Text>
          <Text style={styles.comparisonArrow}>→</Text>
          <Text style={styles.comparisonVersion}>v{compareVersion2.version_number}</Text>
        </View>
        
        {changes.length === 0 ? (
          <Text style={styles.noChanges}>No changes detected</Text>
        ) : (
          <View style={styles.changesList}>
            {changes.map((change, index) => (
              <View key={index} style={styles.changeItem}>
                <Text style={styles.changeField}>{change.field}</Text>
                <View style={styles.changeValues}>
                  <View style={styles.oldValue}>
                    <Text style={styles.changeLabel}>Old:</Text>
                    <Text style={styles.changeText} numberOfLines={3}>
                      {String(change.old)}
                    </Text>
                  </View>
                  <View style={styles.newValue}>
                    <Text style={styles.changeLabel}>New:</Text>
                    <Text style={styles.changeText} numberOfLines={3}>
                      {String(change.new)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
        
        <TouchableOpacity
          style={styles.closeComparisonButton}
          onPress={() => {
            setCompareMode(false)
            setCompareVersion1(null)
            setCompareVersion2(null)
          }}
        >
          <Text style={styles.closeComparisonText}>Close Comparison</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('versionHistory.title')}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.compareModeButton, compareMode && styles.compareModeButtonActive]}
              onPress={() => {
                setCompareMode(!compareMode)
                setCompareVersion1(null)
                setCompareVersion2(null)
              }}
            >
              <Text style={styles.compareModeText}>
                {compareMode ? '✓ Compare' : 'Compare'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {compareVersion1 && compareVersion2 ? (
          renderComparison()
        ) : (
          <ScrollView style={styles.content}>
            {loading ? (
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            ) : versions.length === 0 ? (
              <Text style={styles.emptyText}>{t('versionHistory.noVersions')}</Text>
            ) : (
              versions.map(renderVersion)
            )}
          </ScrollView>
        )}

        {/* Version Detail Modal */}
        {selectedVersion && !compareMode && (
          <Modal
            visible={!!selectedVersion}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectedVersion(null)}
          >
            <View style={styles.detailOverlay}>
              <View style={styles.detailContainer}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailTitle}>
                    {t('versionHistory.version')} {selectedVersion.version_number}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedVersion(null)}>
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Title:</Text>
                  <Text style={styles.detailText}>{selectedVersion.title}</Text>
                  
                  <Text style={styles.detailLabel}>Content:</Text>
                  <Text style={styles.detailText}>{selectedVersion.content}</Text>
                  
                  <Text style={styles.detailLabel}>Author:</Text>
                  <Text style={styles.detailText}>
                    {selectedVersion.profiles?.full_name || 'Unknown'}
                  </Text>
                  
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailText}>
                    {new Date(selectedVersion.created_at).toLocaleString()}
                  </Text>
                </ScrollView>
                
                <TouchableOpacity
                  style={styles.restoreButton}
                  onPress={() => {
                    setSelectedVersion(null)
                    handleRestore(selectedVersion.id)
                  }}
                >
                  <Text style={styles.restoreButtonText}>
                    {t('versionHistory.restoreVersion')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  compareModeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  compareModeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  compareModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 40,
  },
  versionItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  versionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  versionBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  versionNumber: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  versionInfo: {
    flex: 1,
  },
  versionAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  versionDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  versionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  changeSummary: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  versionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  compareButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  comparisonContainer: {
    flex: 1,
    padding: 20,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  comparisonVersions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  comparisonVersion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  comparisonArrow: {
    fontSize: 20,
    marginHorizontal: 16,
    color: '#64748b',
  },
  changesList: {
    flex: 1,
  },
  changeItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  changeField: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  changeValues: {
    gap: 8,
  },
  oldValue: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
  },
  newValue: {
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 8,
  },
  changeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  changeText: {
    fontSize: 12,
    color: '#1e293b',
  },
  noChanges: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    marginTop: 40,
  },
  closeComparisonButton: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  closeComparisonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  detailContent: {
    padding: 20,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
  restoreButton: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  restoreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})