CREATE KEYSPACE IF NOT EXISTS aurae
            WITH REPLICATION = {'class' : 'SimpleStrategy','replication_factor' : 1};