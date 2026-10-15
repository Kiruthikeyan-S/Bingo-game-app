import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Server, Check, Wifi, Globe, Smartphone } from 'lucide-react-native';
import { GameHeader } from '../components/GameHeader';
import { GameButton } from '../components/GameButton';
import { socketService } from '../services/socket';
import { useGameStore } from '../store/gameStore';

export default function SettingsScreen() {
  const isConnected = useGameStore((s) => s.isConnected);
  const currentUrl = socketService.getServerUrl();
  const [serverUrl, setServerUrl] = useState(currentUrl);
  const [testing, setTesting] = useState(false);

  const handleSave = () => {
    const trimmed = serverUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      Alert.alert('Invalid URL', 'Server URL must start with http:// or https://');
      return;
    }
    socketService.setServerUrl(trimmed);
    Alert.alert('Saved', 'Server address updated! Reconnecting socket...');
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch(`${serverUrl.trim()}/health`);
      if (res.ok) {
        Alert.alert('Success', 'Connected to Bingo Battle Server successfully!');
      } else {
        Alert.alert('Failed', `Server returned status ${res.status}`);
      }
    } catch (err: any) {
      Alert.alert('Connection Failed', `Could not reach server: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const setPreset = (url: string) => {
    setServerUrl(url);
    socketService.setServerUrl(url);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader title="Settings" subtitle="Network & Game Engine" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Connection Status Card */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={[styles.dot, isConnected ? styles.dotOnline : styles.dotOffline]} />
            <Text style={styles.statusTitle}>
              {isConnected ? 'Connected to Multiplayer Server' : 'Disconnected from Server'}
            </Text>
          </View>
          <Text style={styles.statusDesc}>
            Active URL: {currentUrl}
          </Text>
        </View>

        {/* Server URL Input */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Server size={18} color="#00e5ff" />
            <Text style={styles.cardTitle}>BACKEND SERVER URL</Text>
          </View>

          <TextInput
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://192.168.1.50:3001"
            placeholderTextColor="#475569"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.buttonRow}>
            <GameButton
              title="Save & Connect"
              onPress={handleSave}
              style={{ flex: 1 }}
              icon={<Check size={16} color="#ffffff" />}
            />
            <GameButton
              title="Ping"
              variant="outline"
              loading={testing}
              onPress={handleTestConnection}
              style={{ minWidth: 90 }}
              icon={<Wifi size={16} color="#00e5ff" />}
            />
          </View>
        </View>

        {/* Quick Presets for Two Devices Testing */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>QUICK PRESETS</Text>
          <Text style={styles.presetNotice}>
            For 2 Android phones on the same Wi-Fi, set the server URL to your computer's local IP (e.g. http://192.168.X.X:3001).
          </Text>

          <GameButton
            title="Localhost (PC / Emulator) • :3001"
            variant="outline"
            onPress={() => setPreset('http://localhost:3001')}
            icon={<Smartphone size={16} color="#a5b4fc" />}
            style={{ marginVertical: 4 }}
          />

          <GameButton
            title="Android Emulator Loopback • 10.0.2.2:3001"
            variant="outline"
            onPress={() => setPreset('http://10.0.2.2:3001')}
            icon={<Smartphone size={16} color="#a5b4fc" />}
            style={{ marginVertical: 4 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070b1e',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: '#11183c',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#a5b4fc',
    letterSpacing: 1.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotOnline: {
    backgroundColor: '#10b981',
  },
  dotOffline: {
    backgroundColor: '#ef4444',
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  statusDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  input: {
    backgroundColor: '#19224d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#24326f',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  presetNotice: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
});
