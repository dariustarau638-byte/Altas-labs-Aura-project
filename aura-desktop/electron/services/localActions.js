import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { shell } from 'electron';

const execFileAsync = promisify(execFile);

/**
 * Catalog of safe local automations available in Companion and Control Center.
 */
export const LOCAL_ACTIONS_CATALOG = [
  {
    id: 'system_health',
    title: 'Quick PC Diagnostics (RAM, CPU & SSD)',
    description: 'Analyzes top memory-consuming processes and free disk storage.',
    category: 'System',
    icon: 'Activity',
    requiresApproval: false,
  },
  {
    id: 'organize_downloads',
    title: 'Organize Downloads Folder',
    description: 'Automatically groups downloads into Documents, Images, Archives, and Installers.',
    category: 'Files',
    icon: 'FolderKanban',
    requiresApproval: true,
  },
  {
    id: 'clean_temp',
    title: 'Clean Temporary Files (%TEMP%)',
    description: 'Safely removes stale cache and temporary files to free up disk space.',
    category: 'Maintenance',
    icon: 'Sparkles',
    requiresApproval: true,
  },
  {
    id: 'volume_mute',
    title: 'Mute / Unmute Audio',
    description: 'Instantly toggles Windows system master volume.',
    category: 'Audio',
    icon: 'VolumeX',
    requiresApproval: false,
  },
  {
    id: 'volume_up',
    title: 'Increase Volume (+10%)',
    description: 'Increases master system volume.',
    category: 'Audio',
    icon: 'Volume2',
    requiresApproval: false,
  },
  {
    id: 'volume_down',
    title: 'Decrease Volume (-10%)',
    description: 'Decreases master system volume.',
    category: 'Audio',
    icon: 'Volume1',
    requiresApproval: false,
  },
  {
    id: 'empty_recycle_bin',
    title: 'Empty Recycle Bin',
    description: 'Purges deleted files in the Recycle Bin to reclaim storage.',
    category: 'Maintenance',
    icon: 'Trash2',
    requiresApproval: true,
  },
  {
    id: 'toggle_dark_mode',
    title: 'Toggle Windows Dark / Light Mode',
    description: 'Switches the Windows application theme between dark and light modes.',
    category: 'System',
    icon: 'Moon',
    requiresApproval: false,
  },
];

const FILE_CATEGORIES = [
  { folder: 'Documents', exts: new Set(['.pdf', '.doc', '.docx', '.txt', '.rtf', '.xlsx', '.xls', '.csv', '.pptx', '.ppt', '.md']) },
  { folder: 'Images', exts: new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp', '.ico']) },
  { folder: 'Archives', exts: new Set(['.zip', '.rar', '.7z', '.tar', '.gz']) },
  { folder: 'Installers', exts: new Set(['.exe', '.msi', '.msix', '.bat']) },
  { folder: 'Media_Video_Audio', exts: new Set(['.mp4', '.mkv', '.mov', '.avi', '.mp3', '.wav', '.flac']) },
  { folder: 'Code_and_Data', exts: new Set(['.json', '.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css', '.sql', '.xml']) },
];

async function sendMediaKey(keyCode, times = 1) {
  const ps = `
$wsh = New-Object -ComObject WScript.Shell
for ($i = 0; $i -lt ${Number(times) || 1}; $i++) {
  $wsh.SendKeys([char]${Number(keyCode)})
  Start-Sleep -Milliseconds 40
}
`;
  await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
    timeout: 4000,
    windowsHide: true,
  });
}

/**
 * Organizes root files in Downloads into categorized subdirectories.
 */
async function organizeDownloadsFolder() {
  const downloadsDir = path.join(os.homedir(), 'Downloads');
  const entries = await fs.readdir(downloadsDir, { withFileTypes: true });
  const moved = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    const match = FILE_CATEGORIES.find((c) => c.exts.has(ext));
    if (!match) continue;

    const targetDir = path.join(downloadsDir, `Aura_${match.folder}`);
    await fs.mkdir(targetDir, { recursive: true });

    const srcPath = path.join(downloadsDir, entry.name);
    let destPath = path.join(targetDir, entry.name);

    try {
      await fs.access(destPath);
      const base = path.basename(entry.name, ext);
      destPath = path.join(targetDir, `${base}_${Date.now()}${ext}`);
    } catch {
      // destPath is free
    }

    try {
      await fs.rename(srcPath, destPath);
      moved.push({ name: entry.name, folder: `Aura_${match.folder}` });
    } catch {
      // skip locked files
    }
  }

  return {
    ok: true,
    title: 'Organize Downloads Folder',
    summary:
      moved.length > 0
        ? `✅ Organized ${moved.length} files from Downloads into dedicated subfolders (${moved
            .slice(0, 6)
            .map((m) => `${m.name} → ${m.folder}`)
            .join(', ')}${moved.length > 6 ? '...' : ''}).`
        : '✨ Your Downloads folder is already clean (no loose files found in root).',
    details: moved,
  };
}

