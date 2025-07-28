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
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

const commonPlants = [
  'Spider Plant',
  'Snake Plant',
  'Pothos',
  'Peace Lily',
  'Aloe Vera',
  'Succulent',
  'Fiddle Leaf Fig',
  'ZZ Plant',
  'Tomato',
  'Cucumber',
  'Bell Pepper',
  'Jalapeño',
];

const API_URL = 'https://yjf4i5vcg2.execute-api.us-east-1.amazonaws.com/dev/plants';
const PERENUAL_API_KEY = ''; 

export default function App() {
  const [plants, setPlants] = useState([]);
  const [plantName, setPlantName] = useState('');
  const [species, setSpecies] = useState(null);
  const [lastWatered, setLastWatered] = useState('');
  const [editingPlant, setEditingPlant] = useState(null);

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

  // Fetch plants from backend API
  const fetchPlants = async () => {
    try {
      console.log('Fetching plants from:', API_URL);
      const res = await fetch(API_URL);
      console.log('Response status:', res.status);
      console.log('Response headers:', res.headers);
      
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
      // Set empty array so app doesn't crash
      setPlants([]);
    }
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  // Fetch watering info & description from Perenual API when species changes
  useEffect(() => {
    if (!species) {
      setWateringInterval(null);
      setSpeciesDescription('');
      setSpeciesId(null);
      return;
    }
    
    // First, search for the species to get its ID and basic info
    const fetchSpeciesDetails = async () => {
      try {
        const searchResponse = await fetch(
          `https://perenual.com/api/v2/species-list?key=${PERENUAL_API_KEY}&q=${encodeURIComponent(species)}`
        );
        const searchJson = await searchResponse.json();
        
        if (searchJson.data && searchJson.data.length > 0) {
          const foundSpecies = searchJson.data[0];
          setSpeciesId(foundSpecies.id);
          
          // Get detailed information using the species ID
          const detailResponse = await fetch(
            `https://perenual.com/api/v2/species/details/${foundSpecies.id}?key=${PERENUAL_API_KEY}`
          );
          const detailJson = await detailResponse.json();
          
          // Extract watering interval from detailed response
          let intervalDays = null;
          if (detailJson.watering_general_benchmark?.value) {
            const benchmarkValue = detailJson.watering_general_benchmark.value;
            if (typeof benchmarkValue === 'string') {
              // Handle ranges like "5-7"
              const match = benchmarkValue.match(/(\d+)/);
              if (match) {
                intervalDays = parseInt(match[1], 10);
              }
            } else if (typeof benchmarkValue === 'number') {
              intervalDays = benchmarkValue;
            }
          } else if (detailJson.watering) {
            // Fallback: parse watering frequency description
            const watering = detailJson.watering.toLowerCase();
            if (watering.includes('frequent') || watering.includes('daily')) {
              intervalDays = 1;
            } else if (watering.includes('week')) {
              intervalDays = 7;
            } else if (watering.includes('month')) {
              intervalDays = 30;
            } else {
              intervalDays = 3; // Default fallback
            }
          }

          setWateringInterval(intervalDays || 3);
          setSpeciesDescription(detailJson.description || foundSpecies.common_name || 'No description available');
        } else {
          setWateringInterval(3); // Default fallback
          setSpeciesDescription('Species not found in database');
          setSpeciesId(null);
        }
      } catch (error) {
        console.error('Error fetching species details:', error);
        setWateringInterval(3); // Default fallback
        setSpeciesDescription('Error fetching species info');
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
    
    try {
      console.log('Adding/updating plant with data:', {
        plantName,
        speciesQuery: species,
        lastWatered,
        wateringIntervalDays: wateringInterval || 3,
        description: speciesDescription,
        speciesId: speciesId,
      });
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantName,
          speciesQuery: species,
          lastWatered,
          wateringIntervalDays: wateringInterval || 3,
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
    setSpecies(plant.Species || null);
    setLastWatered(plant.LastWatered);
    setEditingPlant(plant.PlantName);
    setWateringInterval(plant.wateringIntervalDays || null);
    setSpeciesDescription(plant.description || '');
  };

  // When a plant is clicked: open modal and fetch fresh data from Perenual
  const handlePlantClick = async (plant) => {
    setSelectedPlantInfo(plant);
    setModalVisible(true);
    setModalLoading(true);

    // If we have stored species ID, fetch fresh details
    if (plant.speciesId) {
      try {
        const response = await fetch(
          `https://perenual.com/api/v2/species/details/${plant.speciesId}?key=${PERENUAL_API_KEY}`
        );
        const detailJson = await response.json();
        
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
          default_image: detailJson.default_image
        }));
      } catch (error) {
        console.error('Error fetching fresh plant details:', error);
      }
    }
    
    setModalLoading(false);
  };

  const checkForReminders = () => {
    const now = new Date();
    plants.forEach((plant) => {
      const last = new Date(plant.LastWatered);
      const daysAgo = Math.floor((now - last) / (1000 * 60 * 60 * 24));
      const interval = plant.wateringIntervalDays || 3;
      if (daysAgo >= interval) {
        Alert.alert('Reminder', `${plant.PlantName} needs watering! (${daysAgo} days since last watered)`);
      }
    });
  };

  useEffect(() => {
    const interval = setInterval(checkForReminders, 60000);
    return () => clearInterval(interval);
  }, [plants]);

  const daysSince = (dateString) => {
    const now = new Date();
    const last = new Date(dateString);
    return Math.floor((now - last) / (1000 * 60 * 60 * 24));
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fffee8' }}>
      <FlatList
        style={styles.container}
        data={plants}
        keyExtractor={(item) => item.PlantName}
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
              />
            </View>

            <TextInput
              placeholder="Last Watered (YYYY-MM-DD)"
              value={lastWatered}
              onChangeText={setLastWatered}
              style={styles.input}
              placeholderTextColor="#666"
            />

            <View style={{ marginTop: 10 }}>
              <Button
                title={editingPlant ? 'Update Plant' : 'Add Plant'}
                onPress={addOrUpdatePlant}
                color="#4CAF50"
              />
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const daysAgo = daysSince(item.LastWatered);
          const interval = item.wateringIntervalDays || 3;
          const needsWatering = daysAgo >= interval;
          return (
            <TouchableOpacity 
              onPress={() => handlePlantClick(item)} 
              style={[styles.plantRow, { zIndex: dropdownOpen ? -1 : 1 }]}
              disabled={dropdownOpen}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.plantName}>
                  <Text style={{ fontWeight: 'bold' }}>{item.PlantName}</Text>
                  {`: Last watered ${daysAgo === 0 ? 'today' : `${daysAgo} days ago`} (every ${interval} days)`}
                </Text>
                {needsWatering && <Text style={styles.alert}>⚠️ Needs water!</Text>}
              </View>
              <TouchableOpacity 
                onPress={() => handleEdit(item)} 
                style={styles.editButton}
                disabled={dropdownOpen}
              >
                <Text style={styles.editButtonText}>✏️</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={{ padding: 20, textAlign: 'center' }}>No plants yet.</Text>}
        contentContainerStyle={{ paddingBottom: 50 }}

        />

        {/* Modal for plant info */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView>
                <Text style={styles.modalTitle}>{selectedPlantInfo?.PlantName}</Text>
                <Text style={styles.modalSubtitle}>Species: {selectedPlantInfo?.Species}</Text>
                
                {modalLoading ? (
                  <ActivityIndicator size="large" color="#4CAF50" style={{ marginVertical: 20 }} />
                ) : (
                  <>
                    {selectedPlantInfo?.default_image?.regular_url && (
                      <View style={{ alignItems: 'center', marginVertical: 10 }}>
                        {/* Note: In React Native, you'd use Image component here */}
                        <Text style={{ fontStyle: 'italic', color: '#666' }}>
                          [Plant image would display here]
                        </Text>
                      </View>
                    )}
                    
                    <Text style={{ marginVertical: 10, fontSize: 16 }}>
                      {selectedPlantInfo?.freshDescription || selectedPlantInfo?.description || 'No description available.'}
                    </Text>
                    
                    <View style={{ marginVertical: 10 }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Care Information:</Text>
                      
                      <Text style={{ marginTop: 5 }}>
                        <Text style={{ fontWeight: '600' }}>Watering: </Text>
                        {selectedPlantInfo?.watering || 'Unknown'}
                        {selectedPlantInfo?.wateringBenchmark?.value && 
                          ` (Every ${selectedPlantInfo.wateringBenchmark.value} ${selectedPlantInfo.wateringBenchmark.unit || 'days'})`
                        }
                      </Text>
                      
                      <Text style={{ marginTop: 5 }}>
                        <Text style={{ fontWeight: '600' }}>Watering interval: </Text>
                        {selectedPlantInfo?.wateringIntervalDays
                          ? `${selectedPlantInfo.wateringIntervalDays} days`
                          : 'Unknown'}
                      </Text>
                      
                      {selectedPlantInfo?.sunlight && (
                        <Text style={{ marginTop: 5 }}>
                          <Text style={{ fontWeight: '600' }}>Sunlight: </Text>
                          {Array.isArray(selectedPlantInfo.sunlight) 
                            ? selectedPlantInfo.sunlight.join(', ') 
                            : selectedPlantInfo.sunlight}
                        </Text>
                      )}
                      
                      {selectedPlantInfo?.careLevel && (
                        <Text style={{ marginTop: 5 }}>
                          <Text style={{ fontWeight: '600' }}>Care Level: </Text>
                          {selectedPlantInfo.careLevel}
                        </Text>
                      )}
                      
                      {selectedPlantInfo?.cycle && (
                        <Text style={{ marginTop: 5 }}>
                          <Text style={{ fontWeight: '600' }}>Life Cycle: </Text>
                          {selectedPlantInfo.cycle}
                        </Text>
                      )}
                      
                      {selectedPlantInfo?.growth_rate && (
                        <Text style={{ marginTop: 5 }}>
                          <Text style={{ fontWeight: '600' }}>Growth Rate: </Text>
                          {selectedPlantInfo.growth_rate}
                        </Text>
                      )}
                      
                      {selectedPlantInfo?.maintenance && (
                        <Text style={{ marginTop: 5 }}>
                          <Text style={{ fontWeight: '600' }}>Maintenance: </Text>
                          {selectedPlantInfo.maintenance}
                        </Text>
                      )}
                      
                      {(selectedPlantInfo?.poisonous_to_pets !== undefined || selectedPlantInfo?.poisonous_to_humans !== undefined) && (
                        <View style={{ marginTop: 10 }}>
                          <Text style={{ fontWeight: 'bold', color: '#e74c3c' }}>Safety Information:</Text>
                          {selectedPlantInfo?.poisonous_to_pets !== undefined && (
                            <Text style={{ color: selectedPlantInfo.poisonous_to_pets ? '#e74c3c' : '#27ae60' }}>
                              {selectedPlantInfo.poisonous_to_pets ? '⚠️ Poisonous to pets' : '✅ Safe for pets'}
                            </Text>
                          )}
                          {selectedPlantInfo?.poisonous_to_humans !== undefined && (
                            <Text style={{ color: selectedPlantInfo.poisonous_to_humans ? '#e74c3c' : '#27ae60' }}>
                              {selectedPlantInfo.poisonous_to_humans ? '⚠️ Poisonous to humans' : '✅ Safe for humans'}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  </>
                )}
                
                <View style={{ marginTop: 20 }}>
                  <Button title="Close" onPress={() => setModalVisible(false)} color="#4CAF50" />
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
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 20,
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
    fontSize: 16,
  },
  alert: {
    color: 'red',
    marginTop: 2,
  },
  editButton: {
    paddingHorizontal: 10,
  },
  editButtonText: {
    fontSize: 20,
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
  },
  modalSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
});