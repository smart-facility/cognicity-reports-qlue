INSERT INTO qlue_reports (
  post_id,
  created_at,
  text,
  lang,
  image_url,
  title,
  the_geom
  )
  VALUES (
   1,
   '2014-02-07 00:06:26+11',
   'Kalimati ujung',
   'id',
   'http://lh3.googleusercontent.com/Ev3fVTmYB-GmQN-6CXGEZ_uqBDOPu7W0nGguukvoXSs0S-BYDFPUNnDlJeNbApOL2v5dFFGLeweq-3YR7WHq_uOcnky4LdD9IrU=s480-c',
   'Dinding bendungan sudah retak, selalu bocor jika air meluap, kapan mau ditambal? Sampah kapan mau diangkat sehingga tidak dangkal karena sedimen...',
   '0101000020E610000000A370E2D0B45A407325A71BCD8E19C0'
  );

SELECT upsert_qlue_users(md5('123456'));
