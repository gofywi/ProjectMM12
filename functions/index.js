const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();

// Stored in Google Secret Manager, never in the app or the repo:
//   firebase functions:secrets:set THIRD_PARTY_API_KEY
const THIRD_PARTY_API_KEY = defineSecret('THIRD_PARTY_API_KEY');

/**
 * Callable function: only signed-in Firebase users can call it
 * (auth is verified automatically for onCall functions).
 * Use it as the proxy for anything that needs a real secret.
 */
exports.secureProxy = onCall(
  { secrets: [THIRD_PARTY_API_KEY], enforceAppCheck: false, region: 'us-central1' },
  async request => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }
    const { payload } = request.data || {};
    // TODO: call your third-party service with THIRD_PARTY_API_KEY.value()
    // and return only the data the client needs.
    return { ok: true, uid: request.auth.uid, echo: payload ?? null };
  },
);
