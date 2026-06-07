import { useImpactoSocialAlbergue } from '../api';
import ImpactoDashboard from './impacto/ImpactoDashboard';
import ImpactoFormModal from './impacto/ImpactoFormModal';
import { useImpactoForm } from './impacto/useImpactoForm';
import '../styles/institutional.css';

const ImpactoSocialAlberguePage = () => {
  const {
    periodo,
    setPeriodo,
    reload,
    modalOpen,
    openModal,
    closeModal,
    form,
    updateForm,
    saving,
    handleSubmit,
  } = useImpactoForm();

  const { data, loading, error } = useImpactoSocialAlbergue(periodo, reload);

  return (
    <main className="page-band impact-page">
      <ImpactoDashboard
        data={data}
        error={error}
        loading={loading}
        onOpenForm={openModal}
        onPeriodoChange={setPeriodo}
        periodo={periodo}
      />
      <ImpactoFormModal
        form={form}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onUpdateForm={updateForm}
        open={modalOpen}
        saving={saving}
      />
    </main>
  );
};

export default ImpactoSocialAlberguePage;
