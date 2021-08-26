import { createProxy, extractVuexModule } from 'vuex-class-component'

import { NotifierStore } from './notifications'
import { PlayerStore } from './playerState'
import { PlaylistStore } from '@/mainWindow/store/playlists'
import { ProviderStore } from '@/mainWindow/store/providers'
import { SyncStore } from '@/mainWindow/store/syncState'
import { ThemeStore } from './themes';
import Vue from 'vue'
import Vuex from 'vuex'
import { createPersist } from '@/utils/ui/store/persist'

Vue.use(Vuex)

const paths = ['player.volume', 'player.currentSong', 'player.state', 'player.songQueue', 'player.repeat', 'themes.colors']

export const store = new Vuex.Store({
  modules: {
    ...extractVuexModule(PlayerStore),
    ...extractVuexModule(PlaylistStore),
    ...extractVuexModule(SyncStore),
    ...extractVuexModule(ProviderStore),
    ...extractVuexModule(NotifierStore),
    ...extractVuexModule(ThemeStore),
  },
  plugins: [createPersist(paths)],
})

export const vxm = {
  player: createProxy(store, PlayerStore),
  playlist: createProxy(store, PlaylistStore),
  sync: createProxy(store, SyncStore),
  providers: createProxy(store, ProviderStore),
  notifier: createProxy(store, NotifierStore),
  themes: createProxy(store, ThemeStore),
}
