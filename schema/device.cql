CREATE TABLE IF NOT EXISTS aurae.device
(
    id           text primary key,
    name         text,
    type         text,
    last_record  timestamp,
    latitude     float,
    longitude    float,
    room         text,
    sensor_types set<text>
);