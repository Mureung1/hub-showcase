[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("Get", "Set", "Delete")]
  [string]$Action,

  [ValidateSet("AgeIdentity", "DatabaseUrl")]
  [string]$Kind = "AgeIdentity",

  [string]$Target = "ModuBrain/SupabaseBackupAgeIdentity",
  [string]$SecretFile,
  [string]$OutputFile,
  [switch]$DeleteSource
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ($env:OS -ne "Windows_NT") {
  throw "Windows Credential Manager is available only on Windows."
}
if ($Target -notmatch '^[A-Za-z0-9 ._:/-]{1,128}$') {
  throw "Credential target contains unsupported characters."
}

Add-Type -TypeDefinition @"
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

public static class ModuBrainCredentialManager
{
    private const UInt32 CRED_TYPE_GENERIC = 1;
    private const UInt32 CRED_PERSIST_LOCAL_MACHINE = 2;

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct NativeCredential
    {
        public UInt32 Flags;
        public UInt32 Type;
        [MarshalAs(UnmanagedType.LPWStr)] public string TargetName;
        [MarshalAs(UnmanagedType.LPWStr)] public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public UInt32 CredentialBlobSize;
        public IntPtr CredentialBlob;
        public UInt32 Persist;
        public UInt32 AttributeCount;
        public IntPtr Attributes;
        [MarshalAs(UnmanagedType.LPWStr)] public string TargetAlias;
        [MarshalAs(UnmanagedType.LPWStr)] public string UserName;
    }

    [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CredRead(string target, UInt32 type, Int32 reservedFlag, out IntPtr credentialPtr);

    [DllImport("advapi32.dll", EntryPoint = "CredWriteW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CredWrite(ref NativeCredential credential, UInt32 flags);

    [DllImport("advapi32.dll", EntryPoint = "CredDeleteW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CredDelete(string target, UInt32 type, UInt32 flags);

    [DllImport("advapi32.dll", SetLastError = false)]
    private static extern void CredFree(IntPtr credentialPtr);

    public static string ReadGeneric(string target)
    {
        IntPtr pointer;
        if (!CredRead(target, CRED_TYPE_GENERIC, 0, out pointer))
            throw new Win32Exception(Marshal.GetLastWin32Error(), "Credential Manager entry was not found.");
        try
        {
            NativeCredential credential = (NativeCredential)Marshal.PtrToStructure(pointer, typeof(NativeCredential));
            if (credential.CredentialBlobSize == 0) return String.Empty;
            byte[] bytes = new byte[(int)credential.CredentialBlobSize];
            Marshal.Copy(credential.CredentialBlob, bytes, 0, bytes.Length);
            return Encoding.Unicode.GetString(bytes).TrimEnd('\0');
        }
        finally
        {
            CredFree(pointer);
        }
    }

    public static void WriteGeneric(string target, string userName, string secret)
    {
        byte[] bytes = Encoding.Unicode.GetBytes(secret);
        if (bytes.Length > 2560) throw new ArgumentException("Credential secret exceeds the Windows limit.");
        IntPtr blob = Marshal.AllocCoTaskMem(bytes.Length);
        try
        {
            Marshal.Copy(bytes, 0, blob, bytes.Length);
            NativeCredential credential = new NativeCredential();
            credential.Type = CRED_TYPE_GENERIC;
            credential.TargetName = target;
            credential.CredentialBlobSize = (UInt32)bytes.Length;
            credential.CredentialBlob = blob;
            credential.Persist = CRED_PERSIST_LOCAL_MACHINE;
            credential.UserName = userName;
            if (!CredWrite(ref credential, 0))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "Credential Manager write failed.");
        }
        finally
        {
            Marshal.FreeCoTaskMem(blob);
        }
    }

    public static void DeleteGeneric(string target)
    {
        if (!CredDelete(target, CRED_TYPE_GENERIC, 0))
            throw new Win32Exception(Marshal.GetLastWin32Error(), "Credential Manager delete failed.");
    }
}
"@

function Assert-CredentialSecret([string]$Value) {
  if ($Kind -eq "AgeIdentity") {
    if ($Value -notmatch '(?m)^AGE-SECRET-KEY-1[0-9A-Z]+$') {
      throw "The credential value is not a native age identity."
    }
    return
  }
  try {
    $uri = [Uri]$Value
    if ($uri.Scheme -notin @("postgres", "postgresql")) { throw "invalid scheme" }
  } catch {
    throw "The credential value is not a PostgreSQL connection URL."
  }
}

switch ($Action) {
  "Set" {
    $resolvedSecret = $null
    if ($SecretFile) {
      $resolvedSecret = (Resolve-Path -LiteralPath $SecretFile).Path
      $secret = [IO.File]::ReadAllText($resolvedSecret).Trim()
    } else {
      $secureSecret = Read-Host "Enter the $Kind secret" -AsSecureString
      $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
      try { $secret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer).Trim() }
      finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    }
    Assert-CredentialSecret $secret
    [ModuBrainCredentialManager]::WriteGeneric($Target, $Kind.ToLowerInvariant(), $secret)
    if ($DeleteSource -and $resolvedSecret) { Remove-Item -LiteralPath $resolvedSecret -Force }
    Write-Output "$Kind stored in Windows Credential Manager target '$Target'."
  }
  "Get" {
    if (-not $OutputFile) { throw "OutputFile is required for Action=Get." }
    $secret = [ModuBrainCredentialManager]::ReadGeneric($Target).Trim()
    Assert-CredentialSecret $secret
    $fullOutput = [IO.Path]::GetFullPath($OutputFile)
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($fullOutput)) | Out-Null
    try {
      [IO.File]::WriteAllText(
        $fullOutput,
        $secret + [Environment]::NewLine,
        (New-Object Text.UTF8Encoding($false))
      )
      $acl = New-Object Security.AccessControl.FileSecurity
      $acl.SetAccessRuleProtection($true, $false)
      $rule = New-Object Security.AccessControl.FileSystemAccessRule(
        [Security.Principal.WindowsIdentity]::GetCurrent().Name,
        "FullControl",
        "Allow"
      )
      $acl.AddAccessRule($rule)
      Set-Acl -LiteralPath $fullOutput -AclObject $acl
    } catch {
      Remove-Item -LiteralPath $fullOutput -Force -ErrorAction SilentlyContinue
      throw
    }
  }
  "Delete" {
    [ModuBrainCredentialManager]::DeleteGeneric($Target)
    Write-Output "Credential Manager target '$Target' was deleted."
  }
}
