'use client';

import { useState } from 'react';
import { GAMES, ratingGameFor, type GameType } from '@/lib/games/catalog';
import { usePlayedGamesQuery } from '@/lib/queries/games';
import type { PlayedGame } from '@/types';

type RankPreference = 'highest-first' | 'lowest-first';

export interface GameSelection {
  gameType: GameType;
  gameLabel: string;
}

interface GamePickerProps {
  value: GameSelection;
  onChange: (selection: GameSelection, suggestedRankPreference?: RankPreference) => void;
  onSubmit?: () => void;
  fieldClassName: string;
  labelClassName: string;
}

const LEAST_COUNT_OPTION = 'least-count';
const NEW_GAME_OPTION = 'other:new';
const PLAYED_GAME_PREFIX = 'played:';
const GAME_LABEL_MAX_LENGTH = 50;

function playedOptionFor(key: string): string {
  return `${PLAYED_GAME_PREFIX}${key}`;
}

function matchingOption(value: GameSelection, playedGames: PlayedGame[]): string {
  if (value.gameType !== 'other') return LEAST_COUNT_OPTION;
  const key = ratingGameFor('other', value.gameLabel).key;
  return playedGames.some((game) => game.key === key) ? playedOptionFor(key) : NEW_GAME_OPTION;
}

export default function GamePicker({
  value,
  onChange,
  onSubmit,
  fieldClassName,
  labelClassName,
}: GamePickerProps) {
  const { data: playedGames = [] } = usePlayedGamesQuery();
  const [typingNewGame, setTypingNewGame] = useState(false);

  const selectedOption = typingNewGame ? NEW_GAME_OPTION : matchingOption(value, playedGames);
  const selectedPlayedGame = playedGames.find(
    (game) => playedOptionFor(game.key) === selectedOption
  );
  const selectedBlurb =
    selectedOption === LEAST_COUNT_OPTION ? GAMES['least-count'].blurb : GAMES.other.blurb;

  const handleSelect = (option: string) => {
    if (option === LEAST_COUNT_OPTION) {
      setTypingNewGame(false);
      onChange(
        { gameType: 'least-count', gameLabel: '' },
        GAMES['least-count'].defaultRankPreference
      );
      return;
    }
    if (option === NEW_GAME_OPTION) {
      setTypingNewGame(true);
      onChange({ gameType: 'other', gameLabel: '' }, GAMES.other.defaultRankPreference);
      return;
    }
    const game = playedGames.find((g) => playedOptionFor(g.key) === option);
    if (!game) return;
    setTypingNewGame(false);
    onChange({ gameType: 'other', gameLabel: game.name }, game.rankPreference);
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="game-picker" className={labelClassName}>
          Game
        </label>
        <select
          id="game-picker"
          value={selectedOption}
          onChange={(e) => handleSelect(e.target.value)}
          className={fieldClassName}
        >
          <option value={LEAST_COUNT_OPTION}>{GAMES['least-count'].label}</option>
          {playedGames.length > 0 && (
            <optgroup label="Played before">
              {playedGames.map((game) => (
                <option key={game.key} value={playedOptionFor(game.key)}>
                  {game.name}
                </option>
              ))}
            </optgroup>
          )}
          <option value={NEW_GAME_OPTION}>Other (new game)…</option>
        </select>
        {!selectedPlayedGame && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{selectedBlurb}</p>
        )}
      </div>

      {selectedOption === NEW_GAME_OPTION && (
        <div>
          <label htmlFor="game-picker-label" className={labelClassName}>
            Which game?
          </label>
          <input
            id="game-picker-label"
            type="text"
            value={value.gameLabel}
            onChange={(e) => onChange({ gameType: 'other', gameLabel: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
            placeholder="e.g., Bluff, Rummy, Teen Patti"
            maxLength={GAME_LABEL_MAX_LENGTH}
            className={fieldClassName}
          />
        </div>
      )}
    </div>
  );
}
