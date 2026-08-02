param(
    [string]$Root = "."
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path $Root).Path
$postsDir = Join-Path $projectRoot "posts"
$indexPath = Join-Path $projectRoot "index.html"
$imageExtensions = @("png", "jpg", "jpeg", "gif", "bmp", "webp", "svg", "ico", "avif")
$videoExtensions = @("mov", "mp4", "mkv", "avi", "webm")
$audioExtensions = @("mp3", "wav", "aiff", "aac", "ogg", "wma", "flac", "m4a", "alac")

$VerbosePreference = "Continue"
Write-Verbose "Root folder: $Root"
Write-Verbose "Resolved project root: $projectRoot"
Write-Verbose "Posts directory: $postsDir"
Write-Verbose "Index path: $indexPath"

if (-not (Test-Path $postsDir)) {
    throw "Folder 'posts' not found: $postsDir"
}

function Get-MediaSrc {
    param([string]$RawCard)

    $sourceMatch = [regex]::Match($RawCard, '<source\s+[^>]*src="([^"]+)"', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($sourceMatch.Success) {
        return $sourceMatch.Groups[1].Value.Trim()
    }

    $imgMatch = [regex]::Match($RawCard, '<img\s+[^>]*src="([^"]+)"', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($imgMatch.Success) {
        return $imgMatch.Groups[1].Value.Trim()
    }

    return $null
}

function Get-Extension {
    param([string]$PathValue)

    if ([string]::IsNullOrWhiteSpace($PathValue)) {
        return ""
    }

    $cleanPath = $PathValue.Split("?")[0]
    $dotIndex = $cleanPath.LastIndexOf(".")
    if ($dotIndex -lt 0 -or $dotIndex -ge ($cleanPath.Length - 1)) {
        return ""
    }

    return $cleanPath.Substring($dotIndex + 1).ToLowerInvariant()
}

function Is-MediaExtension {
    param([string]$ExtensionValue)

    return $imageExtensions.Contains($ExtensionValue) -or $videoExtensions.Contains($ExtensionValue) -or $audioExtensions.Contains($ExtensionValue)
}

function Get-PostTitle {
    param([string]$RawCard)

    $titleMatch = [regex]::Match($RawCard, '<h2>\s*(?:<a[^>]*>)?\s*(.*?)\s*(?:</a>)?\s*</h2>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if (-not $titleMatch.Success) {
        return "Document"
    }

    return ([regex]::Replace($titleMatch.Groups[1].Value, '<[^>]+>', '')).Trim()
}

function Get-FileNameFromSrc {
    param([string]$Src)

    $normalized = $Src.Replace('\', '/')
    $slashIndex = $normalized.LastIndexOf('/')
    if ($slashIndex -ge 0 -and $slashIndex -lt ($normalized.Length - 1)) {
        return $normalized.Substring($slashIndex + 1)
    }
    return $normalized
}

function Get-ProjectRelativeHref {
    param(
        [string]$ProjectRootValue,
        [string]$PostDirValue,
        [string]$Src
    )

    if ([string]::IsNullOrWhiteSpace($Src)) {
        return $Src
    }

    $s = ($Src.Trim() -replace '\\', '/')
    while ($s.StartsWith('./')) {
        $s = $s.Substring(2)
    }
    if ($s.StartsWith('/') -and -not $s.StartsWith('//')) {
        $s = $s.Substring(1)
    }

    try {
        $rootFull = [System.IO.Path]::GetFullPath($ProjectRootValue)

        $candidates = @()
        if ($s -match '^[a-zA-Z]:') {
            $candidates += [System.IO.Path]::GetFullPath($s)
        } else {
            $postDirFull = [System.IO.Path]::GetFullPath($PostDirValue)
            $candidates += [System.IO.Path]::GetFullPath((Join-Path $postDirFull $s))
            $candidates += [System.IO.Path]::GetFullPath((Join-Path $rootFull $s))
        }

        foreach ($candidateRaw in $candidates) {
            $candidate = $candidateRaw
            if (Test-Path -LiteralPath $candidate -PathType Leaf) {
                $candidate = [System.IO.Path]::GetFullPath((Get-Item -LiteralPath $candidate).FullName)
            }

            if ($candidate.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
                $tail = $candidate.Substring($rootFull.Length).TrimStart('\', '/')
                if (-not [string]::IsNullOrWhiteSpace($tail)) {
                    return ($tail -replace '\\', '/')
                }
            }
        }
    }
    catch {}

    return (Get-FallbackRelativeAssetPath $Src)
}

function Get-FallbackRelativeAssetPath {
    param([string]$Src)

    $s = ($Src.Trim() -replace '\\', '/')
    while ($s.StartsWith('./')) {
        $s = $s.Substring(2)
    }
    if ($s.StartsWith('/') -and -not $s.StartsWith('//')) {
        $s = $s.Substring(1)
    }
    $idx = $s.ToLowerInvariant().IndexOf('assets/')
    if ($idx -ge 0) {
        return $s.Substring($idx)
    }
    return $s
}

function Test-AssetExists {
    param(
        [string]$ProjectRootValue,
        [string]$RelativeSrc
    )

    $rootFull = [System.IO.Path]::GetFullPath($ProjectRootValue)
    $candidate = [System.IO.Path]::GetFullPath((Join-Path $rootFull $RelativeSrc))
    if (-not $candidate.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $false
    }
    return (Test-Path -LiteralPath $candidate -PathType Leaf)
}

function Escape-Html {
    param([string]$Text)
    return $Text.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;').Replace('"', '&quot;')
}

function Escape-Attribute {
    param([string]$Text)
    return (Escape-Html $Text).Replace("'", '&#39;')
}

function Convert-PostCard {
    param(
        [string]$RawCard,
        [string]$ProjectRootValue,
        [string]$PostDirValue
    )

    $mediaSrcRaw = Get-MediaSrc $RawCard
    if ([string]::IsNullOrWhiteSpace($mediaSrcRaw)) {
        return $RawCard
    }

    $mediaSrc = Get-ProjectRelativeHref -ProjectRootValue $ProjectRootValue -PostDirValue $PostDirValue -Src $mediaSrcRaw

    $extension = Get-Extension $mediaSrc
    if ([string]::IsNullOrWhiteSpace($extension) -or (Is-MediaExtension $extension)) {
        return $RawCard
    }

    $postTitle = Get-PostTitle $RawCard
    $fileName = Get-FileNameFromSrc $mediaSrc
    $fileExists = Test-AssetExists -ProjectRootValue $ProjectRootValue -Src $mediaSrc
    $documentTitle = if ($fileExists -and -not [string]::IsNullOrWhiteSpace($fileName)) { $fileName } else { $postTitle }

    $downloadLabel = "&#1057;&#1082;&#1072;&#1095;&#1072;&#1090;&#1100;"
    $downloadHtml = if ($fileExists) {
        $downloadAttr = if (-not [string]::IsNullOrWhiteSpace($fileName)) {
            ' download="' + (Escape-Attribute $fileName) + '"'
        } else {
            ' download'
        }
        '<a class="doc-download-btn" href="' + (Escape-Attribute $mediaSrc) + '"' + $downloadAttr + '>' + $downloadLabel + '</a>'
    } else {
        '<span class="doc-download-btn doc-download-btn-disabled">' + $downloadLabel + '</span>'
    }

    return @"
<article class="post-preview doc-preview">
    <div class="doc-media">
        <div class="doc-media-main">
            <span class="doc-icon">DOC</span>
            <div>
                <p class="doc-name">$(Escape-Html $documentTitle)</p>
                <p class="doc-subtitle">Документ</p>
            </div>
        </div>
        $downloadHtml
    </div>
</article>
"@
}

$postFiles = Get-ChildItem -Path $postsDir -Filter "post*.html" -File | Sort-Object {
    if ($_.BaseName -match "^post(\d+)$") { [int]$matches[1] } else { -1 }
} -Descending

$cards = @()
foreach ($file in $postFiles) {
    $raw = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $cards += (Convert-PostCard -RawCard $raw.Trim() -ProjectRootValue $projectRoot -PostDirValue $file.DirectoryName)
}

if ($cards.Count -eq 0) {
    $postsHtml = "            <p>No posts yet.</p>"
} else {
    $postsHtml = ($cards -join [Environment]::NewLine)
}

$indexHtml = @"
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Blog</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header>
        <h1>My Tech Blog</h1>
        <nav>
            <a href="index.html">Home</a>
            <a href="admin/index.html">Admin</a>
        </nav>
    </header>
    <main>
        <section class="posts-list">
$postsHtml
        </section>
    </main>
    <footer>
        <p>&copy; 2024 My Blog. All rights reserved.</p>
    </footer>
    <script src="js/script.js" defer></script>
</body>
</html>
"@

Set-Content -Path $indexPath -Value $indexHtml -Encoding UTF8
Write-Output "index.html generated: $($postFiles.Count) posts"
