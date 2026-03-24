import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function AuthChoiceScreen({ route, navigation }: any) {
  // Bir önceki ekrandan gelen rol bilgisini alıyoruz
  const { role } = route.params || {};

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Chosen Role: {role}</Text>
      <View style={styles.buttonContainer}>
        <Button title="Login" onPress={() => navigation.navigate('Login', { role })} />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Register" onPress={() => navigation.navigate('Register', { role })} />
      </View>
    </View> 
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  text: { color: '#BB86FC', fontSize: 20, marginBottom: 30, fontWeight: 'bold' },
  buttonContainer: { marginVertical: 10, width: '60%' }
});