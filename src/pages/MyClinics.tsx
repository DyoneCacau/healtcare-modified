import { MainLayout } from '@/components/layout/MainLayout';
import { Building2 } from 'lucide-react';
import { MyClinicsContent } from '@/components/admin/MyClinicsContent';

export default function MyClinics() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            Minhas Clínicas
          </h1>
        </div>
        <MyClinicsContent />
      </div>
    </MainLayout>
  );
}
