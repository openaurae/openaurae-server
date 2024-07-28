INSERT INTO aurae.sensor_type (id, measures)
VALUES ('nemo_cloud',
        {'temperature', 'pressure', 'humidity', 'co2', 'ch2o', 'lvocs', 'pm1', 'pm25', 'pm4', 'pm10', 'battery'});
INSERT INTO aurae.sensor_type (id, measures)
VALUES ('ptqs1005', {'temperature', 'pm25', 'tvoc', 'ch2o'});
INSERT INTO aurae.sensor_type (id, measures)
VALUES ('pms5003st', {'temperature', 'pm25'});
INSERT INTO aurae.sensor_type (id, measures)
VALUES ('zigbee_temp', {'temperature'});
INSERT INTO aurae.sensor_type (id, measures)
VALUES ('zigbee_occupancy', {'occupancy'});
INSERT INTO aurae.sensor_type (id, measures)
VALUES ('zigbee_power', {'power'});
INSERT INTO aurae.sensor_type (id, measures)
VALUES ('zigbee_vibration', {'angle'});