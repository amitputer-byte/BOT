import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { GardenArrays } from '@/features/games/GardenArrays';
import { BalloonPop } from '@/features/games/BalloonPop';
import { MultiplicationTrain } from '@/features/games/MultiplicationTrain';
import { MagicLab } from '@/features/games/MagicLab';
import { Screen, RTLText } from '@/components';

/** Game host route. The map/home links here with a game id. */
export default function GameRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  switch (id) {
    case 'garden':
      return <GardenArrays />;
    case 'balloons':
      return <BalloonPop />;
    case 'train':
      return <MultiplicationTrain />;
    case 'lab':
      return <MagicLab />;
    default:
      return (
        <Screen>
          <RTLText variant="title" center>
            🎮
          </RTLText>
        </Screen>
      );
  }
}
