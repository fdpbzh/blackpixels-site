# Téléchargement de toutes les photos du Portfolio Mariage (101)
# Noms neutres photo-001.jpg à photo-101.jpg pour éviter les biais de nommage
# Usage : .\download-all-photos.ps1

$ErrorActionPreference = "Continue"

$ids = @(
    "p4161172481-3","p4035583554-3","p4035587600-2","p2366810595-3","p4035588614-2",
    "p2366851980-2","p4035583547-2","p4035583537-2","p3611895929-3","p4035583566-2",
    "p3505293464-3","p3611894754-3","p2445087634-3","p3611882043-3","p4035583552-2",
    "p3611891929-3","p3611878443-3","p3611881640-3","p4035587387-2","p3611878539-3",
    "p3611874062-3","p3006666715-3","p3611874134-3","p2445060082-2","p3611874157-2",
    "p3611881910-2","p3611874208-2","p3611880190-2","p4035585035-2","p3611882393-3",
    "p3537164187-3","p3537164184-3","p3537164191-3","p3515108023-2","p3515127762-3",
    "p3515107849-3","p3515108234-3","p2445121342-2","p3515108054-3","p2445275110-3",
    "p3505299551-3","p2445081925-2","p2445060056-2","p3505297106-3","p3505295876-3",
    "p4035587053-3","p3505293762-3","p2445060032-2","p3505291642-3","p3505291992-2",
    "p3505288930-2","p3505287271-2","p3505287281-2","p3057157978-3","p3057155488-3",
    "p3611884151-2","p3057155271-3","p3057152702-3","p2445060050-3","p3611894073-2",
    "p2445080689-3","p4161173455-2","p4161171985-2","p3006658730-2","p4161172029-2",
    "p4161173083-2","p4161172185-2","p4161172934-3","p4161172391-2","p4161172964-2",
    "p4161173446-3","p2445327866-3","p2366811035-3","p2366812552-3","p2366813096-2",
    "p2366846315-3","p2366846761-2","p2366846747-3","p2366847004-2","p2366847082-3",
    "p2366848041-3","p2366848752-3","p2366848998-2","p2366849653-3","p2366849626-3",
    "p2366850810-3","p2366850702-2","p2366852812-3","p2366852960-3","p2366853885-2",
    "p2366854029-2","p2366854591-2","p2366856073-2","p2366859297-2","p2366859715-2",
    "p2366860378-2","p2366861287-2","p2366861958-3","p2366863443-3","p2366863634-3",
    "p2366863722-3"
)

$outDir = "public\images"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$success = 0
$failed = 0
$skipped = 0

for ($i = 0; $i -lt $ids.Count; $i++) {
    $id = $ids[$i]
    $num = ($i + 1).ToString("000")
    $name = "photo-$num.jpg"
    $url = "https://www.blackpixels.fr/img/s/v-10/$id.jpg"
    $out = Join-Path $outDir $name

    if (Test-Path $out) {
        $skipped++
        continue
    }

    try {
        Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing -ErrorAction Stop -TimeoutSec 10
        $size = (Get-Item $out).Length
        if ($size -gt 1000) {
            $success++
            if ($success % 10 -eq 0) {
                Write-Host "  ... $success photos téléchargées" -ForegroundColor DarkGray
            }
        } else {
            Remove-Item $out -Force
            $failed++
        }
    } catch {
        Write-Host "  echec $name : $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "Total : $($ids.Count) photos demandées" -ForegroundColor Cyan
Write-Host "  Téléchargées : $success" -ForegroundColor Green
Write-Host "  Déjà présentes (skipped) : $skipped" -ForegroundColor DarkGray
Write-Host "  Échecs : $failed" -ForegroundColor $(if ($failed -gt 0) { 'Red' } else { 'Green' })
Write-Host ""
Write-Host "Dossier : $((Resolve-Path $outDir).Path)"
Write-Host ""
Write-Host "Maintenant ouvre http://localhost:4321/photos-preview pour voir toutes les photos."
