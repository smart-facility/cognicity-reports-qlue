-- Create Trigger Function to update all_reports table
CREATE OR REPLACE FUNCTION public.update_all_reports_from_qlue()
  RETURNS trigger AS
$BODY$
	BEGIN
		IF (TG_OP = 'UPDATE') THEN
			INSERT INTO all_reports (fkey, created_at, text, source, lang, url, image_url, title, the_geom) SELECT NEW.pkey, NEW.created_at, NEW.text, 'qlue', NEW.url, NEW.image_url, NEW.title, NEW.the_geom;
			RETURN NEW;
		ELSIF (TG_OP = 'INSERT') THEN
			INSERT INTO all_reports (fkey, created_at, text, source, lang, url, image_url, title, the_geom) SELECT NEW.pkey, NEW.created_at, NEW.text, 'qlue', NEW.lang, NEW.url, NEW.image_url, NEW.title, NEW.the_geom;
			RETURN NEW;
		END IF;
	END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
ALTER FUNCTION public.update_all_reports_from_qlue()
  OWNER TO postgres;


-- Create table for Qlue reports
CREATE TABLE qlue_reports
(
  pkey bigserial NOT NULL,
  post_id bigint NOT NULL,
  database_time timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone,
  text character varying,
  lang character varying,
  url character varying,
  image_url character varying,
  title character varying,
  CONSTRAINT pkey_qlue PRIMARY KEY (pkey)
)
WITH (
  OIDS=FALSE
);
ALTER TABLE qlue_reports
  OWNER TO postgres;

-- Add Geometry column to tweet_reports
SELECT AddGeometryColumn ('public','qlue_reports','the_geom',4326,'POINT',2);

-- Add GIST spatial index
CREATE INDEX gix_qlue_reports ON qlue_reports USING gist (the_geom);

CREATE TRIGGER trigger_update_all_reports_from_qlue
  BEFORE INSERT OR UPDATE
  ON public.qlue_reports
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_all_reports_from_qlue();

-- Create table for Qlue report users
CREATE TABLE qlue_users
(
  pkey bigserial,
  user_hash character varying UNIQUE,
  reports_count integer	,
  CONSTRAINT pkey_qlue_users PRIMARY KEY (pkey)
)
WITH (
  OIDS=FALSE
);
ALTER TABLE qlue_users
  OWNER TO postgres;

  --Function to update or insert tweet users
  CREATE FUNCTION upsert_qlue_users(hash varchar) RETURNS VOID AS
  $$
  BEGIN
      LOOP
          -- first try to update the key
          UPDATE qlue_users SET reports_count = reports_count + 1 WHERE user_hash = hash;
          IF found THEN
              RETURN;
          END IF;
          -- not there, so try to insert the key
          -- if someone else inserts the same key concurrently,
          -- we could get a unique-key failure
          BEGIN
              INSERT INTO qlue_users(user_hash,reports_count) VALUES (hash, 1);
              RETURN;
          EXCEPTION WHEN unique_violation THEN
              -- Do nothing, and loop to try the UPDATE again.
          END;
      END LOOP;
  END;
  $$
  LANGUAGE plpgsql;
