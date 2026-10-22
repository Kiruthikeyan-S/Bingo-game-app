import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Dimensions,
} from 'react-native';
import { Star, Check } from 'lucide-react-native';

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

      {isInCompletedLine && (
        <View style={styles.starOverlay}>
          <Star size={12} color="#064E3B" fill="#064E3B" />
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
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  innerHighlight: {
    position: 'absolute',
    top: 2,
    left: 4,
    right: 4,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  highlightCompleted: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  highlightSwap: {
    backgroundColor: 'rgba(255, 215, 0, 0.5)',
  },
  numberText: {
    fontSize: CELL_SIZE > 54 ? 22 : 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  cellCalled: {
    backgroundColor: '#34D399',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
  },
  textCalled: {
    color: '#064E3B',
    opacity: 1,
    fontWeight: '900',
  },
  cellCompletedLine: {
    borderColor: '#059669',
    borderWidth: 2.5,
    backgroundColor: '#6EE7B7',
    shadowColor: '#10B981',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  textCompletedLine: {
    color: '#022C22',
    opacity: 1,
    fontWeight: '900',
  },
  cellLastCalled: {
    borderColor: '#EF4444',
    borderWidth: 2.5,
    backgroundColor: '#34D399',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  textLastCalled: {
    color: '#064E3B',
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
  starOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
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
