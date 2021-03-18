import { Module, Mutation, VuexModule } from 'vuex-class-modules'

import { Song } from '@/models/songs'
import store from '@/commonStore'

export enum PeerMode {
  WATCHER,
  BROADCASTER,
  UNDEFINED,
}

@Module
class Sync extends VuexModule {
  mode: PeerMode = PeerMode.UNDEFINED
  currentSongDets: Song | null = null
  currentCover: Blob | null = null
  roomID: string = ''

  @Mutation
  setMode(mode: PeerMode) {
    this.mode = mode
  }

  @Mutation
  setRoom(id: string) {
    this.roomID = id
  }

  @Mutation
  setSong(song: Song) {
    this.currentSongDets = song
  }

  @Mutation
  setCover(cover: Blob) {
    this.currentCover = cover
  }
}

export const SyncModule = new Sync({ store, name: 'sync' })
