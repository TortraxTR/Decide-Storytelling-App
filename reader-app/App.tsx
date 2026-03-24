import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import RoleScreen from './src/screens/RoleScreen';
import AuthChoiceScreen from './src/screens/AuthChoiceScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import StoryScreen from './src/screens/StoryScreen';
import AuthorDashboardScreen from './src/screens/AuthorDashboardScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="RoleSelection"
        screenOptions={{
          headerStyle: { backgroundColor: '#1E1E1E' },
          headerTintColor: '#fff',
        }}
      >
        <Stack.Screen name="RoleSelection" component={RoleScreen} options={{ title: 'Decide' }} />
        <Stack.Screen name="AuthChoice" component={AuthChoiceScreen} options={{ title: 'Welcome' }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
        <Stack.Screen name="Story" component={StoryScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AuthorDashboard" component={AuthorDashboardScreen} options={{ title: 'Author Panel' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}