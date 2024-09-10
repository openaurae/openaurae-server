CREATE TABLE IF NOT EXISTS correction
(
    device       text,
    reading_type text,
    metric       text,
    expression   text,
    primary key ((device), reading_type, metric)
);
