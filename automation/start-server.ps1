# Start a local HTTP server to serve the news briefing website
# Run this script with: .\start-server.ps1

$port = 8080
$dir = Join-Path $PSScriptRoot "dist"

Write-Host "Starting server on http://localhost:$port" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawPath = $request.Url.LocalPath
        $rawPath = $rawPath -replace '/+', '/'
        if ($rawPath -eq '/') { $rawPath = '/index.html' }
        $safePath = $rawPath.TrimStart('/').Replace('..', '').Replace('\\', '/')
        $filePath = Join-Path $dir $safePath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mimeMap = @{
                '.html' = 'text/html'
                '.js'   = 'application/javascript'
                '.css'  = 'text/css'
                '.svg'  = 'image/svg+xml'
                '.png'  = 'image/png'
                '.jpg'  = 'image/jpeg'
                '.jpeg' = 'image/jpeg'
                '.gif'  = 'image/gif'
                '.ico'  = 'image/x-icon'
                '.json' = 'application/json'
                '.woff' = 'font/woff'
                '.woff2'= 'font/woff2'
                '.ttf'  = 'font/ttf'
            }
            $contentType = $mimeMap[$ext]
            if (-not $contentType) { $contentType = 'application/octet-stream' }
            $response.ContentType = $contentType

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("Not Found: $safePath")
            $response.ContentLength64 = $msg.Length
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
    Write-Host "Server stopped." -ForegroundColor Yellow
}
