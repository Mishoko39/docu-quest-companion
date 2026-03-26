UPDATE spaces SET status = 'published' WHERE title = 'Onboarding Général';
UPDATE modules SET status = 'published' WHERE space_id = (SELECT id FROM spaces WHERE title = 'Onboarding Général');
UPDATE lessons SET status = 'published' WHERE module_id IN (SELECT id FROM modules WHERE space_id = (SELECT id FROM spaces WHERE title = 'Onboarding Général'));