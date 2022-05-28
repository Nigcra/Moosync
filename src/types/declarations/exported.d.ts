interface Album {
  album_id?: string
  album_name?: string
  album_coverPath_high?: string
  album_coverPath_low?: string
  album_song_count?: number
  album_artist?: string
  year?: number
}

interface Artists {
  artist_id: string
  artist_name?: string
  artist_mbid?: string
  artist_coverPath?: string
  artist_song_count?: number
}

interface Genre {
  genre_id: string
  genre_name: string
  genre_song_count: number
}

interface Playlist {
  playlist_id: string
  playlist_name: string
  playlist_desc?: string
  playlist_coverPath: string | undefined
  playlist_song_count?: number
  playlist_path?: string
  icon?: string
}

type PlayerTypes = 'LOCAL' | 'YOUTUBE' | 'SPOTIFY' | 'URL' | 'DASH'

interface Song {
  _id: string
  path?: string
  size?: number
  title: string
  song_coverPath_low?: string
  song_coverPath_high?: string
  album?: Album
  artists?: Artists[]
  date?: string
  year?: number
  genre?: string[]
  lyrics?: string
  releaseType?: string[]
  bitrate?: number
  codec?: string
  container?: string
  duration: number
  sampleRate?: number
  hash?: string
  inode?: string
  deviceno?: string
  url?: string
  playbackUrl?: string
  date_added: number
  providerExtension?: string
  icon?: string
  type: PlayerTypes
}

interface SearchableSong {
  _id?: string
  path?: string
  title?: string
  url?: string
  playbackUrl?: string

  // MD5 hash
  hash?: string

  type?: PlayerTypes

  // Will return all songs provided by this extension
  extension?: boolean | string
}

type PlayerState = 'PLAYING' | 'PAUSED' | 'STOPPED' | 'LOADING'

/**
 * Interface representing Queue of tracks
 */
interface SongQueue {
  /**
   * Data is a dictionary with unique songs. Song here won't be repeated
   */
  data: { [id: string]: Song }

  /**
   * Order is an array with songID corresponding to {@link SongQueue#data}
   * Items may be repeated
   */
  order: { id: string; songID: string }[]

  /**
   * Index of current playing song from {@link SongQueue#order}
   */
  index: number
}

interface ExtensionData {
  extensionDescriptors: ExtensionFactory[]
}

interface Checkbox {
  key: string
  title: string
  enabled: boolean
}

interface PathGroup {
  path: string
  enabled: boolean
}

interface Buttons {
  key: string
  title: string
  lastClicked: number
}

type ExtensionPreferenceGroup = {
  key: string
  title: string
  description: string
} & (
  | {
      type: 'CheckboxGroup'
      items: Checkbox[]
    }
  | {
      type: 'EditText'
      /**
       * Setting inputType to password will store the value as encrypted. It can be retrieved using getSecure
       */
      inputType?: 'text' | 'number' | 'password' | 'url'
      default: string
    }
  | {
      type: 'FilePicker'
      default: string
    }
  | {
      type: 'DirectoryGroup'
      default: PathGroup[]
    }
  | {
      type: 'ButtonGroup'
      items: Buttons[]
    }
  | {
      type: 'ProgressBar'
      default: number
    }
)

interface ExtensionFactory {
  // Return an instance of the plugin
  registerPreferences?(): Promise<ExtensionPreferenceGroup[]>

  /**
   * This method is necessary for the extension to be loaded into moosync
   */
  create(): Promise<MoosyncExtensionTemplate>
}

/**
 * Interface defining Moosync extension lifecycle hooks
 */
interface MoosyncExtensionTemplate {
  /**
   * Method fired when the extension is started
   */
  onStarted?(): Promise<void>

  /**
   * Method fired when the extension is stopped
   */
  onStopped?(): Promise<void>
}

/**
 * Sort by key in Song.
 * If asc is true then results will be sorted in ascending otherwise descending
 */
type SongSortOptions = { type: keyof Song; asc: boolean }

/**
 * Options for searching songs from Database
 * To search for all tracks with a specific term, surround the term with %.
 * Eg. if the term is 'aaa', to get all songs containing 'aaa' in the title,
 * put the term as '%aaa%' in 'song.title'.
 */
