<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

/**
 * Shrinks an uploaded photo after it is stored: at most 1600 px on the long side, re-saved as
 * a JPEG (PNGs with transparency stay PNG), phone rotation applied. A 3–8 MB phone photo usually
 * ends up around 150–400 KB, which keeps the showroom fast and the server's storage small.
 * PDFs and anything that isn't a JPEG/PNG/WebP are left exactly as uploaded.
 */
class ImageShrinker
{
    public static function shrinkStored(string $relativePath, string $disk = 'public', int $maxPx = 1600): string
    {
        $path = Storage::disk($disk)->path($relativePath);
        if (! function_exists('imagecreatetruecolor') || ! is_file($path)) {
            return $relativePath;
        }

        $info = @getimagesize($path);
        if (! $info || ! in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
            return $relativePath;
        }
        [$w, $h, $type] = $info;
        $size = filesize($path);
        if (max($w, $h) <= $maxPx && $size <= 400 * 1024) {
            return $relativePath; // already small
        }

        $src = match ($type) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($path),
            IMAGETYPE_PNG => @imagecreatefrompng($path),
            IMAGETYPE_WEBP => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
        };
        if (! $src) {
            return $relativePath;
        }

        if ($type === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
            $rotate = [3 => 180, 6 => -90, 8 => 90][(int) (@exif_read_data($path)['Orientation'] ?? 1)] ?? 0;
            if ($rotate) {
                $src = imagerotate($src, $rotate, 0);
                [$w, $h] = [imagesx($src), imagesy($src)];
            }
        }

        // PNG color types 4 and 6 have an alpha channel: keep those as PNG.
        $keepPng = $type === IMAGETYPE_PNG && in_array(ord((string) @file_get_contents($path, false, null, 25, 1)), [4, 6], true);
        $scale = min(1, $maxPx / max($w, $h));
        $nw = max(1, (int) round($w * $scale));
        $nh = max(1, (int) round($h * $scale));
        $dst = imagecreatetruecolor($nw, $nh);
        if ($keepPng) {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
        } else {
            imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
        }
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);

        $newRelative = $keepPng ? $relativePath : preg_replace('/\.(png|webp|jpe?g)$/i', '.jpg', $relativePath);
        $newPath = Storage::disk($disk)->path($newRelative);
        $tmp = $newPath.'.tmp';
        $ok = $keepPng ? imagepng($dst, $tmp, 9) : imagejpeg($dst, $tmp, 82);
        if (! $ok || ! is_file($tmp) || filesize($tmp) >= $size) {
            @unlink($tmp);

            return $relativePath;
        }
        rename($tmp, $newPath);
        if ($newPath !== $path) {
            @unlink($path);
        }

        return $newRelative;
    }
}
