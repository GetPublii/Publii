; -- 64Bit.iss --
; Demonstrates installation of a program built for the x64 (a.k.a. AMD64)
; architecture.
; To successfully run this installation and the program it installs,
; you must have a "x64" edition of Windows.

; SEE THE DOCUMENTATION FOR DETAILS ON CREATING .ISS SCRIPT FILES!

[InstallDelete]
Type: filesandordirs; Name: "{app}\resources";

[Setup]
AppName=Publii
AppVersion=0.30.4
DefaultDirName={pf}\Publii
DefaultGroupName=Publii
UninstallDisplayIcon={app}\Publii.exe
Compression=lzma2
SolidCompression=yes
OutputDir=userdocs:Inno Setup Examples Output
; "ArchitecturesAllowed=x64" specifies that Setup cannot run on
; anything but x64.
ArchitecturesAllowed=x64
; "ArchitecturesInstallIn64BitMode=x64" requests that the install be
; done in "64-bit mode" on x64, meaning it should use the native
; 64-bit Program Files directory and the 64-bit view of the registry.
ArchitecturesInstallIn64BitMode=x64

[Tasks]
Name: desktopicon; Description: "Create a &desktop icon"; GroupDescription: "Additional icons:";

[Files]
Source: "*"; Excludes: "publii.iss"; DestDir: "{app}"
Source: "locales\*"; DestDir: "{app}\locales"; Flags: recursesubdirs
Source: "resources\*"; DestDir: "{app}\resources"; Flags: recursesubdirs

[Icons]
Name: "{group}\Publii"; Filename: "{app}\Publii.exe"
Name: "{userdesktop}\Publii"; Filename: "{app}\Publii.exe"; Tasks: desktopicon