/**
 * Cleans temporary files from %TEMP% not locked by active processes.
 */
async function cleanTempFolder() {
  const tempDir = os.tmpdir();
  const entries = await fs.readdir(tempDir, { withFileTypes: true });
  let deletedCount = 0;
  let freedBytes = 0;

  for (const entry of entries.slice(0, 120)) {
    const fullPath = path.join(tempDir, entry.name);
    try {
      const stat = await fs.stat(fullPath);
      // Avoid files created in the last 10 minutes
      if (Date.now() - stat.mtimeMs < 10 * 60 * 1000) continue;
      if (entry.isFile()) {
        await fs.unlink(fullPath);
        deletedCount += 1;
        freedBytes += stat.size || 0;
      }
    } catch {
      // skip locked
    }
  }

  const freedMb = (freedBytes / (1024 * 1024)).toFixed(2);
  return {
    ok: true,
    title: 'Clean Temporary Files (%TEMP%)',
    summary: `🧹 Safely cleaned ${deletedCount} temporary files (${freedMb} MB freed from ${tempDir}).`,
  };
}

/**
 * Health report (RAM, Top processes, Disk space).
 */
async function getSystemHealthReport() {
  const totalMemGb = (os.totalmem() / 1024 ** 3).toFixed(1);
  const freeMemGb = (os.freemem() / 1024 ** 3).toFixed(1);
  const usedMemGb = (totalMemGb - freeMemGb).toFixed(1);
  const usedPct = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
  const uptimeHours = (os.uptime() / 3600).toFixed(1);

  let topProcs = [];
  let diskInfo = '';

  if (process.platform === 'win32') {
    try {
      const ps = `
$procs = Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 5 ProcessName, @{Name="MemMB";Expression={[math]::Round($_.WorkingSet64 / 1MB, 0)}}
$drive = Get-PSDrive C -ErrorAction SilentlyContinue
@{
  procs = $procs
  freeGb = if ($drive) { [math]::Round($drive.Free / 1GB, 1) } else { 0 }
} | ConvertTo-Json -Compress
`;
      const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
        timeout: 3500,
        windowsHide: true,
      });
      const parsed = JSON.parse(stdout.trim());
      topProcs = Array.isArray(parsed.procs) ? parsed.procs : [];
      if (parsed.freeGb) {
        diskInfo = ` · SSD C: ${parsed.freeGb} GB free`;
      }
    } catch {
      // ignore
    }
  }

  const procLines = topProcs.length
    ? `\nTop RAM Consumers:\n` + topProcs.map((p, i) => `${i + 1}. ${p.ProcessName} — ${p.MemMB} MB`).join('\n')
    : '';

  return {
    ok: true,
    title: 'Quick System Diagnostics',
    summary: `💻 System RAM: ${usedMemGb} GB / ${totalMemGb} GB (${usedPct}% utilized)${diskInfo} · Uptime: ${uptimeHours}h.${procLines}`,
  };
}

/**
 * Executes a catalog action by ID.
 */
export async function executeLocalAction(actionId, params = {}) {
  switch (actionId) {
    case 'system_health':
      return getSystemHealthReport();

    case 'organize_downloads':
      return organizeDownloadsFolder();

    case 'clean_temp':
      return cleanTempFolder();

    case 'volume_mute':
      await sendMediaKey(173, 1);
      return {
        ok: true,
        title: 'Windows Audio Control',
        summary: '🔇 Toggled audio mute state on PC.',
      };

    case 'volume_up':
      await sendMediaKey(175, params.steps || 5);
      return {
        ok: true,
        title: 'Windows Audio Control',
        summary: '🔊 Increased system volume (+10%).',
      };

    case 'volume_down':
      await sendMediaKey(174, params.steps || 5);
      return {
        ok: true,
        title: 'Windows Audio Control',
        summary: '🔉 Decreased system volume (-10%).',
      };

    case 'empty_recycle_bin': {
      const ps = `Clear-RecycleBin -Force -ErrorAction SilentlyContinue`;
      await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
        timeout: 6000,
        windowsHide: true,
      });
      return {
        ok: true,
        title: 'Recycle Bin',
        summary: '🗑️ Recycle Bin successfully emptied.',
      };
    }

    case 'toggle_dark_mode': {
      const ps = `
$path = "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize"
$curr = (Get-ItemProperty -Path $path -Name AppsUseLightTheme -ErrorAction SilentlyContinue).AppsUseLightTheme
$next = if ($curr -eq 0) { 1 } else { 0 }
Set-ItemProperty -Path $path -Name AppsUseLightTheme -Value $next
Set-ItemProperty -Path $path -Name SystemUsesLightTheme -Value $next
if ($next -eq 0) { "Dark Mode" } else { "Light Mode" }
`;
      const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
        timeout: 4000,
        windowsHide: true,
      });
      const modeName = stdout.trim() || 'Dark/Light Mode';
      return {
        ok: true,
        title: 'Windows System Theme',
        summary: `🌓 Switched Windows theme to **${modeName}**.`,
      };
    }

    case 'open_settings': {
      const uri = params.uri || 'ms-settings:';
      await shell.openExternal(uri);
      return {
        ok: true,
        title: 'Windows Settings',
        summary: `⚙️ Opened Windows Settings (${uri}).`,
      };
    }

    case 'close_app': {
      const target = String(params.processName || '')
        .replace(/\.exe$/i, '')
        .replace(/[^a-zA-Z0-9_-]/g, '');
      if (!target) {
        throw new Error('Please specify the application process name to close.');
      }
      const ps = `Stop-Process -Name "${target}" -ErrorAction Stop`;
      try {
        await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
          timeout: 4000,
          windowsHide: true,
        });
        return {
          ok: true,
          title: `Close Application (${target})`,
          summary: `🛑 Closed process "${target}" successfully.`,
        };
      } catch {
        return {
          ok: false,
          title: `Close Application (${target})`,
          summary: `Active process "${target}" was not found or is already closed.`,
        };
      }
    }

    default:
      throw new Error(`Unknown local action: ${actionId}`);
  }
}

