import { useState, useCallback, type FormEvent } from 'react';
import {
  createImpactoAlbergueResposta,
  type CreateImpactoAlberguePayload,
  type ImpactoSocialPeriodo,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { initialForm } from './impacto-constants';

export function useImpactoForm() {
  const { currentUser } = useAuth();
  const [periodo, setPeriodo] = useState<ImpactoSocialPeriodo>('mes');
  const [reload, setReload] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateImpactoAlberguePayload>(initialForm);

  const updateForm = useCallback(
    <K extends keyof CreateImpactoAlberguePayload>(
      key: K,
      value: CreateImpactoAlberguePayload[K],
    ) => {
      setForm((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSaving(true);

      try {
        await createImpactoAlbergueResposta({
          ...form,
          preenchidoPor: currentUser?.displayName || form.preenchidoPor,
          perfilPreenchedor: currentUser?.roleLabel || form.perfilPreenchedor,
        });
        setForm({ ...initialForm, dataReferencia: new Date().toISOString().slice(0, 10) });
        setModalOpen(false);
        setReload((value) => value + 1);
        window.showToast?.('Formulário de impacto registrado.', 'success');
      } catch (err) {
        window.showToast?.(err instanceof Error ? err.message : 'Erro ao salvar formulário.', 'error');
      } finally {
        setSaving(false);
      }
    },
    [form, currentUser],
  );

  return {
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
  };
}
