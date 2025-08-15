// src/services/api.js
import { API_CONFIG } from '../utils/constants';

export const plantsApi = {
  // Get all plants
  getPlants: async () => {
    try {
      console.log('Fetching plants from:', API_CONFIG.BASE_URL);
      const res = await fetch(API_CONFIG.BASE_URL);
      console.log('Response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response body:', errorText);
        throw new Error(`HTTP error! status: ${res.status}, response: ${errorText}`);
      }
      
      const data = await res.json();
      console.log('Fetched plants data:', data);

      if (Array.isArray(data)) {
        // Sort by last watered date
        data.sort((a, b) => {
          const dateA = new Date(a.LastWatered);
          const dateB = new Date(b.LastWatered);
          return dateA - dateB;
        });
        return data;
      } else {
        console.log('Data is not an array:', data);
        return [];
      }
    } catch (error) {
      console.error('Error fetching plants:', error);
      throw error;
    }
  },

  // Add or update a plant
  addOrUpdatePlant: async (plantData) => {
    try {
      console.log('Adding/updating plant with data:', plantData);
      
      const response = await fetch(API_CONFIG.BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plantData),
      });
      
      console.log('Add plant response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Add plant error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log('Add plant success:', responseData);
      return responseData;
    } catch (error) {
      console.error('Error adding/updating plant:', error);
      throw error;
    }
  },

  // Delete a plant
  deletePlant: async (plantName) => {
    try {
      console.log('Deleting plant:', plantName);
      const response = await fetch(`${API_CONFIG.BASE_URL}/${encodeURIComponent(plantName)}`, {
        method: 'DELETE',
      });
      
      console.log('Delete response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      console.log('Plant deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting plant:', error);
      throw error;
    }
  },

  // Get photos for a plant
  getPhotos: async (plantName) => {
    try {
      console.log(`Fetching photos for plant: ${plantName}`);
      const response = await fetch(`${API_CONFIG.BASE_URL}/${encodeURIComponent(plantName)}/photos`);  
      console.log('Photos fetch response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Photos data:', data);
        
        // Sort photos by upload date (newest first)
        const sortedPhotos = (data.photos || []).sort((a, b) => 
          new Date(b.uploadDate) - new Date(a.uploadDate)
        );
        return sortedPhotos;
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch photos:', response.status, errorText);
        
        if (response.status === 404) {
          return []; // No photos found, return empty array
        }
        throw new Error(`Failed to fetch photos: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
      throw error;
    }
  },

  // Upload a photo
  uploadPhoto: async (plantName, uploadData) => {
    try {
      console.log('=== Starting photo upload ===');
      console.log('Plant name:', plantName);
      console.log('Upload data (without base64):', {
        ...uploadData,
        imageData: `[${uploadData.imageData.length} characters of base64 data]`
      });

      const encodedPlantName = encodeURIComponent(plantName);
      const uploadUrl = `${API_CONFIG.BASE_URL}/${encodedPlantName}/photos`;
      console.log('Upload URL:', uploadUrl);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(uploadData),
      });

      console.log('Upload response status:', response.status);
      const responseText = await response.text();
      console.log('Raw response body:', responseText);

      if (response.ok) {
        try {
          const responseData = JSON.parse(responseText);
          console.log('Upload success response:', responseData);
          return responseData;
        } catch (parseError) {
          console.log('Response was successful but JSON parsing failed');
          return { success: true };
        }
      } else {
        console.error('Upload failed with status:', response.status);
        console.error('Error response body:', responseText);
        
        let errorMessage = `Upload failed with status ${response.status}`;
        try {
          const errorJson = JSON.parse(responseText);
          if (errorJson.error) {
            errorMessage = errorJson.error;
          } else if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch (parseError) {
          if (responseText && responseText.length < 200) {
            errorMessage = responseText;
          }
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  },

  // Update photo caption
  updatePhotoCaption: async (plantName, photoId, newCaption) => {
    try {
      console.log(`Updating caption for photo ${photoId} to: "${newCaption}"`);
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/${encodeURIComponent(plantName)}/photos/${photoId}`, 
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ caption: newCaption }),
        }
      );

      console.log('Update caption response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update caption failed:', response.status, errorText);
        throw new Error('Update failed');
      }

      return true;
    } catch (error) {
      console.error('Error updating caption:', error);
      throw error;
    }
  },

  // Delete photo
  deletePhoto: async (plantName, photoId) => {
    try {
      console.log(`Deleting photo ${photoId} for plant ${plantName}`);
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/${encodeURIComponent(plantName)}/photos/${photoId}`,
        { method: 'DELETE' }
      );

      console.log('Delete photo response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete photo failed:', response.status, errorText);
        throw new Error('Delete failed');
      }

      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw error;
    }
  }
};