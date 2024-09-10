CREATE TABLE IF NOT EXISTS aurae.user
(
    id       text primary key,
    devices  set<text>,
);
