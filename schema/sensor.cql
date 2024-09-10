CREATE TABLE IF NOT EXISTS aurae.sensor
(
    device      text,
    type        text,
    id          text,
    comments    text,
    last_record timestamp,
    name        text,
    primary key ((device), id)
);