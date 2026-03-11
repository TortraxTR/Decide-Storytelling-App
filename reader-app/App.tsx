import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  SafeAreaView 
} from 'react-native';

const { width } = Dimensions.get('window');

// test için (mock) veri
const MOCK_STORY_DATA = [
  { id: '1', type: 'image', url: 'https://picsum.photos/seed/baslangic1/600/800' },
  { id: '2', type: 'image', url: 'https://picsum.photos/seed/baslangic2/600/800' },
  { id: '3', type: 'image', url: 'https://picsum.photos/seed/baslangic3/600/800' },
  { 
    id: '4', 
    type: 'decision', 
    question: 'Which path should the character  choose ?', 
    options: ['Dark Forest', 'Old Bridge'] 
  },
];

export default function App() {
  const [storyNodes, setStoryNodes] = useState(MOCK_STORY_DATA);

const handleDecision = (choice: string) => {
    //  terminale yazdır 
    console.log("Reader's choice:", choice);

    // Seçime göre yüklenecek yeni hikaye panelleri ( Branching )
    const newPanels = choice === 'Dark Forest' 
      ? [
          { id: Date.now().toString() + '-1', type: 'image', url: 'https://picsum.photos/seed/orman1/600/800' },
          { id: Date.now().toString() + '-2', type: 'image', url: 'https://picsum.photos/seed/orman2/600/800' }
        ]
      : [
          { id: Date.now().toString() + '-1', type: 'image', url: 'https://picsum.photos/seed/kopru1/600/800' },
          { id: Date.now().toString() + '-2', type: 'image', url: 'https://picsum.photos/seed/kopru2/600/800' }
        ];

    // panelleri ekle
    setStoryNodes(prevNodes => {
      const nodesWithoutDecision = prevNodes.filter(node => node.type !== 'decision');
      return [...nodesWithoutDecision, ...newPanels];
    });
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Decide - Test Story</Text>
      </View>

      <FlatList
        data={storyNodes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', 
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
