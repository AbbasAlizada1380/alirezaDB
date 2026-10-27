import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import multer from 'multer';
import sequelize from '../dbconnection.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_WINDOWS = process.platform === 'win32';
const EXE_SUFFIX = IS_WINDOWS ? '.exe' : '';

/* ============================================================
 *  EXECUTABLE DISCOVERY
 * ============================================================ */

/**
 * Normalize a path coming from .env:
 *  - Strip surrounding quotes
 *  - Convert backslashes to forward slashes (avoids escape issues)
 *  - Trim whitespace
 */
function normalizeEnvPath(p) {
  if (!p) return '';
  return p
    .trim()
    .replace(/^["'](.*)["']$/, '$1') // remove surrounding quotes
    .replace(/\\/g, '/');            // backslashes → forward slashes
}

/**
 * Given a directory, return the full path to `<baseName>.exe` (or without .exe
 * on non-Windows) if the file exists there. Otherwise return null.
 */
function tryDir(dir, baseName) {
  if (!dir) return null;
  const candidate = path.join(dir, baseName + EXE_SUFFIX);
  try {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Build a list of directories to search, in priority order:
 *  1. MYSQL_BIN_DIR from .env (normalized)
 *  2. Common install locations on Windows / macOS / Linux
 *  3. Any folder on PATH (handled by shell fallback)
 */
function getCandidateDirs() {
  const dirs = [];

  // 1) From .env
  const envDir = normalizeEnvPath(process.env.MYSQL_BIN_DIR);
  if (envDir) {
    dirs.push(envDir);
    // Also try adding the trailing \bin if the user only gave the root
    if (!/\/bin$/i.test(envDir)) {
      dirs.push(path.join(envDir, 'bin').replace(/\\/g, '/'));
    }
  }

  // 2) Common locations
  if (IS_WINDOWS) {
    const programFiles = process.env['ProgramFiles'] || 'C:/Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)';

    // MySQL Server 5.7 / 8.0 / 8.1 / 8.2 / 8.3 / 8.4 / 9.0 etc.
    const mysqlRoots = [
      `${programFiles}/MySQL`,
      `${programFilesX86}/MySQL`,
    ];
    for (const root of mysqlRoots) {
      if (fs.existsSync(root)) {
        for (const entry of fs.readdirSync(root)) {
          // entry is like "MySQL Server 8.0"
          const binDir = path.join(root, entry, 'bin').replace(/\\/g, '/');
          if (fs.existsSync(binDir)) dirs.push(binDir);
        }
      }
    }

    // XAMPP / WAMP / Laragon / Chocolatey / Scoop
    const extras = [
      'C:/xampp/mysql/bin',
      'C:/wamp64/bin/mysql',           // contains subfolders like mysql8.x.x
      'C:/laragon/bin/mysql',          // contains subfolders like mysql-8.x
      'C:/ProgramData/chocolatey/bin',
      path.join(os.homedir(), 'scoop', 'apps', 'mysql', 'current', 'bin').replace(/\\/g, '/'),
    ];

    for (const extra of extras) {
      if (!fs.existsSync(extra)) continue;
      // Direct bin dir
      if (path.basename(extra) === 'bin') {
        dirs.push(extra);
      } else {
        // Has versioned subfolders
        try {
          for (const entry of fs.readdirSync(extra)) {
            dirs.push(path.join(extra, entry, 'bin').replace(/\\/g, '/'));
          }
        } catch { /* ignore */ }
      }
    }
  } else if (process.platform === 'darwin') {
    dirs.push(
      '/usr/local/mysql/bin',
      '/opt/homebrew/opt/mysql/bin',
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin'
    );
  } else {
    // Linux
    dirs.push(
      '/usr/bin',
      '/usr/local/bin',
      '/usr/local/mysql/bin',
      '/opt/mysql/bin',
      '/snap/bin'
    );
  }

  // Deduplicate
  return [...new Set(dirs)];
}

/**
 * Find the executable by name (e.g. 'mysqldump').
 * Returns the full path, or the bare name (relying on PATH) as last resort.
 */
function findExecutable(baseName) {
  const tried = [];

  for (const dir of getCandidateDirs()) {
    const found = tryDir(dir, baseName);
    tried.push(dir);
    if (found) {
      console.log(`✅ Found ${baseName} at: ${found}`);
      return found;
    }
  }

  // Last resort: rely on PATH
  console.warn(
    `⚠️  Could not locate "${baseName}" on disk. Tried these folders:\n` +
    tried.map((d) => `   - ${d}`).join('\n') +
    `\n   → Will fall back to PATH lookup.`
  );
  return baseName;
}

const mysqldumpExe = findExecutable('mysqldump');
const mysqlExe = findExecutable('mysql');

/* ============================================================
 *  DATABASE CONFIG
 * ============================================================ */
const dbConfig = sequelize.config;
const {
  database: DB_NAME,
  username: DB_USER,
  password: DB_PASS,
  host: DB_HOST,
  port: DB_PORT,
} = dbConfig;

/* ============================================================
 *  SPAWN HELPER
 * ============================================================ */
function spawnCommand(cmd, args, inputStream = null) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    if (inputStream) {
      inputStream.pipe(child.stdin);
      inputStream.on('error', (err) => {
        child.stdin.end();
        reject(err);
      });
    } else {
      child.stdin.end();
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(
          `Command failed with exit code ${code}: ${stderr || stdout}`
        );
        error.code = code;
        error.stderr = stderr;
        error.stdout = stdout;
        reject(error);
      }
    });

    child.on('error', (err) => {
      // This catches "ENOENT" – executable not found
      reject(err);
    });
  });
}