/**
 * Natural language interpreter for `/action <task>`.
 */
export async function runNaturalLanguageLocalAction(rawQuery = '') {
  const q = rawQuery.trim().toLowerCase();
  if (!q) {
    return {
      ok: true,
      showCatalog: true,
      catalog: LOCAL_ACTIONS_CATALOG,
      summary: '⚡ Local Actions Automation — choose a quick action below or type `/action <command>`:',
    };
  }

  if (/(mute|sound off|quiet|silence)/i.test(q)) {
    return executeLocalAction('volume_mute');
  }
  if (/(volume.*(up|louder|increase|raise)|turn.*up)/i.test(q)) {
    return executeLocalAction('volume_up', { steps: 6 });
  }
  if (/(volume.*(down|softer|decrease|lower)|turn.*down)/i.test(q)) {
    return executeLocalAction('volume_down', { steps: 6 });
  }
  if (/(organize|sort|clean).*(downloads?|files?|folders?)/i.test(q)) {
    return executeLocalAction('organize_downloads');
  }
  if (/(clean|clear|purge).*(temp|cache|disk|space)/i.test(q)) {
    return executeLocalAction('clean_temp');
  }
  if (/(empty|clear|purge).*(recycle|bin|trash)/i.test(q)) {
    return executeLocalAction('empty_recycle_bin');
  }
  if (/(dark mode|light mode|theme|windows theme)/i.test(q)) {
    return executeLocalAction('toggle_dark_mode');
  }
  if (/(health|ram|cpu|processes|memory|diagnostic|specs)/i.test(q)) {
    return executeLocalAction('system_health');
  }
  if (/(sound settings|audio settings)/i.test(q)) {
    return executeLocalAction('open_settings', { uri: 'ms-settings:sound' });
  }
  if (/(display settings|screen settings|resolution)/i.test(q)) {
    return executeLocalAction('open_settings', { uri: 'ms-settings:display' });
  }
  if (/(network settings|wifi settings)/i.test(q)) {
    return executeLocalAction('open_settings', { uri: 'ms-settings:network' });
  }

  const closeMatch = q.match(/(?:close|kill|stop|terminate)\s+([a-z0-9_.-]+)/i);
  if (closeMatch) {
    return executeLocalAction('close_app', { processName: closeMatch[1] });
  }

  const openMatch = q.match(/(?:open|launch|start|run)\s+([a-z0-9_.-]+)/i);
  if (openMatch) {
    const appMap = {
      notepad: 'notepad.exe',
      calculator: 'calc.exe',
      calc: 'calc.exe',
      paint: 'mspaint.exe',
      explorer: 'explorer.exe',
      cmd: 'cmd.exe',
      terminal: 'wt.exe',
      taskmgr: 'taskmgr.exe',
      vscode: 'code',
    };
    const key = openMatch[1].toLowerCase();
    const exe = appMap[key] || key;
    const child = spawn('cmd.exe', ['/c', 'start', '', exe], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    return {
      ok: true,
      title: `Launch Application (${openMatch[1]})`,
      summary: `🚀 Launched "${openMatch[1]}" on desktop.`,
    };
  }

  // Fallback
  const health = await getSystemHealthReport();
  return {
    ok: true,
    showCatalog: true,
    catalog: LOCAL_ACTIONS_CATALOG,
    summary: `${health.summary}\n\nYou can run any of the local automations below with a single click:`,
  };
}
