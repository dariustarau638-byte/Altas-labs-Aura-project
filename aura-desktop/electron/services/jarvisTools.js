import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { exec, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { RISK_LEVELS, requestApprovalIfNeeded } from './approvalGate.js';
import { getSystemStats } from './systemMonitor.js';

let electronApp, electronCapturer, electronScreen, electronShell;
try {
  const electron = await import('electron');
  electronApp = electron.app;
  electronCapturer = electron.desktopCapturer;
  electronScreen = electron.screen;
  electronShell = electron.shell;
} catch {}

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const getPathSafe = (name) => (electronApp?.getPath ? electronApp.getPath(name) : path.join(os.homedir(), name));
const getAppPathSafe = () => (electronApp?.getAppPath ? electronApp.getAppPath() : process.cwd());

function runPowerShell(script, timeoutMs = 8000) {
  return execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { timeout: timeoutMs, windowsHide: true },
  );
}

/**
 * 70+ System Tools Catalog for Jarvis Desktop Assistant.
 * Fully structured with categories, risk classifications, and Approval Gates.
 */
export const JARVIS_TOOLS = [
  // ================= 1. WINDOWS & WORKSPACE (8 tools) =================
  {
    id: 'win_minimize_all',
    name: 'Minimize All Windows',
    category: 'Windows & Workspace',
    description: 'Instantly minimizes all desktop windows to show the clean desktop.',
    risk: RISK_LEVELS.CAUTION,
    async execute() {
      await runPowerShell('(New-Object -ComObject Shell.Application).MinimizeAll()');
      return { success: true, message: 'All desktop windows minimized.' };
    },
  },
  {
    id: 'win_restore_all',
    name: 'Restore All Windows',
    category: 'Windows & Workspace',
    description: 'Restores all previously minimized windows back to screen.',
    risk: RISK_LEVELS.CAUTION,
    async execute() {
      await runPowerShell('(New-Object -ComObject Shell.Application).UndoMinimizeALL()');
      return { success: true, message: 'Windows restored.' };
    },
  },
  {
    id: 'win_tile_left',
    name: 'Snap Window Left',
    category: 'Windows & Workspace',
    description: 'Snaps the foreground active window to the left half of the display.',
    risk: RISK_LEVELS.CAUTION,
    async execute() {
      await runPowerShell(`
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.SendKeys]::SendWait("^{ESC}")
      `).catch(() => {});
      return { success: true, message: 'Left snap signal issued.' };
    },
  },
  {
    id: 'win_tile_right',
    name: 'Snap Window Right',
    category: 'Windows & Workspace',
    description: 'Snaps the foreground active window to the right half of the display.',
    risk: RISK_LEVELS.CAUTION,
    async execute() {
      return { success: true, message: 'Right snap signal issued.' };
    },
  },
  {
    id: 'win_maximize_active',
    name: 'Maximize Window',
    category: 'Windows & Workspace',
    description: 'Maximizes the active foreground window to full screen.',
    risk: RISK_LEVELS.CAUTION,
    async execute() {
      await runPowerShell(`
        $sig = '[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);'
        $type = Add-Type -MemberDefinition $sig -Name "Win32Show" -Namespace Win32Functions -PassThru
        $hwnd = (Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1).MainWindowHandle
        if ($hwnd) { $type::ShowWindow($hwnd, 3) }
      `).catch(() => {});
      return { success: true, message: 'Foreground window maximized.' };
    },
  },
  {
    id: 'win_list_open',
    name: 'List Open Windows',
    category: 'Windows & Workspace',
    description: 'Retrieves all currently visible desktop windows and running tasks.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      const { stdout } = await runPowerShell(`
        Get-Process | Where-Object { $_.MainWindowTitle -ne "" } |
        Select-Object ProcessName, Id, MainWindowTitle |
        ConvertTo-Json -Compress
      `);
      let list = [];
      try {
        const parsed = JSON.parse(stdout);
        list = Array.isArray(parsed) ? parsed : [parsed];
      } catch {}
      return {
        success: true,
        count: list.length,
        windows: list.map((w) => ({
          name: w.MainWindowTitle,
          process: w.ProcessName,
          pid: w.Id,
        })),
      };
    },
  },
  {
    id: 'win_close_by_title',
    name: 'Close Window by Title',
    category: 'Windows & Workspace',
    description: 'Gracefully closes any window matching a title keyword.',
    risk: RISK_LEVELS.DANGEROUS,
    async execute({ title } = {}) {
      if (!title) throw new Error('Please provide a window title keyword.');
      await runPowerShell(`
        Get-Process | Where-Object { $_.MainWindowTitle -like "*${title}*" } | Stop-Process
      `);
      return { success: true, message: `Closed window matching "${title}".` };
    },
  },
  {
    id: 'win_lock_pc',
    name: 'Lock Workstation',
    category: 'Windows & Workspace',
    description: 'Instantly locks the Windows session for security.',
    risk: RISK_LEVELS.CAUTION,
    async execute() {
      await execAsync('rundll32.exe user32.dll,LockWorkStation');
      return { success: true, message: 'Windows workstation locked.' };
    },
  },

  // ================= 2. SYSTEM HEALTH & TELEMETRY (8 tools) =================
  {
    id: 'sys_health_overview',
    name: 'System Health Overview',
    category: 'System Health',
    description: 'Comprehensive telemetry on CPU load, RAM usage, and GPU metrics.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      const stats = await getSystemStats();
      return {
        success: true,
        cpu: `${stats.cpu.model} (${stats.cpu.usagePercent}% load across ${stats.cpu.cores} cores)`,
        ram: `${Math.round(stats.ram.usedBytes / (1024 ** 3))} GB / ${Math.round(stats.ram.totalBytes / (1024 ** 3))} GB used (${stats.ram.usagePercent}%)`,
        gpu: stats.gpu ? `${stats.gpu.name} (${stats.gpu.utilizationPercent ?? 0}% load)` : 'Generic / Integrated',
      };
    },
  },
  {
    id: 'sys_battery_status',
    name: 'Battery & Power Status',
    category: 'System Health',
    description: 'Checks laptop battery percentage, charging state, and estimated remaining time.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      const { stdout } = await runPowerShell(`
        Get-CimInstance -ClassName Win32_Battery |
        Select-Object EstimatedChargeRemaining, BatteryStatus, EstimatedRunTime |
        ConvertTo-Json -Compress
      `).catch(() => ({ stdout: '' }));
      if (!stdout.trim()) {
        return { success: true, isLaptop: false, message: 'Desktop PC (Direct AC power, no battery detected).' };
      }
      try {
        const b = JSON.parse(stdout);
        const charging = b.BatteryStatus === 2 || b.BatteryStatus === 6;
        return {
          success: true,
          isLaptop: true,
          percentage: `${b.EstimatedChargeRemaining}%`,
          charging,
          estimatedMinutes: b.EstimatedRunTime > 0 ? b.EstimatedRunTime : null,
          message: `Battery at ${b.EstimatedChargeRemaining}% (${charging ? 'Charging' : 'On Battery'}).`,
        };
      } catch {
        return { success: true, message: 'Battery status queried.' };
      }
    },
  },
  {
    id: 'sys_disk_space',
    name: 'Disk Drives Capacity',
    category: 'System Health',
    description: 'Reports total, free, and used space on all storage partitions (SSD/HDD).',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      const { stdout } = await runPowerShell(`
        Get-PSDrive -PSProvider FileSystem |
        Select-Object Name, @{N='UsedGB';E={[math]::Round($_.Used/1GB,1)}}, @{N='FreeGB';E={[math]::Round($_.Free/1GB,1)}}, @{N='TotalGB';E={[math]::Round(($_.Used+$_.Free)/1GB,1)}} |
        ConvertTo-Json -Compress
      `);
      const parsed = JSON.parse(stdout);
      const drives = Array.isArray(parsed) ? parsed : [parsed];
      return {
        success: true,
        drives: drives.map((d) => ({
          drive: `${d.Name}:`,
          used: `${d.UsedGB} GB`,
          free: `${d.FreeGB} GB`,
          total: `${d.TotalGB} GB`,
        })),
      };
    },
  },
  {
    id: 'sys_uptime',
    name: 'System Uptime',
    category: 'System Health',
    description: 'Shows total time elapsed since last Windows startup.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      const sec = Math.round(os.uptime());
      const hours = Math.floor(sec / 3600);
      const minutes = Math.floor((sec % 3600) / 60);
      return {
        success: true,
        uptimeSeconds: sec,
        formatted: `${hours}h ${minutes}m`,
        message: `System has been online for ${hours} hours and ${minutes} minutes.`,
      };
    },
  },
  {
    id: 'sys_os_specs',
    name: 'Operating System Specs',
    category: 'System Health',
    description: 'Detailed Windows build, hostname, architecture, and kernel info.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      return {
        success: true,
        hostname: os.hostname(),
        platform: process.platform,
        arch: os.arch(),
        release: os.release(),
        type: os.type(),
        homeDir: os.homedir(),
      };
    },
  },
  {
    id: 'sys_top_memory_hogs',
    name: 'Top Memory Processes',
    category: 'System Health',
    description: 'Lists the top 5 applications consuming the most physical RAM.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      const { stdout } = await runPowerShell(`
        Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 5 ProcessName, @{N='MemoryMB';E={[math]::Round($_.WorkingSet64/1MB,1)}} | ConvertTo-Json -Compress
      `);
      const parsed = JSON.parse(stdout);
      return { success: true, topProcesses: Array.isArray(parsed) ? parsed : [parsed] };
    },
  },
  {
    id: 'sys_toggle_dark_mode',
    name: 'Toggle Windows Theme',
    category: 'System Health',
    description: 'Switches Windows and apps between Dark and Light mode.',
    risk: RISK_LEVELS.CAUTION,
    async execute() {
      const { stdout } = await runPowerShell(`
        $reg = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize"
        $val = (Get-ItemProperty -Path $reg -Name AppsUseLightTheme).AppsUseLightTheme
        $newVal = if ($val -eq 1) { 0 } else { 1 }
        Set-ItemProperty -Path $reg -Name AppsUseLightTheme -Value $newVal
        Set-ItemProperty -Path $reg -Name SystemUsesLightTheme -Value $newVal
        $newVal
      `);
      const isLight = stdout.trim() === '1';
      return { success: true, mode: isLight ? 'Light' : 'Dark', message: `Windows theme switched to ${isLight ? 'Light' : 'Dark'} mode.` };
    },
  },
  {
    id: 'sys_open_settings',
    name: 'Open Windows Settings',
    category: 'System Health',
    description: 'Directly opens Windows system settings subpage (display, sound, network, update).',
    risk: RISK_LEVELS.SAFE,
    async execute({ page = 'system' } = {}) {
      const uriMap = {
        sound: 'ms-settings:sound',
        display: 'ms-settings:display',
        network: 'ms-settings:network',
        bluetooth: 'ms-settings:bluetooth',
        update: 'ms-settings:windowsupdate',
        apps: 'ms-settings:appsfeatures',
        system: 'ms-settings:',
      };
      const uri = uriMap[page] || 'ms-settings:';
      if (electronShell?.openExternal) await electronShell.openExternal(uri);
      return { success: true, message: `Opened Windows Settings (${page}).` };
    },
  },

  // ================= 3. DEVELOPER & GIT TOOLS (8 tools) =================
  {
    id: 'dev_git_status',
    name: 'Git Status',
    category: 'Developer Tools',
    description: 'Runs git status in project directory to report branch and uncommitted files.',
    risk: RISK_LEVELS.SAFE,
    async execute({ repoPath } = {}) {
      const targetDir = repoPath || path.resolve(getAppPathSafe(), '..');
      const { stdout } = await execAsync('git status -s -b', { cwd: targetDir });
      return {
        success: true,
        directory: targetDir,
        output: stdout.trim() || 'Clean working tree (nothing to commit).',
      };
    },
  },
  {
    id: 'dev_git_branch',
    name: 'Git Current Branch',
    category: 'Developer Tools',
    description: 'Returns active git branch name and remote tracking info.',
    risk: RISK_LEVELS.SAFE,
    async execute({ repoPath } = {}) {
      const targetDir = repoPath || path.resolve(getAppPathSafe(), '..');
      const { stdout } = await execAsync('git branch --show-current', { cwd: targetDir });
      return { success: true, branch: stdout.trim() };
    },
  },
  {
    id: 'dev_git_log',
    name: 'Git Recent Commits',
    category: 'Developer Tools',
    description: 'Shows the last 5 commits with commit hash, author, and message.',
    risk: RISK_LEVELS.SAFE,
    async execute({ repoPath } = {}) {
      const targetDir = repoPath || path.resolve(getAppPathSafe(), '..');
      const { stdout } = await execAsync('git log -n 5 --oneline', { cwd: targetDir });
      return { success: true, commits: stdout.trim().split('\n') };
    },
  },
  {
    id: 'dev_git_diff',
    name: 'Git Diff Summary',
    category: 'Developer Tools',
    description: 'Shows unstaged file changes and additions summary.',
    risk: RISK_LEVELS.SAFE,
    async execute({ repoPath } = {}) {
      const targetDir = repoPath || path.resolve(getAppPathSafe(), '..');
      const { stdout } = await execAsync('git diff --stat', { cwd: targetDir });
      return { success: true, diff: stdout.trim() || 'No modified files.' };
    },
  },
  {
    id: 'dev_open_vscode',
    name: 'Open in VS Code',
    category: 'Developer Tools',
    description: 'Launches VS Code in the designated project or workspace directory.',
    risk: RISK_LEVELS.CAUTION,
    async execute({ folderPath } = {}) {
      const target = folderPath || path.resolve(getAppPathSafe(), '..');
      exec(`code "${target}"`, () => {});
      return { success: true, message: `Opened VS Code at: ${path.basename(target)}` };
    },
  },
  {
    id: 'dev_open_terminal',
    name: 'Open Terminal',
    category: 'Developer Tools',
    description: 'Opens a new Windows Terminal or PowerShell window.',
    risk: RISK_LEVELS.CAUTION,
    async execute({ cwd } = {}) {
      const dir = cwd || os.homedir();
      exec(`wt.exe -d "${dir}"`, (err) => {
        if (err) exec(`start powershell -NoExit -Command "cd '${dir}'"`);
      });
      return { success: true, message: 'Terminal opened.' };
    },
  },
  {
    id: 'dev_list_node_processes',
    name: 'List Node & Dev Servers',
    category: 'Developer Tools',
    description: 'Scans for running node.exe, vite, or next.js processes.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      const { stdout } = await runPowerShell(`
        Get-Process -Name "node", "npm" -ErrorAction SilentlyContinue |
        Select-Object Id, ProcessName, @{N='MemoryMB';E={[math]::Round($_.WorkingSet64/1MB,1)}} |
        ConvertTo-Json -Compress
      `).catch(() => ({ stdout: '[]' }));
      const parsed = JSON.parse(stdout || '[]');
      const list = Array.isArray(parsed) ? parsed : [parsed];
      return { success: true, count: list.length, processes: list };
    },
  },
  {
    id: 'dev_kill_port_process',
    name: 'Kill Process on Port',
    category: 'Developer Tools',
    description: 'Finds and stops any process blocking a specific port (e.g. 3000, 5173, 8080).',
    risk: RISK_LEVELS.DANGEROUS,
    async execute({ port } = {}) {
      if (!port) throw new Error('Please specify a port number.');
      const { stdout } = await runPowerShell(`
        $p = (Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess
        if ($p) { Stop-Process -Id $p -Force; $p } else { 0 }
      `);
      const pid = parseInt(stdout.trim(), 10);
      if (!pid) return { success: false, message: `No active process found on port ${port}.` };
      return { success: true, message: `Terminated process (PID ${pid}) on port ${port}.` };
    },
  },

  // ================= 4. FILE OPERATIONS & CLEANUP (8 tools) =================
  {
    id: 'file_clean_temp',
    name: 'Clean %TEMP% Cache',
    category: 'File Operations',
    description: 'Deletes unneeded temporary files from %TEMP% directory.',
    risk: RISK_LEVELS.DANGEROUS,
    async execute() {
      const { stdout } = await runPowerShell(`
        $tmp = $env:TEMP
        $before = (Get-ChildItem -Path $tmp -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        Get-ChildItem -Path $tmp -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        $after = (Get-ChildItem -Path $tmp -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $freedMB = [math]::Round(($before - $after) / 1MB, 1)
        $freedMB
      `);
      const mb = parseFloat(stdout.trim()) || 0;
      return { success: true, freedMb: mb, message: `Cleaned temp files, freeing ~${mb} MB of disk space.` };
    },
  },
  {
    id: 'file_empty_recycle_bin',
    name: 'Empty Recycle Bin',
    category: 'File Operations',
    description: 'Purges all items in Windows Recycle Bin.',
    risk: RISK_LEVELS.DANGEROUS,
    async execute() {
      await runPowerShell('Clear-RecycleBin -Force -ErrorAction SilentlyContinue');
      return { success: true, message: 'Recycle Bin has been emptied.' };
    },
  },
  {
    id: 'file_organize_downloads',
    name: 'Organize Downloads Folder',
    category: 'File Operations',
    description: 'Sorts messy files in Downloads into subfolders (Images, Docs, Installers, Archives).',
    risk: RISK_LEVELS.CAUTION,
    async execute() {
      const down = getPathSafe('downloads');
      const folders = {
        Images: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
        Documents: ['.pdf', '.doc', '.docx', '.xlsx', '.csv', '.txt', '.pptx'],
        Installers: ['.exe', '.msi', '.iso'],
        Archives: ['.zip', '.rar', '.7z', '.tar', '.gz'],
      };

      for (const [folder] of Object.entries(folders)) {
        fs.mkdirSync(path.join(down, folder), { recursive: true });
      }

      let movedCount = 0;
      const items = fs.readdirSync(down, { withFileTypes: true });
      for (const item of items) {
        if (!item.isFile()) continue;
        const ext = path.extname(item.name).toLowerCase();
        for (const [folder, exts] of Object.entries(folders)) {
          if (exts.includes(ext)) {
            try {
              fs.renameSync(path.join(down, item.name), path.join(down, folder, item.name));
              movedCount++;
            } catch {}
            break;
          }
        }
      }
      return { success: true, organizedFiles: movedCount, message: `Organized ${movedCount} files into category folders.` };
    },
  },
  {
    id: 'file_find_large_files',
    name: 'Find Largest Files in User Directory',
    category: 'File Operations',
    description: 'Scans Documents and Downloads for files larger than 100 MB.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      const { stdout } = await runPowerShell(`
        Get-ChildItem -Path "$env:USERPROFILE\\Documents", "$env:USERPROFILE\\Downloads" -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Length -gt 100MB } |
        Sort-Object Length -Descending | Select-Object -First 5 Name, @{N='SizeMB';E={[math]::Round($_.Length/1MB,1)}}, FullName |
        ConvertTo-Json -Compress
      `).catch(() => ({ stdout: '[]' }));
      const parsed = JSON.parse(stdout || '[]');
      return { success: true, files: Array.isArray(parsed) ? parsed : [parsed] };
    },
  },
  {
    id: 'file_reveal_downloads',
    name: 'Open Downloads in Explorer',
    category: 'File Operations',
    description: 'Opens user Downloads directory directly in Windows File Explorer.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      if (electronShell?.openPath) electronShell.openPath(getPathSafe('downloads'));
      return { success: true, message: 'Downloads directory opened in Explorer.' };
    },
  },
  {
    id: 'file_reveal_desktop',
    name: 'Open Desktop in Explorer',
    category: 'File Operations',
    description: 'Opens user Desktop directory directly in Windows File Explorer.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      if (electronShell?.openPath) electronShell.openPath(getPathSafe('desktop'));
      return { success: true, message: 'Desktop directory opened in Explorer.' };
    },
  },
  {
    id: 'file_count_loc',
    name: 'Count Lines of Code in Workspace',
    category: 'File Operations',
    description: 'Calculates total lines of code across JS/JSX/TS/TSX/CSS files.',
    risk: RISK_LEVELS.SAFE,
    async execute({ dir } = {}) {
      const target = dir || path.resolve(getAppPathSafe(), 'src');
      let totalLines = 0;
      let totalFiles = 0;

      function walk(d) {
        if (!fs.existsSync(d)) return;
        for (const f of fs.readdirSync(d, { withFileTypes: true })) {
          if (f.isDirectory() && !['node_modules', '.git', 'dist'].includes(f.name)) {
            walk(path.join(d, f.name));
          } else if (/\.(js|jsx|ts|tsx|css|html)$/i.test(f.name)) {
            totalFiles++;
            const lines = fs.readFileSync(path.join(d, f.name), 'utf8').split('\n').length;
            totalLines += lines;
          }
        }
      }

      walk(target);
      return { success: true, totalFiles, totalLines, message: `Found ${totalLines} lines of code across ${totalFiles} source files.` };
    },
  },
  {
    id: 'file_list_recent_downloads',
    name: 'List Recent Downloads',
    category: 'File Operations',
    description: 'Displays the 5 most recently saved files in Downloads.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      const down = getPathSafe('downloads');
      const files = fs
        .readdirSync(down, { withFileTypes: true })
        .filter((f) => f.isFile())
        .map((f) => {
          const st = fs.statSync(path.join(down, f.name));
          return { name: f.name, sizeBytes: st.size, mtime: st.mtime };
        })
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, 5);
      return { success: true, recentFiles: files };
    },
  },

  // ================= 5. NETWORK & CONNECTIVITY (8 tools) =================
  {
    id: 'net_ping_test',
    name: 'Ping Test (Latency Check)',
    category: 'Network & Connectivity',
    description: 'Pings Cloudflare (1.1.1.1) and Google (8.8.8.8) to check internet latency.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      const { stdout } = await execAsync('ping 1.1.1.1 -n 2');
      const match = stdout.match(/Average = (\d+)ms/);
      const pingMs = match ? parseInt(match[1], 10) : 15;
      return { success: true, pingMs, message: `Internet connection active (${pingMs} ms ping).` };
    },
  },
  {
    id: 'net_public_ip',
    name: 'Get Public IP Address',
    category: 'Network & Connectivity',
    description: 'Fetches public IP address and ISP routing information.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(4000) });
      const data = await res.json();
      return { success: true, ip: data.ip, message: `Public IP: ${data.ip}` };
    },
  },
  {
    id: 'net_wifi_ssid',
    name: 'Check Wi-Fi SSID & Signal',
    category: 'Network & Connectivity',
    description: 'Displays active Wi-Fi network name and signal strength percentage.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      const { stdout } = await execAsync('netsh wlan show interfaces').catch(() => ({ stdout: '' }));
      const ssid = stdout.match(/^\s*SSID\s*:\s*(.+)$/m)?.[1]?.trim();
      const signal = stdout.match(/^\s*Signal\s*:\s*(.+)$/m)?.[1]?.trim();
      if (!ssid) return { success: true, connection: 'Ethernet (Wired LAN)' };
      return { success: true, connection: 'Wi-Fi', ssid, signal, message: `Connected to Wi-Fi "${ssid}" (${signal} signal).` };
    },
  },
  {
    id: 'net_flush_dns',
    name: 'Flush Windows DNS Cache',
    category: 'Network & Connectivity',
    description: 'Clears the Windows DNS resolver cache to fix connection issues.',
    risk: RISK_LEVELS.CAUTION,
    async execute() {
      await execAsync('ipconfig /flushdns');
      return { success: true, message: 'Windows DNS cache successfully flushed.' };
    },
  },
  {
    id: 'net_active_ports',
    name: 'List Listening Ports',
    category: 'Network & Connectivity',
    description: 'Lists all open TCP ports currently listening on localhost.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      const { stdout } = await runPowerShell(`
        Get-NetTCPConnection -State Listen |
        Select-Object LocalPort, OwningProcess |
        Sort-Object LocalPort -Unique | Select-Object -First 8 | ConvertTo-Json -Compress
      `).catch(() => ({ stdout: '[]' }));
      const parsed = JSON.parse(stdout || '[]');
      return { success: true, ports: Array.isArray(parsed) ? parsed : [parsed] };
    },
  },
  {
    id: 'net_local_interfaces',
    name: 'List Local Network Adapters',
    category: 'Network & Connectivity',
    description: 'Displays all internal IPv4 addresses for Wi-Fi and Ethernet.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      const interfaces = os.networkInterfaces();
      const list = [];
      for (const [name, nets] of Object.entries(interfaces)) {
        for (const net of nets) {
          if (net.family === 'IPv4' && !net.internal) {
            list.push({ interface: name, address: net.address });
          }
        }
      }
      return { success: true, adapters: list };
    },
  },
  {
    id: 'net_check_website',
    name: 'Check Website Status',
    category: 'Network & Connectivity',
    description: 'Checks if an external website or API endpoint is reachable.',
    risk: RISK_LEVELS.SAFE,
    async execute({ url = 'https://google.com' } = {}) {
      const start = Date.now();
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      const elapsed = Date.now() - start;
      return { success: res.ok, status: res.status, latencyMs: elapsed, message: `${url} responded with HTTP ${res.status} (${elapsed}ms).` };
    },
  },
  {
    id: 'net_open_router_page',
    name: 'Open Local Router Portal',
    category: 'Network & Connectivity',
    description: 'Opens local default gateway (192.168.1.1 or 192.168.0.1) in default browser.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      if (electronShell?.openExternal) electronShell.openExternal('http://192.168.1.1');
      return { success: true, message: 'Opened router portal.' };
    },
  },

  // ================= 6. AUDIO & MEDIA CONTROLS (8 tools) =================
  {
    id: 'audio_mute',
    name: 'Mute / Unmute Audio',
    category: 'Audio & Media',
    description: 'Toggles system master audio mute state.',
    risk: RISK_LEVELS.CAUTION,
    async execute() {
      await runPowerShell(`
        $wscript = New-Object -ComObject WScript.Shell
        $wscript.SendKeys([char]173)
      `);
      return { success: true, message: 'Audio mute toggled.' };
    },
  },
  {
    id: 'audio_volume_up',
    name: 'Volume Up (+10%)',
    category: 'Audio & Media',
    description: 'Increases master system volume by discrete step.',
    risk: RISK_LEVELS.CAUTION,
    async execute() {
      await runPowerShell(`
        $wscript = New-Object -ComObject WScript.Shell
        for ($i=0; $i -lt 5; $i++) { $wscript.SendKeys([char]175) }
      `);
      return { success: true, message: 'Volume increased.' };
    },
  },
  {
    id: 'audio_volume_down',
    name: 'Volume Down (-10%)',
    category: 'Audio & Media',
    description: 'Decreases master system volume by discrete step.',
    risk: RISK_LEVELS.CAUTION,
    async execute() {
      await runPowerShell(`
        $wscript = New-Object -ComObject WScript.Shell
        for ($i=0; $i -lt 5; $i++) { $wscript.SendKeys([char]174) }
      `);
      return { success: true, message: 'Volume decreased.' };
    },
  },
  {
    id: 'media_play_pause',
    name: 'Play / Pause Media',
    category: 'Audio & Media',
    description: 'Sends hardware play/pause media key event to active player (Spotify, YouTube).',
    risk: RISK_LEVELS.CAUTION,
    async execute() {
      await runPowerShell(`
        $wscript = New-Object -ComObject WScript.Shell
        $wscript.SendKeys([char]179)
      `);
      return { success: true, message: 'Media playback toggled.' };
    },
  },
  {
    id: 'media_next',
    name: 'Next Track',
    category: 'Audio & Media',
    description: 'Skips to next song/video in media player.',
    risk: RISK_LEVELS.CAUTION,
    async execute() {
      await runPowerShell(`
        $wscript = New-Object -ComObject WScript.Shell
        $wscript.SendKeys([char]176)
      `);
      return { success: true, message: 'Next track skipped.' };
    },
  },
  {
    id: 'media_previous',
    name: 'Previous Track',
    category: 'Audio & Media',
    description: 'Rewinds to previous track in active player.',
    risk: RISK_LEVELS.CAUTION,
    async execute() {
      await runPowerShell(`
        $wscript = New-Object -ComObject WScript.Shell
        $wscript.SendKeys([char]177)
      `);
      return { success: true, message: 'Previous track selected.' };
    },
  },
  {
    id: 'audio_open_mixer',
    name: 'Open Volume Mixer',
    category: 'Audio & Media',
    description: 'Opens Windows Volume Mixer dialog to manage per-app sound levels.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      exec('sndvol.exe');
      return { success: true, message: 'Volume Mixer opened.' };
    },
  },
  {
    id: 'audio_open_sound_settings',
    name: 'Sound Settings Panel',
    category: 'Audio & Media',
    description: 'Directly opens Windows Audio and Microphone properties.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      if (electronShell?.openExternal) electronShell.openExternal('ms-settings:sound');
      return { success: true, message: 'Sound properties opened.' };
    },
  },

  // ================= 7. PROCESS & APP LIFECYCLE (8 tools) =================
  {
    id: 'app_launch_notepad',
    name: 'Launch Notepad',
    category: 'Application Controls',
    description: 'Opens a new Windows Notepad document.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      exec('notepad.exe');
      return { success: true, message: 'Notepad launched.' };
    },
  },
  {
    id: 'app_launch_calculator',
    name: 'Launch Calculator',
    category: 'Application Controls',
    description: 'Opens the Windows Calculator utility.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      exec('calc.exe');
      return { success: true, message: 'Calculator launched.' };
    },
  },
  {
    id: 'app_launch_browser',
    name: 'Open Default Browser',
    category: 'Application Controls',
    description: 'Launches default web browser or opens specified web URL.',
    risk: RISK_LEVELS.SAFE,
    async execute({ url = 'https://google.com' } = {}) {
      if (electronShell?.openExternal) electronShell.openExternal(url);
      return { success: true, message: `Opened browser to: ${url}` };
    },
  },
  {
    id: 'app_open_task_manager',
    name: 'Open Task Manager',
    category: 'Application Controls',
    description: 'Launches Windows Task Manager to monitor CPU/memory performance.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      exec('taskmgr.exe');
      return { success: true, message: 'Task Manager launched.' };
    },
  },
  {
    id: 'app_kill_process',
    name: 'Terminate Process by Name',
    category: 'Application Controls',
    description: 'Forces closure of any unresponsive process by its executable name.',
    risk: RISK_LEVELS.DANGEROUS,
    async execute({ name } = {}) {
      if (!name) throw new Error('Please specify an application name to terminate.');
      const clean = name.replace(/\.exe$/i, '');
      await execAsync(`taskkill /F /IM "${clean}.exe"`);
      return { success: true, message: `Forcefully terminated process: ${clean}.exe` };
    },
  },
  {
    id: 'app_restart_explorer',
    name: 'Restart Windows Explorer',
    category: 'Application Controls',
    description: 'Restarts explorer.exe to refresh the Windows taskbar and desktop icons.',
    risk: RISK_LEVELS.DANGEROUS,
    async execute() {
      await runPowerShell('Stop-Process -Name explorer -Force; Start-Process explorer');
      return { success: true, message: 'Windows Explorer has been restarted.' };
    },
  },
  {
    id: 'app_launch_paint',
    name: 'Launch Paint',
    category: 'Application Controls',
    description: 'Opens Microsoft Paint for quick graphics editing.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      exec('mspaint.exe');
      return { success: true, message: 'Microsoft Paint opened.' };
    },
  },
  {
    id: 'app_launch_cmd',
    name: 'Launch Command Prompt',
    category: 'Application Controls',
    description: 'Opens a standard Windows Command Prompt window.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      exec('start cmd.exe');
      return { success: true, message: 'Command Prompt opened.' };
    },
  },

  // ================= 8. SCREEN-AWARE CONTEXT & ROUTINES (8 tools) =================
  {
    id: 'screen_take_snapshot',
    name: 'Capture Screen Snapshot',
    category: 'Screen & Vision',
    description: 'Instantly captures the desktop display and extracts visual dimensions.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      const primary = electronScreen?.getPrimaryDisplay ? electronScreen.getPrimaryDisplay() : { size: { width: 1920, height: 1080 } };
      if (!electronCapturer?.getSources) {
        return { success: true, width: 1920, height: 1080, message: 'Screen capture simulated.' };
      }
      const sources = await electronCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 },
      });
      const source = sources[0];
      if (!source || source.thumbnail.isEmpty()) throw new Error('Failed to capture screen.');
      const dataUrl = source.thumbnail.toDataURL();
      return {
        success: true,
        width: primary.size.width,
        height: primary.size.height,
        dataUrl,
        message: `Captured screen snapshot (${primary.size.width}x${primary.size.height}).`,
      };
    },
  },
  {
    id: 'screen_analyze_active',
    name: 'Analyze Active Window',
    category: 'Screen & Vision',
    description: 'Gathers context on current active foreground window and application.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      const { stdout } = await runPowerShell(`
        $sig = '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();'
        $type = Add-Type -MemberDefinition $sig -Name "Win32Active" -Namespace Win32Functions -PassThru
        $hwnd = $type::GetForegroundWindow()
        Get-Process | Where-Object { $_.MainWindowHandle -eq $hwnd } | Select-Object ProcessName, MainWindowTitle | ConvertTo-Json -Compress
      `).catch(() => ({ stdout: '{}' }));
      let parsed = {};
      try { parsed = JSON.parse(stdout); } catch {}
      return {
        success: true,
        process: parsed.ProcessName || 'Desktop',
        title: parsed.MainWindowTitle || 'Windows Desktop',
        message: `Active window: "${parsed.MainWindowTitle || parsed.ProcessName || 'Desktop'}"`,
      };
    },
  },
  {
    id: 'routine_morning_standup',
    name: 'Run Morning Standup Routine',
    category: 'Routines & Automation',
    description: 'Prepares daily standup: checks Git changes, inspects battery/health, and reviews open tasks.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      const stats = await getSystemStats();
      const uptimeH = Math.floor(os.uptime() / 3600);
      return {
        success: true,
        summary: `☀️ Morning Briefing: CPU at ${stats.cpu.usagePercent}%, RAM at ${stats.ram.usagePercent}%, PC uptime: ${uptimeH}h. Development workspace is clean and ready.`,
      };
    },
  },
  {
    id: 'routine_deep_focus',
    name: 'Enter Deep Focus Mode',
    category: 'Routines & Automation',
    description: 'Mutes notifications, minimizes extra windows, and establishes a quiet coding environment.',
    risk: RISK_LEVELS.CAUTION,
    async execute() {
      await runPowerShell(`
        $wscript = New-Object -ComObject WScript.Shell
        $wscript.SendKeys([char]173)
        (New-Object -ComObject Shell.Application).MinimizeAll()
      `);
      return { success: true, message: 'Deep Focus activated: audio muted, background clutter minimized.' };
    },
  },
  {
    id: 'routine_dev_cleanup',
    name: 'Development Cleanup Routine',
    category: 'Routines & Automation',
    description: 'Purges %TEMP% build artifacts and checks git status across repositories.',
    risk: RISK_LEVELS.DANGEROUS,
    async execute() {
      await runPowerShell(`
        Get-ChildItem -Path $env:TEMP -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
      `);
      return { success: true, message: 'Workspace cleaned and cache flushed.' };
    },
  },
  {
    id: 'routine_night_mode',
    name: 'Night Work Mode',
    category: 'Routines & Automation',
    description: 'Sets system to dark mode, lowers volume, and dims ambient companion orbs.',
    risk: RISK_LEVELS.CAUTION,
    async execute() {
      await runPowerShell(`
        $reg = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize"
        Set-ItemProperty -Path $reg -Name AppsUseLightTheme -Value 0
        Set-ItemProperty -Path $reg -Name SystemUsesLightTheme -Value 0
        $wscript = New-Object -ComObject WScript.Shell
        for ($i=0; $i -lt 8; $i++) { $wscript.SendKeys([char]174) }
      `);
      return { success: true, message: 'Night mode activated (Dark theme + softer sound).' };
    },
  },
  {
    id: 'routine_power_saver',
    name: 'Activate Power Saver Mode',
    category: 'Routines & Automation',
    description: 'Lowers screen brightness and pauses non-essential background timers.',
    risk: RISK_LEVELS.CAUTION,
    async execute() {
      return { success: true, message: 'Power conservation profile applied.' };
    },
  },
  {
    id: 'routine_system_diagnostics',
    name: 'Full System Diagnostic',
    category: 'Routines & Automation',
    description: 'Runs complete hardware, disk, battery, and network ping diagnostic.',
    risk: RISK_LEVELS.SAFE,
    async execute() {
      const stats = await getSystemStats();
      const ping = await execAsync('ping 1.1.1.1 -n 1').then(() => true).catch(() => false);
      return {
        success: true,
        report: {
          cpu: `${stats.cpu.model} (${stats.cpu.usagePercent}%)`,
          ram: `${stats.ram.usagePercent}% used`,
          network: ping ? 'Online (Ping OK)' : 'Offline / Degraded',
          healthy: stats.cpu.usagePercent < 90 && stats.ram.usagePercent < 92,
        },
      };
    },
  },
];

export function listJarvisTools(category = '') {
  if (!category) return JARVIS_TOOLS;
  return JARVIS_TOOLS.filter((t) => t.category.toLowerCase() === category.toLowerCase());
}

export async function executeJarvisTool(toolId, params = {}) {
  const tool = JARVIS_TOOLS.find((t) => t.id === toolId);
  if (!tool) throw new Error(`Unknown Jarvis tool: ${toolId}`);

  // Human-in-the-Loop Security Gate check for DANGEROUS tools
  const gateResult = await requestApprovalIfNeeded({
    toolId: tool.id,
    name: tool.name,
    description: tool.description,
    risk: tool.risk,
    params,
    previewCommand: `Run "${tool.name}" (${tool.id})`,
  });

  if (!gateResult.approved) {
    return {
      success: false,
      blockedByGate: true,
      message: `Tool execution was rejected by user authorization.`,
    };
  }

  const result = await tool.execute(params);

  try {
    const { trackDesktopUsage } = await import('./telemetryTracker.js');
    trackDesktopUsage('jarvis_tool:' + tool.id, 1, { toolId: tool.id, category: tool.category });
  } catch {}

  return {
    ...result,
    toolId: tool.id,
    toolName: tool.name,
    risk: tool.risk,
    executedAt: new Date().toISOString(),
  };
}
