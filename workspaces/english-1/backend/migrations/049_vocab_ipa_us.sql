-- Fix IPA/VD Anh-My (giong doc en-US) cho 3 tu batch E/F/G.
-- Seed 045-047 da sua tuong ung; migration nay cap nhat DB hien co (idempotent).

UPDATE words SET ipa = '/ˈsteɪʃəˌneri/' WHERE en = 'stationery';
UPDATE words SET ipa = '/ˈdɪspjuːt/' WHERE en = 'dispute';
UPDATE words SET vi = 'nâng cấp', example = 'Upgrade to business class.' WHERE en = 'upgrade';
