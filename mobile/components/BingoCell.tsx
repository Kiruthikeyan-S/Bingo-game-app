import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Dimensions,
} from 'react-native';
import { X } from 'lucide-react-native';

const { width } = Dimensions.get('window');
// Responsive cell size calculation for 5x5 board with padding and gaps
const OUTER_MARGIN = 32; // screen horizontal padding (16 * 2)
const BOARD_PADDING = 28; // board inner padding (14 * 2)
const GAP = 8;
const CELL_SIZE = Math.floor((width - OUTER_MARGIN - BOARD_PADDING - GAP * 4) / 5);

interface BingoCellProps {
  number: number;
  isCalled: boolean;
  isLastCalled: boolean;
  isInCompletedLine: boolean;
  isSelectedForSwap?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export const BingoCell: React.FC<BingoCellProps> = ({
  number,
  isCalled,
  isLastCalled,
  isInCompletedLine,
  isSelectedForSwap = false,
  disabled = false,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.72}
      disabled={disabled || isCalled}
      onPress={onPress}
      style={[
        styles.cell,
        isCalled && styles.cellCalled,
        isInCompletedLine && styles.cellCompletedLine,
        isLastCalled && styles.cellLastCalled,
        isSelectedForSwap && styles.cellSelectedSwap,
      ]}
    >
      {/* Top glossy highlight bar */}
      <View
        style={[
          styles.innerHighlight,
          isInCompletedLine && styles.highlightCompleted,
          isSelectedForSwap && styles.highlightSwap,
        ]}
      />

      <Text
        style={[
          styles.numberText,
          isCalled && styles.textCalled,
          isInCompletedLine && styles.textCompletedLine,
          isLastCalled && styles.textLastCalled,
          isSelectedForSwap && styles.textSelectedSwap,
        ]}
      >
        {number}
      </Text>

      {isCalled && (
        <View style={styles.crossedOverlay}>
          <X
            size={CELL_SIZE * 0.68}
            color={isInCompletedLine ? '#00ff87' : '#f43f5e'}
            strokeWidth={3.2}
          />
        </View>
      )}

      {isLastCalled && (
        <View style={styles.lastCalledBadge}>
          <Text style={styles.lastCalledText}>NEW</Text>
        </View>
      )}

      {isSelectedForSwap && (
        <View style={styles.swapBadge}>
          <Text style={styles.swapBadgeText}>SWAP</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 14,
    backgroundColor: '#151e46',
    borderWidth: 1.5,
    borderColor: '#29387a',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  innerHighlight: {
    position: 'absolute',
    top: 3,
    left: 6,
    right: 6,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  highlightCompleted: {
    backgroundColor: 'rgba(0, 255, 135, 0.35)',
  },
  highlightSwap: {
    backgroundColor: 'rgba(255, 215, 0, 0.4)',
  },
  numberText: {
    fontSize: CELL_SIZE > 54 ? 20 : 17,
    fontWeight: '900',
    color: '#f8fafc',
  },
  cellCalled: {
    backgroundColor: '#1c103b',
    borderColor: '#581c87',
  },
  textCalled: {
    color: '#a855f7',
    opacity: 0.45,
  },
  cellCompletedLine: {
    borderColor: '#00ff87',
    borderWidth: 2,
    backgroundColor: '#062e22',
    shadowColor: '#00ff87',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  textCompletedLine: {
    color: '#00ff87',
    opacity: 0.9,
    fontWeight: '900',
  },
  cellLastCalled: {
    borderColor: '#00e5ff',
    borderWidth: 2.5,
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
    elevation: 6,
  },
  textLastCalled: {
    color: '#00e5ff',
    opacity: 1,
    fontWeight: '900',
  },
  cellSelectedSwap: {
    borderColor: '#ffd700',
    borderWidth: 2.5,
    backgroundColor: '#3b2f06',
    transform: [{ scale: 1.04 }],
  },
  textSelectedSwap: {
    color: '#ffd700',
  },
  crossedOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.88,
  },
  lastCalledBadge: {
    position: 'absolute',
    top: -5,
    right: -4,
    backgroundColor: '#00e5ff',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  lastCalledText: {
    color: '#050816',
    fontSize: 7,
    fontWeight: '900',
  },
  swapBadge: {
    position: 'absolute',
    bottom: -5,
    backgroundColor: '#ffd700',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  swapBadgeText: {
    color: '#050816',
    fontSize: 7,
    fontWeight: '900',
  },
});
