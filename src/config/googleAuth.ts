import { GoogleSignin } from '@react-native-google-signin/google-signin';
import googleServices from '../../android/app/google-services.json';

export const getWebClientId = (): string => {
  try {
    const clients = googleServices?.client?.[0]?.oauth_client || [];

    const webClient = clients.find((c: any) => c.client_type === 3);
    if (webClient?.client_id) {
      return webClient.client_id;
    }
  } catch (e) {
    console.warn('Could not auto-read webClientId from google-services.json', e);
  }

  return 'AddKeyHere';
};

export const configureGoogleSignIn = () => {
  const webClientId = getWebClientId();
  GoogleSignin.configure({
    webClientId,
    offlineAccess: true,
  });
};