import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import concurrently from 'concurrently';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pythonPath = process.platform === 'win32'
  ? path.join(rootDir, 'venv', 'Scripts', 'python.exe')
  : path.join(rootDir, 'venv', 'bin', 'python');

if (!existsSync(pythonPath)) {
  console.error('Python environment not found. Run the first-time setup in README.md.');
  process.exit(1);
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

async function findBackendPort(startPort = 8000) {
  for (let port = startPort; port < startPort + 100; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No free backend port found between ${startPort} and ${startPort + 99}.`);
}

const backendPort = await findBackendPort();
const backendUrl = `http://127.0.0.1:${backendPort}`;

if (backendPort !== 8000) {
  console.log(`Port 8000 is busy; using ${backendUrl} for Django.`);
}

process.env.VITE_API_URL = backendUrl;
process.chdir(rootDir);

const pythonCommand = `"${pythonPath}" manage.py runserver 127.0.0.1:${backendPort}`;
const { result } = concurrently(
  [
    { command: pythonCommand, name: 'BACKEND', prefixColor: 'blue' },
    { command: 'npm --prefix frontend run dev', name: 'FRONTEND', prefixColor: 'magenta' },
  ],
  {
    killOthersOn: ['failure', 'success'],
    prefix: '[{name}]',
  },
);

try {
  await result;
} catch {
  process.exitCode = 1;
}
