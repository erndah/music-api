/* eslint-disable camelcase *//* eslint-disable linebreak-style */
/* eslint-disable no-underscore-dangle */
const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');
const ClientError = require('../../exceptions/ClientError');

class PlaylistsService {
  constructor(collaborationService, activitiesService) {
    this._pool = new Pool();
    this._collaborationService = collaborationService;
    this._activitiesService = activitiesService;
  }

  async addPlaylist({ name, owner }) {
    const id = `playlist-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3) RETURNING id',
      values: [id, name, owner],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }
    const songId = '-';
    const action = 'Create Playlist';
    await this._activitiesService.addActivity(id, songId, owner, action);

    return result.rows[0].id;
  }

  async getPlaylists(owner) {
    const queryCollab = {
      text: 'SELECT playlist_id from collaborations where user_id = $1',
      values: [owner],
    };
    const result2 = await this._pool.query(queryCollab);

    let playlistId = '';
    if (result2.rows.length) {
      const result = result2.rows[0].playlist_id;
      playlistId = result;
    }
    const query = {
      text: `SELECT playlists.id, playlists.name, users.username FROM playlists
      LEFT JOIN users ON users.id = playlists.owner WHERE owner = $1 or playlists.id = $2`,
      values: [owner, playlistId],
    };

    const result = await this._pool.query(query);
    return result.rows;
  }

  async deletePlaylistById(playlistId) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id',
      values: [playlistId],
    };
    await this._activitiesService.deleteActivity(playlistId);
    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('-- Lagu gagal dihapus. Id tidak ada');
    }
  }

  async addSongToPlaylist(song_id, playlist_id, credentialId) {
    const id = `playlist_song-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlistsongs VALUES($1, $2, $3) RETURNING id',
      values: [id, playlist_id, song_id],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Gagal menambahkan lagu ke dalam playlist');
    }
    const action = 'add';
    const userId = credentialId;

    await this._activitiesService.addActivity(playlist_id, song_id, userId, action);
    return result.rows[0].id;
  }

  async getPlaylistSong(id, owner) {
    const playlistId = id;

    const query1 = {
      text: `SELECT playlists.id, playlists.name, users.username FROM playlists
      INNER JOIN users ON users.id = playlist.owner WHERE playlists.id = $3 OR owner = $1 and playlists.id = $2`,
      values: [owner, id, playlistId],
    };

    const query2 = {
      text: `SELECT song.id, song.title, song.performer FROM song
      LEFT JOIN playlistsongs ON playlistsong.song_id = song.id
      WHERE playlistsongs.playlist_id = $1 or playlistsongs.playlist_id = $2`,
      values: [id, playlistId],
    };

    const result = await this._pool.query(query1);
    const song = await this._pool.query(query2);

    const listsong = {
      ...result.rows[0],
      song: [
        ...song.rows],
    };

    if (!result.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    return listsong;
  }

  async deleteSongFromPlaylist(id, playlistId, credentialId) {
    const query = {
      text: 'DELETE FROM playlistsongs WHERE song_id = $1 AND playlist_id = $2 RETURNING id',
      values: [id, playlistId],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new ClientError('---- Lagu gagal dihapus. Id tidak ada');
    }
    const action = 'delete';
    const songId = id;
    const userId = credentialId;

    await this._activitiesService.addActivity(playlistId, songId, userId, action);
  }

  async verifyPlaylistOwner(playlistId, userId) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [playlistId],
    };
    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('2 Playlist tidak ditemukan');
    }
    const playlist = result.rows[0];
    if (playlist.owner !== userId) {
      throw new AuthorizationError('Tidak memiliki hak untuk mengakses');
    }
  }

  async verifySongId(id) {
    const query = {
      text: 'select * from song where id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError(' not found');
    }
  }

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      try {
        await this._collaborationService.verifyCollaborator(playlistId, userId);
      } catch {
        throw error;
      }
    }
  }
}

module.exports = PlaylistsService;
