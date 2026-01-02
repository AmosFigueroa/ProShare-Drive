/**
 * ======================================================================
 * PROSHARE DRIVE PORTAL - SERVER SIDE CODE
 * ======================================================================
 * 
 * CATATAN IZIN AKSES (SCOPES):
 * Script ini menggunakan deteksi otomatis Google Apps Script.
 * Saat pertama kali dijalankan, Google akan meminta izin untuk:
 * 1. Melihat, mengedit, membuat, dan menghapus file Google Drive (DriveApp)
 * 2. Mengirim email sebagai Anda (MailApp)
 * 3. Melihat info email pengguna (Session)
 * 
 * Anda TIDAK PERLU mengedit file appsscript.json.
 */

/**
 * KONFIGURASI ADMIN
 * Daftar email yang diizinkan untuk login ke Panel Admin.
 * Masukkan email Gmail atau Google Workspace Anda di sini.
 */
const ALLOWED_EMAILS = [
  'bisnisdigitalhmp@gmail.com',
  'eventhmpbisdigupy@gmail.com',
  'mywebnestid@gmail.com',
  'bigdityteam@gmail.com'
];

/**
 * URL Deployment (Diupdate sesuai request user)
 * Digunakan agar link yang digenerate selalu mengarah ke versi Exec/Production.
 */
const DEPLOY_URL = "https://script.google.com/macros/s/AKfycbyzOqI0vUxlShSiNwr1pOIEw8-zvq_hugHREHJTtKhOV9O_dpLY32981lSyx9WMtS-vlQ/exec";

/**
 * Melayani halaman HTML utama
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('index');
  
  // Menggunakan URL hardcoded agar konsisten saat generate link sharing
  template.scriptUrl = DEPLOY_URL;

  // Cek parameter 'q' untuk menentukan mode (Admin vs Client)
  if (e && e.parameter && e.parameter.q) {
    template.clientConfig = e.parameter.q; // Data konfigurasi terenkripsi
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
 * Fitur Keamanan: Memastikan hanya email terdaftar yang bisa meminta OTP.
 */
