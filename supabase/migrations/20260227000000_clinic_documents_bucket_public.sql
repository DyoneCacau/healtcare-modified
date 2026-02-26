-- Tornar bucket clinic-documents publico para links funcionarem ao abrir
UPDATE storage.buckets SET public = true WHERE id = 'clinic-documents';
