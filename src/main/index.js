const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { startServer, stopServer } = require('./server');

let mainWindow;

// Direktori dinamis tempat penyimpanan aset web
const wwwDir = path.join(app.getPath('userData'), 'www');
const indexPath = path.join(wwwDir, 'index.html');

// Konfigurasi endpoint raw file di repo GitHub Anda
const GITHUB_OWNER = 'USERNAME_GITHUB_ANDA';
const GITHUB_REPO = 'pos-electron-app';
const RAW_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/src/renderer`;

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      } else {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// Inisialisasi folder www lokal dengan aset bawaan jika baru pertama kali dibuka
function setupLocalAssets() {
  if (!fs.existsSync(wwwDir)) {
    fs.mkdirSync(wwwDir, { recursive: true });
  }

  const bundledIndex = path.join(__dirname, '../renderer/index.html');
  if (!fs.existsSync(indexPath) && fs.existsSync(bundledIndex)) {
    fs.copyFileSync(bundledIndex, indexPath);
  }
}

// Periksa pembaruan HTML/JS dari GitHub
async function checkForWebUpdates() {
  try {
    const manifestUrl = `${RAW_URL}/manifest.json?t=${Date.now()}`;
    const tempManifest = path.join(app.getPath('temp'), 'manifest.json');
    const localManifest = path.join(wwwDir, 'manifest.json');

    await downloadFile(manifestUrl, tempManifest);
    const remoteData = JSON.parse(fs.readFileSync(tempManifest, 'utf8'));

    let localVersion = 0;
    if (fs.existsSync(localManifest)) {
      try {
        localVersion = JSON.parse(fs.readFileSync(localManifest, 'utf8')).version || 0;
      } catch (e) {}
    }

    if (remoteData.version > localVersion) {
      console.log(`Update web ditemukan (v${remoteData.version}). Mengunduh file...`);

      for (const fileName of remoteData.files) {
        const fileUrl = `${RAW_URL}/${fileName}?t=${Date.now()}`;
        const localDest = path.join(wwwDir, fileName);
        await downloadFile(fileUrl, localDest);
      }

      fs.copyFileSync(tempManifest, localManifest);
      console.log('Update selesai. Refreshing view...');
      
      if (mainWindow) {
        mainWindow.loadFile(indexPath);
      }
    }
  } catch (err) {
    console.log('[Update Skipped / Offline]', err.message);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (fs.existsSync(indexPath)) {
    mainWindow.loadFile(indexPath);
  } else {
    mainWindow.loadURL(`data:text/html,<h2>Memuat sistem...</h2>`);
  }
}

app.whenReady().then(() => {
  setupLocalAssets();
  startServer(3001);
  createWindow();

  // Cek update 3 detik setelah aplikasi terbuka
  setTimeout(checkForWebUpdates, 3000);
});

app.on('before-quit', () => {
  stopServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
