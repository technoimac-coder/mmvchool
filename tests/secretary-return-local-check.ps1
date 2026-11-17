$ErrorActionPreference = 'Stop'
$mysqlBin = 'C:\xampp\mysql\bin'
$phpBin = 'C:\xampp\php\php.exe'
$testDataDir = Join-Path $env:TEMP ('mmv-secretary-lock-check-' + [guid]::NewGuid().ToString('N'))
if (Test-NetConnection 127.0.0.1 -Port 43317 -InformationLevel Quiet) { throw 'Test port 43317 is already in use. No changes were made.' }
& (Join-Path $mysqlBin 'mysql_install_db.exe') "--datadir=$testDataDir"
if ($LASTEXITCODE -ne 0) { throw 'Could not initialize temporary database.' }
$serverArgs = @('--no-defaults', "--datadir=`"$testDataDir`"", '--basedir=C:\xampp\mysql', '--bind-address=127.0.0.1', '--port=43317', '--skip-grant-tables', '--console')
$server = Start-Process -FilePath (Join-Path $mysqlBin 'mysqld.exe') -ArgumentList $serverArgs -WindowStyle Hidden -PassThru
try {
  $ready = $false
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Seconds 1
    & (Join-Path $mysqlBin 'mysqladmin.exe') --protocol=tcp --host=127.0.0.1 --port=43317 --connect-timeout=1 ping 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    if ($server.HasExited) { break }
  }
  if (!$ready) { throw 'Temporary database did not start.' }
  & $phpBin (Join-Path $PSScriptRoot 'pending-request-edit.test.php')
  if ($LASTEXITCODE -ne 0) { throw 'Database test failed.' }
} finally {
  if (!$server.HasExited) { Stop-Process -Id $server.Id }
}
