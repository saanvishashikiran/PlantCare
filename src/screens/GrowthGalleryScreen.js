// src/screens/GrowthGalleryScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { usePlants } from '../hooks/usePlants';
import { usePhotos } from '../hooks/usePhotos';
import styles from '../styles/styles';

const GrowthGalleryScreen = () => {
  const { plants, fetchPlants } = usePlants();
  const { 
    photos, 
    photosLoading, 
    fetchPhotos, 
    uploadPhoto, 
    openPhotoModal, 
    resetPhotos 
  } = usePhotos();

  const [selectedPlant, setSelectedPlant] = useState(null);

  const handleSelectPlant = (plant) => {
    setSelectedPlant(plant);
    if (plant) {
      fetchPhotos(plant.PlantName);
    } else {
      resetPhotos();
    }
  };

  const renderPlantItem = ({ item, index }) => {
    console.log(`Rendering plant ${index}:`, item);
    
    return (
      <TouchableOpacity 
        style={[
          styles.plantSelectItem,
          selectedPlant?.PlantName === item.PlantName && styles.selectedPlantItem
        ]}
        onPress={() => {
          console.log('Plant selected:', item.PlantName);
          handleSelectPlant(item);
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
          <Text style={styles.selectedIndicator}>
            ✓ Selected
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderPhotoItem = ({ item, index }) => (
    <TouchableOpacity 
      style={styles.photoItem}
      onPress={() => openPhotoModal(item)}
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
                  minHeight: 300,
                  backgroundColor: '#fffee8' 
                }}
                contentContainerStyle={{ 
                  paddingBottom: 20,
                  flexGrow: 1
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
              onPress={() => handleSelectPlant(null)}
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
            onPress={() => uploadPhoto(selectedPlant)}
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

export default GrowthGalleryScreen;