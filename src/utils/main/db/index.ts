/* 
 *  index.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { EntityApiOptions, SongAPIOptions } from '@moosync/moosync-types';

import { DBUtils } from './utils'
import { promises as fsP } from 'fs'
import { v4 } from 'uuid'

type KeysOfUnion<T> = T extends T ? keyof T : never;
// AvailableKeys will basically be keyof Foo | keyof Bar 
// so it will be  "foo" | "bar"
type EntityKeys = KeysOfUnion<EntityApiOptions>;

class SongDBInstance extends DBUtils {
  /* ============================= 
                ALLSONGS
     ============================= */

  public async store(newDoc: Song): Promise<void> {
    const artistID = newDoc.artists ? this.storeArtists(...newDoc.artists) : []
    const albumID = newDoc.album ? this.storeAlbum(newDoc.album) : ''
    const genreID = this.storeGenre(newDoc.genre)
    const marshaledSong = this.marshalSong(newDoc)
    if (this.db.query(`SELECT _id from allsongs WHERE _id = ?`, marshaledSong._id).length === 0) {
      this.db.insert('allsongs', marshaledSong)
      this.storeArtistBridge(artistID, marshaledSong._id)
      this.storeGenreBridge(genreID, marshaledSong._id)
      this.storeAlbumBridge(albumID, marshaledSong._id)
    }
    return
  }

  private getCountBySong(bridge: string, column: string, song: string) {
    const data = this.db.query(`SELECT ${column} FROM ${bridge} WHERE song = ?`, song) as any[]
    const counts = []
    for (const i of data) {
      counts.push(...this.db.query(`SELECT count(id) as count, ${column} FROM ${bridge} WHERE ${column} = ?`, i[column]))
    }

    return counts
  }

  /**
   * Removes song by its ID. Also removes references to albums, artists, genre, playlist and unlinks thumbnails.
   * @param song_id id of song to remove
   */
  public async removeSong(song_id: string) {
    const pathsToRemove: string[] = []
    this.db.transaction((song_id: string) => {
      const album_ids = this.getCountBySong('album_bridge', 'album', song_id)
      const artist_ids = this.getCountBySong('artists_bridge', 'artist', song_id)

      const songCoverPath_low = this.db.queryFirstCell(`SELECT song_coverPath_low from allsongs WHERE _id = ?`, song_id)
      const songCoverPath_high = this.db.queryFirstCell(`SELECT song_coverPath_high from allsongs WHERE _id = ?`, song_id)

      if (songCoverPath_low) pathsToRemove.push(songCoverPath_low)
      if (songCoverPath_high) pathsToRemove.push(songCoverPath_high)

      this.db.delete('artists_bridge', { song: song_id })
      this.db.delete('album_bridge', { song: song_id })
      this.db.delete('genre_bridge', { song: song_id })
      this.db.delete('playlist_bridge', { song: song_id })
      this.db.delete('allsongs', { _id: song_id })

      for (const id of album_ids) {
        if (id.count === 1) {
          const album: Album = (this.getEntityByOptions({
            album: {
              album_id: id.album
            }
          }) as Album[])[0]
          this.db.delete('albums', { album_id: id.album })
          if (album?.album_coverPath_low) pathsToRemove.push(album.album_coverPath_low)
          if (album?.album_coverPath_high) pathsToRemove.push(album.album_coverPath_high)
        }
      }

      for (const id of artist_ids) {
        if (id.count === 1) {
          const artist = (this.getEntityByOptions({
            artist: {
              artist_id: id.artist
            }
          }) as artists[])[0]
          this.db.delete('artists', { artist_id: id.artist })
          if (artist?.artist_coverPath) pathsToRemove.push(artist.artist_coverPath)
        } else {
          console.log((artist_ids))
        }
      }
    }).immediate(song_id)

    for (const path of pathsToRemove) {
      await fsP.rm(path, { force: true })
    }
  }

  /**
   * Search every entity for matching keyword
   * @param term term to search
   * @param exclude path to exclude from search
   * @returns SearchResult consisting of songs, albums, artists, genre
   */
  public searchAll(term: string, exclude?: string[]): SearchResult {
    const songs = this.getSongByOptions({
      song: {
        path: term
      }
    }, exclude)

    const albums: Album[] = this.getEntityByOptions({
      album: {
        album_name: term
      }
    })

    const artists: artists[] = this.getEntityByOptions({
      artist: {
        artist_name: term
      }
    })

    const genre: Genre[] = this.getEntityByOptions({
      genre: {
        genre_name: term
      }
    })

    return { songs: songs, albums: albums, artists: artists, genres: genre }
  }

  private populateWhereQuery(options?: SongAPIOptions) {
    if (options) {
      let where = 'WHERE '
      const args: string[] = []
      let isFirst = true

      const addANDorOR = () => {
        const str = (!isFirst ? ((options.inclusive ? 'AND' : 'OR')) : '')
        isFirst = false
        return str
      }

      for (const [key, _] of Object.entries(options)) {
        if (key !== 'inclusive' && key !== 'sortBy') {
          const tableName = this.getTableByProperty(key as keyof SongAPIOptions)
          for (const [innerKey, innerValue] of Object.entries(options[key as keyof SongAPIOptions]!)) {
            where += `${addANDorOR()} ${tableName}.${innerKey} LIKE ?`
            args.push(`%${innerValue}%`)
          }
        }
      }

      if (args.length === 0) {
        return { where: '', args: [] }
      }

      return { where, args }
    }
    return { where: '', args: [] }
  }

  private addOrderClause(sortBy?: sortOptions) {
    if (sortBy) {
      return `ORDER BY ${sortBy.type === 'name' ? 'title' : 'date_added'} ${sortBy.asc ? 'ASC' : 'DESC'}`
    }
    return ''
  }

  /**
   * Gets song by options 
   * @param [options] SongAPIOptions to search by
   * @param [exclude] paths to exclude from result
   * @returns list of songs matching the query
   */
  public getSongByOptions(options?: SongAPIOptions, exclude?: string[]): Song[] {
    const { where, args } = this.populateWhereQuery(options)

    const songs: marshaledSong[] = this.db.query(
      `SELECT *, ${this.addGroupConcatClause()} FROM allsongs
      ${this.addLeftJoinClause(undefined, 'allsongs')}
        ${where}
        ${this.addExcludeWhereClause(args.length === 0, exclude)} GROUP BY allsongs._id ${this.addOrderClause(options?.sortBy)}`,
      ...args
    )
    return this.batchUnmarshal(songs)
  }

  private getTableByProperty(key: string) {
    switch (key) {
      case 'song':
        return 'allsongs'
      case 'album':
        return 'albums'
      case 'artist':
        return 'artists'
      case 'genre':
        return 'genre'
      case 'playlist':
        return 'playlists'
    }
  }

  private getTitleColByProperty(key: string) {
    switch (key) {
      case 'song':
        return 'title'
      case 'album':
        return 'album_name'
      case 'artist':
        return 'artist_name'
      case 'genre':
        return 'genre_name'
      case 'playlist':
        return 'playlist_name'
    }
  }

  /**
   * Get album, genre, playlist, artists by options
   * @param options EntityApiOptions to search by
   * @returns 
   */
  public getEntityByOptions<T>(options: EntityApiOptions): T[] {
    let isFirst = true
    const addANDorOR = () => {
      const str = (!isFirst ? ((options.inclusive ? 'AND' : 'OR')) : '')
      isFirst = false
      return str
    }

    let query = `SELECT * FROM `
    let where = `WHERE `
    const args = []
    let orderBy
    for (const [key, value] of Object.entries(options)) {
      const tableName = this.getTableByProperty(key as EntityKeys)
      if (tableName) {
        query += `${tableName} `
        orderBy = `${tableName}.${this.getTitleColByProperty(key as EntityKeys)}`

        if (typeof value === 'boolean' && value === true) {
          break
        }

        if (typeof value === 'object') {
          for (const [innerKey, innerValue] of Object.entries(options[key as keyof EntityApiOptions]!)) {
            where += `${addANDorOR()} ${innerKey} LIKE ?`
            args.push(innerValue)
          }
          break
        }
      }
    }
    return this.db.query(`${query} ${args.length > 0 ? where : ''} ORDER BY ${orderBy} ASC`, ...args) as T[]
  }

  /**
   * Get song matching the md5 hash
   * @param hash md5 hash
   * @returns Song
   */
  public getByHash(hash: string) {
    return this.db.queryFirstRow(`SELECT * FROM allsongs WHERE hash = ?`, hash)! as Song
  }

  /**
   * Update cover image of song by id
   * @param id id of song to update cover image
   * @param coverHigh high resolution cove image path
   * @param coverLow low resolution cove image path
   */
  public updateSongCover(id: string, coverHigh: string, coverLow: string) {
    this.db.update('allsongs', {
      song_coverPath_high: coverHigh,
      song_coverPath_low: coverLow
    }, ['_id = ?', id])
  }

  /* ============================= 
                ALBUMS
     ============================= */

  private storeAlbum(album: Album): string {
    let id: string | undefined
    if (album.album_name) {
      id = this.db.queryFirstCell(
        `SELECT album_id FROM albums WHERE album_name = ? COLLATE NOCASE`,
        album.album_name.trim()
      )
      if (!id) {
        id = v4()
      }
      this.db.run(`INSERT OR REPLACE INTO albums (album_id, album_name, album_coverPath_low, album_coverPath_high, album_artist) VALUES(?, ?, ?, ?, ?)`, id, album.album_name, album.album_coverPath_low, album.album_coverPath_high, album.album_artist)
    }
    return id as string
  }

  /**
  * Updates album covers by song_id
  * @param songid id of the song belonging to the album whose cover is to be updated
  * @param coverHigh high resolution cover path
  * @param coverLow low resolution cover path
  */
  public updateAlbumCovers(songid: string, coverHigh: string, coverLow: string) {
    this.db.transaction((songid, newHigh, newLow) => {
      const { album_id } = this.db.queryFirstRowObject(`SELECT album as album_id FROM album_bridge WHERE song = ?`, songid) as { album_id: string }
      if (album_id) {
        const { high, low } = this.db.queryFirstRowObject(`SELECT album_coverPath_high as high, album_coverPath_low as low from albums WHERE album_id = ?`, album_id) as { high: string, low: string }
        console.log(high, low)

        if (!high) {
          this.db.update('albums', { album_coverPath_high: newHigh }, ['album_id = ?', album_id])
        }

        if (!low) {
          this.db.update('albums', { album_coverPath_low: newLow }, ['album_id = ?', album_id])
        }
      }
    })(songid, coverHigh, coverLow)
  }

  /**
   * Updates song count of all albums
   */
  public updateSongCountAlbum() {
    this.db.transaction(() => {
      for (const row of this.db.query(`SELECT album_id FROM albums`)) {
        this.db.run(
          `UPDATE albums SET album_song_count = (SELECT count(id) FROM album_bridge WHERE album = ?) WHERE album_id = ?`,
          (row as Album).album_id,
          (row as Album).album_id
        )
      }
    })()
  }

  private storeAlbumBridge(albumID: string, songID: string) {
    if (albumID) this.db.insert('album_bridge', { song: songID, album: albumID })
  }

  /* ============================= 
                GENRE
     ============================= */

  /**
   * Updates song count of all genres
   */
  public updateSongCountGenre() {
    this.db.transaction(() => {
      for (const row of this.db.query(`SELECT genre_id FROM genre`)) {
        this.db.run(
          `UPDATE genre SET genre_song_count = (SELECT count(id) FROM genre_bridge WHERE genre = ?) WHERE genre_id = ?`,
          (row as Genre).genre_id,
          (row as Genre).genre_id
        )
      }
    })()
  }

  private storeGenre(genre?: string[]) {
    const genreID: string[] = []
    if (genre) {
      for (const a of genre) {
        const id = this.db.queryFirstCell(`SELECT genre_id FROM genre WHERE genre_name = ? COLLATE NOCASE`, a)
        if (id) genreID.push(id)
        else {
          const id = v4()
          this.db.insert('genre', { genre_id: id, genre_name: a })
          genreID.push(id)
        }
      }
    }
    return genreID
  }

  private storeGenreBridge(genreID: string[], songID: string) {
    for (const i of genreID) {
      this.db.insert('genre_bridge', { song: songID, genre: i })
    }
  }

  /* ============================= 
                ARTISTS
     ============================= */

  /**
   * Updates artists details
   * artist_id and artist_name are not updated
   * artist is queried by artist_id
   * @param artist artist with updated details. 
   * 
   * @returns number of rows updated
   */
  public async updateArtists(artist: artists) {
    return new Promise((resolve) => {
      resolve(
        this.db.updateWithBlackList(
          'artists',
          artist,
          ['artist_id = ?', artist.artist_id],
          ['artist_id', 'artist_name']
        )
      )
    })
  }

  private storeArtists(...artists: string[]): string[] {
    const artistID: string[] = []
    for (const a of artists) {
      const id = this.db.queryFirstCell(`SELECT artist_id FROM artists WHERE artist_name = ? COLLATE NOCASE`, a.trim())
      if (id) artistID.push(id)
      else {
        const id = v4()
        this.db.insert('artists', { artist_id: id, artist_name: a.trim() })
        artistID.push(id)
      }
    }
    return artistID
  }

  private storeArtistBridge(artistID: string[], songID: string) {
    for (const i of artistID) {
      this.db.insert('artists_bridge', { song: songID, artist: i })
    }
  }

  /**
   * Gets default cover for artist
   * Queries the albums belonging to songs by the artist for cover image
   * @param id of artist whose default cover image is required
   * @returns high resolution cover image for artist
   */
  public async getDefaultCoverByArtist(id: string): Promise<string | undefined> {
    return (this.db.queryFirstRow(
      `SELECT album_coverPath_high from albums WHERE album_id = (SELECT album FROM album_bridge WHERE song = (SELECT song FROM artists_bridge WHERE artist = ?))`,
      id
    ) as marshaledSong)?.album_coverPath_high
  }

  /**
   * Updates song count of all genres
   */
  public updateSongCountArtists() {
    this.db.transaction(() => {
      for (const row of this.db.query(`SELECT artist_id FROM artists`)) {
        this.db.run(
          `UPDATE artists SET artist_song_count = (SELECT count(id) FROM artists_bridge WHERE artist = ?) WHERE artist_id = ?`,
          (row as artists).artist_id,
          (row as artists).artist_id
        )
      }
    })()
  }

  /* ============================= 
                PLAYLISTS
     ============================= */

  /**
   * Creates playlist
   * @param name name of playlist
   * @param desc description of playlist
   * @param imgSrc cover image of playlist
   * @returns playlist id after creation
   */
  public async createPlaylist(name: string, desc: string, imgSrc: string): Promise<string> {
    const id = v4()
    this.db.insert('playlists', { playlist_id: id, playlist_name: name, playlist_desc: desc, playlist_coverPath: imgSrc })
    return id
  }

  /**
   * Updates playlist cover path
   * @param playlist_id id of playlist whose cover is to be updated
   * @param coverPath hig resolution cover path 
   */
  public updatePlaylistCoverPath(playlist_id: string, coverPath: string) {
    this.db.update('playlists', { playlist_coverPath: coverPath }, ['playlist_id = ?', playlist_id])
  }

  private isPlaylistCoverExists(playlist_id: string) {
    return (
      (this.db.query(`SELECT playlist_coverPath FROM playlists WHERE playlist_id = ?`, playlist_id)[0] as Playlist)
        .playlist_coverPath !== null
    )
  }

  /**
   * Adds songs to playlist
   * @param playlist_id id of playlist where songs are to be added
   * @param songs songs which are to be added to playlist
   */
  public async addToPlaylist(playlist_id: string, ...songs: Song[]) {
    // TODO: Regenerate cover instead of using existing from song
    const coverExists = this.isPlaylistCoverExists(playlist_id)
    this.db.transaction((songs: Song[]) => {
      for (const s of songs) {
        if (!coverExists) {
          if (s.album?.album_coverPath_high) {
            this.updatePlaylistCoverPath(playlist_id, s.album.album_coverPath_high)
          }
        }
        this.db.insert('playlist_bridge', { playlist: playlist_id, song: s._id })
      }
    })(songs)
    this.updateSongCountPlaylists()
  }

  /**
   * Removes song from playlist
   * @param playlist id of playlist from which song is to be removed
   * @param songs songs which are to be removed
   */
  public async removeFromPlaylist(playlist: string, ...songs: string[]) {
    this.db.transaction((songs: string[]) => {
      for (const s in songs) {
        this.db.delete('playlist_bridge', { playlist: playlist, song: s })
      }
    })(songs)
    this.updateSongCountPlaylists()
  }

  /**
   * Updates song count of all playlists
   */
  public updateSongCountPlaylists() {
    this.db.transaction(() => {
      for (const row of this.db.query(`SELECT playlist_id FROM playlists`)) {
        this.db.run(
          `UPDATE playlists SET playlist_song_count = (SELECT count(id) FROM playlist_bridge WHERE playlist = ?) WHERE playlist_id = ?`,
          (row as Playlist).playlist_id,
          (row as Playlist).playlist_id
        )
      }
    })()
  }

  /**
   * Removes playlist
   * @param playlist_id id of playlist to be removed
   */
  public async removePlaylist(playlist_id: string) {
    this.db.delete('playlist_bridge', { playlist: playlist_id })
    this.db.delete('playlists', { playlist_id: playlist_id })
  }
}

export const SongDB = new SongDBInstance()