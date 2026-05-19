import React from 'react';
import type { WorldConfig } from '../../lib/adventure-map';
import { isLevelUnlocked } from '../../lib/adventure-map';
import { LevelNode } from './LevelNode';
import type { LevelStatus } from './LevelNode';
import type { AdventureProgress } from '../../types';

interface WorldSectionProps {
  world: WorldConfig;
  adventureProgress: AdventureProgress;
  onLevelClick: (levelId: number) => void;
  currentLevelId?: number;
}

export const WorldSection: React.FC<WorldSectionProps> = ({
  world,
  adventureProgress,
  onLevelClick,
  currentLevelId: _currentLevelId,
}) => {
  return (
    <div className={`rounded-3xl border-3 border-dark-ink shadow-comic overflow-hidden mb-4 ${world.bgColor}`}>
      {/* World header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b-3 border-dark-ink bg-white/50">
        <span className="text-3xl" aria-hidden="true">{world.emoji}</span>
        <h2 className="font-fredoka font-bold text-lg text-dark-ink">{world.name}</h2>
      </div>

      {/* Level nodes row */}
      <div className="relative px-4 py-6">
        {/* Dotted connector path behind nodes */}
        <svg
          className="absolute top-1/2 left-0 right-0 w-full -translate-y-1/2 pointer-events-none"
          height="4"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line
            x1="15%"
            y1="2"
            x2="85%"
            y2="2"
            stroke="#2D2D44"
            strokeWidth="3"
            strokeDasharray="8,6"
            strokeOpacity="0.3"
          />
        </svg>

        <div className="relative flex justify-around items-start">
          {world.levels.map((level) => {
            const stars = adventureProgress.stars[level.id] ?? 0;
            const unlocked = isLevelUnlocked(level.id, adventureProgress);
            let status: LevelStatus;
            if (!unlocked) {
              status = 'locked';
            } else if (stars > 0) {
              status = 'completed';
            } else {
              status = 'current';
            }

            return (
              <LevelNode
                key={level.id}
                levelConfig={level}
                status={status}
                stars={stars}
                onClick={() => onLevelClick(level.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorldSection;