/* ============================================================
 *  CHECK EXECUTABLE
 * ============================================================ */
async function checkExecutable(exe, label) {
  try {
    await spawnCommand(exe, ['--version']);
    console.log(`✅ ${label} is runnable (using: ${exe})`);
  } catch (err) {
    throw new Error(
      `❌ ${label} is not available.\n` +
      `Tried: ${exe}\n` +
      `MYSQL_BIN_DIR from .env: ${
        process.env.MYSQL_BIN_DIR
          ? `"${process.env.MYSQL_BIN_DIR}"`
          : '(not set)'
      }\n` +
      `Please install MySQL client tools and/or set MYSQL_BIN_DIR in your .env file.\n` +
      `Original error: ${err.message}`
    );
  }
}

/* ============================================================
 *  EXPORT
 * ============================================================ */
export const exportDatabase = async (req, res) => {
  try {
    await checkExecutable(mysqldumpExe, 'mysqldump');

    const filename = `backup_${new Date().toISOString().slice(0, 10)}.sql`;

    const args = [
      `--host=${DB_HOST}`,
      `--port=${DB_PORT}`,
      `--user=${DB_USER}`,
      `--password=${DB_PASS}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--no-tablespaces',
      DB_NAME,
    ];

    console.log('🔹 Exporting database with mysqldump...');
    const { stdout, stderr } = await spawnCommand(mysqldumpExe, args);

    if (stderr && !stderr.includes('Warning')) {
      console.error('mysqldump stderr:', stderr);
      if (stderr.toLowerCase().includes('error')) {
        throw new Error(stderr);
      }
    }

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(stdout));
    return res.send(stdout);
  } catch (error) {
    console.error('Export error:', error);
    let message = 'Error exporting database';
    if (error.message.includes('Access denied')) {
      message = 'Access denied. Please check your database credentials in dbconnection.js.';
    } else if (error.code === 'ENOENT' || error.message.includes('not available')) {
      message = 'MySQL client tools (mysqldump) not found. Please install them or set MYSQL_BIN_DIR.';
    }
    return res.status(500).json({ message, error: error.message });
  }
};

/* ============================================================
 *  IMPORT (Multer setup)
 * ============================================================ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tmpDir = path.join(__dirname, '../tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    cb(null, tmpDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const safeName = base.replace(/[^a-zA-Z0-9]/g, '_') + Date.now() + ext;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.sql') {
      cb(null, true);
    } else {
      cb(new Error('Only .sql files are allowed'), false);
    }
  },
  limits: { fileSize: 200 * 1024 * 1024 },
}).single('sqlFile');

export const importDatabase = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: 'File upload error', error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ message: 'Uploaded file not found on server' });
    }

    try {
      await checkExecutable(mysqlExe, 'mysql');

      const args = [
        `--host=${DB_HOST}`,
        `--port=${DB_PORT}`,
        `--user=${DB_USER}`,
        `--password=${DB_PASS}`,
        `--init-command=SET FOREIGN_KEY_CHECKS=0`,
        DB_NAME,
      ];

      console.log('🔹 Importing database with mysql...');
      const fileStream = fs.createReadStream(filePath);
      const { stderr } = await spawnCommand(mysqlExe, args, fileStream);

      if (stderr && !stderr.includes('Warning')) {
        console.error('mysql stderr:', stderr);
        if (stderr.toLowerCase().includes('error')) {
          throw new Error(stderr);
        }
      }

      fs.unlinkSync(filePath);
      return res.status(200).json({ message: 'Database imported successfully' });
    } catch (error) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      console.error('Import error:', error);
      let message = 'Error importing database';
      if (error.message.includes('Access denied')) {
        message = 'Access denied. Please check your database credentials in dbconnection.js.';
      } else if (error.code === 'ENOENT' || error.message.includes('not available')) {
        message = 'MySQL client tools (mysql) not found. Please install them or set MYSQL_BIN_DIR.';
      }
      return res.status(500).json({ message, error: error.message });
    }
  });
};
