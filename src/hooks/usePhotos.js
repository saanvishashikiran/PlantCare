// src/hooks/usePhotos.js
import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { plantsApi } from '../services/api';

export const usePhotos = () => {
  const [photos, setPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [captionModalVisible, setCaptionModalVisible] = useState(false);
  const [editingCaption, setEditingCaption] = useState(null);
  const [newCaption, setNewCaption] = useState('');

  const fetchPhotos = async (plantName) => {
    if (!plantName) return;
    
    setPhotosLoading(true);
    try {
      const photosData = await plantsApi.getPhotos(plantName);
      setPhotos(photosData);
    } catch (error) {
      console.error('Error fetching photos:', error);
      setPhotos([]);
      if (error.message && !error.message.includes('404')) {
        Alert.alert('Error', 'Failed to load photos');
      }
    } finally {
      setPhotosLoading(false);
    }
  };

  const uploadPhoto = async (selectedPlant) => {
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
          onPress: () => openImagePicker('camera', selectedPlant)
        },
        { 
          text: 'Photo Library', 
          onPress: () => openImagePicker('library', selectedPlant)
        },
        { 
          text: 'Cancel', 
          style: 'cancel'
        }
      ]
    );
  };
  
  const openImagePicker = async (source, selectedPlant) => {
    try {
      console.log(`=== Opening ${source} with Expo ImagePicker ===`);
      
      let result;
      
      if (source === 'camera') {
        // Request camera permissions
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        console.log('Camera permission:', cameraPermission);
        
        if (cameraPermission.status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required to take photos.');
          return;
        }
        
        // Launch camera
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true, 
        });
      } else {
        // Request media library permissions
        const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log('Library permission:', libraryPermission);
        
        if (libraryPermission.status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library permission is required to select photos.');
          return;
        }
        
        // Launch image library
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
        
        // Prompt user for caption
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
                uploadPhotoToServer(uploadAsset, caption || '', selectedPlant);
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

  const uploadPhotoToServer = async (asset, caption, selectedPlant) => {
    try {
      // Show loading indicator
      Alert.alert('Uploading', 'Please wait while your photo is being uploaded...');

      const uploadData = {
        plantName: selectedPlant.PlantName, 
        imageData: asset.base64,
        caption: caption ? caption.trim() : '',
        fileName: asset.fileName || `photo_${Date.now()}.jpg`,
        contentType: asset.type || 'image/jpeg',
      };

      await plantsApi.uploadPhoto(selectedPlant.PlantName, uploadData);
      Alert.alert('Success!', 'Photo uploaded successfully!');
      
      // Refresh photos to show the new upload
      console.log('Refreshing photos after successful upload...');
      await fetchPhotos(selectedPlant.PlantName);
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert(
        'Upload Error', 
        `Failed to upload photo: ${error.message}. Please check your internet connection and try again.`
      );
    }
  };

  const updatePhotoCaption = async (plantName, photoId, newCaption) => {
    try {
      await plantsApi.updatePhotoCaption(plantName, photoId, newCaption);
      Alert.alert('Success', 'Caption updated successfully!');
      await fetchPhotos(plantName);
      setCaptionModalVisible(false);
      setEditingCaption(null);
      setNewCaption('');
    } catch (error) {
      console.error('Error updating caption:', error);
      Alert.alert('Error', 'Failed to update caption');
    }
  };

  const deletePhoto = async (plantName, photoId) => {
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
              await plantsApi.deletePhoto(plantName, photoId);
              Alert.alert('Success', 'Photo deleted successfully!');
              await fetchPhotos(plantName);
            } catch (error) {
              console.error('Error deleting photo:', error);
              Alert.alert('Error', 'Failed to delete photo');
            }
          }
        }
      ]
    );
  };

  const openPhotoModal = (photo) => {
    setSelectedPhoto(photo);
    setPhotoModalVisible(true);
  };

  const closePhotoModal = () => {
    setPhotoModalVisible(false);
    setSelectedPhoto(null);
  };

  const openCaptionModal = (photo) => {
    setEditingCaption(photo.photoId);
    setNewCaption(photo.caption || '');
    setCaptionModalVisible(true);
  };

  const closeCaptionModal = () => {
    setCaptionModalVisible(false);
    setEditingCaption(null);
    setNewCaption('');
  };

  const resetPhotos = () => {
    setPhotos([]);
    setSelectedPhoto(null);
    setPhotoModalVisible(false);
    setCaptionModalVisible(false);
    setEditingCaption(null);
    setNewCaption('');
  };

  return {
    photos,
    photosLoading,
    selectedPhoto,
    photoModalVisible,
    captionModalVisible,
    editingCaption,
    newCaption,
    setNewCaption,
    fetchPhotos,
    uploadPhoto,
    updatePhotoCaption,
    deletePhoto,
    openPhotoModal,
    closePhotoModal,
    openCaptionModal,
    closeCaptionModal,
    resetPhotos
  };
};