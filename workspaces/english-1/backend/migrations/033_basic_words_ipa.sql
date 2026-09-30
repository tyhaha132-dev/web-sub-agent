-- Backfill IPA for the 20 basic seed words (004) which predate the ipa column (005).
-- Guarded by WHERE ipa = '' so re-runs never overwrite curated data.
UPDATE words SET ipa = '/ˈæpl/' WHERE en = 'apple' AND ipa = '';
UPDATE words SET ipa = '/bʊk/' WHERE en = 'book' AND ipa = '';
UPDATE words SET ipa = '/ˈwɔːtər/' WHERE en = 'water' AND ipa = '';
UPDATE words SET ipa = '/haʊs/' WHERE en = 'house' AND ipa = '';
UPDATE words SET ipa = '/frend/' WHERE en = 'friend' AND ipa = '';
UPDATE words SET ipa = '/lɜːn/' WHERE en = 'learn' AND ipa = '';
UPDATE words SET ipa = '/ˈlæŋɡwɪdʒ/' WHERE en = 'language' AND ipa = '';
UPDATE words SET ipa = '/kəmˈpjuːtə/' WHERE en = 'computer' AND ipa = '';
UPDATE words SET ipa = '/skuːl/' WHERE en = 'school' AND ipa = '';
UPDATE words SET ipa = '/ˈtiːtʃə/' WHERE en = 'teacher' AND ipa = '';
UPDATE words SET ipa = '/ˈbjuːtɪfl/' WHERE en = 'beautiful' AND ipa = '';
UPDATE words SET ipa = '/ˈkwɪkli/' WHERE en = 'quickly' AND ipa = '';
UPDATE words SET ipa = '/ɪmˈpɔːtənt/' WHERE en = 'important' AND ipa = '';
UPDATE words SET ipa = '/ˈdʒɜːni/' WHERE en = 'journey' AND ipa = '';
UPDATE words SET ipa = '/ˈnɑːlɪdʒ/' WHERE en = 'knowledge' AND ipa = '';
UPDATE words SET ipa = '/ɪɡˈzæmpl/' WHERE en = 'example' AND ipa = '';
UPDATE words SET ipa = '/ˈkwestʃən/' WHERE en = 'question' AND ipa = '';
UPDATE words SET ipa = '/ˈænsər/' WHERE en = 'answer' AND ipa = '';
UPDATE words SET ipa = '/ˈpræktɪs/' WHERE en = 'practice' AND ipa = '';
UPDATE words SET ipa = '/səkˈses/' WHERE en = 'success' AND ipa = '';