interface SongAPIOptions {
  /**
   * To search tracks by properties in song, specify this property.
   */
  song?: SearchableSong

  /**
   * To search tracks by properties in album, specify this property.
   */
  album?: Partial<Album>

  /**
   * To search tracks by properties in artists, specify this property.
   */
  artist?: Partial<Artists>

  /**
   * To search tracks by properties in genre, specify this property.
   */
  genre?: Partial<Genre>

  /**
   * To search tracks by properties in playlist, specify this property.
   */
  playlist?: Partial<Playlist>

  /**
   * To sort the results, specify this property
   */
  sortBy?: SongSortOptions

  /**
   * If false, then the exact match of all options will be provided.
   * If true, then even if a track matches one of the options, it will be returned.
   * In terms of SQL, true will add 'AND' between where queries and false will add 'OR'.
   *
   * Eg. If song.title is 'aaa' and album.album_name is 'bbb'
   *
   * In this scenario if inclusive is false, then all tracks having title as 'aaa'
   * AND album_name as 'bbb' will be returned
   *
   * If inclusive is false then songs having title as 'aaa' OR album_name as 'bbb' will be returned
   */
  inclusive?: boolean
}

/**
 * Options for searching entities like Albums, Artists, Playlists or Genre
 *
 */
type EntityApiOptions = {
  /**
   * If false, then the exact match of all options will be provided.
   * If true, then even if an entity matches one of the options, it will be returned.
   * In terms of SQL, true will add 'AND' between where queries and false will add 'OR'.
   *
   * Eg. If album.album_name is 'aaa' and album.album_id is 'bbb'
   *
   * In this scenario if inclusive is false, then all albums having album_name as 'aaa'
   * AND album_id as 'bbb' will be returned
   *
   * If inclusive is false then albums having album_name as 'aaa' OR album_id as 'bbb' will be returned
   */
  inclusive?: boolean
} & (
  | {
      album: Partial<Album> | boolean
    }
  | {
      artist: Partial<Artists> | boolean
    }
  | {
      genre: Partial<Genre> | boolean
    }
  | {
      playlist: Partial<Playlist> | boolean
    }
)

/**
 * Methods to control the audio player in Moosync
 */
interface playerControls {
  /**
   * Start playing the loaded track
   */
  play(): Promise<void>

  /**
   * Pause the track
   */
  pause(): Promise<void>

  /**
   * Unload the audio from player
   */
  stop(): Promise<void>

  /**
   * Stop current track and load next track in queue
   */
  nextSong(): Promise<void>

  /**
   * Stop current track and load previous track in queue
   */
  prevSong(): Promise<void>
}

type ExtraExtensionEventTypes =
  | 'requestedPlaylists'
  | 'requestedPlaylistSongs'
  | 'oauthCallback'
  | 'songQueueChanged'
  | 'seeked'
  | 'volumeChanged'
  | 'playerStateChanged'
  | 'songChanged'
  | 'preferenceChanged'
  | 'playbackDetailsRequested'
  | 'customRequest'
  | 'requestedSongFromURL'
  | 'requestedPlaylistFromURL'
  | 'requestSearchResult'
  | 'requestedRecommendations'
  | 'requestedLyrics'

type ExtraExtensionEventReturnType<T extends ExtraExtensionEventTypes> = T extends 'requestedPlaylists'
  ? GetPlaylistReturnType | void
  : T extends 'requestedPlaylistSongs'
  ? GetPlaylistSongsReturnType | void
  : T extends 'playbackDetailsRequested'
  ? GetPlaybackDetailsReturnType | void
  : T extends 'customRequest'
  ? CustomRequestReturnType | void
  : T extends 'requestedSongFromURL'
  ? GetSongReturnType | void
  : T extends 'requestedPlaylistFromURL'
  ? GetPlaylistAndSongsReturnType | void
  : T extends 'requestSearchResult'
  ? GetSearchReturnType | void
  : T extends 'requestedRecommendations'
  ? GetRecommendationsReturnType | void
  : T extends 'requestedLyrics'
  ? string | void
  : void

