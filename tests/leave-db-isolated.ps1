$ErrorActionPreference = 'Stop'
$taskMysql = 'C:\xampp\mysql\bin'
$taskPhp = 'C:\xampp\php\php.exe'
$taskRoot = Join-Path $env:TEMP ('mmv-leave-test-' + [guid]::NewGuid().ToString('N'))
$taskPort = Get-Random -Minimum 40000 -Maximum 60000
if (!(Test-Path -LiteralPath (Join-Path $taskMysql 'mysql_install_db.exe')) -or !(Test-Path -LiteralPath $taskPhp)) { throw 'XAMPP MySQL/PHP not found.' }
& (Join-Path $taskMysql 'mysql_install_db.exe') "--datadir=$taskRoot"
if ($LASTEXITCODE -ne 0) { throw 'Test database initialization failed.' }
$taskArgs = @('--no-defaults', "--datadir=`"$taskRoot`"", '--basedir=C:\xampp\mysql', '--bind-address=127.0.0.1', "--port=$taskPort", '--skip-grant-tables', '--console')
$taskServer = Start-Process -FilePath (Join-Path $taskMysql 'mysqld.exe') -ArgumentList $taskArgs -WindowStyle Hidden -PassThru
try {
  $taskReady = $false
  for ($taskAttempt = 0; $taskAttempt -lt 20; $taskAttempt++) {
    Start-Sleep -Seconds 1
    & (Join-Path $taskMysql 'mysqladmin.exe') --protocol=tcp --host=127.0.0.1 "--port=$taskPort" --connect-timeout=1 ping 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $taskReady = $true; break }
    if ($taskServer.HasExited) { break }
  }
  if (!$taskReady) { throw 'Isolated test database did not start; no production data was used.' }
  & $taskPhp (Join-Path $PSScriptRoot 'leave-db-isolated.php') $taskPort
  if ($LASTEXITCODE -ne 0) { throw 'Isolated database test failed.' }
} finally {
  if (!$taskServer.HasExited) { Stop-Process -Id $taskServer.Id }
}
