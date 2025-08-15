// src/utils/dateUtils.js

export const formatDateForAPI = (date) => {
    const safeDate = new Date(date);
    safeDate.setHours(12, 0, 0, 0);
    const year = safeDate.getFullYear();
    const month = String(safeDate.getMonth() + 1).padStart(2, '0');
    const day = String(safeDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  export const parseAPIDate = (dateString) => {
    if (!dateString) return new Date();
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? new Date() : date;
    } catch (error) {
      console.error('Error parsing date:', error);
      return new Date();
    }
  };
  
  export const daysSince = (dateString) => {
    try {
      const now = new Date();
      const last = new Date(dateString);
      return Math.floor((now - last) / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error('Error calculating days since:', error);
      return 0;
    }
  };
  
  export const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return dateString;
    }
  };
  
  export const formatDateForDisplay = (dateString) => {
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