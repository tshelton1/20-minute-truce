/* app/(tabs)/_layout.tsx */
import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f172a', 
          borderTopColor: '#1e293b',
          height: 65,
          paddingBottom: 10,
          paddingTop: 5,
        },
        // We override the global active tint to keep the labels white
        tabBarActiveTintColor: '#FFFFFF', 
        tabBarInactiveTintColor: '#FFFFFF',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          color: '#FFFFFF', // Forces all lettering to White
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size }) => (
            <MaterialCommunityIcons name="home-variant" size={size} color="#FF0000" /> // Red House
          ),
        }}
      />
      <Tabs.Screen
        name="mediator"
        options={{
          title: 'Mediator',
          tabBarIcon: ({ size }) => (
            <MaterialCommunityIcons name="scale-balance" size={size} color="#D4AF37" /> // Gold Scales
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ size }) => (
            <MaterialCommunityIcons name="history" size={size} color="#4ade80" /> // Green History
          ),
        }}
      />
    </Tabs>
  );
}