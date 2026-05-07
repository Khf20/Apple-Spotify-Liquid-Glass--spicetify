$ErrorActionPreference = "Stop"

$themeName = "AppleSpotifyDark"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = spicetify -c
$spicetifyDir = Split-Path $configPath
$themeDir = Join-Path $spicetifyDir "Themes\$themeName"
$extensionDir = Join-Path $spicetifyDir "Extensions"
$extensionName = "appleSpotifyLiquidGlassCompanion.js"

New-Item -ItemType Directory -Force -Path $themeDir | Out-Null
New-Item -ItemType Directory -Force -Path $extensionDir | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot "color.ini") -Destination $themeDir -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "user.css") -Destination $themeDir -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "theme.js") -Destination $themeDir -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "extensions\$extensionName") -Destination $extensionDir -Force

spicetify config inject_css 1
spicetify config replace_colors 1
spicetify config inject_theme_js 1
$existingExtensions = ""
$extensionConfigLine = Select-String -Path $configPath -Pattern "^\s*extensions\s*=" -ErrorAction SilentlyContinue
if ($extensionConfigLine) {
    $existingExtensions = ($extensionConfigLine.Line -replace "^\s*extensions\s*=\s*", "").Trim()
}

$extensions = @()
if ($existingExtensions) {
    $extensions = $existingExtensions -split "\|" | Where-Object { $_ }
}
if ($extensions -notcontains $extensionName) {
    $extensions += $extensionName
}
spicetify config extensions ($extensions -join "|")
spicetify config current_theme $themeName
spicetify config color_scheme base
spicetify apply

Write-Host "Installed and applied $themeName."
