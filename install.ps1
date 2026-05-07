$ErrorActionPreference = "Stop"

$themeName = "AppleSpotifyDark"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = spicetify -c
$spicetifyDir = Split-Path $configPath
$themeDir = Join-Path $spicetifyDir "Themes\$themeName"

New-Item -ItemType Directory -Force -Path $themeDir | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot "color.ini") -Destination $themeDir -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "user.css") -Destination $themeDir -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "theme.js") -Destination $themeDir -Force

spicetify config inject_css 1
spicetify config replace_colors 1
spicetify config inject_theme_js 1
spicetify config current_theme $themeName
spicetify config color_scheme base
spicetify apply

Write-Host "Installed and applied $themeName."
