/**
 * Firebase Cloud Functions to assign the `role: 'authenticated'`
 * custom claim to all users. This is required by Supabase's
 * third-party Firebase auth integration.
 *
 * IMPORTANT: These are "blocking" functions and require
 * Firebase Authentication with Identity Platform.
 * Enable it in Firebase Console > Authentication > Settings.
 *
 * Deploy with:
 *   cd firebase-functions
 *   npm install
 *   npx firebase deploy --only functions
 */

import { beforeUserCreated, beforeUserSignedIn } from 'firebase-functions/v2/identity';

export const beforecreated = beforeUserCreated(() => {
  return {
    customClaims: {
      role: 'authenticated',
    },
  };
});

export const beforesignedin = beforeUserSignedIn(() => {
  return {
    customClaims: {
      role: 'authenticated',
    },
  };
});
