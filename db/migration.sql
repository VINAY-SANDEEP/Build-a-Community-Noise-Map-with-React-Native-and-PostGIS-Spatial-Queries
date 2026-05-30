CREATE TABLE IF NOT EXISTS readings (
    id SERIAL PRIMARY KEY,
    decibel_level FLOAT NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS readings_location_idx ON readings USING GIST (location);
