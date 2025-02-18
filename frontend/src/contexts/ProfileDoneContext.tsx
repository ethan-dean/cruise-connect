import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

import fetchWithAuth from "../utils/fetchWithAuth";
import getBackendUrl from "../utils/getBackendUrl";
import { AuthContext } from './AuthContext';


// Define the ProfileDoneContext type
interface ProfileDoneContextType {
  isProfileDone: boolean | null;
  checkIfProfileDone: () => void;
}

// Create ProfileDoneContext with default values
export const ProfileDoneContext = createContext<ProfileDoneContextType>({
  isProfileDone: null,
  checkIfProfileDone: () => {},
});

// Provider component for ProfileDoneContext
export const ProfileDoneProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isProfileDone, setIsProfileDone] = useState<boolean | null>(null);

  const { logout } = useContext(AuthContext);

  // Function to check if the user has finished their profile  
  const checkIfProfileDone = async () => {
    try {
      const response = await fetchWithAuth(`${getBackendUrl()}/api/v1/users/is-profile-done`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setIsProfileDone(data.profileDone);
      } else {
        const data = await response.json();
        if (data.error === 'NO_REFRESH_TOKEN' || data.error === 'INVALID_REFRESH_TOKEN') {
          try {
            const response = await fetch(`${getBackendUrl()}/api/v1/users/logout`, {
              method: 'POST',
              credentials: 'include'
            });

            if (response.ok) {
              logout();
            } else {
              const data = await response.json();
              logout();
              console.log(data.message || 'Server connection error, try again later...');
            }
          } catch (error) {
            console.log('Server connection error, try again later...');
          }
        }

        console.log(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      console.log('Server connection error, try again later... ');
    };
  };

  // Check if the user has finished their profile when first loading, if they have a token
  // from being signed in.
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      checkIfProfileDone();
    }
  }, []);

  return (
    <ProfileDoneContext.Provider value={{ isProfileDone, checkIfProfileDone }}>
      {children}
    </ProfileDoneContext.Provider>
  );
};
