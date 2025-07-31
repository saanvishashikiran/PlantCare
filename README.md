# 🌿 PlantCare Mobile App

**PlantCare** is a mobile app that helps users track their plant care routine. It allows users to add, view, and delete plants; fetch plant care details from an external API; and receive personalized watering reminders. The app is built using **React Native** and integrates with an **AWS serverless backend** and the [Perenual Plant API](https://perenual.com/docs/api).

---

## 📱 Features

- Add and delete plants from your personal list
- Automatically sets watering intervals using Perenual API data
- Local notifications to remind users when to water plants based on optimal watering intervals
- AWS Lambda + API Gateway + DynamoDB backend
- Clean, responsive mobile interface built with Expo (React Native)

---

## 🛠️ Tech Stack

### Frontend

- **React Native (via Expo)**
- **JavaScript**
- **Local Notifications API**
- **Fetch API** to communicate with backend and Perenual

### Backend (AWS)

- **Lambda Functions** (3 total):
  - `getPlants`: Fetches all stored plants from DynamoDB
  - `addPlant`: Adds a new plant (name, last watered) to DynamoDB
  - `deletePlant`: Deletes a plant from the database
- **API Gateway** (REST API with CORS + OPTIONS preflight enabled)
- **DynamoDB**: Stores plant metadata

### External API

- **Perenual API**:
  - Retrieves plant information and watering intervals
  - Used to set reminders and determine watering frequency

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
git clone https://github.com/yourusername/plantcare-app.git
cd plantcare-app

2. Install dependencies
Ensure you have Node.js and Expo CLI installed.
```bash
npm install

4. Start the app
npm start


