import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function AuthorDashboardScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Author Panel</Text>
      
      <Text style={styles.description}>
        The mobile version of the Decide app is designed exclusively for readers. To create your stories, construct branching narratives, 
        and upload high-resolution images, please log in to our web dashboard from your computer.
      </Text>

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => navigation.navigate('RoleSelection')}
      >
        <Text style={styles.buttonText}>Back to Main Menu</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#121212' },
  title: { color: '#BB86FC', fontSize: 26, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  description: { color: '#CCCCCC', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  button: { backgroundColor: '#1E1E1E', padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});