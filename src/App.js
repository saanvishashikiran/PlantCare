// src/App.js
import React, { useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
  Text,
  Image,
  Button,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Screens
import PlantCareScreen from './screens/PlantCareScreen';
import GrowthGalleryScreen from './screens/GrowthGalleryScreen';

// Hooks
import { usePhotos } from './hooks/usePhotos';

// Services
import { perenualApi } from './services/perenualApi';

// Utils
import { formatDate, daysSince } from './utils/dateUtils';

// Styles
import styles from './styles/styles';

export default function App() {
  // Navigation state
  const [activeTab, setActiveTab] = useState('care');
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlantInfo, setSelectedPlantInfo] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Photo modal states from hook
  const {
    selectedPhoto,
    photoModalVisible,
    closePhotoModal,
    captionModalVisible,
    editingCaption,
    newCaption,
    setNewCaption,
    updatePhotoCaption,
    deletePhoto,
    openCaptionModal,
    closeCaptionModal
  } = usePhotos();

  // Handle plant info modal
  const handlePlantClick = async (plant) => {
    setSelectedPlantInfo(plant);
    setModalVisible(true);
    setModalLoading(true);

    try {
      if (plant.speciesId) {
        console.log(`Fetching fresh details for species ID: ${plant.speciesId}`);
        const detailJson = await perenualApi.getSpeciesDetails(plant.speciesId);
        console.log('Fresh plant details:', detailJson);
        
        setSelectedPlantInfo(prev => ({
          ...prev,
          perenualData: detailJson,
          freshDescription: detailJson.description || prev.description,
          sunlight: detailJson.sunlight,
          careLevel: detailJson.care_level,
          watering: detailJson.watering,
          wateringBenchmark: detailJson.watering_general_benchmark,
          cycle: detailJson.cycle,
          growth_rate: detailJson.growth_rate,
          maintenance: detailJson.maintenance,
          poisonous_to_pets: detailJson.poisonous_to_pets,
          poisonous_to_humans: detailJson.poisonous_to_humans,
          default_image: detailJson.default_image,
          indoor: detailJson.indoor,
          hardiness: detailJson.hardiness,
          hardiness_location: detailJson.hardiness_location,
        }));
      } else if (plant.Species || plant.species) {
        console.log(`No species ID, searching by name: ${plant.Species || plant.species}`);
        const searchResults = await perenualApi.searchSpecies(plant.Species || plant.species);
        
        if (searchResults && searchResults.length > 0) {
          const foundSpecies = searchResults[0];
          const detailJson = await perenualApi.getSpeciesDetails(foundSpecies.id);
          
          setSelectedPlantInfo(prev => ({
            ...prev,
            speciesId: foundSpecies.id,
            perenualData: detailJson,
            freshDescription: detailJson.description || prev.description,
            sunlight: detailJson.sunlight,
            careLevel: detailJson.care_level,
            watering: detailJson.watering,
            wateringBenchmark: detailJson.watering_general_benchmark,
            cycle: detailJson.cycle,
            growth_rate: detailJson.growth_rate,
            maintenance: detailJson.maintenance,
            poisonous_to_pets: detailJson.poisonous_to_pets,
            poisonous_to_humans: detailJson.poisonous_to_humans,
            default_image: detailJson.default_image,
            indoor: detailJson.indoor,
            hardiness: detailJson.hardiness,
            hardiness_location: detailJson.hardiness_location,
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching fresh plant details:', error);
    }
    
    setModalLoading(false);
  };

  // Tab change handler with cleanup
  const handleTabChange = (newTab) => {
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fffee8' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Tab Content */}
        <View style={{ flex: 1 }}>
          {activeTab === 'care' ? (
            <PlantCareScreen onPlantClick={handlePlantClick} />
          ) : (
            <GrowthGalleryScreen />
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Bottom Navigation */}
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#E8F5E8' }}>
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={[
              styles.navButton, 
              activeTab === 'care' && styles.activeNavButton
            ]}
            onPress={() => handleTabChange('care')}
          >
            <Text style={[
              styles.navButtonText,
              activeTab === 'care' && styles.activeNavButtonText
            ]}>
              🪴 Plant Care
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.navButton, 
              activeTab === 'gallery' && styles.activeNavButton
            ]}
            onPress={() => handleTabChange('gallery')}
          >
            <Text style={[
              styles.navButtonText,
              activeTab === 'gallery' && styles.activeNavButtonText
            ]}>
              📸 Growth Gallery
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Enhanced Modal for plant info */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{selectedPlantInfo?.PlantName}</Text>
              <Text style={styles.modalSubtitle}>
                Species: {selectedPlantInfo?.Species || selectedPlantInfo?.species || 'Unknown'}
              </Text>
              
              {modalLoading ? (
                <View style={{ alignItems: 'center', marginVertical: 30 }}>
                  <ActivityIndicator size="large" color="#4CAF50" />
                  <Text style={{ marginTop: 10, color: '#666' }}>Loading plant details...</Text>
                </View>
              ) : (
                <>
                  {selectedPlantInfo?.default_image?.regular_url && (
                    <View style={{ alignItems: 'center', marginVertical: 15 }}>
                      <Image 
                        source={{ uri: selectedPlantInfo.default_image.regular_url }}
                        style={{ width: 200, height: 150, borderRadius: 8 }}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                  
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>📅 Watering Schedule</Text>
                    <Text style={styles.infoText}>
                      Last watered: {formatDate(selectedPlantInfo?.LastWatered)} 
                      ({daysSince(selectedPlantInfo?.LastWatered)} days ago)
                    </Text>
                    <Text style={styles.infoText}>
                      Watering interval: Every {selectedPlantInfo?.wateringIntervalDays || selectedPlantInfo?.WateringIntervalDays || 7} days
                    </Text>
                    {selectedPlantInfo?.watering && (
                      <Text style={styles.infoText}>
                        Perenual recommendation: {selectedPlantInfo.watering}
                      </Text>
                    )}
                  </View>

                  {(selectedPlantInfo?.freshDescription || selectedPlantInfo?.description) && (
                    <View style={styles.infoSection}>
                      <Text style={styles.sectionTitle}>📖 Description</Text>
                      <Text style={styles.descriptionText}>
                        {selectedPlantInfo?.freshDescription || selectedPlantInfo?.description}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>🌿 Care Information</Text>
                    
                    {selectedPlantInfo?.sunlight && (
                      <Text style={styles.infoText}>
                        <Text style={styles.infoLabel}>☀️ Sunlight: </Text>
                        {Array.isArray(selectedPlantInfo.sunlight) 
                          ? selectedPlantInfo.sunlight.join(', ') 
                          : selectedPlantInfo.sunlight}
                      </Text>
                    )}
                    
                    {selectedPlantInfo?.careLevel && (
                      <Text style={styles.infoText}>
                        <Text style={styles.infoLabel}>📊 Care Level: </Text>
                        {selectedPlantInfo.careLevel}
                      </Text>
                    )}
                    
                    {selectedPlantInfo?.cycle && (
                      <Text style={styles.infoText}>
                        <Text style={styles.infoLabel}>🔄 Life Cycle: </Text>
                        {selectedPlantInfo.cycle}
                      </Text>
                    )}
                    
                    {selectedPlantInfo?.growth_rate && (
                      <Text style={styles.infoText}>
                        <Text style={styles.infoLabel}>📈 Growth Rate: </Text>
                        {selectedPlantInfo.growth_rate}
                      </Text>
                    )}
                    
                    {selectedPlantInfo?.maintenance && (
                      <Text style={styles.infoText}>
                        <Text style={styles.infoLabel}>🔧 Maintenance: </Text>
                        {selectedPlantInfo.maintenance}
                      </Text>
                    )}

                    {selectedPlantInfo?.indoor !== undefined && (
                      <Text style={styles.infoText}>
                        <Text style={styles.infoLabel}>🏠 Indoor suitable: </Text>
                        {selectedPlantInfo.indoor ? 'Yes' : 'No'}
                      </Text>
                    )}

                    {selectedPlantInfo?.hardiness && (
                      <Text style={styles.infoText}>
                        <Text style={styles.infoLabel}>❄️ Hardiness: </Text>
                        {selectedPlantInfo.hardiness}
                        {selectedPlantInfo.hardiness_location && 
                          ` (${selectedPlantInfo.hardiness_location})`}
                      </Text>
                    )}
                  </View>
                  
                  {(selectedPlantInfo?.poisonous_to_pets !== undefined || 
                    selectedPlantInfo?.poisonous_to_humans !== undefined) && (
                    <View style={[styles.infoSection, { backgroundColor: '#fff3cd', borderColor: '#ffc107' }]}>
                      <Text style={[styles.sectionTitle, { color: '#856404' }]}>⚠️ Safety Information</Text>
                      {selectedPlantInfo?.poisonous_to_pets !== undefined && (
                        <Text style={[styles.infoText, { 
                          color: selectedPlantInfo.poisonous_to_pets ? '#e74c3c' : '#27ae60',
                          fontWeight: '600'
                        }]}>
                          🐕 {selectedPlantInfo.poisonous_to_pets ? 'Poisonous to pets' : 'Safe for pets'}
                        </Text>
                      )}
                      {selectedPlantInfo?.poisonous_to_humans !== undefined && (
                        <Text style={[styles.infoText, { 
                          color: selectedPlantInfo.poisonous_to_humans ? '#e74c3c' : '#27ae60',
                          fontWeight: '600'
                        }]}>
                          👤 {selectedPlantInfo.poisonous_to_humans ? 'Poisonous to humans' : 'Safe for humans'}
                        </Text>
                      )}
                    </View>
                  )}
                </>
              )}
              
              <View style={{ marginTop: 20, marginBottom: 10 }}>
                <Button 
                  title="Close" 
                  onPress={() => setModalVisible(false)} 
                  color="#4CAF50" 
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Photo Detail Modal */}
      <Modal
        visible={photoModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closePhotoModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedPhoto && (
                <>
                  <View style={styles.photoModalHeader}>
                    <TouchableOpacity 
                      style={styles.modalCloseButton}
                      onPress={closePhotoModal}
                    >
                      <Text style={styles.modalCloseButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <Image 
                    source={{ uri: selectedPhoto.imageUrl }} 
                    style={styles.fullImage}
                    resizeMode="contain"
                    onError={(error) => {
                      console.log('Full image load error:', error.nativeEvent.error);
                    }}
                  />
                  
                  <View style={styles.photoDetails}>
                    <Text style={styles.photoDetailCaption}>
                      {selectedPhoto.caption || 'No caption'}
                    </Text>
                    <Text style={styles.photoDetailDate}>
                      Taken: {new Date(selectedPhoto.uploadDate).toLocaleDateString()}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Caption Edit Modal */}
      <Modal
        visible={captionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeCaptionModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.captionModalContent}>
            <Text style={styles.captionModalTitle}>Edit Caption</Text>
            
            <TextInput
              style={styles.captionInput}
              value={newCaption}
              onChangeText={setNewCaption}
              placeholder="Enter caption..."
              multiline={true}
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
            />
            
            <Text style={styles.characterCount}>
              {newCaption.length}/200 characters
            </Text>
            
            <View style={styles.captionModalButtons}>
              <TouchableOpacity 
                style={[styles.captionButton, styles.cancelButton]}
                onPress={closeCaptionModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.captionButton, styles.saveButton]}
                onPress={() => {
                  if (editingCaption) {
                    updatePhotoCaption(editingCaption, newCaption);
                  }
                }}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}