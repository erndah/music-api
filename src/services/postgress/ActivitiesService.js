/* eslint-disable linebreak-style */
/* eslint-disable no-underscore-dangle */
const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');

class ActivitiesService {
  constructor() {
    this._pool = new Pool();
  }

  async addActivity(playlistId, songId, userId, action) {
    const id = `activities-${nanoid(16)}`;

    const time = new Date().toISOString();

    const query = {
      text: 'INSERT INTO playlist_activities VALUES($1, $2, $3, $4, $5, $6) RETURNING id',
      values: [id, playlistId, songId, userId, action, time],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new InvariantError('Activity gagal ditambahkan');
    }
    return result.rows[0].id;
  }

  async deleteActivity(playlistId, credentialId) {
    const query = {
      text: 'DELETE FROM playlist_activities WHERE playlist_id = $1 RETURNING id',
      values: [playlistId, credentialId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new InvariantError('Activity gagal dihapus');
    }
  }

  async getActivities(playlistId) {
    const query1 = {
      text: `SELECT playlist_id FROM playlist_activities
      WHERE playlist_id = $1 GROUP BY playlist_id`,
      values: [playlistId],
    };

    const query2 = {
      text: `SELECT users.username, songs.title, playlist_activities.action, playlist_activities.time 
      FROM ((playlist_activities 
        INNER JOIN users on users.id = playlist_activities.user_id)
        INNER JOIN songs on songs.id = playlist_activities.song_id) WHERE playlist_activities.playlist_id = $1`,
      values: [playlistId],
    };

    const result = await this._pool.query(query1);

    const activities = await this._pool.query(query2);

    const combine = {
      playlistId: result.rows[0].playlist_id,
      activities: [
        ...activities.rows],
    };

    if (!result.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    return combine;
  }
}

module.exports = ActivitiesService;
