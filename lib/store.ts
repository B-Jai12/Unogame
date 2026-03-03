import { create } from 'zustand';
import { User, Room, ChatMessage } from './types';

interface GameStore {
  user: User | null;
  room: Room | null;
  messages: ChatMessage[];
  selectedColor: string | null;
  showColorPicker: boolean;
  pendingWildCard: { cardId: string; type: string } | null;
  setUser: (user: User | null) => void;
  setRoom: (room: Room | null) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  setSelectedColor: (color: string | null) => void;
  setShowColorPicker: (show: boolean) => void;
  setPendingWildCard: (card: { cardId: string; type: string } | null) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  user: null,
  room: null,
  messages: [],
  selectedColor: null,
  showColorPicker: false,
  pendingWildCard: null,
  setUser: (user) => set({ user }),
  setRoom: (room) => set({ room }),
  setMessages: (messages) => set({ messages }),
  setSelectedColor: (selectedColor) => set({ selectedColor }),
  setShowColorPicker: (showColorPicker) => set({ showColorPicker }),
  setPendingWildCard: (pendingWildCard) => set({ pendingWildCard }),
}));
