import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Copy, Eye, EyeOff, ShieldCheck, Users, Check } from 'lucide-react';
import { Modal } from '../../components/UI/Modal';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

const BLANK_USER = { id: null, username: '', full_name: '', email: '', phone: '', role_id: '', password: '', active: 1, stage_mode: 'ROLE', stage_ids: [] };
const BLANK_ROLE = { id: null, role_name: '', role_code: '', description: '', permissions: [], stage_mode: 'ALL', stage_ids: [] };

function Checkbox({ checked, onChange, label, disabled, indeterminate }) {
  return (
    <label className={`inline-flex items-center gap-1.5 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        ref={(el) => { if (el) el.indeterminate = !!indeterminate && !checked; }}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
      />
      {label && <span className="text-xs text-slate-700">{label}</span>}
    </label>
  );
}

export function UsersRoles() {
  const [view, setView] = useState('users'); // users | roles
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState({ modules: [], stages: [] });
  const [loading, setLoading] = useState(true);
  const [userForm, setUserForm] = useState(null);
  const [roleForm, setRoleForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { success, error } = useToast();
  const { user: me, refreshUser } = useAuth();

  const load = async () => {
    setLoading(true);
    try {
      const [u, r, c] = await Promise.all([api.settings.getUsers(), api.settings.getRoles(), api.settings.getPermissionCatalog()]);
      setUsers(u?.data || []);
      setRoles(r?.data || []);
      setCatalog(c?.data || { modules: [], stages: [] });
    } catch (err) {
      error('Failed to load users & roles: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const roleById = useMemo(() => Object.fromEntries(roles.map((r) => [String(r.id), r])), [roles]);
  const stageName = (id) => catalog.stages.find((s) => Number(s.id) === Number(id))?.name || `Stage #${id}`;

  const describeStages = (stages) => {
    if (stages === 'ALL' || stages === undefined || stages === null) return 'All stages';
    if (!stages.length) return 'No stages';
    return stages.map(stageName).join(', ');
  };

  const userStageSummary = (u) => {
    if (Array.isArray(u.stage_access)) {
      return u.stage_access.includes('ALL') ? 'All stages (personal)' : `${describeStages(u.stage_access)} (personal)`;
    }
    const role = roleById[String(u.role_id)];
    return role ? describeStages(role.effective_stages) : '—';
  };

  // ---------- Users ----------
  const openUser = (u = null) => {
    setShowPassword(false);
    if (!u) {
      setUserForm({ ...BLANK_USER, role_id: roles.find((r) => !r.is_admin)?.id || roles[0]?.id || '' });
      return;
    }
    const sa = u.stage_access;
    setUserForm({
      id: u.id, username: u.username, full_name: u.full_name, email: u.email || '', phone: u.phone || '',
      role_id: u.role_id, password: '', active: Number(u.active ?? 1),
      stage_mode: Array.isArray(sa) ? (sa.includes('ALL') ? 'ALL' : 'CUSTOM') : 'ROLE',
      stage_ids: Array.isArray(sa) ? sa.filter((x) => x !== 'ALL').map(Number) : [],
    });
  };

  const saveUser = async (e) => {
    e.preventDefault();
    const f = userForm;
    if (f.stage_mode === 'CUSTOM' && f.stage_ids.length === 0) {
      error('Tick at least one stage, or choose "Same as role".');
      return;
    }
    setSaving(true);
    try {
      await api.settings.saveUser({
        id: f.id, username: f.username, full_name: f.full_name, email: f.email, phone: f.phone,
        role_id: Number(f.role_id), password: f.password, active: f.active,
        stage_access: f.stage_mode === 'ROLE' ? null : f.stage_mode === 'ALL' ? ['ALL'] : f.stage_ids,
      });
      success('User saved.');
      setUserForm(null);
      load();
      if (Number(f.id) === Number(me?.id)) refreshUser();
    } catch (err) {
      error(err.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Roles ----------
  const openRole = (r = null, duplicate = false) => {
    if (!r) {
      setRoleForm({ ...BLANK_ROLE, permissions: ['dashboard.view'] });
      return;
    }
    const st = r.effective_stages;
    setRoleForm({
      id: duplicate ? null : r.id,
      role_name: duplicate ? `${r.role_name} (Copy)` : r.role_name,
      role_code: duplicate ? '' : r.role_code,
      description: r.description || '',
      permissions: [...(r.effective_permissions || [])],
      stage_mode: st === 'ALL' ? 'ALL' : 'CUSTOM',
      stage_ids: Array.isArray(st) ? st.map(Number) : [],
      is_admin: duplicate ? false : r.is_admin,
    });
  };

  const togglePerm = (key, on) => {
    setRoleForm((prev) => {
      const set = new Set(prev.permissions);
      const [mod, act] = key.split('.');
      if (on) {
        set.add(key);
        set.add(`${mod}.view`); // any action needs View
      } else {
        set.delete(key);
        if (act === 'view') {
          [...set].forEach((k) => { if (k.startsWith(`${mod}.`)) set.delete(k); });
        }
      }
      return { ...prev, permissions: [...set] };
    });
  };

  const setModuleAll = (mod, on) => {
    setRoleForm((prev) => {
      const set = new Set(prev.permissions);
      mod.actions.forEach((a) => (on ? set.add(`${mod.key}.${a.key}`) : set.delete(`${mod.key}.${a.key}`)));
      return { ...prev, permissions: [...set] };
    });
  };

  const setEverything = (mode) => {
    setRoleForm((prev) => {
      const all = catalog.modules.flatMap((m) => m.actions.map((a) => `${m.key}.${a.key}`));
      if (mode === 'none') return { ...prev, permissions: [] };
      if (mode === 'view') return { ...prev, permissions: all.filter((k) => k.endsWith('.view')) };
      return { ...prev, permissions: all.filter((k) => !k.startsWith('settings.')) };
    });
  };

  const saveRole = async (e) => {
    e.preventDefault();
    const f = roleForm;
    if (f.permissions.includes('sku_tracking.view') && f.stage_mode === 'CUSTOM' && f.stage_ids.length === 0) {
      error('Tick at least one stage for SKU Tracking, or choose All stages.');
      return;
    }
    setSaving(true);
    try {
      await api.settings.saveRole({
        id: f.id, role_name: f.role_name, role_code: f.role_code, description: f.description,
        permissions: f.permissions, stages: f.stage_mode === 'ALL' ? 'ALL' : f.stage_ids,
      });
      success('Role saved.');
      setRoleForm(null);
      load();
      if (f.id && Number(f.id) === Number(me?.role_id)) refreshUser();
    } catch (err) {
      error(err.message || 'Failed to save role.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (r) => {
    if (!window.confirm(`Delete role "${r.role_name}"?`)) return;
    try {
      await api.settings.deleteRole(r.id);
      success('Role deleted.');
      load();
    } catch (err) {
      error(err.message || 'Failed to delete role.');
    }
  };

  const moduleSummary = (r) => {
    if (r.is_admin) return 'Full access to everything';
    const mods = catalog.modules.filter((m) => (r.effective_permissions || []).includes(`${m.key}.view`) || (r.effective_permissions || []).some((k) => k.startsWith(`${m.key}.`)));
    return mods.length ? mods.map((m) => m.label).join(' • ') : 'No access';
  };

  const segBtn = (key, label, Icon) => (
    <button
      type="button"
      onClick={() => setView(key)}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-transform active:scale-[0.97] ${
        view === key ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );

  const rf = roleForm;
  const stagesEnabled = rf && rf.permissions.includes('sku_tracking.view');

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Users & Roles</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Tick what each role may see and do. Limit SKU Tracking to particular stages per role or per supervisor.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            {segBtn('users', `Users (${users.length})`, Users)}
            {segBtn('roles', `Roles & Permissions (${roles.length})`, ShieldCheck)}
          </div>
          <button
            type="button"
            onClick={() => (view === 'users' ? openUser() : openRole())}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.97] transition-transform text-white text-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> {view === 'users' ? 'Add User' : 'New Role'}
          </button>
        </div>
      </div>

      {loading && <p className="text-xs text-slate-500 px-1">Loading...</p>}

      {/* USERS */}
      {view === 'users' && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Login</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">SKU Tracking Stages</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{u.full_name}</div>
                      <div className="text-[11px] text-slate-500">{u.email}{u.phone ? ` • ${u.phone}` : ''}</div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{u.username}</td>
                    <td className="px-4 py-3"><span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">{u.role_name}</span></td>
                    <td className="px-4 py-3 text-[11px] text-slate-600 max-w-[260px]">{userStageSummary(u)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${Number(u.active) === 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {Number(u.active) === 1 ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openUser(u)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold border border-slate-200 cursor-pointer">
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile list */}
          <div className="md:hidden divide-y divide-slate-100">
            {users.map((u) => (
              <button key={u.id} type="button" onClick={() => openUser(u)} className="w-full text-left p-4 active:bg-slate-50 cursor-pointer">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 text-sm">{u.full_name}</span>
                  <span className="text-[10px] font-bold text-slate-600">{u.role_name}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">@{u.username} • {userStageSummary(u)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ROLES */}
      {view === 'roles' && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {roles.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{r.role_name}</span>
                    {r.is_admin && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">ADMIN</span>}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">{r.role_code} • {r.user_count} user(s)</div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => openRole(r, true)} title="Duplicate" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"><Copy className="w-3.5 h-3.5" /></button>
                  {!r.is_admin && <button type="button" onClick={() => openRole(r)} title="Edit permissions" className="p-1.5 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>}
                  {!r.is_admin && <button type="button" onClick={() => deleteRole(r)} title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">{moduleSummary(r)}</p>
              {!r.is_admin && (r.effective_permissions || []).includes('sku_tracking.view') && (
                <p className="text-[11px] text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1">
                  Stages: {describeStages(r.effective_stages)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* USER MODAL */}
      <Modal
        isOpen={!!userForm}
        onClose={() => setUserForm(null)}
        title={userForm?.id ? 'Edit User' : 'Add User'}
        footer={
          <>
            <button type="button" onClick={() => setUserForm(null)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700">Cancel</button>
            <button type="submit" form="user-form" disabled={saving} className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-xs font-bold text-white">{saving ? 'Saving...' : 'Save User'}</button>
          </>
        }
      >
        {userForm && (
          <form id="user-form" onSubmit={saveUser} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="u-name">Full Name *</label>
                <input id="u-name" required value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} className="w-full rounded-xl px-3 py-2 border border-slate-300" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="u-login">Login Username *</label>
                <input id="u-login" required value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value.toLowerCase().trim() })} className="w-full rounded-xl px-3 py-2 border border-slate-300 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="u-email">Email *</label>
                <input id="u-email" type="email" required value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="w-full rounded-xl px-3 py-2 border border-slate-300" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="u-phone">Phone</label>
                <input id="u-phone" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} className="w-full rounded-xl px-3 py-2 border border-slate-300" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="u-role">Role</label>
                <select id="u-role" value={userForm.role_id} onChange={(e) => setUserForm({ ...userForm, role_id: e.target.value })} className="w-full rounded-xl px-3 py-2 border border-slate-300 font-semibold">
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.role_name}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-2">
                <Checkbox checked={userForm.active === 1} onChange={(v) => setUserForm({ ...userForm, active: v ? 1 : 0 })} label="Account active" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700" htmlFor="u-pass">{userForm.id ? 'New Password' : 'Password'}</label>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 cursor-pointer">
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input id="u-pass" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder={userForm.id ? 'Leave blank to keep current password' : 'Default: welcome123'} className="w-full rounded-xl px-3 py-2 border border-slate-300 font-mono" />
            </div>

            {/* Supervisor stage assignment */}
            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 space-y-2">
              <p className="font-bold text-blue-950">SKU Tracking stages for this user</p>
              <div className="flex flex-wrap gap-3">
                {[['ROLE', `Same as role (${describeStages(roleById[String(userForm.role_id)]?.effective_stages)})`], ['ALL', 'All stages'], ['CUSTOM', 'Only selected stages']].map(([v, l]) => (
                  <label key={v} className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="stage_mode" checked={userForm.stage_mode === v} onChange={() => setUserForm({ ...userForm, stage_mode: v })} className="text-blue-600" />
                    <span className="text-slate-700">{l}</span>
                  </label>
                ))}
              </div>
              {userForm.stage_mode === 'CUSTOM' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {catalog.stages.map((s, i) => (
                    <Checkbox
                      key={s.id}
                      checked={userForm.stage_ids.includes(Number(s.id))}
                      onChange={(v) => setUserForm({
                        ...userForm,
                        stage_ids: v ? [...userForm.stage_ids, Number(s.id)] : userForm.stage_ids.filter((x) => x !== Number(s.id)),
                      })}
                      label={`${i + 1}. ${s.name}`}
                    />
                  ))}
                </div>
              )}
              <p className="text-[10px] text-blue-900/70">The user sees and hands off only these stages. Use this to give each supervisor his own stage.</p>
            </div>
          </form>
        )}
      </Modal>

      {/* ROLE MODAL — checkbox matrix */}
      <Modal
        isOpen={!!rf}
        onClose={() => setRoleForm(null)}
        title={rf?.id ? `Edit Role: ${rf.role_name}` : 'New Role'}
        maxWidth="max-w-4xl"
        footer={
          <>
            <button type="button" onClick={() => setRoleForm(null)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700">Cancel</button>
            <button type="submit" form="role-form" disabled={saving || rf?.is_admin} className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-xs font-bold text-white">{saving ? 'Saving...' : 'Save Role'}</button>
          </>
        }
      >
        {rf && (
          <form id="role-form" onSubmit={saveRole} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="r-name">Role Name *</label>
                <input id="r-name" required value={rf.role_name} onChange={(e) => setRoleForm({ ...rf, role_name: e.target.value })} placeholder="e.g. Casting Supervisor" className="w-full rounded-xl px-3 py-2 border border-slate-300 font-semibold" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="r-code">Code</label>
                <input id="r-code" value={rf.role_code} onChange={(e) => setRoleForm({ ...rf, role_code: e.target.value.toUpperCase() })} placeholder="Auto from name" className="w-full rounded-xl px-3 py-2 border border-slate-300 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="r-desc">Description</label>
                <input id="r-desc" value={rf.description} onChange={(e) => setRoleForm({ ...rf, description: e.target.value })} className="w-full rounded-xl px-3 py-2 border border-slate-300" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-600">Quick set:</span>
              <button type="button" onClick={() => setEverything('view')} className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-semibold cursor-pointer">View only (all modules)</button>
              <button type="button" onClick={() => setEverything('all')} className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-semibold cursor-pointer">Everything except admin</button>
              <button type="button" onClick={() => setEverything('none')} className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-semibold cursor-pointer">Clear all</button>
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
              {catalog.modules.map((m) => {
                const keys = m.actions.map((a) => `${m.key}.${a.key}`);
                const on = keys.filter((k) => rf.permissions.includes(k)).length;
                return (
                  <div key={m.key} className={`p-3 ${on > 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="sm:w-56 shrink-0">
                        <Checkbox
                          checked={on === keys.length}
                          indeterminate={on > 0}
                          onChange={(v) => setModuleAll(m, v)}
                          label={<span className="font-bold text-slate-900">{m.label}</span>}
                        />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {m.actions.map((a) => (
                          <Checkbox key={a.key} checked={rf.permissions.includes(`${m.key}.${a.key}`)} onChange={(v) => togglePerm(`${m.key}.${a.key}`, v)} label={a.label} />
                        ))}
                      </div>
                    </div>

                    {m.has_stages && (
                      <div className={`mt-2.5 sm:ml-56 bg-blue-50/60 border border-blue-200 rounded-lg p-2.5 space-y-1.5 ${stagesEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-blue-950">Stages this role works on:</span>
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name="role_stage_mode" checked={rf.stage_mode === 'ALL'} onChange={() => setRoleForm({ ...rf, stage_mode: 'ALL' })} />
                            <span>All stages</span>
                          </label>
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name="role_stage_mode" checked={rf.stage_mode === 'CUSTOM'} onChange={() => setRoleForm({ ...rf, stage_mode: 'CUSTOM' })} />
                            <span>Only selected</span>
                          </label>
                        </div>
                        {rf.stage_mode === 'CUSTOM' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {catalog.stages.map((s, i) => (
                              <Checkbox
                                key={s.id}
                                checked={rf.stage_ids.includes(Number(s.id))}
                                onChange={(v) => setRoleForm({ ...rf, stage_ids: v ? [...rf.stage_ids, Number(s.id)] : rf.stage_ids.filter((x) => x !== Number(s.id)) })}
                                label={`${i + 1}. ${s.name}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1"><Check className="w-3 h-3" /> Ticking any action also gives View for that module. Users see the change on their next page load.</p>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default UsersRoles;
