import React from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { popularStories } from '../data/mockData';

export default function HomeScreen({ navigation }: any) {
  
  // Her bir hikaye kartının nasıl görüneceğini belirleyen fonksiyon
  const renderStoryCard = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.card} 
      // Kartın üstüne basınca Story ekranına yönlendiriyoruz
      onPress={() => navigation.navigate('Story', { storyId: item.id, title: item.title })}
    >
      <Image source={{ uri: item.coverImage }} style={styles.coverImage} />
      <Text style={styles.storyTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.storyAuthor} numberOfLines={1}>{item.author}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Explore</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Stories</Text>
        <FlatList
          data={popularStories}
          renderItem={renderStoryCard}
          keyExtractor={(item) => item.id}
          horizontal={true} // Yan yana kaydırma özelliği!
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>

      {/* İleride buraya "Yeni Çıkanlar", "Senin İçin Seçtiklerimiz" gibi yeni List'ler ekleyebiliriz */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  headerTitle: { color: '#BB86FC', fontSize: 32, fontWeight: 'bold', margin: 20, marginTop: 40 },
  section: { marginBottom: 30 },
  sectionTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginLeft: 20, marginBottom: 15 },
  listContainer: { paddingLeft: 20 },
  card: { marginRight: 15, width: 140 },
  coverImage: { width: 140, height: 200, borderRadius: 10, marginBottom: 10, backgroundColor: '#333' },
  storyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  storyAuthor: { color: '#AAAAAA', fontSize: 14, marginTop: 2 },
});