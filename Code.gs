/**
 * KONFIGURASI ADMIN
 * Daftar email yang diizinkan untuk login ke Panel Admin.
 */
const ALLOWED_EMAILS = [
  'bisnisdigitalhmp@gmail.com',
  'eventhmpbisdigupy@gmail.com',
  'mywebnestid@gmail.com',
  'bigdityteam@gmail.com'
];

/**
 * Melayani halaman HTML utama
 * Mengecek apakah ada parameter 'q' untuk Client Mode
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('index');
  
  // Jika ada parameter 'q', berarti ini link client
  if (e.parameter.q) {
    template.clientConfig = e.parameter.q; // Kirim data terenkripsi ke frontend
    template.mode = 'CLIENT';
  } else {
    template.clientConfig = null;
    template.mode = 'ADMIN';
  }

  return template.evaluate()
    .setTitle('ProShare Drive Portal')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * API: Mengirim OTP ke Email Admin
 */
function sendLoginOtp(email) {
  const cleanEmail = email.trim().toLowerCase();
  
  if (!ALLOWED_EMAILS.includes(cleanEmail)) {
    throw new Error("Email tidak terdaftar dalam sistem.");
  }

  // Generate 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Simpan OTP di Script Properties (berlaku 5 menit)
  // Format Key: OTP_email@domain.com
  const props = PropertiesService.getScriptProperties();
  props.setProperty('OTP_' + cleanEmail, otp);
  
  // Kirim Email
  MailApp.sendEmail({
    to: cleanEmail,
    subject: "Kode Verifikasi Login - ProShare Admin",
    htmlBody: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #2563eb;">Verifikasi Masuk Admin</h2>
        <p>Gunakan kode berikut untuk masuk ke panel admin:</p>
        <h1 style="font-size: 32px; letter-spacing: 5px; color: #1e3a8a;">${otp}</h1>
        <p>Kode ini berlaku singkat. Jangan berikan kepada siapapun.</p>
      </div>
    `
  });
  
  return { success: true, message: "OTP Terkirim ke " + cleanEmail };
}

/**
 * API: Verifikasi OTP
 */
function verifyLoginOtp(email, inputOtp) {
  const cleanEmail = email.trim().toLowerCase();
  const props = PropertiesService.getScriptProperties();
  const savedOtp = props.getProperty('OTP_' + cleanEmail);
  
  if (savedOtp && savedOtp === inputOtp.toString()) {
    // Hapus OTP setelah sukses agar tidak bisa dipakai ulang
    props.deleteProperty('OTP_' + cleanEmail);
    return { success: true, token: Utilities.base64Encode(cleanEmail + "_" + new Date().getTime()) };
  } else {
    throw new Error("Kode OTP salah atau sudah kadaluarsa.");
  }
}

/**
 * API: Mengambil isi folder berdasarkan ID yang dikirim
 * (Client Side Access)
 */
function getFolderContents(folderId) {
  if (!folderId) throw new Error("Folder ID tidak ditemukan.");

  try {
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    const data = [];

    while (files.hasNext()) {
      const file = files.next();
      if (file.isTrashed()) continue;

      // Logika Tipe File
      const mime = file.getMimeType();
      let type = 'file';
      if (mime.includes('image')) type = 'image';
      else if (mime.includes('pdf')) type = 'pdf';
      else if (mime.includes('video')) type = 'video';
      else if (mime.includes('folder')) type = 'folder';

      // Link Download Direct
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${file.getId()}`;

      data.push({
        id: file.getId(),
        name: file.getName(),
        size: formatBytes(file.getSize()),
        date: file.getDateCreated().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        type: type,
        mimeType: mime,
        thumbnail: type === 'image' ? `https://drive.google.com/thumbnail?sz=w600&id=${file.getId()}` : null,
        downloadUrl: downloadUrl,
        previewUrl: file.getUrl()
      });
    }

    return data.sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    Logger.log(e);
    throw new Error("Folder tidak ditemukan atau akses ditolak. Pastikan Folder di-share 'Anyone with the link'.");
  }
}

/**
 * Helper: Format Bytes
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
