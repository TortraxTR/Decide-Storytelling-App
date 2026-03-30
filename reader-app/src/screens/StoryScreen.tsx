import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { fetchStories, fetchStoryNodes } from '../api';

const { width } = Dimensions.get('window');

export default function StoryScreen({ route }: any) {
  const { storyId, title } = route.params || { storyId: '1', title: 'Story' };
  const [storyNodes, setStoryNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      const nodes = await fetchStoryNodes(storyId);

      // For now, let's display the start node and its immediate follow-up if it's a simple sequence
      // Or just load all nodes if it's a simple list for testing
      setStoryNodes(nodes);
      setLoading(false);
    };

    loadInitialData();
  }, [storyId]);

  const handleDecision = (choice: string) => {
    console.log("Reader's choice:", choice);
    // Future: Fetch next nodes based on decision
  };

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'image') {
      return (
        <Image 
          source={{ uri: item.url }} 
          style={styles.panelImage} 
          resizeMode="cover"
        />
      );
    }

    if (item.type === 'decision') {
      return (
        <View style={styles.decisionContainer}>
          <Text style={styles.decisionText}>{item.question}</Text>
          {item.options.map((option: string, index: number) => (
            <TouchableOpacity 
              key={index} 
              style={styles.decisionButton}
              onPress={() => handleDecision(option)}
            >
              <Text style={styles.decisionButtonText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#BB86FC" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      <FlatList
        data={storyNodes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        ListEmptyComponent={<Text style={{color: 'white', textAlign: 'center', marginTop: 20}}>No content found for this story.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', 
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 15,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  panelImage: {
    width: width,
    height: width * 1.33, 
    marginBottom: -1, 
  },
  decisionContainer: {
    padding: 20,
    backgroundColor: '#1E1E1E',
    marginTop: 10,
    alignItems: 'center',
  },
  decisionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  decisionButton: {
    backgroundColor: '#BB86FC', 
    width: '80%',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  decisionButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
