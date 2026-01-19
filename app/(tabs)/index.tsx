import { Image } from 'expo-image';
import * as NavigationBar from 'expo-navigation-bar';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Banner images
const BANNERS = [
  require('../../public/images/bannerimage.png'),
  require('../../public/images/bannerimage1.png'),
  require('../../public/images/bannerimage2.png'),
  require('../../public/images/bannerimage3.png'),
];

// Button language translations with vibrant colors
const LANGUAGES = [
  { text: 'Join the World', color: '#FFFFFF' },           // English - White
  { text: 'Rejoignez le Monde', color: '#FFD700' },       // French - Gold
  { text: 'Únete al Mundo', color: '#FF6B9D' },           // Spanish - Hot Pink
  { text: 'Присоединяйтесь к Миру', color: '#87CEEB' },  // Russian - Sky Blue
  { text: '加入世界', color: '#FFA500' },                  // Chinese - Orange
];

export default function LandingScreen() {
  // State for current image index and pagination dots
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // State for current language index
  const [currentLanguageIndex, setCurrentLanguageIndex] = useState(0);

  // Router for navigation
  const router = useRouter();

  // Shared value for button text fade animation
  const textOpacity = useSharedValue(1);

  // Animated style for fade transition
  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  // Hide navigation bar on mount
  useEffect(() => {
    NavigationBar.setVisibilityAsync('hidden');
  }, []);

  // Transition to next image
  const transitionToNext = useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % 4);
  }, []);

  // Handle button press - navigate to explore screen
  const handleJoinPress = useCallback(() => {
    router.push('/explore');
  }, [router]);

  // Auto-advance carousel every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      transitionToNext();
    }, 3000);

    return () => clearInterval(interval);
  }, [transitionToNext]);

  // Fade animation when language changes
  useEffect(() => {
    // Fade out
    textOpacity.value = withTiming(0, { duration: 200 }, () => {
      // After fade out completes, fade back in
      textOpacity.value = withTiming(1, { duration: 200 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguageIndex]);

  // Auto-advance button language every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLanguageIndex((prev) => (prev + 1) % 5);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      {/* Full-screen banner images */}
      {BANNERS.map((banner, index) => (
        <Animated.View
          key={index}
          style={[
            styles.imageContainer,
            {
              opacity: currentImageIndex === index ? 1 : 0,
            },
          ]}
        >
          <Image
            source={banner}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </Animated.View>
      ))}

      {/* Join the World Button */}
      <Pressable style={styles.joinButton} onPress={handleJoinPress}>
        <MaterialCommunityIcons name="translate" size={24} color="white" />
        <Animated.Text
          style={[
            styles.joinButtonText,
            animatedTextStyle,
            { color: LANGUAGES[currentLanguageIndex].color },
          ]}
        >
          {LANGUAGES[currentLanguageIndex].text}
        </Animated.Text>
      </Pressable>

      {/* Pagination dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor:
                  currentImageIndex === index
                    ? '#10B981'
                    : 'rgba(16, 185, 129, 0.3)',
                width: currentImageIndex === index ? 10 : 8,
                height: currentImageIndex === index ? 10 : 8,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFF4',
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  dot: {
    borderRadius: 5,
    marginHorizontal: 4,
  },
  joinButton: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
