import { createContext, useContext, useState, ReactNode } from 'react';

interface ProfileOpenContextType {
  isProfileOpen: boolean;
  setIsProfileOpen: (v: boolean) => void;
}

const ProfileOpenContext = createContext<ProfileOpenContextType>({
  isProfileOpen: false,
  setIsProfileOpen: () => {},
});

export const useProfileOpen = () => useContext(ProfileOpenContext);

export function ProfileOpenProvider({ children }: { children: ReactNode }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  return (
    <ProfileOpenContext.Provider value={{ isProfileOpen, setIsProfileOpen }}>
      {children}
    </ProfileOpenContext.Provider>
  );
}
