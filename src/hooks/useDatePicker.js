// src/hooks/useDatePicker.js
import { useState } from 'react';
import { Platform } from 'react-native';
import { formatDateForAPI } from '../utils/dateUtils';

export const useDatePicker = () => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const onDateChange = (event, date, onDateSelected) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && date) {
        const currentDate = date;
        setSelectedDate(currentDate);
        if (onDateSelected) {
          onDateSelected(formatDateForAPI(currentDate));
        }
      }
    } else {
      if (date) {
        const currentDate = date;
        setSelectedDate(currentDate);
        if (onDateSelected) {
          onDateSelected(formatDateForAPI(currentDate));
        }
      }
    }
  };

  const showDatePickerModal = () => {
    if (Platform.OS === 'android') {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(!showDatePicker);
    }
  };

  const hideDatePicker = () => {
    setShowDatePicker(false);
  };

  const resetDatePicker = () => {
    setSelectedDate(new Date());
    setShowDatePicker(false);
  };

  return {
    showDatePicker,
    selectedDate,
    setSelectedDate,
    onDateChange,
    showDatePickerModal,
    hideDatePicker,
    resetDatePicker
  };
};