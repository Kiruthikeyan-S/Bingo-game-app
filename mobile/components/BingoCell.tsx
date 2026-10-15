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
const GRID_PADDING = 16;
const GAP = 8;
const CELL_SIZE = Math.floor((width - GRID_PADDING * 2 - GAP * 4) / 5);

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
      activeOpacity={0.7}
      disabled={disabled || isCalled}
      onPress={onPress}
      style={[
        styles.cell,
        isCalled && styles.cellCalled,
        isLastCalled && styles.cellLastCalled,
        isInCompletedLine && styles.cellCompletedLine,
        isSelectedForSwap && styles.cellSelectedSwap,
      ]}
    >
      <Text
        style={[
          styles.numberText,
          isCalled && styles.textCalled,
          isLastCalled && styles.textLastCalled,
          isInCompletedLine && styles.textCompletedLine,
          isSelectedForSwap && styles.textSelectedSwap,
        ]}
      >
        {number}
      </Text>

      {isCalled && (
        <View style={styles.crossedOverlay}>
          <X size={CELL_SIZE * 0.75} color={isInCompletedLine ? '#00ff87' : '#ec4899'} strokeWidth={3} />
        </View>
      )}

      {isLastCalled && (
        <View style={styles.lastCalledBadge}>
          <Text style={styles.lastCalledText}>LAST</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 12,
    backgroundColor: '#161f48',
    borderWidth: 1.5,
    borderColor: '#24326f',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  numberText: {
    fontSize: CELL_SIZE > 55 ? 20 : 17,
    fontWeight: '800',
    color: '#f8fafc',
  },
  cellCalled: {
    backgroundColor: '#231245',
    borderColor: '#6b21a8',
  },
  textCalled: {
    color: '#a855f7',
    opacity: 0.6,
  },
  cellLastCalled: {
    borderColor: '#00e5ff',
    borderWidth: 2.5,
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  textLastCalled: {
    color: '#00e5ff',
    fontWeight: '900',
  },
  cellCompletedLine: {
    borderColor: '#00ff87',
    borderWidth: 2,
    backgroundColor: '#073322',
  },
  textCompletedLine: {
    color: '#00ff87',
    fontWeight: '900',
  },
  cellSelectedSwap: {
    borderColor: '#ffd700',
    borderWidth: 2.5,
    backgroundColor: '#382e07',
  },
  textSelectedSwap: {
    color: '#ffd700',
  },
  crossedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
  lastCalledBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#00e5ff',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  lastCalledText: {
    color: '#070b1e',
    fontSize: 7,
    fontWeight: '900',
  },
});
