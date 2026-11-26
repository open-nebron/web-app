import { create } from 'zustand';

export interface ActiveSpaceVoiceSession {
  spaceId: string;
  spaceName: string;
  channelId: string;
  channelName: string;
  roomName: string;
  livekitUrl: string;
  token: string;
  canPublish: boolean;
  joinedAt: string;
}

export interface VoiceRoomParticipant {
  identity: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isCameraEnabled: boolean;
  isScreenShareEnabled: boolean;
}

interface SpacesStoreState {
  activeVoice: ActiveSpaceVoiceSession | null;
  voiceConnectionState: 'disconnected' | 'connecting' | 'connected';
  isMuted: boolean;
  isDeafened: boolean;
  isCameraEnabled: boolean;
  isScreenShareEnabled: boolean;
  participantsByChannel: Record<string, VoiceRoomParticipant[]>;
  unreadByChannel: Record<string, number>;
  unreadBySpace: Record<string, number>;
  collapsedCategories: Record<string, boolean>;

  setActiveVoice: (session: ActiveSpaceVoiceSession | null) => void;
  setVoiceConnectionState: (state: 'disconnected' | 'connecting' | 'connected') => void;
  setMuted: (muted: boolean) => void;
  setDeafened: (deafened: boolean) => void;
  setCameraEnabled: (enabled: boolean) => void;
  setScreenShareEnabled: (enabled: boolean) => void;
  setChannelParticipants: (channelId: string, participants: VoiceRoomParticipant[]) => void;
  clearActiveVoice: () => void;
  incrementUnread: (spaceId: string, channelId: string) => void;
  clearChannelUnread: (spaceId: string, channelId: string) => void;
  toggleCategoryCollapsed: (categoryId: string) => void;
}

export const useSpacesStore = create<SpacesStoreState>((set) => ({
  activeVoice: null,
  voiceConnectionState: 'disconnected',
  isMuted: false,
  isDeafened: false,
  isCameraEnabled: false,
  isScreenShareEnabled: false,
  participantsByChannel: {},
  unreadByChannel: {},
  unreadBySpace: {},
  collapsedCategories: {},

  setActiveVoice: (activeVoice) =>
    set({
      activeVoice,
      voiceConnectionState: activeVoice ? 'connecting' : 'disconnected',
      isMuted: activeVoice ? !activeVoice.canPublish : false,
      isCameraEnabled: false,
      isScreenShareEnabled: false,
    }),

  setVoiceConnectionState: (voiceConnectionState) => set({ voiceConnectionState }),

  setMuted: (isMuted) => set({ isMuted }),

  setDeafened: (isDeafened) =>
    set((state) => ({
      isDeafened,
      isMuted: isDeafened ? true : state.isMuted,
    })),

  setCameraEnabled: (isCameraEnabled) => set({ isCameraEnabled }),

  setScreenShareEnabled: (isScreenShareEnabled) => set({ isScreenShareEnabled }),

  setChannelParticipants: (channelId, participants) =>
    set((state) => ({
      participantsByChannel: {
        ...state.participantsByChannel,
        [channelId]: participants,
      },
    })),

  clearActiveVoice: () =>
    set((state) => {
      const nextParticipants = { ...state.participantsByChannel };
      if (state.activeVoice) {
        delete nextParticipants[state.activeVoice.channelId];
      }
      return {
        activeVoice: null,
        voiceConnectionState: 'disconnected',
        isMuted: false,
        isDeafened: false,
        isCameraEnabled: false,
        isScreenShareEnabled: false,
        participantsByChannel: nextParticipants,
      };
    }),

  incrementUnread: (spaceId, channelId) =>
    set((state) => ({
      unreadByChannel: {
        ...state.unreadByChannel,
        [channelId]: (state.unreadByChannel[channelId] || 0) + 1,
      },
      unreadBySpace: {
        ...state.unreadBySpace,
        [spaceId]: (state.unreadBySpace[spaceId] || 0) + 1,
      },
    })),

  clearChannelUnread: (spaceId, channelId) =>
    set((state) => {
      const prevCount = state.unreadByChannel[channelId] || 0;
      if (prevCount === 0) return state;
      const nextSpaceTotal = Math.max(0, (state.unreadBySpace[spaceId] || 0) - prevCount);
      return {
        unreadByChannel: {
          ...state.unreadByChannel,
          [channelId]: 0,
        },
        unreadBySpace: {
          ...state.unreadBySpace,
          [spaceId]: nextSpaceTotal,
        },
      };
    }),

  toggleCategoryCollapsed: (categoryId) =>
    set((state) => ({
      collapsedCategories: {
        ...state.collapsedCategories,
        [categoryId]: !state.collapsedCategories[categoryId],
      },
    })),
}));
