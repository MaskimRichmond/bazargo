import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from './src/lib/supabase';
import { CatalogScreen } from './src/screens/CatalogScreen';
import { CartScreen } from './src/screens/CartScreen';
import { B2BOffersScreen } from './src/screens/B2BOffersScreen';
import { MyListingsScreen } from './src/screens/MyListingsScreen';
import { ListingFormScreen } from './src/screens/ListingFormScreen';
import { SellerOrdersScreen } from './src/screens/SellerOrdersScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProductScreen } from './src/screens/ProductScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { Session } from '@supabase/supabase-js';

type ScreenName = 'catalog' | 'cart' | 'b2b' | 'my_listings' | 'seller_orders' | 'listing_form' | 'product' | 'settings';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('catalog');
  const [editListingId, setEditListingId] = useState<string | undefined>();
  const [viewProductId, setViewProductId] = useState<string | undefined>();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session && currentScreen !== 'catalog' && currentScreen !== 'product') {
        setCurrentScreen('catalog');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [currentScreen]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  const renderScreen = () => {
    // If not logged in and not on catalog or product screen, force login
    if (!session?.user && currentScreen !== 'catalog' && currentScreen !== 'product') {
      return <LoginScreen onLoginSuccess={() => setCurrentScreen('catalog')} />;
    }

    switch (currentScreen) {
      case 'product':
        return (
          <ProductScreen 
            productId={viewProductId!} 
            onNavigateBack={() => setCurrentScreen('catalog')}
            onNavigateToCart={() => setCurrentScreen('cart')}
          />
        );
      case 'settings':
        return (
          <SettingsScreen 
            onNavigateBack={() => setCurrentScreen('catalog')}
            onLoggedOut={() => setCurrentScreen('catalog')}
          />
        );
      case 'cart':
        return <CartScreen onBack={() => setCurrentScreen('catalog')} />;
      case 'b2b':
        return <B2BOffersScreen onBack={() => setCurrentScreen('catalog')} />;
      case 'my_listings':
        return (
          <MyListingsScreen 
            onBack={() => setCurrentScreen('catalog')} 
            onNavigateToForm={(id) => { setEditListingId(id); setCurrentScreen('listing_form'); }}
          />
        );
      case 'seller_orders':
        return <SellerOrdersScreen onBack={() => setCurrentScreen('catalog')} />;
      case 'listing_form':
        return (
          <ListingFormScreen 
            editId={editListingId}
            onBack={() => setCurrentScreen('my_listings')} 
          />
        );
      case 'catalog':
      default:
        return (
          <CatalogScreen 
            onNavigateToCart={() => setCurrentScreen('cart')} 
            onNavigateToB2B={() => setCurrentScreen('b2b')}
            onNavigateToMyListings={() => setCurrentScreen('my_listings')}
            onNavigateToSellerOrders={() => setCurrentScreen('seller_orders')}
            onNavigateToProduct={(id) => { setViewProductId(id); setCurrentScreen('product'); }}
            onNavigateToSettings={() => setCurrentScreen('settings')}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
      {renderScreen()}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
});
