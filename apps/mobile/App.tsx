import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { supabase } from './src/lib/supabase';
import { Session } from '@supabase/supabase-js';

import { CreateRfqScreen } from './src/screens/CreateRfqScreen';
import { RfqExchangeScreen } from './src/screens/RfqExchangeScreen';
import { MyRequestsScreen } from './src/screens/MyRequestsScreen';
import { SupplierHubScreen } from './src/screens/SupplierHubScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { RequestDetailScreen } from './src/screens/RequestDetailScreen';
import { LoginScreen } from './src/screens/LoginScreen';

type TabKey = 'create_rfq' | 'exchange' | 'my_requests' | 'supplier_hub' | 'profile';

const THEME = {
  bg: '#090A0F',
  tabBarBg: '#131620',
  tabBarBorder: '#1F2433',
  tabActive: '#10B981',
  tabInactive: '#64748B',
};

const TABS: { key: TabKey; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'create_rfq', label: 'AI-Закупка', icon: 'plus-circle' },
  { key: 'exchange', label: 'Биржа RFQ', icon: 'grid' },
  { key: 'my_requests', label: 'Мои закупки', icon: 'inbox' },
  { key: 'supplier_hub', label: 'Поставщикам', icon: 'briefcase' },
  { key: 'profile', label: 'Профиль', icon: 'user' },
];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabKey>('exchange');
  const [viewRequestId, setViewRequestId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  // Render main screen content based on tab or active request details
  const renderContent = () => {
    // If viewing a specific request detail
    if (viewRequestId) {
      return (
        <RequestDetailScreen
          requestId={viewRequestId}
          onBack={() => setViewRequestId(null)}
        />
      );
    }

    // Tabs that require authentication
    if (!session?.user && (currentTab === 'my_requests' || currentTab === 'profile')) {
      return <LoginScreen onLoginSuccess={() => setCurrentTab(currentTab)} />;
    }

    switch (currentTab) {
      case 'create_rfq':
        return (
          <CreateRfqScreen
            onNavigateToExchange={() => setCurrentTab('exchange')}
            onRequestCreated={(id) => setViewRequestId(id)}
          />
        );
      case 'exchange':
        return (
          <RfqExchangeScreen
            onSelectRequest={(id) => setViewRequestId(id)}
            onNavigateToCreate={() => setCurrentTab('create_rfq')}
          />
        );
      case 'my_requests':
        return (
          <MyRequestsScreen
            onSelectRequest={(id) => setViewRequestId(id)}
            onNavigateToCreate={() => setCurrentTab('create_rfq')}
          />
        );
      case 'supplier_hub':
        return <SupplierHubScreen />;
      case 'profile':
      default:
        return <SettingsScreen onLoggedOut={() => setCurrentTab('exchange')} />;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.mainContainer}>
        <View style={styles.contentWrap}>{renderContent()}</View>

        {/* Bottom Tab Bar (hidden when inspecting request detail) */}
        {!viewRequestId && (
          <SafeAreaView edges={['bottom']} style={styles.tabBarSafeArea}>
            <View style={styles.tabBar}>
              {TABS.map((tab) => {
                const isActive = currentTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={styles.tabItem}
                    activeOpacity={0.7}
                    onPress={() => setCurrentTab(tab.key)}
                  >
                    <Feather
                      name={tab.icon}
                      size={20}
                      color={isActive ? THEME.tabActive : THEME.tabInactive}
                    />
                    <Text
                      style={[
                        styles.tabLabel,
                        isActive && styles.tabLabelActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SafeAreaView>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  contentWrap: {
    flex: 1,
  },
  tabBarSafeArea: {
    backgroundColor: THEME.tabBarBg,
  },
  tabBar: {
    flexDirection: 'row',
    height: 56,
    backgroundColor: THEME.tabBarBg,
    borderTopWidth: 1,
    borderTopColor: THEME.tabBarBorder,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: THEME.tabInactive,
    marginTop: 4,
  },
  tabLabelActive: {
    color: THEME.tabActive,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.bg,
  },
});
