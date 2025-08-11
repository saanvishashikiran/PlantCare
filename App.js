import React, { useState, useEffect, useCallback } from 'react';
import styles from './styles';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  Image,
  Dimensions,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

const { width: screenWidth } = Dimensions.get('window');

const commonPlants = [
  'Spider Plant',
  'Snake Plant',
  'Pothos',
  'Aloe Vera',
  'Tomato',
  'Cucumber',
  'Bell Pepper',
  'Orchid',
  'Lavender',
  'Dracaena',
];

const API_URL = 'https://yjf4i5vcg2.execute-api.us-east-1.amazonaws.com/dev/plants';
const PERENUAL_API_KEY = 'FILL IN - AVAILABLE AT REQUEST';

// Plant Care Screen Component
const PlantCareScreen = ({ 
  plants, 
  plantName, 
  setPlantName, 
  species, 
  setSpecies, 
  lastWatered, 
  setLastWatered, 
  editingPlant, 
  setEditingPlant,
  showDatePicker,
  selectedDate,
  setSelectedDate,
  setWateringInterval,
  setSpeciesDescription,
  dropdownItems,
  setDropdownItems,
  dropdownOpen,
  setDropdownOpen,
  setSpeciesId,
  onDateChange,
  showDatePickerModal,
  addOrUpdatePlant,
  handleEdit,
  handlePlantClick,
  deletePlant,
  daysSince,
  formatDateForDisplay
}) => {
  return (
    <FlatList
      style={styles.container}
      data={plants}
      keyExtractor={(item) => item.PlantName || item.plantName}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={!dropdownOpen}
      ListHeaderComponent={
        <View style={{ marginBottom: dropdownOpen ? 90 : 30, zIndex: 1 }}>
          <Text style={styles.header}>🪴 Plant Care Tracker 🪴</Text>

          <TextInput
            placeholder="Plant Name"
            value={plantName}
            onChangeText={setPlantName}
            style={styles.input}
            placeholderTextColor="#666"
          />

          <View style={{ zIndex: 9999, elevation: 9999, marginBottom: 15 }}>
            <DropDownPicker
              placeholder="Select Species"
              open={dropdownOpen}
              value={species}
              items={dropdownItems}
              setOpen={setDropdownOpen}
              setValue={setSpecies}
              setItems={setDropdownItems}
              style={styles.dropdown}
              textStyle={styles.dropdownText}
              placeholderStyle={styles.dropdownPlaceholder}
              dropDownContainerStyle={styles.dropdownContainer}
              listItemLabelStyle={styles.dropdownItemText}
              selectedItemLabelStyle={styles.dropdownSelectedText}
              maxHeight={200}
              scrollViewProps={{
                nestedScrollEnabled: true,
              }}
              listMode="SCROLLVIEW"
              searchable={true}
              searchPlaceholder="Search or add custom species..."
              addCustomItem={true}
            />
          </View>

          <TouchableOpacity 
            style={styles.datePickerButton} 
            onPress={showDatePickerModal}
          >
            <Text style={styles.datePickerButtonText}>
              📅 Last Watered: {lastWatered ? formatDateForDisplay(lastWatered) : 'Select Date'}
            </Text>
          </TouchableOpacity>

          {showDatePicker && Platform.OS === 'ios' && (
            <View style={styles.datePickerWrapper}>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                is24Hour={true}
                display="default"
                onChange={onDateChange}
                maximumDate={new Date()}
              />
             
            </View>
          )}
          <View style={{ marginTop: 5 }}>
            <TouchableOpacity 
              style={styles.addPlantButton}
              onPress={addOrUpdatePlant}
            >
              <Text style={styles.addPhotoButtonText}>
                {editingPlant ? '✏️ Update Plant' : '🌱 Add Plant'}
              </Text>
            </TouchableOpacity>
            
            {editingPlant && (
              <TouchableOpacity 
                style={[styles.addPlantButton, { backgroundColor: '#ff6b6b', marginTop: 10 }]}
                onPress={() => {
                  setEditingPlant(null);
                  setPlantName('');
                  setSpecies(null);
                  setLastWatered('');
                  setSelectedDate(new Date());
                  setWateringInterval(null);
                  setSpeciesDescription('');
                  setSpeciesId(null);
                }}
              >
                <Text style={styles.addPhotoButtonText}>❌ Cancel Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      }
      renderItem={({ item }) => {
        const daysAgo = daysSince(item.LastWatered);
        const interval = item.wateringIntervalDays || item.WateringIntervalDays || 7;
        const needsWatering = daysAgo >= interval;
        const species = item.Species || item.species || 'Unknown species';
        
        return (
          <TouchableOpacity 
            onPress={() => handlePlantClick(item)} 
            style={[
              styles.plantRow, 
              { 
                zIndex: dropdownOpen ? -1 : 1,
                backgroundColor: needsWatering ? '#ffebee' : '#c6f8f3',
                borderColor: needsWatering ? '#f44336' : '#4CAF50',
              }
            ]}
            disabled={dropdownOpen}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.plantName}>
                <Text style={{ fontWeight: 'bold' }}>{item.PlantName}</Text>
                <Text style={{ fontWeight: 'normal'}}> ({species})</Text>
                <Text style={{ color: '#4CAF50', fontWeight: '600', fontSize: 16 }}>  More Info</Text>
              </Text>
              <Text style={styles.plantDetails}>
                Last watered: {daysAgo === 0 ? 'today' : `${daysAgo} days ago`} • Every {interval} days
              </Text>
              {needsWatering && (
                <Text style={styles.alert}>⚠️ Needs water! ({daysAgo - interval} days overdue)</Text>
              )}
            </View>
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                onPress={(e) => {
                  e.stopPropagation();
                  handleEdit(item);
                }} 
                style={styles.actionButton}
                disabled={dropdownOpen}
              >
                <Text style={styles.actionButtonText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={(e) => {
                  e.stopPropagation();
                  deletePlant(item.PlantName);
                }} 
                style={[styles.actionButton, styles.deleteButton]}
                disabled={dropdownOpen}
              >
                <Text style={styles.actionButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <Text style={{ padding: 20, textAlign: 'center', fontSize: 16, color: '#666', marginTop: -19 }}>
          No plants yet. Add your first plant above! 🌱
        </Text>
      }
      contentContainerStyle={{ paddingBottom: 50 }}
    />
  );
};

// Growth Gallery Screen Component
const GrowthGalleryScreen = ({ 
  plants, 
  onSelectPlant, 
  selectedPlant, 
  photos, 
  setPhotos,
  photoModalVisible,
  setPhotoModalVisible,
  selectedPhoto,
  setSelectedPhoto,
  captionModalVisible,
  setCaptionModalVisible,
  editingCaption,
  setEditingCaption,
  newCaption,
  setNewCaption,
  uploadPhoto,
  updatePhotoCaption,
  deletePhoto,
  photosLoading,
  fetchPlants 
}) => {
  const renderPlantItem = ({ item, index }) => {
    console.log(`Rendering plant ${index}:`, item);
    
    return (
      <TouchableOpacity 
        style={[
          styles.plantSelectItem || {
            backgroundColor: '#fffee8',
            padding: 15,
            marginVertical: 5,
            marginHorizontal: 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#ddd'
          },
          selectedPlant?.PlantName === item.PlantName && (styles.selectedPlantItem || {
            backgroundColor: '#e8f5e8',
            borderColor: '#4CAF50'
          })
        ]}
        onPress={() => {
          console.log('Plant selected:', item.PlantName);
          onSelectPlant(item);
        }}
      >
      <Text style={styles.plantName}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#333' }}>
          {item.PlantName}
        </Text>
        <Text style={{ fontWeight: 'normal', fontSize: 16, color: '#333' }}>
          {' '}({item.Species || item.species || 'Unknown species'})
        </Text>
      </Text>
        {selectedPlant?.PlantName === item.PlantName && (
          <Text style={styles.selectedIndicator || { color: '#4CAF50', fontWeight: 'bold', marginTop: 4 }}>
            ✓ Selected
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderPhotoItem = ({ item, index }) => (
    <TouchableOpacity 
      style={styles.photoItem}
      onPress={() => {
        setSelectedPhoto(item);
        setPhotoModalVisible(true);
      }}
    >
      <Image 
        source={{ uri: item.thumbnailUrl || item.imageUrl }} 
        style={styles.thumbnailImage}
        resizeMode="cover"
        onError={(error) => {
          console.log('Image load error:', error.nativeEvent.error);
        }}
      />
      <View style={styles.photoInfo}>
        <Text style={styles.photoCaption} numberOfLines={2}>
          {item.caption || 'No caption'}
        </Text>
        <Text style={styles.photoDate}>
          {new Date(item.uploadDate).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>📸 Growth Gallery 📸</Text>
      {!selectedPlant ? (
        <View style={{ flex: 1 }}>
          <Text style={styles.subHeader}>Select a plant to view its growth gallery:</Text>
          {plants.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 15, marginTop: 190}}>
                No plants available. Add some plants in the Plant Care tab first! 🌱
              </Text>
              <TouchableOpacity 
                style={{
                  backgroundColor: '#4CAF50',
                  padding: 10,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
                onPress={() => {
                  console.log('Refresh button pressed - fetching plants');
                  fetchPlants();
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  🔄 Refresh Plants
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1, backgroundColor: '#fffee8' }}>
              <FlatList
                data={plants}
                keyExtractor={(item, index) => item.PlantName || `plant-${index}`}
                renderItem={renderPlantItem}
                style={{ 
                  flex: 1, 
                  minHeight: 300, // Forcing minimum height
                  backgroundColor: '#fffee8' 
                }}
                contentContainerStyle={{ 
                  paddingBottom: 20,
                  flexGrow: 1 // Allowing content to grow
                }}
                showsVerticalScrollIndicator={true}
                ListEmptyComponent={
                  <Text style={{ padding: 20, textAlign: 'center', fontSize: 16, color: '#666' }}>
                    Plants array is empty (this shouldn't show if debug shows 4 plants)
                  </Text>
                }
                onLayout={(event) => {
                  console.log('FlatList layout:', event.nativeEvent.layout);
                }}
                removeClippedSubviews={false}
                nestedScrollEnabled={true}
              />
            </View>
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.selectedPlantHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => onSelectPlant(null)}
            >
              <Text style={styles.backButtonText}>← Back to Plants</Text>
            </TouchableOpacity>
            <Text style={styles.selectedPlantTitle}>{selectedPlant.PlantName}</Text>
            <Text style={styles.selectedPlantSpecies}>
              {selectedPlant.Species || selectedPlant.species || 'Unknown species'}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.addPhotoButton}
            onPress={uploadPhoto}
          >
            <Text style={styles.addPhotoButtonText}>📷 Add Photo</Text>
          </TouchableOpacity>

          {photosLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Loading photos...</Text>
            </View>
          ) : photos.length === 0 ? (
            <View style={styles.emptyGallery}>
              <Text style={styles.emptyGalleryText}>
                No photos yet! 🌱{'\n'}Start documenting your plant's growth journey.
              </Text>
            </View>
          ) : (
            <FlatList
              data={photos}
              keyExtractor={(item) => item.photoId}
              renderItem={renderPhotoItem}
              numColumns={2}
              columnWrapperStyle={photos.length > 1 ? styles.photoRow : null}
              contentContainerStyle={styles.photoGrid}
            />
          )}
        </View>
      )}
    </View>
  );
};

// Main App Component
export default function App() {
  // Navigation state
  const [activeTab, setActiveTab] = useState('care');

  const [plants, setPlants] = useState([]);
  const [plantName, setPlantName] = useState('');
  const [species, setSpecies] = useState(null);
  const [lastWatered, setLastWatered] = useState('');
  const [editingPlant, setEditingPlant] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [wateringInterval, setWateringInterval] = useState(null);
  const [speciesDescription, setSpeciesDescription] = useState('');
  const [dropdownItems, setDropdownItems] = useState(
    commonPlants.map((plant) => ({ label: plant, value: plant }))
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlantInfo, setSelectedPlantInfo] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [speciesId, setSpeciesId] = useState(null);

  // New state for growth gallery
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [captionModalVisible, setCaptionModalVisible] = useState(false);
  const [editingCaption, setEditingCaption] = useState(null);
  const [newCaption, setNewCaption] = useState('');
  const [photosLoading, setPhotosLoading] = useState(false);

  // Helper functions
  const formatDateForAPI = (date) => {
    const safeDate = new Date(date);
    safeDate.setHours(12, 0, 0, 0);
    const year = safeDate.getFullYear();
    const month = String(safeDate.getMonth() + 1).padStart(2, '0');
    const day = String(safeDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseAPIDate = (dateString) => {
    if (!dateString) return new Date();
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? new Date() : date;
    } catch (error) {
      console.error('Error parsing date:', error);
      return new Date();
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || new Date();
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedDate(currentDate);
    setLastWatered(formatDateForAPI(currentDate));
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  const daysSince = (dateString) => {
    try {
      const now = new Date();
      const last = new Date(dateString);
      return Math.floor((now - last) / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error('Error calculating days since:', error);
      return 0;
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return dateString;
    }
  };

  const formatDateForDisplay = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return dateString;
    }
  };

  // Fetching plants from backend API
  const fetchPlants = async () => {
    try {
      console.log('Fetching plants from:', API_URL);
      const res = await fetch(API_URL);
      console.log('Response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response body:', errorText);
        throw new Error(`HTTP error! status: ${res.status}, response: ${errorText}`);
      }
      
      const data = await res.json();
      console.log('Fetched plants data:', data);

      if (Array.isArray(data)) {
        data.sort((a, b) => {
          const dateA = new Date(a.LastWatered);
          const dateB = new Date(b.LastWatered);
          return dateA - dateB;
        });
        setPlants(data);
      } else {
        console.log('Data is not an array:', data);
        setPlants([]);
      }
      
    } catch (error) {
      console.error('Error fetching plants:', error);
      Alert.alert('Error', `Failed to fetch plants: ${error.message}`);
      setPlants([]);
    }
  };

  // Fetching photos for selected plant
  const fetchPhotos = async (plantName) => {
    if (!plantName) return;
    
    setPhotosLoading(true);
    try {
      console.log(`Fetching photos for plant: ${plantName}`);
      const response = await fetch(`${API_URL}/${encodeURIComponent(plantName)}/photos`);  
      console.log('Photos fetch response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Photos data:', data);
        
        // Sort photos by upload date (newest first)
        const sortedPhotos = (data.photos || []).sort((a, b) => 
          new Date(b.uploadDate) - new Date(a.uploadDate)
        );
        setPhotos(sortedPhotos);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch photos:', response.status, errorText);
        setPhotos([]);
        
        if (response.status !== 404) {
          Alert.alert('Error', 'Failed to load photos');
        }
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
      setPhotos([]);
      Alert.alert('Error', 'Failed to load photos');
    } finally {
      setPhotosLoading(false);
    }
  };

  const uploadPhoto = async () => {
    console.log('=== uploadPhoto called ===');
    
    if (!selectedPlant) {
      Alert.alert('Error', 'No plant selected');
      return;
    }
  
    Alert.alert(
      'Add Photo',
      'Choose photo source',
      [
        { 
          text: 'Camera', 
          onPress: () => openImagePicker('camera')
        },
        { 
          text: 'Photo Library', 
          onPress: () => openImagePicker('library')
        },
        { 
          text: 'Cancel', 
          style: 'cancel'
        }
      ]
    );
  };
  
  const openImagePicker = async (source) => {
    try {
      console.log(`=== Opening ${source} with Expo ImagePicker ===`);
      
      let result;
      
      if (source === 'camera') {
        // Requesting camera permissions
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        console.log('Camera permission:', cameraPermission);
        
        if (cameraPermission.status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required to take photos.');
          return;
        }
        
        // Launcing camera
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true, 
        });
      } else {
        // Requesting media library permissions
        const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log('Library permission:', libraryPermission);
        
        if (libraryPermission.status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library permission is required to select photos.');
          return;
        }
        
        // Launching image library
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true, 
        });
      }
      
      console.log('ImagePicker result:', {
        canceled: result.canceled,
        hasAssets: result.assets ? result.assets.length : 0
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        console.log('Selected asset info:', {
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize,
          hasBase64: !!asset.base64
        });
        
        if (!asset.base64) {
          Alert.alert('Error', 'Failed to process image. Please try again.');
          return;
        }
        
        // Prompting user for caption
        Alert.prompt(
          'Add Caption',
          'Enter a caption for this photo (optional):',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Save', 
              onPress: (caption) => {
                console.log('Caption entered, uploading...');
                const uploadAsset = {
                  base64: asset.base64,
                  fileName: asset.fileName || `photo_${Date.now()}.jpg`,
                  type: asset.type || 'image/jpeg',
                  fileSize: asset.fileSize,
                  width: asset.width,
                  height: asset.height
                };
                uploadPhotoToServer(uploadAsset, caption || '');
              }
            }
          ],
          'plain-text'
        );
      } else {
        console.log('User cancelled or no asset selected');
      }
      
    } catch (error) {
      console.error('Error with image picker:', error);
      Alert.alert('Error', `Failed to open image picker: ${error.message}`);
    }
  };

// FIXED: Improved photo upload with better error handling and logging
const uploadPhotoToServer = async (asset, caption) => {
  try {
    console.log('=== Starting photo upload ===');
    console.log('Plant name:', selectedPlant.PlantName);
    console.log('Caption:', caption);
    console.log('Asset info:', {
      fileName: asset.fileName,
      type: asset.type,
      fileSize: asset.fileSize,
      width: asset.width,
      height: asset.height,
      hasBase64: !!asset.base64
    });

    // Validating plant name
    if (!selectedPlant || !selectedPlant.PlantName) {
      throw new Error('No plant selected or plant name is missing');
    }

    // Validating asset data
    if (!asset.base64) {
      throw new Error('No image data found');
    }

    // Showing loading indicator
    Alert.alert('Uploading', 'Please wait while your photo is being uploaded...');

    const uploadData = {
      plantName: selectedPlant.PlantName, 
      imageData: asset.base64,
      caption: caption ? caption.trim() : '', // Handle empty/null captions
      fileName: asset.fileName || `photo_${Date.now()}.jpg`,
      contentType: asset.type || 'image/jpeg',
    };
    
    console.log('Upload request data (without base64):', {
      ...uploadData,
      imageData: `[${asset.base64.length} characters of base64 data]`
    });

    // Encoding the plant name in the URL
    const encodedPlantName = encodeURIComponent(selectedPlant.PlantName);
    const uploadUrl = `${API_URL}/${encodedPlantName}/photos`;
    console.log('Upload URL:', uploadUrl);
    console.log('Original plant name:', selectedPlant.PlantName);
    console.log('Encoded plant name:', encodedPlantName);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(uploadData),
    });

    console.log('Upload response status:', response.status);
    console.log('Upload response headers:', Object.fromEntries(response.headers.entries()));

    // Getting response body regardless of success/failure
    const responseText = await response.text();
    console.log('Raw response body:', responseText);

    if (response.ok) {
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('Upload success response:', responseData);
        Alert.alert('Success!', 'Photo uploaded successfully!');
        
        // Refreshing photos to show the new upload
        console.log('Refreshing photos after successful upload...');
        await fetchPhotos(selectedPlant.PlantName);
      } catch (parseError) {
        console.error('Error parsing success response:', parseError);
        console.log('Response was successful but JSON parsing failed');
        Alert.alert('Upload Complete', 'Photo may have been uploaded. Refreshing gallery...');
        await fetchPhotos(selectedPlant.PlantName);
      }
    } else {
      console.error('Upload failed with status:', response.status);
      console.error('Error response body:', responseText);
      
      let errorMessage = `Upload failed with status ${response.status}`;
      try {
        const errorJson = JSON.parse(responseText);
        console.log('Parsed error response:', errorJson);
        
        if (errorJson.body) {
          // Handling double-wrapped error responses
          try {
            const innerError = JSON.parse(errorJson.body);
            if (innerError.error) {
              errorMessage = innerError.error;
            }
          } catch (e) {
            if (errorJson.body.includes && errorJson.body.includes('error')) {
              errorMessage = errorJson.body;
            }
          }
        } else if (errorJson.error) {
          errorMessage = errorJson.error;
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
        // Using the raw response text if we can't parse it
        if (responseText && responseText.length < 200) {
          errorMessage = responseText;
        }
      }
      
      Alert.alert('Upload Error', `Failed to upload photo: ${errorMessage}`);
    }
  } catch (error) {
    console.error('Error uploading photo:', error);
    Alert.alert(
      'Upload Error', 
      `Failed to upload photo: ${error.message}. Please check your internet connection and try again.`
    );
  }
};

  // Updating photo caption
  const updatePhotoCaption = async (photoId, newCaption) => {
    try {
      console.log(`Updating caption for photo ${photoId} to: "${newCaption}"`);
      
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(selectedPlant.PlantName)}/photos/${photoId}`, 
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ caption: newCaption }),
        }
      );

      console.log('Update caption response status:', response.status);

      if (response.ok) {
        Alert.alert('Success', 'Caption updated successfully!');
        await fetchPhotos(selectedPlant.PlantName);
        setCaptionModalVisible(false);
        setEditingCaption(null);
        setNewCaption('');
      } else {
        const errorText = await response.text();
        console.error('Update caption failed:', response.status, errorText);
        throw new Error('Update failed');
      }
    } catch (error) {
      console.error('Error updating caption:', error);
      Alert.alert('Error', 'Failed to update caption');
    }
  };

  // Deleting photo
  const deletePhoto = async (photoId) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`Deleting photo ${photoId} for plant ${selectedPlant.PlantName}`);
              
              const response = await fetch(
                `${API_URL}/${encodeURIComponent(selectedPlant.PlantName)}/photos/${photoId}`,
                { method: 'DELETE' }
              );

              console.log('Delete photo response status:', response.status);

              if (response.ok) {
                Alert.alert('Success', 'Photo deleted successfully!');
                await fetchPhotos(selectedPlant.PlantName);
              } else {
                const errorText = await response.text();
                console.error('Delete photo failed:', response.status, errorText);
                throw new Error('Delete failed');
              }
            } catch (error) {
              console.error('Error deleting photo:', error);
              Alert.alert('Error', 'Failed to delete photo');
            }
          }
        }
      ]
    );
  };

  // Handling plant selection in gallery
  const handleSelectPlant = (plant) => {
    setSelectedPlant(plant);
    if (plant) {
      fetchPhotos(plant.PlantName);
    } else {
      setPhotos([]);
    }
  };

  const parseWateringInterval = (detailJson) => {
    if (detailJson.watering_general_benchmark?.value) {
      const benchmarkValue = detailJson.watering_general_benchmark.value;
      if (typeof benchmarkValue === 'string') {
        const match = benchmarkValue.match(/(\d+)(?:-(\d+))?/);
        if (match) {
          const min = parseInt(match[1], 10);
          const max = match[2] ? parseInt(match[2], 10) : min;
          return Math.round((min + max) / 2);
        }
      } else if (typeof benchmarkValue === 'number') {
        return benchmarkValue;
      }
    }
    
    if (detailJson.watering) {
      const watering = detailJson.watering.toLowerCase();
      if (watering.includes('daily') || watering.includes('every day')) {
        return 1;
      } else if (watering.includes('twice a week')) {
        return 3;
      } else if (watering.includes('week') && !watering.includes('month')) {
        const weekMatch = watering.match(/(\d+)\s*(?:times?\s*(?:a|per)\s*week|week)/);
        if (weekMatch) {
          const timesPerWeek = parseInt(weekMatch[1], 10);
          return Math.round(7 / timesPerWeek);
        }
        return 7;
      } else if (watering.includes('month')) {
        const monthMatch = watering.match(/(\d+)\s*(?:times?\s*(?:a|per)\s*month|month)/);
        if (monthMatch) {
          const timesPerMonth = parseInt(monthMatch[1], 10);
          return Math.round(30 / timesPerMonth);
        }
        return 30;
      } else if (watering.includes('frequent')) {
        return 2;
      } else if (watering.includes('minimal') || watering.includes('rare')) {
        return 14;
      }
    }
    
    return 7;
  };

  useEffect(() => {
    if (!species) {
      setWateringInterval(null);
      setSpeciesDescription('');
      setSpeciesId(null);
      return;
    }
    
    const fetchSpeciesDetails = async () => {
      try {
        console.log(`Searching for species: ${species}`);
        const searchResponse = await fetch(
          `https://perenual.com/api/species-list?key=${PERENUAL_API_KEY}&q=${encodeURIComponent(species)}`
        );
        
        if (!searchResponse.ok) {
          throw new Error(`Search API error: ${searchResponse.status}`);
        }
        
        const searchJson = await searchResponse.json();
        console.log('Search response:', searchJson);
        
        if (searchJson.data && searchJson.data.length > 0) {
          const foundSpecies = searchJson.data[0];
          setSpeciesId(foundSpecies.id);
          
          console.log(`Getting details for species ID: ${foundSpecies.id}`);
          const detailResponse = await fetch(
            `https://perenual.com/api/species/details/${foundSpecies.id}?key=${PERENUAL_API_KEY}`
          );
          
          if (!detailResponse.ok) {
            throw new Error(`Detail API error: ${detailResponse.status}`);
          }
          
          const detailJson = await detailResponse.json();
          console.log('Detail response:', detailJson);
          
          const intervalDays = parseWateringInterval(detailJson);
          
          setWateringInterval(intervalDays);
          setSpeciesDescription(detailJson.description || foundSpecies.common_name || species);
          
          console.log(`Set watering interval to ${intervalDays} days`);
        } else {
          console.log('No species found in search');
          setWateringInterval(7);
          setSpeciesDescription(`${species} - Species not found in database`);
          setSpeciesId(null);
        }
      } catch (error) {
        console.error('Error fetching species details:', error);
        setWateringInterval(7);
        setSpeciesDescription(`${species} - Error fetching species info`);
        setSpeciesId(null);
      }
    };

    fetchSpeciesDetails();
  }, [species]);

  const addOrUpdatePlant = async () => {
    if (!plantName || !lastWatered || !species) {
      Alert.alert('Validation', 'Please fill all fields.');
      return;
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(lastWatered)) {
      Alert.alert('Validation', 'Please select a valid date');
      return;
    }
    
    try {
      console.log('Adding/updating plant with data:', {
        plantName,
        species: species,
        lastWatered,
        wateringIntervalDays: wateringInterval || 7,
        description: speciesDescription,
        speciesId: speciesId,
      });
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantName,
          species: species,
          lastWatered,
          wateringIntervalDays: wateringInterval || 7,
          description: speciesDescription,
          speciesId: speciesId,
        }),
      });
      
      console.log('Add plant response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Add plant error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log('Add plant success:', responseData);
      
      setPlantName('');
      setSpecies(null);
      setLastWatered('');
      setSelectedDate(new Date());
      setWateringInterval(null);
      setSpeciesDescription('');
      setEditingPlant(null);
      setSpeciesId(null);
      
      await fetchPlants();
      
    } catch (error) {
      console.error('Error adding/updating plant:', error);
      Alert.alert('Error', `Failed to add/update plant: ${error.message}`);
    }
  };

  const handleEdit = (plant) => {
    setPlantName(plant.PlantName);
    setSpecies(plant.Species || plant.species || null);
    setLastWatered(plant.LastWatered);
    setSelectedDate(parseAPIDate(plant.LastWatered));
    setEditingPlant(plant.PlantName);
    
    const intervalFromAPI = plant.wateringIntervalDays || plant.WateringIntervalDays;
    setWateringInterval(intervalFromAPI || 7);
    
    setSpeciesDescription(plant.description || '');
    setSpeciesId(plant.speciesId || null);
  };

  const handlePlantClick = async (plant) => {
    setSelectedPlantInfo(plant);
    setModalVisible(true);
    setModalLoading(true);

    try {
      if (plant.speciesId) {
        console.log(`Fetching fresh details for species ID: ${plant.speciesId}`);
        const response = await fetch(
          `https://perenual.com/api/species/details/${plant.speciesId}?key=${PERENUAL_API_KEY}`
        );
        
        if (response.ok) {
          const detailJson = await response.json();
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
        } else {
          console.error(`API error: ${response.status}`);
        }
      } else if (plant.Species || plant.species) {
        console.log(`No species ID, searching by name: ${plant.Species || plant.species}`);
        const searchResponse = await fetch(
          `https://perenual.com/api/species-list?key=${PERENUAL_API_KEY}&q=${encodeURIComponent(plant.Species || plant.species)}`
        );
        
        if (searchResponse.ok) {
          const searchJson = await searchResponse.json();
          if (searchJson.data && searchJson.data.length > 0) {
            const foundSpecies = searchJson.data[0];
            
            const detailResponse = await fetch(
              `https://perenual.com/api/species/details/${foundSpecies.id}?key=${PERENUAL_API_KEY}`
            );
            
            if (detailResponse.ok) {
              const detailJson = await detailResponse.json();
              
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
        }
      }
    } catch (error) {
      console.error('Error fetching fresh plant details:', error);
    }
    
    setModalLoading(false);
  };

  const deletePlant = async (plantName) => {
    Alert.alert(
      'Delete Plant',
      `Are you sure you want to delete "${plantName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting plant:', plantName);
              const response = await fetch(`${API_URL}/${encodeURIComponent(plantName)}`, {
                method: 'DELETE',
              });
              
              console.log('Delete response status:', response.status);
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error('Delete error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
              }
              
              console.log('Plant deleted successfully');
              
              await fetchPlants();
              
              Alert.alert('Success', `${plantName} has been deleted.`);
              
            } catch (error) {
              console.error('Error deleting plant:', error);
              Alert.alert('Error', `Failed to delete plant: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  const checkForReminders = useCallback(() => {
    const now = new Date();
    const reminders = [];
    
    plants.forEach((plant) => {
      try {
        const last = new Date(plant.LastWatered);
        const daysAgo = Math.floor((now - last) / (1000 * 60 * 60 * 24));
        const interval = plant.wateringIntervalDays || plant.WateringIntervalDays || 7;
        
        if (daysAgo >= interval) {
          reminders.push(`${plant.PlantName} needs watering! (${daysAgo} days since last watered, interval: ${interval} days)`);
        }
      } catch (error) {
        console.error(`Error checking reminder for ${plant.PlantName}:`, error);
      }
    });
    
    if (reminders.length > 0) {
      Alert.alert(
        'Watering Reminders', 
        reminders.join('\n\n'),
        [{ text: 'OK', style: 'default' }]
      );
    }
  }, [plants]);

  useEffect(() => {
    fetchPlants();
  }, []);

  useEffect(() => {
    if (plants.length > 0) {
      const interval = setInterval(checkForReminders, 60000);
      return () => clearInterval(interval);
    }
  }, [plants, checkForReminders]);

  // Tab change handler with cleanup
  const handleTabChange = (newTab) => {
    if (newTab !== activeTab) {
      // Resetting gallery state when switching away from gallery
      if (activeTab === 'gallery') {
        setSelectedPlant(null);
        setPhotos([]);
        setPhotoModalVisible(false);
        setSelectedPhoto(null);
        setCaptionModalVisible(false);
        setEditingCaption(null);
        setNewCaption('');
      }
      
      // When switching to gallery, refresh plants if needed
      if (newTab === 'gallery' && plants.length === 0) {
        fetchPlants();
      }
      
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
            <PlantCareScreen 
              plants={plants}
              plantName={plantName}
              setPlantName={setPlantName}
              species={species}
              setSpecies={setSpecies}
              lastWatered={lastWatered}
              setLastWatered={setLastWatered}
              editingPlant={editingPlant}
              setEditingPlant={setEditingPlant}
              showDatePicker={showDatePicker}
              setShowDatePicker={setShowDatePicker}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              wateringInterval={wateringInterval}
              setWateringInterval={setWateringInterval}
              speciesDescription={speciesDescription}
              setSpeciesDescription={setSpeciesDescription}
              dropdownItems={dropdownItems}
              setDropdownItems={setDropdownItems}
              dropdownOpen={dropdownOpen}
              setDropdownOpen={setDropdownOpen}
              modalVisible={modalVisible}
              setModalVisible={setModalVisible}
              selectedPlantInfo={selectedPlantInfo}
              setSelectedPlantInfo={setSelectedPlantInfo}
              modalLoading={modalLoading}
              setModalLoading={setModalLoading}
              speciesId={speciesId}
              setSpeciesId={setSpeciesId}
              onDateChange={onDateChange}
              showDatePickerModal={showDatePickerModal}
              addOrUpdatePlant={addOrUpdatePlant}
              handleEdit={handleEdit}
              handlePlantClick={handlePlantClick}
              deletePlant={deletePlant}
              daysSince={daysSince}
              formatDate={formatDate}
              formatDateForDisplay={formatDateForDisplay}
            />
          ) : (
            <GrowthGalleryScreen 
              plants={plants}
              onSelectPlant={handleSelectPlant}
              selectedPlant={selectedPlant}
              photos={photos}
              setPhotos={setPhotos}
              photoModalVisible={photoModalVisible}
              setPhotoModalVisible={setPhotoModalVisible}
              selectedPhoto={selectedPhoto}
              setSelectedPhoto={setSelectedPhoto}
              captionModalVisible={captionModalVisible}
              setCaptionModalVisible={setCaptionModalVisible}
              editingCaption={editingCaption}
              setEditingCaption={setEditingCaption}
              newCaption={newCaption}
              setNewCaption={setNewCaption}
              uploadPhoto={uploadPhoto}
              updatePhotoCaption={updatePhotoCaption}
              deletePhoto={deletePhoto}
              photosLoading={photosLoading}
              fetchPlants={fetchPlants}
            />
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
          onRequestClose={() => setPhotoModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedPhoto && (
                  <>
                    <View style={styles.photoModalHeader}>
                      <TouchableOpacity 
                        style={styles.modalCloseButton}
                        onPress={() => setPhotoModalVisible(false)}
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
          onRequestClose={() => setCaptionModalVisible(false)}
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
                  onPress={() => {
                    setCaptionModalVisible(false);
                    setEditingCaption(null);
                    setNewCaption('');
                  }}
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