import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Fraunces_400Regular, Fraunces_500Medium } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, useFonts } from '@expo-google-fonts/inter';
import { View } from 'react-native';
import { colors } from '@/theme/colors';
import { PlacesProvider, usePlaces } from '@/lib/store';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore */
});

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { onboarded, loading } = usePlaces();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const first = segments[0];
    if (!onboarded && first !== 'onboarding') {
      router.replace('/onboarding');
    } else if (onboarded && first === 'onboarding') {
      router.replace('/(tabs)');
    }
  }, [loading, onboarded, segments, router]);

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_500Medium,
    Inter_400Regular,
    Inter_500Medium,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <PlacesProvider>
      {/* Android needs both style and an explicit backgroundColor that matches
        * the page; without backgroundColor the bar defaults to a stark white
        * strip at the top that fights the mint palette. translucent=false is
        * required on Android for backgroundColor to apply. */}
      <StatusBar style="dark" backgroundColor={colors.background} translucent={false} />
      <OnboardingGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
            animationDuration: 280,
          }}
        >
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="add"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen name="place/[id]" options={{ animation: 'fade' }} />
          <Stack.Screen name="city/[name]" options={{ animation: 'fade' }} />
          <Stack.Screen
            name="imported"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>
      </OnboardingGate>
    </PlacesProvider>
  );
}
