import React, { createContext, useContext, useState } from 'react';

const GenerateImageContext = createContext();

export const useGenerateImage = () => {
  const context = useContext(GenerateImageContext);
  if (!context) {
    throw new Error('useGenerateImage must be used within a GenerateImageProvider');
  }
  return context;
};

export const GenerateImageProvider = ({ children }) => {
  const [publish, setPublish] = useState(false);

  return (
    <GenerateImageContext.Provider value={{ publish, setPublish }}>
      {children}
    </GenerateImageContext.Provider>
  );
};
