INSERT INTO detik_reports (
  contribution_id,
  created_at,
  text,
  lang,
  url,
  image_url,
  title,
  the_geom
  )
  VALUES (
   1,
   '2014-02-07 00:06:26+11',
   'Kalo potong rambut terus kependekan,yaudah si tinggal di ajarin berenang nanti tinggi lagi',
   'id',
   'https://pasangmata.detik.com/contribution/168698',
   'http://usimages.detik.com/community/pasma/2015/10/20/14452986131613201900.jpg',
   'Penampakan Kawasan Kampus USU Medan yang Dipenuhi Air',
   '0101000020E610000000A370E2D0B45A407325A71BCD8E19C0'
  );

SELECT upsert_detik_users(md5('123456'));