type ExtraExtensionEventData<T extends ExtraExtensionEventTypes> = T extends 'requestedPlaylistSongs'
  ? [playlistID: string, invalidateCache: boolean]
  : T extends 'requestedPlaylists'
  ? [invalidateCache: boolean]
  : T extends 'oauthCallback'
  ? [url: string]
  : T extends 'songQueueChanged'
  ? [songQueue: SongQueue]
  : T extends 'seeked'
  ? [newTime: number]
  : T extends 'volumeChanged'
  ? [newVolume: number]
  : T extends 'playerStateChanged'
  ? [newState: PlayerState]
  : T extends 'songChanged'
  ? [song: Song]
  : T extends 'preferenceChanged'
  ? [preference: { key: string; value: unknown }]
  : T extends 'playbackDetailsRequested'
  ? [song: Song]
  : T extends 'customRequest'
  ? [url: string]
  : T extends 'requestedSongFromURL'
  ? [url: string]
  : T extends 'requestedPlaylistFromURL'
  ? [url: string]
  : T extends 'requestSearchResult'
  ? [term: string]
  : T extends 'requestedLyrics'
  ? [song: Song]
  : []

type GetPlaylistReturnType = {
  playlists: Playlist[]
}

type GetPlaylistSongsReturnType = {
  songs: Song[]
}

type GetPlaybackDetailsReturnType = {
  duration: number
  url: string
}

type CustomRequestReturnType = {
  mimeType: string
  data: Buffer
}

type GetSongReturnType = {
  song: Song
}

type GetPlaylistAndSongsReturnType = {
  playlist: Playlist
  songs: Song[]
}

type GetSearchReturnType = {
  providerName: string
  songs: Song[]
}

type GetRecommendationsReturnType = {
  providerName: string
  songs: Song[]
}

type ExtensionContextMenuItem<T extends ContextMenuTypes> = {
  type: T
  label: string
  disabled?: boolean
  children?: ExtensionContextMenuItem<T>[]
  handler?: (arg: ExtensionContextMenuHandlerArgs<T>) => void
}

type ContextMenuTypes =
  | 'SONGS'
  | 'GENERAL_SONGS'
  | 'PLAYLIST'
  | 'GENERAL_PLAYLIST'
  | 'PLAYLIST_CONTENT'
  | 'QUEUE_ITEM'
  | 'ARTIST'
  | 'ALBUM'

type ExtensionContextMenuHandlerArgs<T extends ContextMenuTypes> = T extends 'SONGS'
  ? Song[]
  : T extends 'PLAYLIST'
  ? Playlist
  : T extends 'PLAYLIST_CONTENT'
  ? Song[]
  : T extends 'QUEUE_ITEM'
  ? Song
  : T extends 'ARTIST'
  ? Artists
  : T extends 'ALBUM'
  ? Album
  : undefined

type AccountDetails = {
  id: string
  packageName: string
  name: string
  bgColor: string
  icon: string
  loggedIn: boolean
  signinCallback: () => Promise<void> | void
  signoutCallback: () => Promise<void> | void
  username?: string
}

type LoginModalData = {
  providerName: string
  providerColor: string
  text?: string
  url?: string
} & (
  | {
      manualClick: true
      oauthPath: string
    }
  | {
      manualClick?: false
      oauthPath?: string
    }
)

interface extensionAPI {
  /**
   * Get songs from database filtered by provided options
   * @param options filter the results
   */
  getSongs(options: SongAPIOptions): Promise<Song[] | undefined>

  /**
   * Get the current playing track. Undefined if no track is playing
   */
  getCurrentSong(): Promise<Song | undefined>

  /**
   * Get state of music player. Undefined is player is broken and audio can't be loaded
   */
  getPlayerState(): Promise<PlayerState | undefined>

  /**
   * Get volume directly from the audio player
   */
  getVolume(): Promise<number | undefined>

  /**
   * Get current time of the player.
   */
  getTime(): Promise<number | undefined>

  /**
   * Get the queue of tracks
   */
  getQueue(): Promise<SongQueue | undefined>

