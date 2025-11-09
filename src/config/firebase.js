const admin = require('firebase-admin');

let firebaseApp = null;

const initializeFirebase = () => {
  try {
    if (!process.env.FIREBASE_CREDENTIALS) {
      throw new Error('Missing FIREBASE_CREDENTIALS environment variable');
    }

    // Parse the JSON string from the environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
  }
};

const getFirebaseApp = () => {
    if (!firebaseApp) {
        throw new Error('Firebase not initialized');
    }
    return firebaseApp;
};

module.exports = { initializeFirebase, getFirebaseApp };
