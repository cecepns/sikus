import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { exportReportsToExcel } from '../utils/exportExcel';

const ReportList = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const { user, token } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
      // Clear the message after 5 seconds
      setTimeout(() => setMessage(''), 5000);
    }
    fetchReports();
  }, [location, currentPage, token]);

  const fetchReports = async () => {
    try {
      if (!token) return;

      const response = await fetch(`https://api-inventory.isavralabel.com/sikus/api/reports?page=${currentPage}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data.reports);
        setTotalPages(data.pagination.totalPages);
      } else {
        setError('Gagal memuat laporan');
      }
    } catch {
      setError('Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (reportId, newStatus) => {
    try {
      const response = await fetch(`https://api-inventory.isavralabel.com/sikus/api/reports/${reportId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setReports(prev => prev.map(report => 
          report.id === reportId ? { ...report, status: newStatus } : report
        ));
        setMessage('Status laporan berhasil diperbarui');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError('Gagal memperbarui status');
      }
    } catch {
      setError('Terjadi kesalahan sistem');
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

  const openModal = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedReport(null);
    setIsModalOpen(false);
  };

  const openExportModal = () => {
    setIsExportModalOpen(true);
  };

  const closeExportModal = () => {
    setIsExportModalOpen(false);
    setExportDateRange({ startDate: '', endDate: '' });
  };

  const exportToExcel = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = exportDateRange;
      
      // Filter reports based on date range if provided
      let reportsToExport = reports;
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        reportsToExport = reports.filter(report => {
          const reportDate = new Date(report.created_at);
          return reportDate >= start && reportDate <= end;
        });
        
        // If admin filtering by date, fetch all data for that range
        if (user?.role === 'admin') {
          const allReportsResponse = await fetch('https://api-inventory.isavralabel.com/sikus/api/reports?limit=10000', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (allReportsResponse.ok) {
            const allData = await allReportsResponse.json();
            reportsToExport = allData.reports.filter(report => {
              const reportDate = new Date(report.created_at);
              return reportDate >= start && reportDate <= end;
            });
          }
        }
      }
      
      if (reportsToExport.length === 0) {
        setError('Tidak ada laporan dalam rentang tanggal yang dipilih');
        setLoading(false);
        return;
      }
      
      await exportReportsToExcel(reportsToExport, startDate, endDate);
      closeExportModal();
      setMessage('Laporan berhasil diekspor');
      setTimeout(() => setMessage(''), 3000);
      setLoading(false);
    } catch (err) {
      console.error('Export error:', err);
      setError(err.message || 'Terjadi kesalahan saat mengekspor');
      setLoading(false);
    }
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
          Menampilkan {((currentPage - 1) * 10) + 1} sampai {Math.min(currentPage * 10, reports.length + ((currentPage - 1) * 10))} dari {totalPages * 10} hasil
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
      <div className="flex justify-between items-center" data-aos="fade-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Laporan</h1>
          <p className="mt-2 text-gray-600">
            {user?.role === 'admin' ? 'Kelola semua laporan kejadian' : 'Laporan kejadian Anda'}
          </p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={openExportModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
          </button>
        )}
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
        {reports.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {reports.map((report) => (
              <div key={report.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        #{report.id}
                      </h3>
                      {user?.role === 'admin' && (
                        <div className="text-sm text-gray-500">
                          <span className="font-medium">{report.nama}</span> - {report.nomor_ptps}
                        </div>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </div>

                    {user?.role === 'admin' && (
                      <div className="text-sm text-gray-500">
                        {report.kelurahan}, {report.kecamatan}
                      </div>
                    )}

                    <div className="text-sm text-gray-500">
                      {new Date(report.created_at).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => openModal(report)}
                        className="text-primary-600 hover:text-primary-500 text-sm font-medium"
                      >
                        Lihat Detail
                      </button>
                    </div>
                  </div>

                  {user?.role === 'admin' && (
                    <div className="ml-4 flex-shrink-0">
                      <select
                        value={report.status}
                        onChange={(e) => handleStatusUpdate(report.id, e.target.value)}
                        className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="Terkirim">Terkirim</option>
                        <option value="Diterima">Diterima</option>
                        <option value="Diproses">Diproses</option>
                        <option value="Selesai">Selesai</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada laporan</h3>
            <p className="mt-1 text-sm text-gray-500">Mulai dengan membuat laporan pertama Anda.</p>
          </div>
        )}

        {reports.length > 0 && renderPagination()}
      </div>

      {/* Report Detail Modal */}
      {isModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50" onClick={closeModal}>
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Detail Laporan #{selectedReport.id}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {user?.role === 'admin' && (
                  <div>
                    <h4 className="font-medium text-gray-700">Pelapor</h4>
                    <p className="text-gray-600">{selectedReport.nama} ({selectedReport.nomor_ptps})</p>
                    <p className="text-gray-600">{selectedReport.kelurahan}, {selectedReport.kecamatan}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Status</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedReport.status)}`}>
                    {selectedReport.status}
                  </span>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Tanggal Dibuat</h4>
                  <p className="text-gray-600">
                    {new Date(selectedReport.created_at).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Uraian Kejadian</h4>
                  <div 
                    className="text-gray-600 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedReport.uraian_kejadian }}
                  />
                </div>

                {selectedReport.tindak_lanjut_ptps && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Tindak Lanjut PTPS</h4>
                    <p className="text-gray-600 whitespace-pre-wrap">{selectedReport.tindak_lanjut_ptps}</p>
                  </div>
                )}

                {selectedReport.tindak_lanjut_kpps && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Tindak Lanjut KPPS</h4>
                    <p className="text-gray-600 whitespace-pre-wrap">{selectedReport.tindak_lanjut_kpps}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Export Laporan Excel
                </h3>
                <button
                  onClick={closeExportModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rentang Waktu (Opsional - Maksimal 1 Bulan)
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Dari Tanggal</label>
                      <input
                        type="date"
                        value={exportDateRange.startDate}
                        onChange={(e) => setExportDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                        max={exportDateRange.endDate || new Date().toISOString().split('T')[0]}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Sampai Tanggal</label>
                      <input
                        type="date"
                        value={exportDateRange.endDate}
                        onChange={(e) => setExportDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                        min={exportDateRange.startDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Jika tidak memilih rentang waktu, semua laporan akan diekspor
                  </p>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={closeExportModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Export Excel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportList;