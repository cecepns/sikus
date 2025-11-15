import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const UserManagement = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingUser, setEditingUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nama: '',
    alamat: '',
    jabatan: '',
    nomor_ptps: '',
    kelurahan: '',
    kecamatan: '',
    nomor_hp: '',
    email: '',
    role: 'user'
  });

  useEffect(() => {
    fetchUsers();
  }, [currentPage, token]);

  const fetchUsers = async () => {
    try {
      if (!token) return;

      const response = await fetch(`https://api-inventory.isavralabel.com/sikus/api/users?page=${currentPage}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
      } else {
        setError('Gagal memuat data user');
      }
    } catch {
      setError('Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (userId, newStatus) => {
    try {
      const response = await fetch(`https://api-inventory.isavralabel.com/sikus/api/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, status: newStatus } : user
        ));
        setMessage('Status user berhasil diperbarui');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError('Gagal memperbarui status');
      }
    } catch {
      setError('Terjadi kesalahan sistem');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) {
      return;
    }

    try {
      const response = await fetch(`https://api-inventory.isavralabel.com/sikus/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setUsers(prev => prev.filter(user => user.id !== userId));
        setMessage('User berhasil dihapus');
        setTimeout(() => setMessage(''), 3000);
        // Refresh the page if current page becomes empty
        if (users.length === 1 && currentPage > 1) {
          setCurrentPage(prev => prev - 1);
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Gagal menghapus user');
      }
    } catch {
      setError('Terjadi kesalahan sistem');
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({
      nama: user.nama,
      alamat: user.alamat,
      jabatan: user.jabatan,
      nomor_ptps: user.nomor_ptps,
      kelurahan: user.kelurahan,
      kecamatan: user.kecamatan,
      nomor_hp: user.nomor_hp,
      email: user.email,
      role: user.role
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setIsEditModalOpen(false);
    setEditForm({
      nama: '',
      alamat: '',
      jabatan: '',
      nomor_ptps: '',
      kelurahan: '',
      kecamatan: '',
      nomor_hp: '',
      email: '',
      role: 'user'
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`https://api-inventory.isavralabel.com/sikus/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        setUsers(prev => prev.map(user => 
          user.id === editingUser.id ? { ...user, ...editForm } : user
        ));
        setMessage('User berhasil diperbarui');
        setTimeout(() => setMessage(''), 3000);
        closeEditModal();
      } else {
        const data = await response.json();
        setError(data.error || 'Gagal memperbarui user');
      }
    } catch {
      setError('Terjadi kesalahan sistem');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getStatusColor = (status) => {
    return status === 'approved' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-yellow-100 text-yellow-800';
  };

  const getRoleColor = (role) => {
    return role === 'admin' 
      ? 'bg-purple-100 text-purple-800' 
      : 'bg-blue-100 text-blue-800';
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return (
      <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
        <div className="text-sm text-gray-700">
          Menampilkan {((currentPage - 1) * 10) + 1} sampai {Math.min(currentPage * 10, users.length + ((currentPage - 1) * 10))} dari {totalPages * 10} hasil
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Sebelumnya
          </button>
          
          {pages.map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 text-sm border rounded-md ${
                page === currentPage
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Selanjutnya
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div data-aos="fade-up">
        <h1 className="text-2xl font-bold text-gray-900">Kelola User</h1>
        <p className="mt-2 text-gray-600">Kelola pengguna dan persetujuan akun</p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md" data-aos="fade-in">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md" data-aos="fade-in">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden" data-aos="fade-up" data-aos-delay="200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kontak
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wilayah
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.nama}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.jabatan} - {user.nomor_ptps}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                    <div className="text-sm text-gray-500">{user.nomor_hp}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.kelurahan}</div>
                    <div className="text-sm text-gray-500">{user.kecamatan}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="text-primary-600 hover:text-primary-500"
                    >
                      Edit
                    </button>
                    {user.role !== 'admin' && (
                      <>
                        <select
                          value={user.status}
                          onChange={(e) => handleStatusUpdate(user.id, e.target.value)}
                          className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                        </select>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Hapus
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada user</h3>
            <p className="mt-1 text-sm text-gray-500">User yang mendaftar akan muncul di sini.</p>
          </div>
        )}

        {users.length > 0 && renderPagination()}
      </div>

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Edit User - {editingUser.nama}
                </h3>
                <button
                  onClick={closeEditModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nama</label>
                    <input
                      type="text"
                      name="nama"
                      value={editForm.nama}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Jabatan</label>
                    <input
                      type="text"
                      name="jabatan"
                      value={editForm.jabatan}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nomor PTPS</label>
                    <input
                      type="text"
                      name="nomor_ptps"
                      value={editForm.nomor_ptps}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nomor HP</label>
                    <input
                      type="text"
                      name="nomor_hp"
                      value={editForm.nomor_hp}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select
                      name="role"
                      value={editForm.role}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Kelurahan</label>
                    <input
                      type="text"
                      name="kelurahan"
                      value={editForm.kelurahan}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Kecamatan</label>
                    <input
                      type="text"
                      name="kecamatan"
                      value={editForm.kecamatan}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Alamat</label>
                  <textarea
                    name="alamat"
                    value={editForm.alamat}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;