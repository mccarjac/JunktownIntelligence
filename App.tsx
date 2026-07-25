import React, { useMemo, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import {
  RootStackParamList,
  RootDrawerParamList,
} from './src/navigation/types';
import { GlobalSearchScreen } from './src/screens/search/GlobalSearchScreen';
import { CharacterListScreen } from './src/screens/character/CharacterListScreen';
import { CharacterDetailScreen } from './src/screens/character/CharacterDetailScreen';
import { CharacterFormScreen } from './src/screens/character/CharacterFormScreen';
import { CharacterStatsScreen } from './src/screens/CharacterStatsScreen';
import { FactionStatsScreen } from './src/screens/FactionStatsScreen';
import { CharacterSearchScreen } from './src/screens/character/CharacterSearchScreen';
import { DataManagementScreen } from './src/screens/DataManagementScreen';
import { FactionListScreen } from './src/screens/faction/FactionListScreen';
import { FactionDetailsScreen } from './src/screens/faction/FactionDetailScreen';
import { FactionFormScreen } from './src/screens/faction/FactionFormScreen';
import { LocationListScreen } from './src/screens/location/LocationListScreen';
import { LocationDetailsScreen } from './src/screens/location/LocationDetailScreen';
import { LocationFormScreen } from './src/screens/location/LocationFormScreen';
import { LocationMapScreen } from './src/screens/location/LocationMapScreen';
import { EventsTimelineScreen } from './src/screens/events/EventsListScreen';
import { EventsFormScreen } from './src/screens/events/EventsFormScreen';
import { EventsDetailScreen } from './src/screens/events/EventsDetailScreen';
import { QuestListScreen } from './src/screens/quest/QuestListScreen';
import { QuestFormScreen } from './src/screens/quest/QuestFormScreen';
import { QuestDetailScreen } from './src/screens/quest/QuestDetailScreen';
import { QuestProposalScreen } from './src/screens/quest/QuestProposalScreen';
import { InfluenceReportScreen } from './src/screens/InfluenceReportScreen';
import { RelationshipGraphScreen } from './src/screens/RelationshipGraphScreen';
import { DiscordConfigScreen } from './src/screens/discord/DiscordConfigScreen';
import { DiscordServerListScreen } from './src/screens/discord/DiscordServerListScreen';
import { DiscordServerFormScreen } from './src/screens/discord/DiscordServerFormScreen';
import { DiscordCharacterMappingScreen } from './src/screens/discord/DiscordCharacterMappingScreen';
import { DiscordMessagesScreen } from './src/screens/discord/DiscordMessagesScreen';
import { DiscordMessageContextScreen } from './src/screens/discord/DiscordMessageContextScreen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components';

// Dark theme for navigation
const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6C5CE7',
    background: '#0F0F23',
    card: '#262647',
    text: '#FFFFFF',
    border: '#404066',
    notification: '#6C5CE7',
  },
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// Custom drawer content with collapsible Discord section
function CustomDrawerContent(props: DrawerContentComponentProps) {
  const [discordExpanded, setDiscordExpanded] = useState(false);
  const { state, navigation } = props;

  const isActive = (routeName: string) => {
    const currentRoute = state.routes[state.index];
    return currentRoute.name === routeName;
  };

  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: '#262647' }}>
      <DrawerItem
        label="Search"
        onPress={() => navigation.navigate('GlobalSearch')}
        focused={isActive('GlobalSearch')}
        activeTintColor="#6C5CE7"
        inactiveTintColor="#B8B8CC"
        activeBackgroundColor="rgba(108, 92, 231, 0.1)"
        labelStyle={drawerStyles.drawerLabel}
      />
      <DrawerItem
        label="Characters"
        onPress={() => navigation.navigate('CharacterList')}
        focused={isActive('CharacterList')}
        activeTintColor="#6C5CE7"
        inactiveTintColor="#B8B8CC"
        activeBackgroundColor="rgba(108, 92, 231, 0.1)"
        labelStyle={drawerStyles.drawerLabel}
      />
      <DrawerItem
        label="Factions"
        onPress={() => navigation.navigate('Factions')}
        focused={isActive('Factions')}
        activeTintColor="#6C5CE7"
        inactiveTintColor="#B8B8CC"
        activeBackgroundColor="rgba(108, 92, 231, 0.1)"
        labelStyle={drawerStyles.drawerLabel}
      />
      <DrawerItem
        label="Locations"
        onPress={() => navigation.navigate('Locations')}
        focused={isActive('Locations')}
        activeTintColor="#6C5CE7"
        inactiveTintColor="#B8B8CC"
        activeBackgroundColor="rgba(108, 92, 231, 0.1)"
        labelStyle={drawerStyles.drawerLabel}
      />
      <DrawerItem
        label="Events"
        onPress={() => navigation.navigate('Events')}
        focused={isActive('Events')}
        activeTintColor="#6C5CE7"
        inactiveTintColor="#B8B8CC"
        activeBackgroundColor="rgba(108, 92, 231, 0.1)"
        labelStyle={drawerStyles.drawerLabel}
      />
      <DrawerItem
        label="Quests"
        onPress={() => navigation.navigate('Quests')}
        focused={isActive('Quests')}
        activeTintColor="#6C5CE7"
        inactiveTintColor="#B8B8CC"
        activeBackgroundColor="rgba(108, 92, 231, 0.1)"
        labelStyle={drawerStyles.drawerLabel}
      />
      <DrawerItem
        label="Influence Report"
        onPress={() => navigation.navigate('InfluenceReport')}
        focused={isActive('InfluenceReport')}
        activeTintColor="#6C5CE7"
        inactiveTintColor="#B8B8CC"
        activeBackgroundColor="rgba(108, 92, 231, 0.1)"
        labelStyle={drawerStyles.drawerLabel}
      />
      <DrawerItem
        label="Relationship Graph"
        onPress={() => navigation.navigate('RelationshipGraph')}
        focused={isActive('RelationshipGraph')}
        activeTintColor="#6C5CE7"
        inactiveTintColor="#B8B8CC"
        activeBackgroundColor="rgba(108, 92, 231, 0.1)"
        labelStyle={drawerStyles.drawerLabel}
      />
      <DrawerItem
        label="Data Management"
        onPress={() => navigation.navigate('DataManagement')}
        focused={isActive('DataManagement')}
        activeTintColor="#6C5CE7"
        inactiveTintColor="#B8B8CC"
        activeBackgroundColor="rgba(108, 92, 231, 0.1)"
        labelStyle={drawerStyles.drawerLabel}
      />

      {/* Collapsible Discord Section */}
      <TouchableOpacity
        style={drawerStyles.sectionHeader}
        onPress={() => setDiscordExpanded(!discordExpanded)}
      >
        <Text style={drawerStyles.sectionHeaderText}>Discord</Text>
        <Text style={drawerStyles.sectionHeaderArrow}>
          {discordExpanded ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>

      {discordExpanded && (
        <View style={drawerStyles.sectionContent}>
          <DrawerItem
            label="Discord Setup (Legacy)"
            onPress={() => navigation.navigate('DiscordConfig')}
            focused={isActive('DiscordConfig')}
            activeTintColor="#6C5CE7"
            inactiveTintColor="#B8B8CC"
            activeBackgroundColor="rgba(108, 92, 231, 0.1)"
            labelStyle={drawerStyles.drawerLabelIndented}
          />
          <DrawerItem
            label="Server/Channel Management"
            onPress={() => navigation.navigate('DiscordServers')}
            focused={isActive('DiscordServers')}
            activeTintColor="#6C5CE7"
            inactiveTintColor="#B8B8CC"
            activeBackgroundColor="rgba(108, 92, 231, 0.1)"
            labelStyle={drawerStyles.drawerLabelIndented}
          />
          <DrawerItem
            label="Character Name Mapping"
            onPress={() => navigation.navigate('DiscordCharacterMapping')}
            focused={isActive('DiscordCharacterMapping')}
            activeTintColor="#6C5CE7"
            inactiveTintColor="#B8B8CC"
            activeBackgroundColor="rgba(108, 92, 231, 0.1)"
            labelStyle={drawerStyles.drawerLabelIndented}
          />
          <DrawerItem
            label="Discord Messages"
            onPress={() => navigation.navigate('DiscordMessages')}
            focused={isActive('DiscordMessages')}
            activeTintColor="#6C5CE7"
            inactiveTintColor="#B8B8CC"
            activeBackgroundColor="rgba(108, 92, 231, 0.1)"
            labelStyle={drawerStyles.drawerLabelIndented}
          />
        </View>
      )}
    </DrawerContentScrollView>
  );
}

