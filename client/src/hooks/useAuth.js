/**
 * The function `useAuth` is a custom hook that utilizes the Clerk authentication library to manage
 * user authentication and retrieve authentication tokens.
 * @returns The `useAuth` function is returning an object with three properties: `getToken`,
 * `isSignedIn`, and `user`. The `getToken` property is a function that, when called, will attempt to
 * retrieve the authentication token. The `isSignedIn` property is a boolean indicating whether the
 * user is currently signed in. The `user` property contains information about the authenticated user.
 */
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

export const useAuth = () => {
  const { getToken, isSignedIn, user } = useClerkAuth();

  const getAuthToken = async () => {
    try {
      if (!isSignedIn) {
        throw new Error('User not authenticated');
      }
      return await getToken();
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw error;
    }
  };

  return {
    getToken: getAuthToken,
    isSignedIn,
    user
  };
}; 