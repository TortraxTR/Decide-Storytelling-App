import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function RoleScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Choose Your Role</Text>
      <View style={styles.buttonContainer}>
        <Button title="Reader" onPress={() => navigation.navigate('AuthChoice', { role: 'Reader' })} />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Author" onPress={() => navigation.navigate('AuthChoice', { role: 'Author' })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  text: { color: 'white', fontSize: 24, marginBottom: 30, fontWeight: 'bold' },
  buttonContainer: { marginVertical: 10, width: '60%' }
});