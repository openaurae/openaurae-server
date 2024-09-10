CREATE TABLE IF NOT EXISTS aurae.correction
(
    device       text,
    reading_type text,
    metric       text,
    expression   text,
    primary key ((device), reading_type, metric)
);
