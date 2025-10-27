import React, { createContext, useContext, useEffect, useState } from 'react';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children, value: socket }) => {
  const [isConnected, setIsConnected] = useState(socket?.connected || false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleLocationUpdate = (data) => {
      setLastLocationUpdate(data);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('location_update', handleLocationUpdate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('location_update', handleLocationUpdate);
    };
  }, [socket]);

  const subscribeToAnimal = (animalId) => {
    if (socket && isConnected) {
      socket.emit('subscribe_animal', { animal_id: animalId });
    }
  };

  const sendLocationUpdate = (data) => {
    if (socket && isConnected) {
      socket.emit('location_update', data);
    }
  };

  const value = {
    socket,
    isConnected,
    lastLocationUpdate,
    subscribeToAnimal,
    sendLocationUpdate
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};






