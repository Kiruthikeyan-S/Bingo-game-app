import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LETTERS = [
  { char: 'B', activeColors: ['#00e5ff', '#0284c7'] as [string, string] },
  { char: 'I', activeColors: ['#a855f7', '#7e22ce'] as [string, string] },
  { char: 'N', activeColors: ['#ffd700', '#d97706'] as [string, string] },
  { char: 'G', activeColors: ['#00ff87', '#059669'] as [string, string] },
  { char: 'O', activeColors: ['#f43f5e', '#be123c'] as [string, string] },
];

interface BingoProgressProps {
  linesCompleted: number;
}

export const BingoProgress: React.FC<BingoProgressProps> = ({ linesCompleted }) => {
  return (
    <View style={styles.container}>
      <View style={styles.lettersRow}>
        {LETTERS.map((item, index) => {
          const isActive = index < linesCompleted;
          return (
            <View key={item.char} style={styles.letterWrapper}>
              {isActive ? (
                <LinearGradient
                  colors={item.activeColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.letterBox, styles.letterBoxActive]}
                >
                  <Text style={styles.letterTextActive}>{item.char}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.letterBox}>
                  <Text style={styles.letterTextInactive}>{item.char}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${Math.min(100, (linesCompleted / 5) * 100)}%` },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    marginVertical: 8,
  },
  lettersRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  letterWrapper: {
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  letterBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#0c122e',
    borderWidth: 1.5,
    borderColor: '#1e2b5e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBoxActive: {
    borderColor: '#ffffff',
    elevation: 6,
  },
  letterTextInactive: {
    fontSize: 22,
    fontWeight: '900',
    color: '#334155',
  },
  letterTextActive: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
  },
  progressBarBg: {
    width: 220,
    height: 5,
    backgroundColor: '#11183c',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00ff87',
    borderRadius: 3,
  },
});
