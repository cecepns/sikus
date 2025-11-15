import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export async function exportReportsToExcel(reports, startDate, endDate) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan PTPS');
    
    // Set columns
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nama PTPS', key: 'nama', width: 25 },
      { header: 'Nomor PTPS', key: 'nomor_ptps', width: 15 },
      { header: 'Kelurahan', key: 'kelurahan', width: 20 },
      { header: 'Kecamatan', key: 'kecamatan', width: 20 },
      { header: 'Uraian Kejadian', key: 'uraian_kejadian', width: 40 },
      { header: 'Tindak Lanjut PTPS', key: 'tindak_lanjut_ptps', width: 30 },
      { header: 'Tindak Lanjut KPPS', key: 'tindak_lanjut_kpps', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Tanggal Dibuat', key: 'created_at', width: 20 }
    ];
    
    // Add data rows
    reports.forEach(report => {
      worksheet.addRow({
        id: report.id,
        nama: report.nama,
        nomor_ptps: report.nomor_ptps,
        kelurahan: report.kelurahan,
        kecamatan: report.kecamatan,
        uraian_kejadian: report.uraian_kejadian.replace(/<[^>]*>/g, ''), // Remove HTML tags
        tindak_lanjut_ptps: report.tindak_lanjut_ptps || '',
        tindak_lanjut_kpps: report.tindak_lanjut_kpps || '',
        status: report.status,
        created_at: new Date(report.created_at).toLocaleString('id-ID')
      });
    });
    
    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    
    // Generate filename with date range
    const dateRange = startDate && endDate ? `-${startDate}-${endDate}` : '';
    const fileName = `laporan-ptps${dateRange}.xlsx`;
    
    // Write and download
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
    
    return { success: true, fileName };
  } catch (error) {
    console.error('Export Excel error:', error);
    throw new Error('Gagal membuat file Excel');
  }
}

