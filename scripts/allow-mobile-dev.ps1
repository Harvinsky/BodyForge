# Spusti ako správca: povolí prichádzajúce spojenia na port 3000 (Next.js dev) v súkromnej sieti.
#Requires -RunAsAdministrator

$ruleName = "BodyForge Dev (TCP 3000)"

$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Pravidlo uz existuje: $ruleName"
  exit 0
}

New-NetFirewallRule `
  -DisplayName $ruleName `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 3000 `
  -Action Allow `
  -Profile Private

Write-Host "OK: Port 3000 povoleny pre sukromnu siet (Wi-Fi doma)."
Write-Host "Na mobile otvor: http://192.168.1.10:3000  (skontroluj IP cez ipconfig)"
