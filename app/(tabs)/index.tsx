import { View, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import * as NavigationBar from 'expo-navigation-bar';

export default function LandingScreen() {
  useEffect(() => {
    // Hide navigation bar with edge-to-edge mode
    NavigationBar.setVisibilityAsync('hidden');
  }, []);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFF4',
  },
});
