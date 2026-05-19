# Téléchargement de 16 photos clés depuis Zenfolio vers public/images/
# Usage : .\download-photos.ps1

$ErrorActionPreference = "Continue"

# Photos sélectionnées du Portfolio Mariage (mix : hero, couples, cérémonie, soirée, lieux, détails)
$photos = @(
    @{id = "p4161172481-3"; name = "hero-sunset-dance.jpg"; desc = "Hero - première danse coucher de soleil"},
    @{id = "p3611895929-3"; name = "ceremonie-emotion.jpg";  desc = "Cérémonie - émotion"},
    @{id = "p3505293464-3"; name = "couple-portrait.jpg";    desc = "Portrait couple"},
    @{id = "p3611894754-3"; name = "preparation-mariee.jpg"; desc = "Préparation mariée"},
    @{id = "p2366810595-3"; name = "chateau-bretagne.jpg";   desc = "Lieu - château Bretagne"},
    @{id = "p4035583537-2"; name = "groupes-famille.jpg";    desc = "Photos de groupe"},
    @{id = "p4035587600-2"; name = "soiree-danse.jpg";       desc = "Soirée - première danse"},
    @{id = "p4035588614-2"; name = "cocktail-moment.jpg";    desc = "Cocktail - moment partagé"},
    @{id = "p3611882043-3"; name = "detail-bouquet.jpg";     desc = "Détail - bouquet"},
    @{id = "p3611891929-3"; name = "couple-paysage.jpg";     desc = "Couple dans le paysage"},
    @{id = "p4035583547-2"; name = "ambiance-soiree.jpg";    desc = "Ambiance soirée"},
    @{id = "p2445087634-3"; name = "ceremonie-eglise.jpg";   desc = "Cérémonie église"},
    @{id = "p3611878443-3"; name = "couple-bord-mer.jpg";    desc = "Couple bord de mer"},
    @{id = "p3611881640-3"; name = "ceremonie-laique.jpg";   desc = "Cérémonie laïque"},
    @{id = "p4035587387-2"; name = "soiree-piste.jpg";       desc = "Soirée - piste de danse"},
    @{id = "p3611878539-3"; name = "couple-tendresse.jpg";   desc = "Couple - tendresse"}
)

$outDir = "public\images"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$success = 0
$failed = 0

foreach ($photo in $photos) {
    $url = "https://www.blackpixels.fr/img/s/v-10/$($photo.id).jpg"
    $out = Join-Path $outDir $photo.name

    if (Test-Path $out) {
        Write-Host "  skip   $($photo.name) (déjà téléchargée)" -ForegroundColor DarkGray
        $success++
        continue
    }

    try {
        Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing -ErrorAction Stop
        $size = (Get-Item $out).Length
        if ($size -gt 1000) {
            Write-Host ("  ok     {0,-30} ({1:N0} Ko) - {2}" -f $photo.name, ($size/1024), $photo.desc) -ForegroundColor Green
            $success++
        } else {
            Remove-Item $out -Force
            Write-Host "  echec  $($photo.name) (taille trop petite : $size octets)" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "  echec  $($photo.name) : $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "$success photo(s) téléchargée(s), $failed échec(s)" -ForegroundColor Cyan
Write-Host "Dossier : $((Resolve-Path $outDir).Path)"
