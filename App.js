import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

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
const PERENUAL_API_KEY = 'sk-uKPu6886783f4ebfe11585'; 

export default function App() {
  const [plants, setPlants] = useState([]);
  const [plantName, setPlantName] = useState('');
  const [species, setSpecies] = useState(null);
  const [lastWatered, setLastWatered] = useState('');
  const [editingPlant, setEditingPlant] = useState(null);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Info from Perenual API for selected species:
  const [wateringInterval, setWateringInterval] = useState(null);
  const [speciesDescription, setSpeciesDescription] = useState('');

  // Dropdown state
  const [dropdownItems, setDropdownItems] = useState(
    commonPlants.map((plant) => ({ label: plant, value: plant }))
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Modal state for plant info popup
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlantInfo, setSelectedPlantInfo] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [speciesId, setSpeciesId] = useState(null);

  // Helper function to format date as YYYY-MM-DD
  const formatDateForAPI = (date) => {
    const safeDate = new Date(date);
    safeDate.setHours(12, 0, 0, 0); // Prevents off-by-one due to time zone conversion
  
    const year = safeDate.getFullYear();
    const month = String(safeDate.getMonth() + 1).padStart(2, '0');
    const day = String(safeDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };  

  // Helper function to parse date string to Date object
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

  // Date picker handlers
  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || new Date();
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedDate(currentDate);
    setLastWatered(formatDateForAPI(currentDate));
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  // Fetch plants from backend API
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

      // Check if data is an array, if not, handle accordingly
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

  useEffect(() => {
    fetchPlants();
  }, []);

  // Enhanced function to parse watering interval from Perenual data
  const parseWateringInterval = (detailJson) => {
    // Try watering_general_benchmark first
    if (detailJson.watering_general_benchmark?.value) {
      const benchmarkValue = detailJson.watering_general_benchmark.value;
      if (typeof benchmarkValue === 'string') {
        // Handle ranges like "5-7" or "Every 5-7 days"
        const match = benchmarkValue.match(/(\d+)(?:-(\d+))?/);
        if (match) {
          const min = parseInt(match[1], 10);
          const max = match[2] ? parseInt(match[2], 10) : min;
          return Math.round((min + max) / 2); // Use average of range
        }
      } else if (typeof benchmarkValue === 'number') {
        return benchmarkValue;
      }
    }
    
    // Fallback to watering description
    if (detailJson.watering) {
      const watering = detailJson.watering.toLowerCase();
      if (watering.includes('daily') || watering.includes('every day')) {
        return 1;
      } else if (watering.includes('twice a week')) {
        return 3;
      } else if (watering.includes('week') && !watering.includes('month')) {
        // Look for numbers in the watering description
        const weekMatch = watering.match(/(\d+)\s*(?:times?\s*(?:a|per)\s*week|week)/);
        if (weekMatch) {
          const timesPerWeek = parseInt(weekMatch[1], 10);
          return Math.round(7 / timesPerWeek);
        }
        return 7; // Default to once a week
      } else if (watering.includes('month')) {
        const monthMatch = watering.match(/(\d+)\s*(?:times?\s*(?:a|per)\s*month|month)/);
        if (monthMatch) {
          const timesPerMonth = parseInt(monthMatch[1], 10);
          return Math.round(30 / timesPerMonth);
        }
        return 30; // Default to once a month
      } else if (watering.includes('frequent')) {
        return 2;
      } else if (watering.includes('minimal') || watering.includes('rare')) {
        return 14;
      }
    }
    
    return 7; // Default fallback - once a week
  };

  // Fetch watering info & description from Perenual API when species changes
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
          // Get detailed information using the species ID
          const detailResponse = await fetch(
            `https://perenual.com/api/species/details/${foundSpecies.id}?key=${PERENUAL_API_KEY}`
          );
          
          if (!detailResponse.ok) {
            throw new Error(`Detail API error: ${detailResponse.status}`);
          }
          
          const detailJson = await detailResponse.json();
          console.log('Detail response:', detailJson);
          
          // Extract watering interval using enhanced parsing
          const intervalDays = parseWateringInterval(detailJson);
          
          setWateringInterval(intervalDays);
          setSpeciesDescription(detailJson.description || foundSpecies.common_name || species);
          
          console.log(`Set watering interval to ${intervalDays} days`);
        } else {
          console.log('No species found in search');
          setWateringInterval(7); // Default fallback
          setSpeciesDescription(`${species} - Species not found in database`);
          setSpeciesId(null);
        }
      } catch (error) {
        console.error('Error fetching species details:', error);
        setWateringInterval(7); // Default fallback
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
    
    // Validate date format
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
      
      // Clear form
      setPlantName('');
      setSpecies(null);
      setLastWatered('');
      setSelectedDate(new Date());
      setWateringInterval(null);
      setSpeciesDescription('');
      setEditingPlant(null);
      setSpeciesId(null);
      
      // Refresh the plants list
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
    
    // FIX: Ensure watering interval is properly set with fallback
    const intervalFromAPI = plant.wateringIntervalDays || plant.WateringIntervalDays;
    setWateringInterval(intervalFromAPI || 7); // Default to 7 if not found
    
    setSpeciesDescription(plant.description || '');
    setSpeciesId(plant.speciesId || null);
  };

  // Enhanced plant click handler with better error handling
  const handlePlantClick = async (plant) => {
    setSelectedPlantInfo(plant);
    setModalVisible(true);
    setModalLoading(true);

    try {
      // If we have stored species ID, fetch fresh details
      if (plant.speciesId) {
        console.log(`Fetching fresh details for species ID: ${plant.speciesId}`);
        const response = await fetch(
          `https://perenual.com/api/species/details/${plant.speciesId}?key=${PERENUAL_API_KEY}`
        );
        
        if (response.ok) {
          const detailJson = await response.json();
          console.log('Fresh plant details:', detailJson);
          
          // Update the plant info with fresh data
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
        // If no species ID but we have species name, try to fetch by name
        console.log(`No species ID, searching by name: ${plant.Species || plant.species}`);
        const searchResponse = await fetch(
          `https://perenual.com/api/species-list?key=${PERENUAL_API_KEY}&q=${encodeURIComponent(plant.Species || plant.species)}`
        );
        
        if (searchResponse.ok) {
          const searchJson = await searchResponse.json();
          if (searchJson.data && searchJson.data.length > 0) {
            const foundSpecies = searchJson.data[0];
            
            // Get detailed info
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

  // Delete plant function
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
              
              // Refresh the plants list
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
        // FIX: Use proper fallback for watering interval
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
    if (plants.length > 0) {
      const interval = setInterval(checkForReminders, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [plants, checkForReminders]);

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

  return (
    <View style={{ flex: 1, backgroundColor: '#fffee8' }}>
      <FlatList
        style={styles.container}
        data={plants}
        keyExtractor={(item) => item.PlantName || item.plantName}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!dropdownOpen}
        ListHeaderComponent={
          <View style={{ marginBottom: dropdownOpen ? 220 : 30, zIndex: 1 }}>
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

            {/* Date Picker Section */}
            <TouchableOpacity 
              style={styles.datePickerButton} 
              onPress={showDatePickerModal}
            >
              <Text style={styles.datePickerButtonText}>
                📅 Last Watered: {lastWatered ? formatDateForDisplay(lastWatered) : 'Select Date'}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
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


            <View style={{ marginTop: 10 }}>
            <Button
              title={editingPlant ? 'Update Plant' : 'Add Plant'}
              onPress={addOrUpdatePlant}
              color="#4CAF50"
            />
              {editingPlant && (
                <View style={{ marginTop: 10 }}>
                  <Button
                    title="Cancel Edit"
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
                    color="#ff6b6b"
                  />
                </View>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const daysAgo = daysSince(item.LastWatered);
          // FIX: Use proper fallback for watering interval in display
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
          <Text style={{ padding: 20, textAlign: 'center', fontSize: 16, color: '#666' }}>
            No plants yet. Add your first plant above! 🌱
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 50 }}
      />

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
                  
                  {/* Basic Care Info */}
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

                  {/* Description */}
                  {(selectedPlantInfo?.freshDescription || selectedPlantInfo?.description) && (
                    <View style={styles.infoSection}>
                      <Text style={styles.sectionTitle}>📖 Description</Text>
                      <Text style={styles.descriptionText}>
                        {selectedPlantInfo?.freshDescription || selectedPlantInfo?.description}
                      </Text>
                    </View>
                  )}
                  
                  {/* Care Information */}
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
                  
                  {/* Safety Information */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    backgroundColor: '#fffee8',
  },
  header: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 20,
    fontFamily: 'MarkerFelt-Thin',
  },
  input: {
    borderColor: '#4CAF50',
    backgroundColor: '#c6f8f3',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    color: '#000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  datePickerButton: {
    borderColor: '#4CAF50',
    backgroundColor: '#c6f8f3',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#2e7d32',
    marginBottom: 4,
  },
  infoTextSmall: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  infoLabel: {
    fontWeight: 'bold',
  },
  dropdown: {
    borderColor: '#4CAF50',
    backgroundColor: '#c6f8f3',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  dropdownText: {
    fontSize: 16,
    color: '#000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  dropdownContainer: {
    borderColor: '#4CAF50',
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: '#c6f8f3',
    zIndex: 9999,
    elevation: 9999,
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#000',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  dropdownSelectedText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subheader: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
  },
  plantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#c6f8f3',
    borderColor: '#4CAF50',
    borderWidth: 1,
    padding: 10,
    borderRadius: 6,
  },
  plantName: {
    fontSize: 20,
    fontFamily: 'MarkerFelt-Thin',
  },
  plantDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  alert: {
    color: 'red',
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 5,
    borderRadius: 4,
  },
  deleteButton: {
    
  },
  actionButtonText: {
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    fontFamily: 'MarkerFelt-Thin',
  },
  modalSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#4CAF50',
  },
  infoSection: {
    backgroundColor: '#c6f8f3',
    borderColor: '#4CAF50',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    fontFamily: 'MarkerFelt-Thin',
  },
  descriptionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  datePickerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
});