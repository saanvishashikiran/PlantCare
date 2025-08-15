// src/screens/PlantCareScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePlants } from '../hooks/usePlants';
import { useDatePicker } from '../hooks/useDatePicker';
import { daysSince, formatDateForDisplay, parseAPIDate } from '../utils/dateUtils';
import { COMMON_PLANTS, DEFAULT_WATERING_INTERVAL } from '../utils/constants';
import styles from '../styles/styles';

const PlantCareScreen = ({ onPlantClick }) => {
  const { plants, addOrUpdatePlant, deletePlant, getSpeciesInfo } = usePlants();
  const { 
    showDatePicker, 
    selectedDate, 
    setSelectedDate,
    onDateChange, 
    showDatePickerModal, 
    resetDatePicker 
  } = useDatePicker();

  // Form state
  const [plantName, setPlantName] = useState('');
  const [species, setSpecies] = useState(null);
  const [lastWatered, setLastWatered] = useState('');
  const [editingPlant, setEditingPlant] = useState(null);
  const [wateringInterval, setWateringInterval] = useState(null);
  const [speciesDescription, setSpeciesDescription] = useState('');
  const [speciesId, setSpeciesId] = useState(null);

  // Dropdown state
  const [dropdownItems, setDropdownItems] = useState(
    COMMON_PLANTS.map((plant) => ({ label: plant, value: plant }))
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Handle date selection
  const handleDateSelected = (formattedDate) => {
    setLastWatered(formattedDate);
  };

  // Fetch species info when species changes
  useEffect(() => {
    if (!species) {
      setWateringInterval(null);
      setSpeciesDescription('');
      setSpeciesId(null);
      return;
    }
    
    const fetchSpeciesDetails = async () => {
      try {
        const speciesInfo = await getSpeciesInfo(species);
        setWateringInterval(speciesInfo.wateringInterval);
        setSpeciesDescription(speciesInfo.description);
        setSpeciesId(speciesInfo.speciesId);
        
        console.log(`Set watering interval to ${speciesInfo.wateringInterval} days`);
      } catch (error) {
        console.error('Error fetching species details:', error);
        setWateringInterval(DEFAULT_WATERING_INTERVAL);
        setSpeciesDescription(`${species} - Error fetching species info`);
        setSpeciesId(null);
      }
    };

    fetchSpeciesDetails();
  }, [species, getSpeciesInfo]);

  const handleAddOrUpdatePlant = async () => {
    if (!plantName || !lastWatered || !species) {
      Alert.alert('Validation', 'Please fill all fields.');
      return;
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(lastWatered)) {
      Alert.alert('Validation', 'Please select a valid date');
      return;
    }
    
    const plantData = {
      plantName,
      species: species,
      lastWatered,
      wateringIntervalDays: wateringInterval || DEFAULT_WATERING_INTERVAL,
      description: speciesDescription,
      speciesId: speciesId,
    };

    const success = await addOrUpdatePlant(plantData);
    
    if (success) {
      // Reset form
      setPlantName('');
      setSpecies(null);
      setLastWatered('');
      setWateringInterval(null);
      setSpeciesDescription('');
      setEditingPlant(null);
      setSpeciesId(null);
      resetDatePicker();
    }
  };

  const handleEdit = (plant) => {
    setPlantName(plant.PlantName);
    setSpecies(plant.Species || plant.species || null);
    setLastWatered(plant.LastWatered);
    setSelectedDate(parseAPIDate(plant.LastWatered));
    setEditingPlant(plant.PlantName);
    
    const intervalFromAPI = plant.wateringIntervalDays || plant.WateringIntervalDays;
    setWateringInterval(intervalFromAPI || DEFAULT_WATERING_INTERVAL);
    
    setSpeciesDescription(plant.description || '');
    setSpeciesId(plant.speciesId || null);
  };

  const handleCancelEdit = () => {
    setEditingPlant(null);
    setPlantName('');
    setSpecies(null);
    setLastWatered('');
    setWateringInterval(null);
    setSpeciesDescription('');
    setSpeciesId(null);
    resetDatePicker();
  };

  const renderPlantItem = ({ item }) => {
    const daysAgo = daysSince(item.LastWatered);
    const interval = item.wateringIntervalDays || item.WateringIntervalDays || DEFAULT_WATERING_INTERVAL;
    const needsWatering = daysAgo >= interval;
    const species = item.Species || item.species || 'Unknown species';
    
    return (
      <TouchableOpacity 
        onPress={() => onPlantClick(item)} 
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
  };

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
                onChange={(event, date) => onDateChange(event, date, handleDateSelected)}
                maximumDate={new Date()}
              />
            </View>
          )}

          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              is24Hour={true}
              display="default"
              onChange={(event, date) => onDateChange(event, date, handleDateSelected)}
              maximumDate={new Date()}
            />
          )}

          <View style={{ marginTop: 5 }}>
            <TouchableOpacity 
              style={styles.addPlantButton}
              onPress={handleAddOrUpdatePlant}
            >
              <Text style={styles.addPhotoButtonText}>
                {editingPlant ? '✏️ Update Plant' : '🌱 Add Plant'}
              </Text>
            </TouchableOpacity>
            
            {editingPlant && (
              <TouchableOpacity 
                style={[styles.addPlantButton, { backgroundColor: '#ff6b6b', marginTop: 10 }]}
                onPress={handleCancelEdit}
              >
                <Text style={styles.addPhotoButtonText}>❌ Cancel Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      }
      renderItem={renderPlantItem}
      ListEmptyComponent={
        <Text style={{ padding: 20, textAlign: 'center', fontSize: 16, color: '#666', marginTop: -19 }}>
          No plants yet. Add your first plant above! 🌱
        </Text>
      }
      contentContainerStyle={{ paddingBottom: 50 }}
    />
  );
};

export default PlantCareScreen;