  /**
   * Fetch preferences by key. If no key is provided, all preferences
   * co-relating to current extension will be fetched.
   *
   * @param key key of preference to fetch. keys within complex objects can be separated by .
   * @param defaultValue If the provided key is not found, then default value will be returned.
   */
  getPreferences<T>(key?: string, defaultValue?: unknown): Promise<T | undefined>

  /**
   * Set preference by key.
   * @param key key separated by '.'
   * @param value value to be stored for corresponding key
   */
  setPreferences(key: string, value: unknown): Promise<void>

  /**
   * Get decrypted value of an encrypted preference
   * @param key key of preference to fetch. keys within complex objects can be separated by .
   * @param defaultValue If the provided key is not found, then default value will be returned.
   */
  getSecure<T>(key: string, defaultValue?: unknown): Promise<T | undefined>

  /**
   * Encrypt value and store in preferences
   * @param key key separated by '.'
   * @param value value to be stored for corresponding key
   */
  setSecure(key: string, value: unknown): Promise<void>

  /**
   * Add songs to library
   * @param songs 1 or more songs that are to be added to library
   * @returns array of booleans with same index as song. True means song has been added successfully
   */
  addSongs(...songs: Song[]): Promise<boolean[] | undefined>

  /**
   * Remove song from library
   * @param song_id id of song to remove
   */
  removeSong(song_id: string): Promise<void>

  /**
   * Add playlist to library
   * @param playlist details of playlist which is to be added to library
   * @returns ID of playlist which has been added
   */
  addPlaylist(playlist: Omit<Playlist, 'playlist_id'>): Promise<string>

  /**
   * Add songs to playlist in library. The song must also exist in the library
   * @param playlistID ID of playlist in which songs are to be added
   * @param songs Songs which are to be added in the playlist
   */
  addSongsToPlaylist(playlistID: string, ...songs: Song[]): Promise<void>

  /**
   * Register a callback for Oauth on given path. This OAuth can be triggered by calling the url
   * moosync://{path}
   * If the path matches, the whole URL is passed to this extension.
   * @param path path on which the callback will be triggered
   */
  registerOAuth(path: string): Promise<void>

  /**
   * Open a url in system browser
   * @param url string corresponding to URL which is to be opened
   */
  openExternalURL(url: string): Promise<void>

  /**
   * Event fired when playlists are requested by the user
   * The callback should return and result playlists or undefined
   */
  on(
    eventName: 'requestedPlaylists',
    callback: (invalidateCache: boolean) => Promise<GetPlaylistReturnType | void>
  ): void

  /**
   * Event fired when songs of a single playlist are requested by the user
   * The callback should return result songs or undefined
   */
  on(
    eventName: 'requestedPlaylistSongs',
    callback: (playlistID: string, invalidateCache: boolean) => Promise<GetPlaylistSongsReturnType | void>
  ): void

  /**
   * Event fired when moosync is passed url containing registered oauth channel name
   * Oauth channel should be registered using {@link registerOAuth}
   */
  on(eventName: 'oauthCallback', callback: (url: string) => Promise<void>): void

  /**
   * Event fired when song queue changes order or new song is added or removed
   */
  on(eventName: 'songQueueChanged', callback: (songQueue: SongQueue) => Promise<void>): void

  /**
   * Event fired when user seeks player manually
   */
  on(eventName: 'seeked', callback: (newTime: number) => Promise<void>): void

  /**
   * Event fired when user changes volume
   */
  on(eventName: 'volumeChanged', callback: (newVolume: number) => Promise<void>): void

  /**
   * Event fired when player changes state to / from paused, stopped, playing, loading
   */
  on(eventName: 'playerStateChanged', callback: (newState: PlayerState) => Promise<void>): void

  /**
   * Event fired when new song is loaded into player
   */
  on(eventName: 'songChanged', callback: (song: Song) => Promise<void>): void

  /**
   * Event fired when preferences corresponding to the extension are changed
   */
  on(eventName: 'preferenceChanged', callback: (preference: { key: string; value: unknown }) => Promise<void>): void

