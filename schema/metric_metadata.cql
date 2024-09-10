CREATE TABLE IF NOT EXISTS measure_metadata
(
    name         text primary key,
    is_bool      boolean,
    display_name text,
    unit         text
);

-- Air
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('temperature', false, 'Temperature', '°C');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('humidity', false, 'Humidity', 'Rh%');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('co2', false, 'CO2', 'ppm');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('ch2o', false, 'Formaldehyde', 'mg/m3');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('tvoc', false, 'TVOC', 'ppm');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('lvocs', false, 'LVOC', 'ppb');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('pressure', false, 'Pressure', 'mb');

-- Particulate Matter
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('pm1', false, 'PM 1', 'µg/m3');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('pm10', false, 'PM 10', 'µg/m3');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('pm25', false, 'PM 2.5', 'µg/m3');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('pm4', false, 'PM 4', 'µg/m3');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('pm100', false, 'PM 100', 'µg/m3');

-- Particulate Matter Volume
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('pmvtotal', false, 'PMV Total', 'µg/m3');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('pmv_total', false, 'PMV Total', 'µg/m3');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('pmv10', false, 'PMV 10', 'µg/m3');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('pmv100', false, 'PMV 100', 'µg/m3');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('pmv25', false, 'PMV 25', 'µg/m3');

-- PD
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('pd05', false, 'PD 5', null);
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('pd10', false, 'PD 10', null);
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('pd100', false, 'PD 100', null);
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('pd100g', false, 'PD 100g', null);
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('pd25', false, 'PD 25', null);
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('pd50', false, 'PD 50', null);

-- CF PM
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('cf_pm1', false, 'CF PM 1', null);
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('cf_pm10', false, 'CF PM 10', null);
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('cf_pm25', false, 'CF PM 25', null);

-- Angle
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('angle', false, 'Angle', '°');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('angle_x', false, 'Angle X', '°');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('angle_y', false, 'Angle Y', '°');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('angle_z', false, 'Angle Z', '°');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('angle_x_absolute', false, 'Absolute Angle X', '°');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('angle_y_absolute', false, 'Absolute Angle Y', '°');

-- Contact
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('contact', true, 'Contact', null);

-- Occupancy
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('occupancy', true, 'Occupancy', null);
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('illuminance', false, 'Illuminance', null);

-- Power
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('battery', false, 'Battery', 'V');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('power', false, 'Power', 'W');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('voltage', false, 'Voltage', 'V');
INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)
VALUES ('consumption', false, 'Consumption', null);

-- INSERT INTO aurae.measure_metadata (name, is_bool, display_name, unit)VALUES ('state', false, 'State', null);
