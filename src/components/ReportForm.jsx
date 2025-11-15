import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useAuth } from '../context/AuthContext';

const ReportForm = () => {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    uraian_kejadian: '',
    tindak_lanjut_ptps: '',
    tindak_lanjut_kpps: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ],
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.uraian_kejadian.trim()) {
      setError('Uraian kejadian wajib diisi');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://api-inventory.isavralabel.com/sikus/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        navigate('/reports', {
          state: { message: 'Laporan berhasil dikirim' }
        });
      } else {
        setError(data.error || 'Gagal mengirim laporan');
      }
    } catch (err) {
      setError('Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg" data-aos="fade-up">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Buat Laporan Kejadian</h1>
          <p className="mt-2 text-gray-600">Silakan isi form di bawah ini untuk melaporkan kejadian</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Uraian Kejadian <span className="text-red-500">*</span>
            </label>
            <ReactQuill
              theme="snow"
              value={formData.uraian_kejadian}
              onChange={(value) => handleChange('uraian_kejadian', value)}
              modules={quillModules}
              placeholder="Jelaskan secara detail kejadian yang terjadi..."
              style={{ height: '200px', marginBottom: '50px' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tindak Lanjut PTPS
            </label>
            <textarea
              rows={4}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Jelaskan tindak lanjut yang dilakukan oleh PTPS..."
              value={formData.tindak_lanjut_ptps}
              onChange={(e) => handleChange('tindak_lanjut_ptps', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tindak Lanjut KPPS
            </label>
            <textarea
              rows={4}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Jelaskan tindak lanjut yang dilakukan oleh KPPS..."
              value={formData.tindak_lanjut_kpps}
              onChange={(e) => handleChange('tindak_lanjut_kpps', e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Mengirim...' : 'Kirim Laporan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportForm;