// src/hooks/usePlants.js
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { plantsApi } from '../services/api';
import { perenualApi } from '../services/perenualApi';
import { daysSince } from '../utils/dateUtils';
import { DEFAULT_WATERING_INTERVAL } from '../utils/constants';

export const usePlants = () => {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPlants = async () => {
    setLoading(true);
    setError(null);
    try {
      const plantsData = await plantsApi.getPlants();
      setPlants(plantsData);
    } catch (error) {
      console.error('Error fetching plants:', error);
      setError(error.message);
      Alert.alert('Error', `Failed to fetch plants: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addOrUpdatePlant = async (plantData) => {
    try {
      await plantsApi.addOrUpdatePlant(plantData);
      await fetchPlants(); // Refresh the plants list
      return true;
    } catch (error) {
      console.error('Error adding/updating plant:', error);
      Alert.alert('Error', `Failed to add/update plant: ${error.message}`);
      return false;
    }
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
              await plantsApi.deletePlant(plantName);
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
        const interval = plant.wateringIntervalDays || plant.WateringIntervalDays || DEFAULT_WATERING_INTERVAL;
        
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

  const getSpeciesInfo = async (speciesName) => {
    if (!speciesName) {
      return {
        wateringInterval: DEFAULT_WATERING_INTERVAL,
        description: '',
        speciesId: null
      };
    }

    try {
      return await perenualApi.getSpeciesInfo(speciesName);
    } catch (error) {
      console.error('Error getting species info:', error);
      return {
        wateringInterval: DEFAULT_WATERING_INTERVAL,
        description: `${speciesName} - Error fetching species info`,
        speciesId: null
      };
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchPlants();
  }, []);

  // Set up reminders
  useEffect(() => {
    if (plants.length > 0) {
      const interval = setInterval(checkForReminders, 60000);
      return () => clearInterval(interval);
    }
  }, [plants, checkForReminders]);

  return {
    plants,
    loading,
    error,
    fetchPlants,
    addOrUpdatePlant,
    deletePlant,
    getSpeciesInfo,
    checkForReminders
  };
};