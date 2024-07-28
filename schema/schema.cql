CREATE KEYSPACE IF NOT EXISTS aurae WITH REPLICATION = {'class' : 'SimpleStrategy','replication_factor' : 1};

CREATE TABLE if not exists aurae.user
(
    id       text primary key,
    devices  set<text>,
);

CREATE TABLE if not exists aurae.device
(
    id           text primary key,
    last_record  timestamp,
    latitude     float,
    longitude    float,
    name         text,
    sensor_types set<text>
);

CREATE TABLE if not exists aurae.sensor
(
    device      text,
    type        text,
    id          text,
    comments    text,
    last_record timestamp,
    name        text,
    primary key (device, type, id)
);

CREATE index if not exists sensors_by_id
    on aurae.sensor (id);

CREATE TABLE if not exists aurae.correction
(
    device       text,
    reading_type text,
    metric       text,
    expression   text,
    primary key ((device), reading_type , metric)
);

CREATE TABLE if not exists aurae.reading
(
    device           text,
    date             date,
    reading_type     text,
    sensor_id        text,
    processed        boolean,
    time             timestamp,
    action           text,
    angle            float,
    angle_x          float,
    angle_x_absolute float,
    angle_y          float,
    angle_y_absolute float,
    angle_z          float,
    battery          float,
    cf_pm1           float,
    cf_pm10          float,
    cf_pm25          float,
    ch2o             float,
    co2              float,
    consumption      float,
    contact          boolean,
    humidity         float,
    illuminance      float,
    ip_address       text,
    latitude         float,
    longitude        float,
    lvocs            float,
    occupancy        boolean,
    pd05             float,
    pd10             float,
    pd100            float,
    pd100g           float,
    pd25             float,
    pd50             float,
    pm1              float,
    pm10             float,
    pm25             float,
    pm4              float,
    pmv10            float,
    pmv100           float,
    pmv25            float,
    pmv_total        float,
    pmvtotal         float,
    power            float,
    pressure         float,
    state            text,
    temperature      float,
    tvoc             float,
    voltage          float,
    primary key ((device, date), reading_type, sensor_id, processed, time)
) WITH CLUSTERING ORDER BY (reading_type ASC, sensor_id ASC, processed ASC, time DESC);

CREATE TABLE IF NOT EXISTS aurae.measure_metadata
(
    id      text primary key,
    name    text,
    is_bool boolean,
    unit    text
);

CREATE TABLE IF NOT EXISTS aurae.sensor_type
(
    id       text primary key,
    measures set<text>,
);
