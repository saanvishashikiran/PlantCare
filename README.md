# 🌿 PlantCare Mobile App

**PlantCare** is a mobile app that helps users track their plant care routine. It allows users to add, view, and delete plants; fetch plant care details from an external API; receive personalized watering reminders; and track plant growth with a visual photo gallery. The app is built using **React Native** and integrates with an **AWS serverless backend** and the [Perenual Plant API](https://perenual.com/docs/api).

---

## 📱 Features

- Add and delete plants from your personal list
- Automatically sets watering intervals using Perenual API data
- Local notifications to remind users when to water plants based on optimal watering intervals
- Access Perenual plant information by clicking on "More Info" next to a plant on the watering tracker
- **Growth gallery** - Upload, view, and delete photos to track your plants' progress over time
- Photo storage via AWS S3 with secure image management
- AWS Lambda + API Gateway + DynamoDB backend
- Clean, responsive mobile interface built with Expo (React Native)

---

## 🛠️ Tech Stack

### Frontend

- **React Native (via Expo)**
- **JavaScript**
- **Local Notifications API**
- **Fetch API** to communicate with backend and Perenual
- **Camera/Image Picker** for photo capture and upload

### Backend (AWS)

- **Lambda Functions** (6 total):
  - `getPlants`: Fetches all stored plants from DynamoDB
  - `addPlant`: Adds a new plant (name, last watered) to DynamoDB
  - `deletePlant`: Deletes a plant from the database
  - `uploadPlantPhoto`: Handles photo uploads to S3 and metadata storage
  - `getPlantPhotos`: Retrieves photo URLs and metadata for a specific plant
  - `deletePlantPhoto`: Removes photos from S3 and deletes associated metadata
- **API Gateway** (REST API with CORS + OPTIONS preflight enabled)
- **DynamoDB**: Stores plant metadata and photo references
- **S3 Bucket**: Secure photo storage with organized folder structure

### External API

- **Perenual API**:
  - Retrieves plant information and watering intervals
  - Used to set reminders and determine watering frequency

---

## 📸 Growth Gallery

The growth gallery feature allows users to document their plants' progress with photos:

- **Upload photos** directly from camera or photo library
- **View photo timeline** showing plant growth over time
- **Delete unwanted photos** with automatic S3 cleanup
- Photos are securely stored in AWS S3 with metadata tracking
- Organized storage structure for efficient retrieval

---

## 🔔 Notifications

PlantCare uses Expo's Local Notifications API to remind users when to water plants. Notifications are personalized based on watering intervals retrieved from the Perenual API and the plant's last watered date.

---

## 🔐 API Keys

### AWS Endpoints

The app communicates with a deployed AWS REST API (via API Gateway). 

### Perenual API Key

A Perenual API key is **required** to fetch plant care data.  
Please contact me if you would like to borrow my API key.

---

## ▶️ Running the App Locally

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/PlantCare.git
cd PlantCare
```

### 2. Install dependencies

Ensure you have Node.js and Expo CLI installed.

```bash
npm install
```

### 3. Start the app

```bash
npm start
```
