// src/services/perenualApi.js
import { API_CONFIG } from '../utils/constants';

export const parseWateringInterval = (detailJson) => {
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

export const perenualApi = {
  searchSpecies: async (speciesName) => {
    try {
      console.log(`Searching for species: ${speciesName}`);
      const searchResponse = await fetch(
        `${API_CONFIG.PERENUAL_BASE_URL}/species-list?key=${API_CONFIG.PERENUAL_API_KEY}&q=${encodeURIComponent(speciesName)}`
      );
      
      if (!searchResponse.ok) {
        throw new Error(`Search API error: ${searchResponse.status}`);
      }
      
      const searchJson = await searchResponse.json();
      console.log('Search response:', searchJson);
      
      return searchJson.data || [];
    } catch (error) {
      console.error('Error searching species:', error);
      throw error;
    }
  },

  getSpeciesDetails: async (speciesId) => {
    try {
      console.log(`Getting details for species ID: ${speciesId}`);
      const detailResponse = await fetch(
        `${API_CONFIG.PERENUAL_BASE_URL}/species/details/${speciesId}?key=${API_CONFIG.PERENUAL_API_KEY}`
      );
      
      if (!detailResponse.ok) {
        throw new Error(`Detail API error: ${detailResponse.status}`);
      }
      
      const detailJson = await detailResponse.json();
      console.log('Detail response:', detailJson);
      
      return detailJson;
    } catch (error) {
      console.error('Error fetching species details:', error);
      throw error;
    }
  },

  getSpeciesInfo: async (speciesName) => {
    try {
      const searchResults = await perenualApi.searchSpecies(speciesName);
      
      if (searchResults && searchResults.length > 0) {
        const foundSpecies = searchResults[0];
        const detailJson = await perenualApi.getSpeciesDetails(foundSpecies.id);
        
        const intervalDays = parseWateringInterval(detailJson);
        
        return {
          speciesId: foundSpecies.id,
          wateringInterval: intervalDays,
          description: detailJson.description || foundSpecies.common_name || speciesName,
          detailData: detailJson
        };
      } else {
        console.log('No species found in search');
        return {
          speciesId: null,
          wateringInterval: 7,
          description: `${speciesName} - Species not found in database`,
          detailData: null
        };
      }
    } catch (error) {
      console.error('Error getting species info:', error);
      return {
        speciesId: null,
        wateringInterval: 7,
        description: `${speciesName} - Error fetching species info`,
        detailData: null
      };
    }
  }
};