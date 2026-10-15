import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LETTERS = ['B', 'I', 'N', 'G', 'O'] as const;

interface BingoProgressProps {
  linesCompleted: number;
}

export const BingoProgress: React.FC<BingoProgressProps> = ({ linesCompleted }) => {
  return (
    <View style={styles.container}>
      <View style={styles.lettersRow}>
        {LETTERS.map((letter, index) => {
          const isActive = index < linesCompleted;
          return (
            <View key={letter} style={styles.letterWrapper}>
              {isActive ? (
                <LinearGradient
                  colors={['#ffd700', '#f59e0b']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.letterBox, styles.letterBoxActive]}
                >
                  <Text style={styles.letterTextActive}>{letter}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.letterBox}>
                  <Text style={styles.letterTextInactive}>{letter}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
      <Text style={styles.countText}>
        {linesCompleted} / 5 Lines Completed
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  lettersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  letterWrapper: {
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  letterBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#11183c',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBoxActive: {
    borderColor: '#ffd700',
    elevation: 6,
  },
  letterTextInactive: {
    fontSize: 22,
    fontWeight: '900',
    color: '#475569',
  },
  letterTextActive: {
    fontSize: 22,
    fontWeight: '900',
    color: '#070b1e',
  },
  countText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#a5b4fc',
    letterSpacing: 0.5,
  },
});
