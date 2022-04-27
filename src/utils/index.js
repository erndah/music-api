/* eslint-disable linebreak-style */
const mapDBToModel = ({
  id, title, year, genre, performer, duration, albumId,
}) => ({
  id, title, year, genre, performer, duration, albumId,
});

const mapDBSong = ({
  id, title, performer,
}) => ({
  id, title, performer,
});

module.exports = { mapDBToModel, mapDBSong };
