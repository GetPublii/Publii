----
-- Basic SQL dump
----
BEGIN TRANSACTION;

CREATE TABLE 'authors' ('id' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, 'name' TEXT, 'username' TEXT, 'password' TEXT, 'config' TEXT, 'additional_data' TEXT);
CREATE TABLE 'posts' ('id' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, 'title' TEXT, 'authors' TEXT, 'slug' TEXT, 'text' TEXT, 'featured_image_id' INTEGER, 'created_at' DATETIME, 'modified_at' DATETIME, 'status' TEXT, 'template' TEXT);
CREATE TABLE 'posts_additional_data' ('id' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, 'post_id' INTEGER, 'key' TEXT, 'value' TEXT);
CREATE TABLE 'posts_images' ('id' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, 'post_id' INTEGER, 'url' TEXT, 'title' TEXT, 'caption' TEXT, 'additional_data' TEXT);
CREATE TABLE 'posts_tags' ('tag_id' INTEGER NOT NULL, 'post_id' INTEGER NOT NULL, PRIMARY KEY ('tag_id', 'post_id'));
CREATE TABLE 'tags' ('id' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, 'name' TEXT, 'slug' TEXT, 'description' TEXT, 'additional_data' TEXT);
;
COMMIT;
