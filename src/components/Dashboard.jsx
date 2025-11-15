import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    completedReports: 0,
    pendingUsers: 0,
  });
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    try {
      if (!token) {
        setLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
      };

      const [reportsResponse] = await Promise.all([
        fetch('https://api-inventory.isavralabel.com/sikus/api/reports?limit=1000', {
          headers,
        }),
      ]);

      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        const reports = reportsData.reports || reportsData; // Handle both old and new API structure
        
        setRecentReports(reports.slice(0, 5));
        
        const totalReports = reports.length;
        const pendingReports = reports.filter(r => r.status === 'Terkirim').length;
        const completedReports = reports.filter(r => r.status === 'Selesai').length;

        setStats(prev => ({
          ...prev,
          totalReports,
          pendingReports,
          completedReports,
        }));

        // Fetch users data for admin
        if (user?.role === 'admin') {
          const usersResponse = await fetch('https://api-inventory.isavralabel.com/sikus/api/users?limit=1000', {
            headers,
          });
          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            const users = usersData.users || usersData; // Handle both old and new API structure
            const pendingUsers = users.filter(u => u.status === 'pending').length;
            setStats(prev => ({
              ...prev,
              pendingUsers,
            }));
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Terkirim':
        return 'bg-blue-100 text-blue-800';
      case 'Diterima':
        return 'bg-yellow-100 text-yellow-800';
      case 'Diproses':
        return 'bg-orange-100 text-orange-800';
      case 'Selesai':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Selamat datang, {user?.nama}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-aos="fade-up" data-aos-delay="200">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Laporan</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalReports}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Laporan Pending</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.pendingReports}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Laporan Selesai</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.completedReports}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {user?.role === 'admin' && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">User Pending</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.pendingUsers}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6" data-aos="fade-up" data-aos-delay="400">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Aksi Cepat</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/reports/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Buat Laporan Baru
          </Link>
          
          <Link
            to="/reports"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Lihat Semua Laporan
          </Link>

          {user?.role === 'admin' && (
            <Link
              to="/users"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Kelola User
            </Link>
          )}
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white shadow rounded-lg" data-aos="fade-up" data-aos-delay="600">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Laporan Terbaru</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentReports.length > 0 ? (
            recentReports.map((report) => (
              <div key={report.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.role === 'admin' ? report.nama : 'Laporan Anda'}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(report.created_at).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500">Belum ada laporan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;