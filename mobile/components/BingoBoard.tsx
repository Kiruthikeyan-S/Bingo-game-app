import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { BoardArray } from '../../shared/types';
import { BingoCell } from './BingoCell';
import { calculateCompletedLines } from '../utils/bingo';

interface BingoBoardProps {
  board: BoardArray;
  calledNumbers?: number[];
  lastCalledNumber?: number | null;
  selectedSwapIndex?: number | null;
  disabled?: boolean;
  onCellPress: (number: number, index: number) => void;
}

export const BingoBoard: React.FC<BingoBoardProps> = ({
  board,
  calledNumbers = [],
  lastCalledNumber = null,
  selectedSwapIndex = null,
  disabled = false,
  onCellPress,
}) => {
  // Precalculate completed lines and highlighted indices
  const { highlightedIndices } = useMemo(() => {
    return calculateCompletedLines(board, calledNumbers);
  }, [board, calledNumbers]);

  return (
    <View style={styles.gridContainer}>
      {board.map((number, index) => {
        const isCalled = calledNumbers.includes(number);
        const isLastCalled = lastCalledNumber === number;
        const isInCompletedLine = highlightedIndices.has(index);
        const isSelectedForSwap = selectedSwapIndex === index;

        return (
          <BingoCell
            key={`${index}-${number}`}
            number={number}
            isCalled={isCalled}
            isLastCalled={isLastCalled}
            isInCompletedLine={isInCompletedLine}
            isSelectedForSwap={isSelectedForSwap}
            disabled={disabled}
            onPress={() => onCellPress(number, index)}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0d1333',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#1e293b',
  },
});
