CREATE TABLE IF NOT EXISTS user
(
    id       text primary key,
    devices  set<text>,
);