const drawerStyles = StyleSheet.create({
  drawerLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  drawerLabelIndented: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.3,
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(108, 92, 231, 0.05)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#404066',
    marginTop: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#B8B8CC',
    textTransform: 'uppercase',
  },
  sectionHeaderArrow: {
    fontSize: 14,
    color: '#B8B8CC',
  },
  sectionContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
});

// Main drawer navigator for primary screens
function MainDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="CharacterList"
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#262647',
          borderBottomWidth: 1,
          borderBottomColor: '#404066',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
          letterSpacing: 0.3,
        },
        drawerStyle: {
          backgroundColor: '#262647',
          width: 280,
        },
      }}
    >
      <Drawer.Screen
        name="GlobalSearch"
        component={GlobalSearchScreen}
        options={{
          title: 'Search',
          drawerLabel: 'Search',
        }}
      />
      <Drawer.Screen
        name="CharacterList"
        component={CharacterListScreen}
        options={{
          title: 'Characters',
          drawerLabel: 'Characters',
        }}
      />
      <Drawer.Screen
        name="Factions"
        component={FactionListScreen}
        options={{
          title: 'Factions',
          drawerLabel: 'Factions',
        }}
      />
      <Drawer.Screen
        name="Locations"
        component={LocationListScreen}
        options={{
          title: 'Locations',
          drawerLabel: 'Locations',
        }}
      />
      <Drawer.Screen
        name="Events"
        component={EventsTimelineScreen}
        options={{
          title: 'Events',
          drawerLabel: 'Events',
        }}
      />
      <Drawer.Screen
        name="Quests"
        component={QuestListScreen}
        options={{
          title: 'Quests',
          drawerLabel: 'Quests',
        }}
      />
      <Drawer.Screen
        name="InfluenceReport"
        component={InfluenceReportScreen}
        options={{
          title: 'Influence Report',
          drawerLabel: 'Influence Report',
        }}
      />
      <Drawer.Screen
        name="RelationshipGraph"
        component={RelationshipGraphScreen}
        options={{
          title: 'Relationship Graph',
          drawerLabel: 'Relationship Graph',
        }}
      />
      <Drawer.Screen
        name="DataManagement"
        component={DataManagementScreen}
        options={{
          title: 'Data Management',
          drawerLabel: 'Data Management',
        }}
      />
      <Drawer.Screen
        name="DiscordConfig"
        component={DiscordConfigScreen}
        options={{
          title: 'Discord Setup (Legacy)',
          drawerLabel: 'Discord Setup (Legacy)',
        }}
      />
      <Drawer.Screen
        name="DiscordServers"
        component={DiscordServerListScreen}
        options={{
          title: 'Discord Servers',
          drawerLabel: 'Discord Servers',
        }}
      />
      <Drawer.Screen
        name="DiscordCharacterMapping"
        component={DiscordCharacterMappingScreen}
        options={{
          title: 'Character Name Mapping',
          drawerLabel: 'Character Name Mapping',
        }}
      />
      <Drawer.Screen
        name="DiscordMessages"
        component={DiscordMessagesScreen}
        options={{
          title: 'Discord Messages',
          drawerLabel: 'Discord Messages',
        }}
      />
    </Drawer.Navigator>
  );
}

const appStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

// Root stack navigator for the entire app
export default function App() {
  const { width: screenWidth } = useWindowDimensions();

  // Calculate max title width dynamically based on screen size
  // Reserve space for: back button (~44px), right buttons (~90px), padding (~40px)
  const headerTitleMaxWidth = useMemo(() => {
    const BACK_BUTTON_WIDTH = 44;
    const RIGHT_BUTTONS_WIDTH = 90;
    const PADDING_MARGINS = 100;
    const reservedSpace =
      BACK_BUTTON_WIDTH + RIGHT_BUTTONS_WIDTH + PADDING_MARGINS;

    return screenWidth - reservedSpace;
  }, [screenWidth]);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={appStyles.root}>
          <NavigationContainer theme={DarkTheme}>
            <Stack.Navigator
              initialRouteName="Main"
              screenOptions={{
                headerStyle: {
                  backgroundColor: '#262647',
                  borderBottomWidth: 1,
                  borderBottomColor: '#404066',
                },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: {
                  fontWeight: '600',
                  fontSize: 18,
                  letterSpacing: 0.3,
                  maxWidth: headerTitleMaxWidth,
                },
                headerTitleAlign: 'left',
                cardStyle: {
                  backgroundColor: '#0F0F23',
                },
              }}
            >
              <Stack.Screen
                name="Main"
                component={MainDrawer}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CharacterDetail"
                component={CharacterDetailScreen}
                options={({ route }) => ({
                  title: route.params?.character?.name || 'Character Detail',
                })}
              />
              <Stack.Screen
                name="CharacterForm"
                component={CharacterFormScreen}
                options={{ title: 'Character Form' }}
              />
              <Stack.Screen
                name="CharacterSearch"
                component={CharacterSearchScreen}
                options={{ title: 'Search Characters' }}
              />
              <Stack.Screen
                name="CharacterStats"
                component={CharacterStatsScreen}
                options={{ title: 'Character Statistics' }}
              />
              <Stack.Screen
                name="FactionStats"
                component={FactionStatsScreen}
                options={{ title: 'Faction Statistics' }}
              />
              <Stack.Screen
                name="FactionDetails"
                component={FactionDetailsScreen}
                options={({ route }) => ({
                  title: route.params?.factionName || 'Faction Details',
                })}
              />
              <Stack.Screen
                name="FactionForm"
                component={FactionFormScreen}
                options={{ title: 'Create Faction' }}
              />
              <Stack.Screen
                name="LocationDetails"
                component={LocationDetailsScreen}
                options={{ title: 'Location Details' }}
              />
              <Stack.Screen
                name="LocationForm"
                component={LocationFormScreen}
                options={{ title: 'Create Location' }}
              />
              <Stack.Screen
                name="LocationMap"
                component={LocationMapScreen}
                options={{ title: 'Junktown Map' }}
              />
              <Stack.Screen
                name="EventsTimeline"
                component={EventsTimelineScreen}
                options={{ title: 'Events Timeline' }}
              />
              <Stack.Screen
                name="EventsForm"
                component={EventsFormScreen}
                options={{ title: 'Event Form' }}
              />
              <Stack.Screen
                name="EventsDetail"
                component={EventsDetailScreen}
                options={{ title: 'Event Details' }}
              />
              <Stack.Screen
                name="QuestsList"
                component={QuestListScreen}
                options={{ title: 'Quests' }}
              />
              <Stack.Screen
                name="QuestsForm"
                component={QuestFormScreen}
                options={{ title: 'Quest Form' }}
              />
              <Stack.Screen
                name="QuestsDetail"
                component={QuestDetailScreen}
                options={{ title: 'Quest Details' }}
              />
              <Stack.Screen
                name="QuestProposals"
                component={QuestProposalScreen}
                options={{ title: 'Quest Proposals' }}
              />
              <Stack.Screen
                name="DiscordMessageContext"
                component={DiscordMessageContextScreen}
                options={{ title: 'Message Context' }}
              />
              <Stack.Screen
                name="DiscordServerForm"
                component={DiscordServerFormScreen}
                options={{ title: 'Server Configuration' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
