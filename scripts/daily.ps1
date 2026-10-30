# 깃허브 레이더 매일 요약 갱신과 배포 (예약 작업 stanlee-github-radar, 매일 06:30)
# 자동화\STOP 파일이 있으면 아무것도 하지 않는다. 기록은 scripts\logs\<날짜>.log
$root = Split-Path $PSScriptRoot -Parent
if (Test-Path (Join-Path $root '..\..\자동화\STOP')) { exit 0 }
$logDir = Join-Path $PSScriptRoot 'logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir ((Get-Date -Format 'yyyy-MM-dd') + '.log')
& node (Join-Path $PSScriptRoot 'summarize.mjs') --max 150 --deploy *>> $log
