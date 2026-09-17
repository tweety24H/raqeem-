import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { useLanguage } from '../context/LanguageContext';

// Task 7: /settings/permissions — lists employees, and lets the owner open a
// checkbox modal per employee to grant/revoke individual permissions. Owners
// always have every permission implicitly (see server middleware/auth.js's
// checkPermission) so they aren't editable here.
export default function PermissionsSettings() {
  const { t } = useLanguage();
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError('');
    try {
      const [permsRes, usersRes] = await Promise.all([
        api.get('/permissions'),
        api.get('/permissions/users'),
      ]);
      setPermissions(permsRes.data.permissions);
      setUsers(usersRes.data.users);
    } catch {
      setError(t('permissionsPage.errorLoad'));
    }
  }

  return (
    <div className="p-6">
      <PageHeader title={t('permissionsPage.title')} subtitle={t('permissionsPage.subtitle')} />

      {error && (
        <div className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger dark:bg-danger/10 dark:text-danger">
          {error}
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 text-right">{t('common.name')}</th>
              <th className="px-4 py-3 text-right">{t('permissionsPage.role')}</th>
              <th className="px-4 py-3 text-right">{t('permissionsPage.grantedCount')}</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 dark:border-white/5">
                <td className="px-4 py-3 font-medium dark:text-slate-200">{u.name}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {u.role === 'owner' ? t('nav.owner') : t('nav.employee')}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {u.permissions === 'all' ? t('permissionsPage.allGranted') : `${u.permissions.length} / ${permissions.length}`}
                </td>
                <td className="px-4 py-3">
                  {u.role !== 'owner' && (
                    <button type="button" className="btn-secondary" onClick={() => setEditing(u)}>
                      {t('permissionsPage.editBtn')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                  {t('common.noData')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditPermissionsModal
          user={editing}
          allPermissions={permissions}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EditPermissionsModal({ user, allPermissions, onClose, onSaved }) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(new Set(Array.isArray(user.permissions) ? user.permissions : []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggle(slug) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      await api.put(`/permissions/users/${user.id}`, { permissions: Array.from(selected) });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || t('permissionsPage.errorSave'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={t('permissionsPage.modalTitle', { name: user.name })} onClose={onClose} width="max-w-2xl">
      {error && (
        <div className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger dark:bg-danger/10 dark:text-danger">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {allPermissions.map((p) => (
          <label
            key={p.slug}
            className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
          >
            <input type="checkbox" className="mt-0.5" checked={selected.has(p.slug)} onChange={() => toggle(p.slug)} />
            <span>
              <span className="block font-medium text-slate-700 dark:text-slate-200">{p.name}</span>
              <span className="block text-xs text-slate-400 dark:text-slate-500">{p.slug}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button type="button" disabled={saving} className="btn-primary" onClick={save}>
          {saving ? t('newOrder.savingBtn') : t('common.save')}
        </button>
      </div>
    </Modal>
  );
}
