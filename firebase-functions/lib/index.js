"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.beforesignedin = exports.beforecreated = void 0;
const identity_1 = require("firebase-functions/v2/identity");
exports.beforecreated = (0, identity_1.beforeUserCreated)(() => {
    return {
        customClaims: {
            role: 'authenticated',
        },
    };
});
exports.beforesignedin = (0, identity_1.beforeUserSignedIn)(() => {
    return {
        customClaims: {
            role: 'authenticated',
        },
    };
});
//# sourceMappingURL=index.js.map