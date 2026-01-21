import { Stack } from 'expo-router';

export default function TabLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="home"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: false,
          presentation: 'card'
        }}
      />
    </Stack>
  );
}