  /**
   * Event fired when song provided by the extension lacks {@link Song.playbackUrl} or {@link Song.duration}
   * Callback should return both playbackUrl and duration even if only either is missing or undefined.
   *
   * Can be used to dynamically provide playbackUrl and/or duration
   */
  on(
    eventName: 'playbackDetailsRequested',
    callback: (song: Song) => Promise<GetPlaybackDetailsReturnType | void>
  ): void

  /**
   * Event fired when custom url corresponding to the extension is called
   * Callback should return data as buffer and mimetype for the same  or undefined
   *
   * if an url ```extension://moosync.extension.packageName/testData``` is provided to Moosync. When the url is fetched,
   * this event will be triggered and custom data can be provided at runtime
   *
   * @example
   * const song: Song = {
   *  ...,
   *  song_coverPath_high: 'extension://moosync.extension.packageName/coverPathUrl',
   *  ...
   *  playbackUrl: 'extension://moosync.extension.packageName/testData'
   * }
   */
  on(eventName: 'customRequest', callback: (url: string) => Promise<CustomRequestReturnType | void>): void

  /**
   * Event fired when user enters url in 'Add song from URL' modal
   * Callback should return parsed song or undefined
   */
  on(eventName: 'requestedSongFromURL', callback: (url: string) => Promise<GetSongReturnType | void>): void

  /**
   * Event fired when user enters url in 'Add playlist from URL' modal
   * Callback should return a playlist and parsed songs in that playlist or undefined
   */
  on(
    eventName: 'requestedPlaylistFromURL',
    callback: (url: string) => Promise<GetPlaylistAndSongsReturnType | void>
  ): void

  /**
   * Event fired when user searches a term in search page
   * Callback should return a providerName and result songs or undefined
   */
  on(eventName: 'requestSearchResult', callback: (term: string) => Promise<GetSearchReturnType | void>): void

  /**
   * Event fired when user opens Explore page
   * Callback should return a providerName and result songs or undefined
   */
  on(eventName: 'requestedRecommendations', callback: () => Promise<GetRecommendationsReturnType | void>): void

  /**
   * Event fired when lyrics are requested for a song
   * Callback should return a string (HTML formatting) with lyrics or undefined
   */
  on(eventName: 'requestedLyrics', callback: (song: Song) => Promise<string | void>): void

  /**
   * Register extra events callbacks. At any time only one callback can be assigned to one event
   *
   * @param eventName Name of event
   * @param callback Callback fired when event is emitted
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  on(eventName: string, callback: Function): void

  /**
   * Remove callbacks from extra events
   * @param eventName name of event whose callback is to be removed
   */
  off<T extends ExtraExtensionEventTypes>(eventName: T): void

  /**
   * Adds new context menu item/s
   * @param item New menu item to show in context menu
   */
  setContextMenuItem<T extends ContextMenuTypes>(...item: ExtensionContextMenuItem<T>[]): void

  /**
   * Remove an item from context menu
   * @param index index of context menu item which is to be removed
   */
  removeContextMenuItem(index: number): void

  /**
   * Get all registered context menu items
   */
  getContextMenuItems(): ExtensionContextMenuItem<ContextMenuTypes>[]

  /**
   * Add an account to show in accounts section in main app.
   * The user will then be able to perform login / logout operations on this account
   * and also view its details
   *
   * @param name name of service provider
   * @param bgColor background color to use for account card (in hex format. Eg. #000000)
   * @param icon icon of account (preferably service provider's icon)
   * @param signinCallback callback fired when user wishes to login
   * @param signoutCallback callback fired when user wishes to logout
   * @returns generated accountId
   */
  registerAccount(
    name: string,
    bgColor: string,
    icon: string,
    signinCallback: AccountDetails['signinCallback'],
    signoutCallback: AccountDetails['signoutCallback']
  ): Promise<string>

  /**
   * Change login status and signed in user's account name.
   *
   * @param id accountId to change details of. Returned from {@link registerAccount}
   * @param loggedIn true if user is logged in otherwise false
   * @param accountName name of user's account if logged in otherwise undefined
   */
  changeAccountAuthStatus(id: string, loggedIn: boolean, username?: string): Promise<void>

  openLoginModal(data: LoginModalData): Promise<boolean>
  closeLoginModal(): Promise<void>

  /**
   * Object containing controls for player
   */
  player: playerControls
}