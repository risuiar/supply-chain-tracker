$content = Get-Content .env
$rpc = ($content | Select-String '^SEPOLIA_RPC_URL=' | ForEach-Object { ($_ -split '=', 2)[1].Trim() -replace '^"|"$', '' })
$key = ($content | Select-String '^PRIVATE_KEY=' | ForEach-Object { ($_ -split '=', 2)[1].Trim() -replace '^"|"$', '' })
$etherscan = ($content | Select-String '^ETHERSCAN_API_KEY=' | ForEach-Object { ($_ -split '=', 2)[1].Trim() -replace '^"|"$', '' })

if (-not $rpc) {
    Write-Host 'ERROR: SEPOLIA_RPC_URL no esta configurado'
    exit 1
}

if (-not $key) {
    Write-Host 'ERROR: PRIVATE_KEY no esta configurado'
    exit 1
}

$rpc | Out-File -FilePath '_temp_rpc.txt' -Encoding ASCII -NoNewline
$key | Out-File -FilePath '_temp_key.txt' -Encoding ASCII -NoNewline

if ($etherscan) {
    $etherscan | Out-File -FilePath '_temp_etherscan.txt' -Encoding ASCII -NoNewline
}

