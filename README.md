# Employee Time Log System

Angular-based employee time tracking system with Firebase backend.

## Features

- Employee registration with name, position, and employee number
- Login using employee number and password
- Time in/out tracking with buttons
- Real-time accumulated hours (daily, weekly, monthly)
- Firebase Authentication and Firestore database

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Firebase Configuration**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication (Email/Password)
   - Create Firestore database
   - Update `src/environments/environment.ts` with your Firebase config

3. **Run the Application**
   ```bash
   npm start
   ```

## Firebase Setup

1. **Authentication Rules**: Enable Email/Password authentication
2. **Firestore Collections**:
   - `employees`: Store employee data
   - `timeLogs`: Store time tracking records

3. **Firestore Security Rules**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /employees/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       match /timeLogs/{document} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

## Usage

1. Register new employee with name, position, employee number, and password
2. Login using employee number and password
3. Use Time In/Time Out buttons to track work hours
4. View accumulated hours in dashboard