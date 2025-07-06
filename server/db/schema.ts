import { 
  pgTable, 
  serial, 
  timestamp, 
  varchar, 
  smallint, 
  json,
  text
} from 'drizzle-orm/pg-core';

export const songsTable = pgTable('songs', {
    id: serial('id').primaryKey().notNull(),
    date_added: timestamp('date_added').defaultNow(),
    date_updated: timestamp('date_updated').defaultNow(),
    date_played: timestamp('date_played'),
    filepath: text('filepath'),
    cdnpath: varchar('cdnpath', { length: 255 }),
    duration: smallint('duration').default(0),
    play_count: smallint('play_count').default(0),
    song_name: varchar('song_name', { length: 255 }),
    song_artist: varchar('song_artist', { length: 255 }),
    song_album: varchar('song_album', { length: 255 }),
    song_year: smallint('song_year'),
    metadata: json('metadata')
});

//export const usersTable = pgTable("users", {
//    id: integer().primaryKey().generatedAlwaysAsIdentity(),
//    name: varchar({ length: 255 }).notNull(),
//    age: integer().notNull(),
//    email: varchar({ length: 255 }).notNull().unique(),
//});
