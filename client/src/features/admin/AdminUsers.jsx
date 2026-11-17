import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listAdminUsers,
  updateUserRole,
  updateUserStatus,
} from '../../api/admin';
import { Seo } from '../../app/Seo';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Field } from '../../components/ui/Field';
import { Pager } from '../../components/ui/Pager';
import { RequestError } from '../../components/ui/Status';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuth } from '../../stores/auth.store';
import { useUi } from '../../stores/ui.store';

const roles = { customer: 'Customer', manager: 'Manager', admin: 'Admin' };

export default function AdminUsers() {
  const userId = useAuth((state) => state.user.id);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [changing, setChanging] = useState(null);
  const q = useDebounce(search.trim());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const users = useQuery({
    queryKey: ['admin', userId, 'users', page, q, role],
    queryFn: ({ signal }) =>
      listAdminUsers({ page, q, role: role || undefined }, signal),
  });
  const update = useMutation({
    mutationFn: ({ id, role, isActive }) =>
      role ? updateUserRole(id, role) : updateUserStatus(id, isActive),
    onSuccess: async (_, change) => {
      setChanging(null);
      if (change.id === userId && change.isActive === false) {
        useAuth.getState().clear();
        queryClient.removeQueries({ queryKey: ['admin'] });
        navigate('/login', { replace: true });
      } else {
        await queryClient.invalidateQueries({ queryKey: ['admin', userId] });
        useUi.getState().announce('Account updated');
      }
    },
  });
  return (
    <>
      <Seo title="Manage users" />
      <h2>Users</h2>
      <div className="admin-filters">
        <Field
          label="Search by name or email"
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <Field
          label="Filter by role"
          as="select"
          value={role}
          onChange={(event) => {
            setRole(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          {Object.entries(roles).map(([id, title]) => (
            <option value={id} key={id}>
              {title}
            </option>
          ))}
        </Field>
      </div>
      {users.isPending && <p role="status">Loading users…</p>}
      {users.isError && (
        <RequestError error={users.error} retry={users.refetch} />
      )}
      {update.isError && !changing && <RequestError error={update.error} />}
      {users.data && (
        <>
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="User table"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.data.data.map((user) => {
                  const active = user.isActive !== false;
                  return (
                    <tr key={user.id}>
                      <th scope="row">
                        {user.name}
                        {user.id === userId ? ' (you)' : ''}
                      </th>
                      <td>{user.email}</td>
                      <td>
                        <select
                          value={user.role}
                          aria-label={`Role for ${user.name}`}
                          disabled={user.id === userId || update.isPending}
                          onChange={(event) =>
                            update.mutate({
                              id: user.id,
                              role: event.target.value,
                            })
                          }
                        >
                          {Object.entries(roles).map(([id, title]) => (
                            <option value={id} key={id}>
                              {title}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className="chip">
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="text-link"
                          aria-label={`${active ? 'Deactivate' : 'Activate'} ${user.name}`}
                          disabled={update.isPending}
                          onClick={() =>
                            active
                              ? setChanging(user)
                              : update.mutate({ id: user.id, isActive: true })
                          }
                        >
                          {active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {users.data.data.length === 0 && (
                  <tr>
                    <td colSpan={5}>No users match your filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager meta={users.data.meta} onPage={setPage} />
        </>
      )}
      <Drawer
        open={Boolean(changing)}
        onClose={() => setChanging(null)}
        title="Deactivate this account?"
        placement="center"
      >
        <div className="drawer-padding form-stack">
          <p>
            {changing?.name} will be signed out and won’t be able to sign in
            until the account is reactivated.
          </p>
          {update.isError && <RequestError error={update.error} />}
          <div className="form-actions">
            <Button variant="outline" onClick={() => setChanging(null)}>
              Keep account active
            </Button>
            <Button
              onClick={() =>
                update.mutate({ id: changing.id, isActive: false })
              }
              disabled={update.isPending}
            >
              Deactivate account
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
