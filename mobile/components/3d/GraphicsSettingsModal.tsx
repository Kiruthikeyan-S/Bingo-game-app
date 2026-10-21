import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { X, Sliders, Sun, ShieldCheck } from 'lucide-react-native';
import {
  useGraphicsStore,
  THEMES,
  ThemeId,
  QualityLevel,
} from '../../store/graphicsStore';

interface GraphicsSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function GraphicsSettingsModal({
  visible,
  onClose,
}: GraphicsSettingsModalProps) {
  const themeId = useGraphicsStore((s) => s.themeId);
  const quality = useGraphicsStore((s) => s.quality);
  const shadowsEnabled = useGraphicsStore((s) => s.shadowsEnabled);
  const cameraRotation = useGraphicsStore((s) => s.cameraRotation);
  const reduceMotion = useGraphicsStore((s) => s.reduceMotion);
  const fallback2D = useGraphicsStore((s) => s.fallback2D);

  const setTheme = useGraphicsStore((s) => s.setTheme);
  const setQuality = useGraphicsStore((s) => s.setQuality);
  const setShadowsEnabled = useGraphicsStore((s) => s.setShadowsEnabled);
  const setCameraRotation = useGraphicsStore((s) => s.setCameraRotation);
  const setReduceMotion = useGraphicsStore((s) => s.setReduceMotion);
  const setFallback2D = useGraphicsStore((s) => s.setFallback2D);

  const activeTheme = THEMES[themeId] || THEMES['midnight-neon'];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Sliders size={20} color={activeTheme.primary} />
              <Text style={styles.title}>3D Graphics & Theme</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {/* Theme Picker */}
            <Text style={styles.sectionHeader}>VISUAL THEME</Text>
            <View style={styles.themeGrid}>
              {(Object.keys(THEMES) as ThemeId[]).map((id) => {
                const t = THEMES[id];
                const isSelected = themeId === id;
                return (
                  <TouchableOpacity
                    key={id}
                    style={[
                      styles.themeCard,
                      { backgroundColor: t.background },
                      isSelected && { borderColor: t.primary, borderWidth: 2 },
                    ]}
                    onPress={() => setTheme(id)}
                  >
                    <View
                      style={[styles.colorDot, { backgroundColor: t.primary }]}
                    />
                    <Text
                      style={[
                        styles.themeName,
                        { color: isSelected ? t.primary : '#f8fafc' },
                      ]}
                    >
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quality Preset */}
            <Text style={styles.sectionHeader}>GRAPHICS QUALITY</Text>
            <View style={styles.qualityRow}>
              {(['low', 'medium', 'high'] as QualityLevel[]).map((lvl) => {
                const isSelected = quality === lvl;
                return (
                  <TouchableOpacity
                    key={lvl}
                    style={[
                      styles.qualityBtn,
                      isSelected && {
                        backgroundColor: activeTheme.primary,
                        borderColor: activeTheme.primary,
                      },
                    ]}
                    onPress={() => setQuality(lvl)}
                  >
                    <Text
                      style={[
                        styles.qualityText,
                        isSelected && { color: '#070b1e', fontWeight: '800' },
                      ]}
                    >
                      {lvl.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Toggles */}
            <Text style={styles.sectionHeader}>ADVANCED SETTINGS</Text>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleLabel}>3D Dynamic Shadows</Text>
                <Text style={styles.toggleSub}>Cast real-time lighting shadows</Text>
              </View>
              <Switch
                value={shadowsEnabled}
                onValueChange={setShadowsEnabled}
                thumbColor={shadowsEnabled ? activeTheme.primary : '#64748b'}
                trackColor={{ false: '#1e293b', true: 'rgba(0, 213, 245, 0.4)' }}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleLabel}>Free Camera Rotation</Text>
                <Text style={styles.toggleSub}>Orbit around the 3D board via touch</Text>
              </View>
              <Switch
                value={cameraRotation}
                onValueChange={setCameraRotation}
                thumbColor={cameraRotation ? activeTheme.primary : '#64748b'}
                trackColor={{ false: '#1e293b', true: 'rgba(0, 213, 245, 0.4)' }}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleLabel}>Reduce Motion</Text>
                <Text style={styles.toggleSub}>Limit continuous idle animations</Text>
              </View>
              <Switch
                value={reduceMotion}
                onValueChange={setReduceMotion}
                thumbColor={reduceMotion ? activeTheme.primary : '#64748b'}
                trackColor={{ false: '#1e293b', true: 'rgba(0, 213, 245, 0.4)' }}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleLabel}>2D Fallback Mode</Text>
                <Text style={styles.toggleSub}>Switch back to standard 2D view</Text>
              </View>
              <Switch
                value={fallback2D}
                onValueChange={setFallback2D}
                thumbColor={fallback2D ? activeTheme.primary : '#64748b'}
                trackColor={{ false: '#1e293b', true: 'rgba(0, 213, 245, 0.4)' }}
              />
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: activeTheme.primary }]}
            onPress={onClose}
          >
            <Text style={styles.doneBtnText}>Apply & Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    width: '100%',
    maxHeight: '85%',
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    gap: 12,
    paddingBottom: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginTop: 8,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeCard: {
    flexBasis: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
    gap: 8,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  themeName: {
    fontSize: 13,
    fontWeight: '700',
  },
  qualityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  qualityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  toggleTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  toggleSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  doneBtn: {
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#070b1e',
    fontSize: 14,
    fontWeight: '800',
  },
});
