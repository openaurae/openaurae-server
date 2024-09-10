CREATE TABLE IF NOT EXISTS aurae.sensor_metadata
(
    type       text primary key,
    metric_names set<text>,
);

INSERT INTO aurae.sensor_metadata (type, metric_names)
VALUES ('pms5003st', {
    'cf_pm1', 'cf_pm10', 'cf_pm25',
    'pm1', 'pm10', 'pm25',
    'pmv10', 'pmv25', 'pmv100', 'pmv_total', 'pmvtotal',
    'pd05','pd10','pd25', 'pd50', 'pd100', 'pd100g',
    'temperature', 'humidity', 'ch2o',
    'latitude', 'longitude'
    });

INSERT INTO aurae.sensor_metadata (type, metric_names)
VALUES ('ptqs1005', {
    'co2', 'ch2o', 'pm25', 'temperature', 'humidity', 'tvoc', 'latitude', 'longitude'
    });

INSERT INTO aurae.sensor_metadata (type, metric_names)
VALUES ('zigbee_temp', {'temperature', 'humidity', 'battery', 'voltage'});

INSERT INTO aurae.sensor_metadata (type, metric_names)
VALUES ('zigbee_occupancy', {'occupancy', 'illuminance', 'battery', 'voltage'});

INSERT INTO aurae.sensor_metadata (type, metric_names)
VALUES ('zigbee_contact', {'contact', 'battery', 'voltage'});

INSERT INTO aurae.sensor_metadata (type, metric_names)
VALUES ('zigbee_power', {'state', 'power', 'voltage', 'battery', 'consumption', 'temperature'});

INSERT INTO aurae.sensor_metadata (type, metric_names)
VALUES ('zigbee_vibration', {
    'angle', 'angle_x', 'angle_y', 'angle_z', 'angle_x_absolute', 'angle_y_absolute',
    'action', 'battery', 'voltage'
    });

INSERT INTO aurae.sensor_metadata (type, metric_names)
VALUES ('nemo_cloud', {
    'battery', 'ch2o', 'co2', 'humidity', 'lvocs',
    'pm1', 'pm10', 'pm25', 'pm4', 'pressure', 'temperature'
    });