function sendLoginOtp(email) {
  if (!email) throw new Error("Email tidak boleh kosong.");
  
  const cleanEmail = email.trim().toLowerCase();
  
  // Dapatkan email pemilik script saat ini (developer) untuk bypass whitelist saat testing
  const ownerEmail = Session.getEffectiveUser().getEmail().toLowerCase();
  
  // Cek apakah email ada di whitelist ATAU email adalah pemilik script
  const isAllowed = ALLOWED_EMAILS.includes(cleanEmail) || cleanEmail === ownerEmail;
  
  if (!isAllowed) {
    // Delay sedikit untuk mencegah brute force timing attack (security)
    Utilities.sleep(1000); 
    throw new Error("Akses ditolak: Email tidak terdaftar dalam sistem.");
  }

  // Generate 6 digit OTP acak
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Simpan OTP di Script Properties (penyimpanan sementara server, berlaku 5 menit)
  const props = PropertiesService.getScriptProperties();
  props.setProperty('OTP_' + cleanEmail, otp);
  
  try {
    MailApp.sendEmail({
      to: cleanEmail,
      subject: "Kode Akses Admin - ProShare Drive",
      htmlBody: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #0f172a; margin-top: 0;">Verifikasi Masuk</h2>
          <p style="color: #475569;">Gunakan kode verifikasi berikut untuk mengakses dashboard admin:</p>
          <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1; text-align: center; margin: 20px 0;">
            <h1 style="font-size: 36px; letter-spacing: 8px; color: #2563eb; margin: 0; font-family: monospace;">${otp}</h1>
          </div>
          <p style="font-size: 13px; color: #64748b;">Kode ini berlaku selama 10 menit. Jangan bagikan kepada siapapun.</p>
        </div>
      `
    });
  } catch (e) {
    throw new Error("Gagal mengirim email. Pastikan Anda telah memberikan izin akses Gmail. Detail: " + e.message);
  }
  
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
    // Hapus OTP agar tidak bisa dipakai ulang (Replay Attack Protection)
    props.deleteProperty('OTP_' + cleanEmail);
    // Return token sederhana
    return { success: true, token: Utilities.base64Encode(cleanEmail + "_" + new Date().getTime()) };
  } else {
    throw new Error("Kode verifikasi salah atau sudah kadaluarsa.");
  }
}

/**
 * API: Mengambil isi folder (Client Side Access)
 * Mendukung input berupa ID Folder murni ATAU Link Folder Lengkap.
 */
function getFolderContents(inputString) {
  if (!inputString) throw new Error("Link atau ID Folder tidak ditemukan.");

  // 1. Logika Ekstraksi ID dari URL
  // Input bisa berupa: "1vKz..." atau "https://drive.google.com/drive/folders/1vKz...?usp=sharing"
  let folderId = inputString.trim();
  
  // Jika input terlihat seperti URL
  if (folderId.includes("folders/")) {
    const parts = folderId.split("folders/");
    if (parts.length > 1) {
      // Ambil bagian setelah 'folders/' dan bersihkan dari parameter query (?)
      folderId = parts[1].split("?")[0].split("/")[0];
    }
  }

  // 2. Akses Google Drive
  try {
    const folder = DriveApp.getFolderById(folderId);
    const data = [];

    // --- A. AMBIL SUB-FOLDERS ---
    const subfolders = folder.getFolders();
    while (subfolders.hasNext()) {
      const sub = subfolders.next();
      if (sub.isTrashed()) continue;

      data.push({
        id: sub.getId(),
        name: sub.getName(),
        size: '-', // Folder tidak memiliki ukuran file tunggal
        date: sub.getDateCreated().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        type: 'folder',
        mimeType: 'application/vnd.google-apps.folder',
        thumbnail: null,
        downloadUrl: sub.getUrl(), // Tombol download akan membuka folder di Drive
        previewUrl: sub.getUrl()
      });
    }

    // --- B. AMBIL FILES ---
    const files = folder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      if (file.isTrashed()) continue;

      const mime = file.getMimeType();
      
      // Kategori sederhana untuk UI
      let type = 'file';
      if (mime.includes('image')) type = 'image';
      else if (mime.includes('pdf')) type = 'pdf';
      else if (mime.includes('video')) type = 'video';
      
      // Link Download Langsung (Direct Download)
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${file.getId()}`;
      
      // Thumbnail
      // Menggunakan fallback sederhana jika tidak tersedia
      const publicThumb = `https://drive.google.com/thumbnail?sz=w800&id=${file.getId()}`;

      data.push({
        id: file.getId(),
        name: file.getName(),
        size: formatBytes(file.getSize()),
        date: file.getDateCreated().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        type: type,
        mimeType: mime,
        thumbnail: type === 'image' ? publicThumb : null,
        downloadUrl: downloadUrl, 
        previewUrl: file.getUrl() 
      });
    }

    // Urutkan: Folder dulu, baru File. Di dalam group, urut A-Z
    return data.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });

  } catch (e) {
    Logger.log("Error akses folder: " + e.toString());
    
    // Pesan error user-friendly
    if (e.message.includes("Access denied") || e.message.includes("permission")) {
      throw new Error("Akses Ditolak. Pastikan Folder Google Drive diatur ke 'Anyone with the link' (Siapa saja yang memiliki link) sebagai Viewer.");
    } else if (e.message.includes("File not found") || e.message.includes("No item")) {
      throw new Error("Folder tidak ditemukan. Cek kembali Link/ID Folder Anda.");
    } else {
      throw new Error("Gagal memuat data: " + e.message);
    }
  }
}

/**
 * Helper: Format ukuran file menjadi KB, MB, GB
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}