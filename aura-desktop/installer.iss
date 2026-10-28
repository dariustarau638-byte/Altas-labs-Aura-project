; Inno Setup Script for Jarvis AI (Aura Desktop 2.0)
; High-Efficiency LZMA2 Solid Compression targeting Windows (64-bit)
; Optimized to bundle all assets & runtimes under 100MB for web distribution

#define MyAppName "Jarvis AI"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "Atlas Labs"
#define MyAppURL "https://atlaslabs.dev"
#define MyAppExeName "Aura.exe"

[Setup]
AppId={{D37F2994-A821-4ECB-B03B-5E7BCF299841}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=dist_installer
OutputBaseFilename=Setup_JarvisAI
SetupIconFile=build\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2/ultra64
SolidCompression=yes
InternalCompressLevel=ultra
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Main application executable and all bundled sub-folders, assets, and dependencies
Source: "release\win-unpacked\*"; DestDir: "{app}"; Excludes: "locales\*.pak"; Flags: ignoreversion recursesubdirs createallsubdirs
; Bundled English locales (Full English distribution)
Source: "release\win-unpacked\locales\en-US.pak"; DestDir: "{app}\locales"; Flags: ignoreversion
Source: "release\win-unpacked\locales\en-GB.pak"; DestDir: "{app}\locales"; Flags: ignoreversion
; Application icon
Source: "build\icon.ico"; DestDir: "{app}\build"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\build\icon.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\build\icon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
