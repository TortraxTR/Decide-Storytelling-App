import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import RoleScreen from './src/screens/RoleScreen';
import AuthChoiceScreen from './src/screens/AuthChoiceScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import EpisodeScreen from './src/screens/EpisodeScreen';
import AuthorDashboardScreen from './src/screens/AuthorDashboardScreen';
import HomeScreen from './src/screens/HomeScreen';
import EpisodeListScreen from './src/screens/EpisodeListScreen';

const Stack = createNativeStackNavigator();

type RootStackParamList = {
  RoleSelection: undefined;
  AuthChoice: undefined;
  Login: undefined;
  Register: undefined;
  Story: { storyId: string; episodeId?: string; episodeTitle?: string };
  AuthorDashboard: undefined;
  Home: undefined;
  EpisodeListScreen: { storyId: string; storyTitle: string };
};

export default function App() {
  return (
    <SafeAreaProvider>
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
        <Stack.Screen name="Episode" component={EpisodeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AuthorDashboard" component={AuthorDashboardScreen} options={{ title: 'Author Panel' }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="EpisodeList" component={EpisodeListScreen} options={{ title: 'Episodes' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}